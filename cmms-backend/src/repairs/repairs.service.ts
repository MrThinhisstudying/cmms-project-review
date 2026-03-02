import { Injectable, NotFoundException, BadRequestException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, In } from 'typeorm';
import { Repair } from './entities/repair.entity';
import { Device } from 'src/devices/entities/device.entity';
import { Department } from 'src/departments/department.entity';
import { User } from 'src/user/user.entity';
import { CreateRepairDto } from './dto/create-repair.dto';
import { ReviewRepairDto } from './dto/review-repair.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { UpdateAcceptanceDto } from './dto/update-acceptance.dto';
import { NotificationService } from 'src/notification/notification.service';
import { DeviceStatus } from 'src/devices/enums/device-status.enum';
import { Packer, Document, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, HeightRule, BorderStyle, Header, Footer, } from 'docx';
import { Response } from 'express';
import { StockOut } from 'src/stock-out/entities/stock-out.entity';
import { Item } from 'src/inventory_item/entities/item.entity';
import { StockOutStatus } from 'src/stock-out/enum/stock-out.enum';
import { UserRole } from 'src/user/user-role.enum';
import { UserDeviceGroup } from 'src/device-groups/entities/user-device-group.entity';
import { RepairsGateway } from './repairs.gateway';
import { buildRepairPdfTemplate } from './utils/repair-pdf-template.util';
import * as puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { CertificatesService } from '../certificates/certificates.service';
import { CertificateType } from '../certificates/entities/user-certificate.entity';

@Injectable()
export class RepairsService {
    constructor(
        @InjectRepository(Repair) private readonly repairRepo: Repository<Repair>,
        @InjectRepository(Device) private readonly deviceRepo: Repository<Device>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        @InjectRepository(StockOut) private readonly stockOutRepo: Repository<StockOut>,
        @InjectRepository(Item) private readonly itemRepo: Repository<Item>,
        @InjectRepository(UserDeviceGroup) private readonly userDeviceGroupRepo: Repository<UserDeviceGroup>,
        @InjectRepository(Department) private readonly departmentRepo: Repository<Department>,
        private readonly notificationService: NotificationService,
        private readonly repairsGateway: RepairsGateway,
        private readonly certificatesService: CertificatesService,
    ) { }

    async createBulk(dto: { device_ids: number[], location_issue?: string, recommendation?: string, note?: string }, userId: number) {
        // Iterate and call create manually to leverage all the existing validations and notifications
        const createdRepairs = [];
        for (const deviceId of dto.device_ids) {
            const singleDto = {
                device_id: deviceId,
                location_issue: dto.location_issue,
                recommendation: dto.recommendation,
                note: dto.note,
            };
            const repair = await this.create(singleDto, userId);
            createdRepairs.push(repair);
        }
        return createdRepairs;
    }

    async create(dto: CreateRepairDto, userId: number) {
        const creator = await this.userRepo.findOne({ where: { user_id: userId }, relations: ['department'] });
        if (!creator) throw new NotFoundException('Không tìm thấy người dùng');
        const device = await this.deviceRepo.findOne({ where: { device_id: dto.device_id } });
        if (!device) throw new NotFoundException('Không tìm thấy thiết bị');
        if (![DeviceStatus.MOI, DeviceStatus.DANG_SU_DUNG].includes(device.status))
            throw new BadRequestException('Chỉ thiết bị mới hoặc đang sử dụng mới được lập phiếu');
        const repair = this.repairRepo.create({
            device,
            created_by: creator,
            created_department: creator.department,
            location_issue: dto.location_issue,
            recommendation: dto.recommendation,
            note: dto.note,
            status_request: 'WAITING_TECH',
            status_inspection: 'inspection_pending',
            status_acceptance: 'acceptance_pending',
            canceled: false,
            created_at: new Date(),
        });
        const saved = await this.repairRepo.save(repair);
        const managers = await this.userRepo.find({ where: { role: UserRole.UNIT_HEAD }, relations: ['department'] });
        const approverManagers = managers.filter(
            (m) => Array.isArray(m.department?.permissions) && m.department.permissions.includes('APPROVE_REPAIR'),
        );
        const admins = await this.userRepo.find({ where: { role: UserRole.ADMIN } });
        const technicians = await this.userRepo.find({ where: { role: UserRole.TECHNICIAN } });

        for (const manager of approverManagers) {
            const msg = `Phòng ${creator.department?.name || ''} vừa lập phiếu sửa chữa thiết bị "${device.name}".`;
            await this.notificationService.createForUser(manager, msg);
            this.repairsGateway.sendToUser(manager.user_id, msg);
        }

        for (const admin of admins) {
            const msg = `Có phiếu sửa chữa mới #${saved.repair_id} do ${creator.name} lập.`;
            await this.notificationService.createForUser(admin, msg);
            this.repairsGateway.sendToUser(admin.user_id, msg);
        }

        for (const tech of technicians) {
             const msg = `Có phiếu sửa chữa mới #${saved.repair_id} ("${device.name}") cần tiếp nhận.`;
             await this.notificationService.createForUser(tech, msg);
             this.repairsGateway.sendToUser(tech.user_id, msg);
        }
        
        this.repairsGateway.notifyRepairUpdate(); // Broadcast update to reload lists
        return saved;
    }

    async update(id: number, dto: CreateRepairDto, userId: number, userRole: string) {
        const repair = await this.repairRepo.findOne({ where: { repair_id: id }, relations: ['device', 'created_by', 'created_department'] });
        if (!repair) throw new NotFoundException('Không tìm thấy phiếu');
        
        // Strict ownership check
        if (repair.created_by.user_id !== userId && userRole !== 'admin') {
            throw new ForbiddenException('Bạn không có quyền chỉnh sửa phiếu này (chỉ người tạo mới được sửa)');
        }

        if (repair.canceled && repair.status_request !== 'REJECTED_B03' && (repair.status_request as string) !== 'REJECTED') throw new BadRequestException('Phiếu đã bị hủy');

        // Allow update if WAITING_TECH or REJECTED_B03
        if (repair.status_request !== 'WAITING_TECH' && repair.status_request !== 'REJECTED_B03') {
             throw new BadRequestException('Chỉ phiếu trạng thái chờ duyệt hoặc bị từ chối mới được chỉnh sửa');
        }

        const device = await this.deviceRepo.findOne({ where: { device_id: dto.device_id } });
        if (!device) throw new NotFoundException('Không tìm thấy thiết bị');
        if (![DeviceStatus.MOI, DeviceStatus.DANG_SU_DUNG].includes(device.status))
            throw new BadRequestException('Chỉ thiết bị mới hoặc đang sử dụng mới được lập phiếu');

        repair.device = device;
        repair.location_issue = dto.location_issue;
        repair.recommendation = dto.recommendation;
        // repair.note = dto.note; // Removed note field support if needed, but keeping it in entity for backward compatibility is fine, just not updating it or updating is fine. DTO still has it.

        // If rejected, reset to WAITING_TECH for re-approval
        if (repair.status_request === 'REJECTED_B03' || (repair.status_request as string) === 'REJECTED') {
            repair.status_request = 'WAITING_TECH';
            repair.canceled = false;
            repair.canceled_at = null;
        }

        const saved = await this.repairRepo.save(repair);
        this.repairsGateway.notifyRepairUpdate();
        return saved;
    }

    async updateInspection(id: number, dto: UpdateInspectionDto, userId: number) {
        const repair = await this.repairRepo.findOne({
            where: { repair_id: id },
            relations: ['inspection_committee', 'device'],
        });

        if (!repair) throw new NotFoundException('Không tìm thấy phiếu');
        if (repair.canceled && repair.status_inspection !== 'REJECTED_B04' && (repair.status_inspection as string) !== 'inspection_rejected') throw new BadRequestException('Phiếu đã bị hủy');
        if (repair.status_request !== 'COMPLETED') throw new BadRequestException('Phiếu yêu cầu chưa được phê duyệt hoàn tất');

        if (repair.status_inspection === 'REJECTED_B04' || (repair.status_inspection as string) === 'inspection_rejected') {
             // Allow edit to redo
             // Reset logic handled at save
        } else if (['inspection_manager_approved', 'inspection_admin_approved'].includes(repair.status_inspection))
            throw new BadRequestException('Kiểm nghiệm đã được phê duyệt, không thể chỉnh sửa');

        if (repair.status_acceptance !== 'acceptance_pending')
            throw new BadRequestException('Phiếu đã chuyển sang nghiệm thu, không thể chỉnh sửa kiểm nghiệm');

        if (dto.inspection_materials) {
            dto.inspection_materials = dto.inspection_materials.map((m) => ({
                item_id: m.item_id ? Number(m.item_id) : null,
                item_name: m.item_name,
                quantity: m.quantity,
                unit: m.unit || null,
                is_new: !!m.is_new,
                notes: m.notes || null,
                specifications: m.specifications || null,
                item_code: m.item_code || null,
            }));
        }

        repair.inspection_materials = dto.inspection_materials ?? repair.inspection_materials;

        if (!repair.inspection_created_at) {
            repair.inspection_created_at = new Date();
        }

        if (!repair.inspection_created_by) {
            repair.inspection_created_by = await this.userRepo.findOne({ where: { user_id: userId } });
            if (repair.inspection_created_by && !repair.inspection_created_by.signature_url) {
                 throw new BadRequestException('Vui lòng cập nhật chữ ký trong Hồ sơ trước khi lập phiếu kiểm tra.');
            }
        }

        repair.inspection_items = dto.inspection_items ?? repair.inspection_items;
        repair.inspection_other_opinions = dto.inspection_other_opinions ?? repair.inspection_other_opinions;

        if (dto.merge_cells !== undefined) {
            repair.extra_config = { ...repair.extra_config, merge_cells: dto.merge_cells };
        }

        if (dto.inspection_committee_ids && dto.inspection_committee_ids.length > 0) {
            const users = await this.userRepo.findByIds(dto.inspection_committee_ids);
            if (users.length !== dto.inspection_committee_ids.length) {
                throw new BadRequestException('Một hoặc nhiều người dùng không tồn tại');
            }

            // Validate technician CCCM
            for (const u of users) {
                if (u.role === UserRole.TECHNICIAN) {
                    const isValid = await this.certificatesService.validateUserHasValidCertificate(u.user_id, CertificateType.CCCM);
                    if (!isValid) throw new BadRequestException(`Nhân viên ${u.name} không có chứng chỉ CCCM hợp lệ hoặc đã hết hạn.`);
                }
            }

            repair.inspection_committee = users;
        }



        // If it was rejected, reset to pending
        if (repair.status_inspection === 'REJECTED_B04' || (repair.status_inspection as string) === 'inspection_rejected') {
            repair.status_inspection = 'inspection_pending';
            repair.canceled = false; // Un-cancel if entire flow was canceled (though we keep B03 valid)
        }

        const savedRepair = await this.repairRepo.save(repair);
        
        // Notify Team Leads (Tổ VHTTBMĐ & All Team Leads for safety)
        const teamLeads = await this.userRepo.find({ where: { role: UserRole.TEAM_LEAD }, relations: ['department'] });
        // const targetLeads = teamLeads.filter(l => l.department?.name === 'Tổ VHTTBMĐ'); // Relaxed for testing
        
        for (const lead of teamLeads) {
             const msg = `Có biên bản kiểm nghiệm mới #${savedRepair.repair_id} ("${repair.device?.name}") cần phê duyệt.`;
             await this.notificationService.createForUser(lead, msg);
             this.repairsGateway.sendToUser(lead.user_id, msg);
        }

        if (dto.inspection_materials && Array.isArray(dto.inspection_materials)) {
            const oldStockOuts = await this.stockOutRepo.find({
                where: { repair: { repair_id: id } as any, status: StockOutStatus.PENDING },
            });
            if (oldStockOuts.length > 0) {
                await this.stockOutRepo.remove(oldStockOuts);
            }

            for (const m of dto.inspection_materials) {
                if (m.is_new || !m.item_id) continue;

                const item = await this.itemRepo.findOne({ where: { item_id: m.item_id } });
                if (!item) continue;

                const stockOut = this.stockOutRepo.create({
                    item,
                    quantity: Number(m.quantity),
                    purpose: `Phục vụ sửa chữa #${savedRepair.repair_id}`,
                    requested_by: repair.created_by,
                    repair: savedRepair,
                    status: StockOutStatus.PENDING,
                    note: `Vật tư từ Kho - ${item.name}`,
                });

                await this.stockOutRepo.save(stockOut);
            }
        }

        // Broadcast update
        this.repairsGateway.notifyRepairUpdate();

        return savedRepair;
    }

    async updateAcceptance(id: number, dto: UpdateAcceptanceDto, userId: number) {
        const repair = await this.repairRepo.findOne({
            where: { repair_id: id },
            relations: ['acceptance_committee', 'device'],
        });
        if (!repair) throw new NotFoundException('Không tìm thấy phiếu');
        if (repair.canceled && repair.status_acceptance !== 'REJECTED_B05' && (repair.status_acceptance as string) !== 'acceptance_rejected') throw new BadRequestException('Phiếu đã bị hủy');
        if (repair.status_inspection !== 'inspection_admin_approved') throw new BadRequestException('Kiểm nghiệm chưa hoàn tất');
        
        if (repair.status_acceptance === 'REJECTED_B05' || (repair.status_acceptance as string) === 'acceptance_rejected') {
            // Allow edit
        } else if (['acceptance_manager_approved', 'acceptance_admin_approved'].includes(repair.status_acceptance)) {
            throw new BadRequestException('Nghiệm thu đã được phê duyệt, không thể chỉnh sửa');
        }
        repair.acceptance_note = dto.acceptance_note ?? repair.acceptance_note;

        if (!repair.acceptance_created_at) {
            repair.acceptance_created_at = new Date();
        }

        if (!repair.acceptance_created_by) {
            repair.acceptance_created_by = await this.userRepo.findOne({ where: { user_id: userId } });
             if (repair.acceptance_created_by && !repair.acceptance_created_by.signature_url) {
                 throw new BadRequestException('Vui lòng cập nhật chữ ký trong Hồ sơ trước khi lập nghiệm thu.');
            }
        }

        repair.failure_cause = dto.failure_cause ?? repair.failure_cause;
        repair.failure_description = dto.failure_description ?? repair.failure_description;
        repair.recovered_materials = dto.recovered_materials ?? repair.recovered_materials;
        repair.materials_to_scrap = dto.materials_to_scrap ?? repair.materials_to_scrap;
        repair.acceptance_other_opinions = dto.acceptance_other_opinions ?? repair.acceptance_other_opinions;

        if (dto.acceptance_committee_ids && dto.acceptance_committee_ids.length > 0) {
            const users = await this.userRepo.findByIds(dto.acceptance_committee_ids);
            if (users.length !== dto.acceptance_committee_ids.length) {
                throw new BadRequestException('Một hoặc nhiều người dùng không tồn tại');
            }

            // Validate technician CCCM
            for (const u of users) {
                if (u.role === UserRole.TECHNICIAN) {
                    const isValid = await this.certificatesService.validateUserHasValidCertificate(u.user_id, CertificateType.CCCM);
                    if (!isValid) throw new BadRequestException(`Nhân viên ${u.name} không có chứng chỉ CCCM hợp lệ hoặc đã hết hạn.`);
                }
            }

            repair.acceptance_committee = users;
        }

        if (dto.inspection_materials) {
            // Merge logic: Preserve item_code/specifications/notes if not provided in DTO but exists in repair
            // B05 might send a subset or modified quantities, but we shouldn't lose B04 data.
            repair.inspection_materials = dto.inspection_materials.map((m: any) => {
                const existing = repair.inspection_materials?.find((ex: any) => 
                    (ex.item_id && String(ex.item_id) === String(m.item_id)) || 
                    (ex.item_name === m.item_name)
                );

                return {
                    item_id: m.item_id ? Number(m.item_id) : undefined,
                    item_name: m.item_name,
                    quantity: Number(m.quantity),
                    unit: m.unit,
                    is_new: !!m.is_new,
                    notes: m.notes ?? existing?.notes, // Preserve if undefined
                    item_code: m.item_code || (existing as any)?.item_code, // Preserve
                    specifications: m.specifications || (existing as any)?.specifications, // Preserve
                    phase: m.phase || (existing as any)?.phase || 'inspection', // Default to inspection
                };
            });
        }

        // If it was rejected, reset to pending
        if (repair.status_acceptance === 'REJECTED_B05' || (repair.status_acceptance as string) === 'acceptance_rejected') {
            repair.status_acceptance = 'acceptance_pending';
            repair.canceled = false;
        }

        const saved = await this.repairRepo.save(repair);
        
        // Notify Team Leads (Tổ VHTTBMĐ & All Team Leads for safety)
        const teamLeads = await this.userRepo.find({ where: { role: UserRole.TEAM_LEAD }, relations: ['department'] });
        // const targetLeads = teamLeads.filter(l => l.department?.name === 'Tổ VHTTBMĐ');

        for (const lead of teamLeads) {
             const msg = `Có phiếu nghiệm thu mới #${saved.repair_id} ("${repair.device?.name}") cần phê duyệt.`;
             await this.notificationService.createForUser(lead, msg);
             this.repairsGateway.sendToUser(lead.user_id, msg);
        }

        // Broadcast update
        this.repairsGateway.notifyRepairUpdate();

        return saved;
    }

    private ensureHasSignature(user: User) {
        if (!user.signature_url) {
            throw new BadRequestException('Vui lòng cập nhật chữ ký trong Hồ sơ trước khi duyệt/ký.');
        }
    }

    async reviewPhase(id: number, userId: number, dto: ReviewRepairDto, phase: 'request' | 'inspection' | 'acceptance') {
        const repair = await this.repairRepo.findOne({
            where: { repair_id: id },
            relations: [
                'created_department',
                'device',
                'device.device_group', // Load device group needed for lead check
                'approved_by_manager_request',
                'approved_by_admin_request',
                'approved_by_manager_inspection',
                'approved_by_admin_inspection',
                'approved_by_manager_acceptance',
                'approved_by_admin_acceptance',
                'approved_by_operator_lead_inspection',
                'approved_by_operator_lead_acceptance',
            ],
        });
        if (!repair) throw new NotFoundException('Không tìm thấy phiếu');
        if (repair.canceled) throw new BadRequestException('Phiếu đã bị hủy');
        const user = await this.userRepo.findOne({ where: { user_id: userId }, relations: ['department'] });
        if (!user) throw new NotFoundException('Không tìm thấy người dùng');

        if (dto.action === 'approve') {
            this.ensureHasSignature(user);
        } else if (dto.action === 'reject') {
            if (!dto.reason) throw new BadRequestException('Vui lòng nhập lý do từ chối');
        }

        // --- B03 REQUEST FLOW ---
        if (phase === 'request') {
            if (repair.status_inspection !== 'inspection_pending' || repair.status_acceptance !== 'acceptance_pending') {
                throw new BadRequestException('Phiếu đã chuyển sang bước sau, không thể thay đổi phê duyệt yêu cầu');
            }
            if (repair.status_request === 'REJECTED_B03') throw new BadRequestException('Phiếu đã bị từ chối');
            if (repair.status_request === 'COMPLETED') throw new BadRequestException('Phiếu yêu cầu đã hoàn tất');

            if (dto.action === 'approve') {
                if (repair.status_request === 'WAITING_TECH') {
                    if (user.role === UserRole.UNIT_HEAD) throw new ForbiddenException('Lãnh đạo Đội không được phép duyệt ở bước Tiếp nhận kỹ thuật. Vui lòng chờ nhân viên kỹ thuật.');

                    // Tech approvals (Normally specific Permission check here)
                    repair.status_request = 'WAITING_MANAGER';
                    repair.approved_by_tech_request = user; 
                    
                    // Notify Unit Head
                    const managers = await this.userRepo.find({ where: { role: UserRole.UNIT_HEAD }, relations: ['department'] });
                    const deptManagers = managers.filter(m => m.department?.dept_id === repair.created_department?.dept_id);
                    for (const manager of deptManagers) {
                         const msg = `Phiếu sửa chữa #${repair.repair_id} ("${repair.device?.name}") đã được Tổ kỹ thuật tiếp nhận và đang chờ Quản lý duyệt.`;
                         await this.notificationService.createForUser(manager, msg);
                         this.repairsGateway.sendToUser(manager.user_id, msg);
                    }
                } else if (repair.status_request === 'WAITING_MANAGER') {
                    if (user.role !== UserRole.UNIT_HEAD) throw new ForbiddenException('Chỉ Trưởng bộ phận mới được duyệt bước này');
                    repair.status_request = 'WAITING_DIRECTOR';
                    repair.approved_by_manager_request = user;
                    
                    // Notify Admin/Director
                    const admins = await this.userRepo.find({ where: [ { role: UserRole.ADMIN }, { role: UserRole.DIRECTOR } ] });
                    for (const admin of admins) {
                        const msg = `Phiếu sửa chữa #${repair.repair_id} ("${repair.device?.name}") đã được Trưởng bộ phận duyệt và đang chờ Ban Giám đốc phê duyệt.`;
                        await this.notificationService.createForUser(admin, msg);
                        this.repairsGateway.sendToUser(admin.user_id, msg);
                    }
                } else if (repair.status_request === 'WAITING_DIRECTOR') {
                    if (![UserRole.ADMIN, UserRole.DIRECTOR].includes(user.role)) throw new ForbiddenException('Chỉ Ban Giám đốc mới được duyệt bước này');
                    repair.status_request = 'COMPLETED';
                    repair.approved_by_admin_request = user;
                    
                    if (repair.device) {
                        repair.device.status = DeviceStatus.DANG_SUA_CHUA;
                        await this.deviceRepo.save(repair.device);
                    }
                    // Notification...
                    if (repair.created_by) {
                        const msg = `Phiếu yêu cầu sửa chữa #${repair.repair_id} ("${repair.device?.name}") đã được Ban Giám đốc phê duyệt. Chuyển sang giai đoạn Kiểm nghiệm.`;
                        await this.notificationService.createForUser(repair.created_by, msg);
                        this.repairsGateway.sendToUser(repair.created_by.user_id, msg);
                    }
                } else {
                    throw new BadRequestException('Trạng thái không hợp lệ để duyệt');
                }
            } else {
                // REJECT
                repair.status_request = 'REJECTED_B03';
                repair.canceled = true;
                repair.canceled_at = new Date();
                repair.rejection_reason = dto.reason;
                repair.rejected_by = user;
            }
        }

        // Helper to check if user is a Group Lead for the device
        const checkGroupLead = async () => {
             // If User is simple TEAM_LEAD role globally, allow
             if (user.role === UserRole.TEAM_LEAD) return true;
             
             // Check if User is Group Lead for this specific Device's Group
             if (repair.device && repair.device.device_group) {
                 const udgRepo = this.repairRepo.manager.getRepository('user_device_group'); 
                 const udg = await udgRepo.findOne({ 
                     where: { 
                         user_id: user.user_id, 
                         device_group: { id: repair.device.device_group.id },
                         is_group_lead: true 
                     } 
                 });
                 if (udg) return true;
             }
             return false;
        };

        // --- B04 INSPECTION FLOW ---
        if (phase === 'inspection') {
            if (repair.status_request !== 'COMPLETED') throw new BadRequestException('Phiếu yêu cầu chưa hoàn tất');
            if (repair.status_acceptance !== 'acceptance_pending') throw new BadRequestException('Phiếu đã chuyển sang nghiệm thu');
            if (repair.status_inspection === 'REJECTED_B04') throw new BadRequestException('Kiểm nghiệm đã bị từ chối');
            if (repair.status_inspection === 'inspection_admin_approved') throw new BadRequestException('Kiểm nghiệm đã hoàn tất');

            if (dto.action === 'approve') {
                if (repair.status_inspection === 'inspection_pending') {
                    // Strict check: Only Team Lead (Removed Dept check to match frontend)
                    if (user.role !== UserRole.TEAM_LEAD) {
                        throw new ForbiddenException('Chỉ Tổ trưởng mới thực hiện ký duyệt mục này.');
                    }
                    
                    repair.status_inspection = 'inspection_lead_approved';
                    repair.approved_by_operator_lead_inspection = user;
                    repair.inspection_approved_at = new Date(); 
                    
                    // Notify Unit Head
                    const managers = await this.userRepo.find({ where: { role: UserRole.UNIT_HEAD }, relations: ['department'] });
                    // Usually notify Manager of "Tổ VHTTBMĐ" (Operator)? Or Creator's manager?
                    // Inspection is usually approved by Operator Manager.
                    // Let's notify all Managers of the Operator Dept (Tổ VHTTBMĐ) if obtainable, or just Creator's as fallback.
                    // Assuming Operator Manager manages the inspection.
                    const opManagers = managers.filter(m => m.department?.name === 'Tổ VHTTBMĐ' || m.department?.dept_id === repair.created_department?.dept_id);
                     for (const manager of opManagers) {
                          const msg = `Biên bản kiểm nghiệm #${repair.repair_id} ("${repair.device?.name}") đã được Tổ trưởng duyệt và đang chờ Quản lý duyệt.`;
                          await this.notificationService.createForUser(manager, msg);
                          this.repairsGateway.sendToUser(manager.user_id, msg);
                     } 
                } else if (repair.status_inspection === 'inspection_lead_approved') {
                    if (user.role !== UserRole.UNIT_HEAD) throw new ForbiddenException('Chỉ Trưởng bộ phận mới được duyệt bước này');
                    repair.status_inspection = 'inspection_manager_approved';
                    repair.approved_by_manager_inspection = user;

                    // Notify Admin/Director
                    const admins = await this.userRepo.find({ where: [ { role: UserRole.ADMIN }, { role: UserRole.DIRECTOR } ] });
                    for (const admin of admins) {
                        const msg = `Biên bản kiểm nghiệm #${repair.repair_id} ("${repair.device?.name}") đã được Quản lý duyệt và đang chờ Ban Giám đốc phê duyệt.`;
                        await this.notificationService.createForUser(admin, msg);
                        this.repairsGateway.sendToUser(admin.user_id, msg);
                    }
                } else if (repair.status_inspection === 'inspection_manager_approved') {
                     if (![UserRole.ADMIN, UserRole.DIRECTOR].includes(user.role)) throw new ForbiddenException('Chỉ Ban Giám đốc mới được duyệt bước này');
                    repair.status_inspection = 'inspection_admin_approved';
                    repair.approved_by_admin_inspection = user;

                    // Handle Material Deduction
                    const pendingStockOuts = await this.stockOutRepo.find({
                        where: { repair: { repair_id: id } as any, status: StockOutStatus.PENDING },
                        relations: ['item'],
                    });

                    // 1. Validate all first
                    for (const so of pendingStockOuts) {
                        if (so.item) {
                            const currentItem = await this.itemRepo.findOne({ where: { item_id: so.item.item_id } });
                            if (!currentItem) throw new BadRequestException(`Không tìm thấy vật tư ${so.item.name}`);
                            if (currentItem.quantity < so.quantity) {
                                throw new BadRequestException(
                                    `Không đủ vật tư "${currentItem.name}". Tồn: ${currentItem.quantity}, Cần: ${so.quantity}`
                                );
                            }
                        }
                    }

                    // 2. Deduct and Approve
                    for (const so of pendingStockOuts) {
                        so.status = StockOutStatus.APPROVED;
                        so.approved_by = user;
                        so.occurred_at = new Date();
                        await this.stockOutRepo.save(so);

                        if (so.item) {
                            const currentItem = await this.itemRepo.findOne({ where: { item_id: so.item.item_id } });
                            if (currentItem) {
                                currentItem.quantity = Number((currentItem.quantity - so.quantity).toFixed(4));
                                await this.itemRepo.save(currentItem);
                            }
                        }
                    }

                    // Notify Technicians to proceed to Acceptance (B05)
                    const technicians = await this.userRepo.find({ where: { role: UserRole.TECHNICIAN } });
                    for (const tech of technicians) {
                         const msg = `Kiểm nghiệm #${repair.repair_id} ("${repair.device?.name}") đã hoàn tất. Vui lòng lập phiếu Nghiệm thu (B05).`;
                         await this.notificationService.createForUser(tech, msg);
                         this.repairsGateway.sendToUser(tech.user_id, msg);
                    }
                } else {
                     throw new BadRequestException('Trạng thái không hợp lệ để duyệt');
                }
            } else {
                repair.status_inspection = 'REJECTED_B04';
                // Note: We do NOT cancel the whole ticket if logic demands preserving B03. 
                // But typically "rejection" implies stopping flow. 
                // However, user requirement: "B03 remain Completed". 
                // So we do NOT set repair.canceled = true globally if we want to separate statuses.
                // But standard logic for "canceled" usually means "stop everything". 
                // Let's set canceled = true but status_request remains COMPLETED. This works.
                repair.canceled = true; 
                repair.canceled_at = new Date();
                repair.rejection_reason = dto.reason;
                repair.rejected_by = user;
            }
        }

        // --- B05 ACCEPTANCE FLOW ---
        if (phase === 'acceptance') {
             if (repair.status_inspection !== 'inspection_admin_approved') throw new BadRequestException('Kiểm nghiệm chưa hoàn tất');
             if (repair.status_acceptance === 'REJECTED_B05') throw new BadRequestException('Nghiệm thu đã bị từ chối');
             if (repair.status_acceptance === 'acceptance_admin_approved') throw new BadRequestException('Nghiệm thu đã hoàn tất');

             if (dto.action === 'approve') {
                if (repair.status_acceptance === 'acceptance_pending') {
                    // Strict check: Only Team Lead (Removed Dept check to match frontend)
                    if (user.role !== UserRole.TEAM_LEAD) {
                        throw new ForbiddenException('Chỉ Tổ trưởng mới thực hiện ký duyệt mục này.');
                    }
                    
                    repair.status_acceptance = 'acceptance_lead_approved';
                    repair.approved_by_operator_lead_acceptance = user;
                    repair.acceptance_approved_at = new Date();

                    // Notify Unit Head
                    const managers = await this.userRepo.find({ where: { role: UserRole.UNIT_HEAD }, relations: ['department'] });
                    const opManagers = managers.filter(m => m.department?.name === 'Tổ VHTTBMĐ' || m.department?.dept_id === repair.created_department?.dept_id);
                     for (const manager of opManagers) {
                          const msg = `Phiếu nghiệm thu #${repair.repair_id} ("${repair.device?.name}") đã được Tổ trưởng duyệt và đang chờ Quản lý duyệt.`;
                          await this.notificationService.createForUser(manager, msg);
                          this.repairsGateway.sendToUser(manager.user_id, msg);
                     }
                } else if (repair.status_acceptance === 'acceptance_lead_approved') {
                    if (user.role !== UserRole.UNIT_HEAD) throw new ForbiddenException('Chỉ Trưởng bộ phận mới được duyệt bước này');
                    repair.status_acceptance = 'acceptance_manager_approved';
                    repair.approved_by_manager_acceptance = user;

                    // Notify Admin/Director
                    const admins = await this.userRepo.find({ where: [ { role: UserRole.ADMIN }, { role: UserRole.DIRECTOR } ] });
                    for (const admin of admins) {
                        const msg = `Phiếu nghiệm thu #${repair.repair_id} ("${repair.device?.name}") đã được Quản lý duyệt và đang chờ Ban Giám đốc phê duyệt.`;
                        await this.notificationService.createForUser(admin, msg);
                        this.repairsGateway.sendToUser(admin.user_id, msg);
                    }
                } else if (repair.status_acceptance === 'acceptance_manager_approved') {
                    if (![UserRole.ADMIN, UserRole.DIRECTOR].includes(user.role)) throw new ForbiddenException('Chỉ Ban Giám đốc mới được duyệt bước này');
                    repair.status_acceptance = 'acceptance_admin_approved';
                    repair.approved_by_admin_acceptance = user;
                    
                    // Final Success Notification?
                    if (repair.created_by) {
                         const msg = `Phiếu nghiệm thu #${repair.repair_id} ("${repair.device?.name}") đã được Ban Giám đốc duyệt hoàn tất.`;
                         await this.notificationService.createForUser(repair.created_by, msg);
                         this.repairsGateway.sendToUser(repair.created_by.user_id, msg);
                    }

                    // Notify Technicians of completion
                    const technicians = await this.userRepo.find({ where: { role: UserRole.TECHNICIAN } });
                    for (const tech of technicians) {
                         const msg = `Quy trình sửa chữa #${repair.repair_id} ("${repair.device?.name}") đã hoàn tất.`;
                         await this.notificationService.createForUser(tech, msg);
                         this.repairsGateway.sendToUser(tech.user_id, msg);
                    }

                    if (repair.device) {
                        repair.device.status = DeviceStatus.DANG_SU_DUNG;
                        await this.deviceRepo.save(repair.device);
                    }
                } else {
                     throw new BadRequestException('Trạng thái không hợp lệ để duyệt');
                }
             } else {
                repair.status_acceptance = 'REJECTED_B05';
                repair.canceled = true;
                repair.canceled_at = new Date();
                repair.rejection_reason = dto.reason;
                repair.rejected_by = user;
             }
        }

        const saved = await this.repairRepo.save(repair);
        this.repairsGateway.notifyRepairUpdate();
        return saved;
    }

    async requestLimitedUse(id: number, userId: number, reason: string) {
        const repair = await this.repairRepo.findOne({ where: { repair_id: id } });
        if (!repair) throw new NotFoundException('Không tìm thấy phiếu');
        
        repair.limited_use_status = 'PENDING';
        // Suggestion: store reason in a new field or reuse rejection_reason/note? 
        // For strictness, maybe add `limited_use_reason` to entity? 
        // For now, let's append to note or ignore if column not added. 
        // "limited_use_status" was added. "rejection_reason" was added. 
        // Let's assume reason is logged or add a column if needed. 
        // But plan only said "Add limited_limited_use_status".
        // Use note field for now if not strictly required schema change.
        if (reason) repair.note = (repair.note || '') + `\n[Yêu cầu sử dụng hạn chế]: ${reason}`;
        
        return this.repairRepo.save(repair);
    }

    async reviewLimitedUse(id: number, userId: number, action: 'approve' | 'reject') {
        const repair = await this.repairRepo.findOne({ where: { repair_id: id }, relations: ['device'] });
        if (!repair) throw new NotFoundException('Không tìm thấy phiếu');
        const user = await this.userRepo.findOne({ where: { user_id: userId } });
        
        if (![UserRole.UNIT_HEAD, UserRole.DIRECTOR, UserRole.ADMIN].includes(user.role)) {
            throw new ForbiddenException('Bạn không có quyền duyệt yêu cầu sử dụng hạn chế');
        }

        if (action === 'approve') {
            repair.limited_use_status = 'APPROVED';
            if (repair.device) {
                repair.device.status = DeviceStatus.SU_DUNG_HAN_CHE;
                await this.deviceRepo.save(repair.device);
            }
        } else {
            repair.limited_use_status = 'REJECTED';
        }
        return this.repairRepo.save(repair);
    }

    async findAll(user: any, filters?: { status_request?: string; status_inspection?: string; device_id?: number }) {
        const query = this.repairRepo.createQueryBuilder('repair')
            .leftJoinAndSelect('repair.device', 'device')
            .leftJoinAndSelect('repair.created_by', 'created_by')
            .leftJoinAndSelect('repair.created_department', 'created_department')
            .leftJoinAndSelect('repair.approved_by_manager_request', 'approved_by_manager_request')
            .leftJoinAndSelect('repair.approved_by_admin_request', 'approved_by_admin_request')
            .leftJoinAndSelect('repair.approved_by_manager_inspection', 'approved_by_manager_inspection')
            .leftJoinAndSelect('repair.approved_by_admin_inspection', 'approved_by_admin_inspection')
            .leftJoinAndSelect('repair.approved_by_manager_acceptance', 'approved_by_manager_acceptance')
            .leftJoinAndSelect('repair.approved_by_admin_acceptance', 'approved_by_admin_acceptance')
            .leftJoinAndSelect('repair.inspection_committee', 'inspection_committee')
            .leftJoinAndSelect('repair.acceptance_committee', 'acceptance_committee')
            .leftJoinAndSelect('repair.stock_outs', 'stock_out')
            .leftJoinAndSelect('stock_out.item', 'item')
            .leftJoinAndSelect('item.category', 'category')
            .leftJoinAndSelect('stock_out.requested_by', 'requested_by')
            .leftJoinAndSelect('stock_out.approved_by', 'stock_approved_by')
            .leftJoinAndSelect('repair.rejected_by', 'rejected_by')
            .orderBy('repair.created_at', 'DESC');


        
        // --- PRE-FETCH HIERARCHY FOR UNIT_HEAD ---
        let permittedDeptIds: number[] = [];
        let isUnitHeadFilter = false;

        if (user && user.role === UserRole.UNIT_HEAD) {
            isUnitHeadFilter = true;
            // 1. Fetch user's department with children
            if (user.department) {
                const userDept = await this.departmentRepo.findOne({
                     where: { dept_id: user.department.dept_id },
                     relations: ['children'] // Load direct children
                });
                if (userDept) {
                    permittedDeptIds.push(userDept.dept_id);
                    if (userDept.children) {
                        permittedDeptIds.push(...userDept.children.map(c => c.dept_id));
                    }
                }
            }

            // 2. Fetch departments where user is Manager
            const managedDepts = await this.departmentRepo.find({ 
                where: { manager_id: user.user_id },
                relations: ['children'] // Also load children of managed departments
            });
            
            managedDepts.forEach(d => {
                permittedDeptIds.push(d.dept_id);
                if (d.children) {
                    permittedDeptIds.push(...d.children.map(c => c.dept_id));
                }
            });
        }
        
        // Apply Filters
        if (isUnitHeadFilter) {
             if (permittedDeptIds.length > 0) {
                 query.andWhere('created_department.dept_id IN (:...permittedDeptIds)', { permittedDeptIds });
             } else {
                 // Fallback if no department found (shouldn't happen for valid users)
                 query.andWhere('1=0'); 
             }
        } else if (user && user.role === UserRole.OPERATOR) {
              // ... existing operator logic ...
              // Re-implementing simplified Operator logic here to fit flow
             const userGroups = await this.userDeviceGroupRepo.find({ 
                 where: { user_id: user.user_id },
                 select: ['group_id']
             });
             const groupIds = userGroups.map(ug => ug.group_id);
             if (groupIds.length === 0) return [];
             query.andWhere('device.group_id IN (:...groupIds)', { groupIds });
        }

        if (filters?.device_id) {
            query.andWhere('device.device_id = :deviceId', { deviceId: filters.device_id });
        }
        if (filters?.status_request) {
            if (filters.status_request === 'CANCELED') {
                query.andWhere('repair.canceled = :isCanceled', { isCanceled: true });
            } else if (filters.status_request === 'REJECTED') {
                 // Comprehensive check for any rejection status
                 query.andWhere(new Brackets(qb => {
                     qb.where('repair.status_request IN (:...reqRejs)', { reqRejs: ['REJECTED', 'REJECTED_B03'] })
                       .orWhere('repair.status_inspection IN (:...inspRejs)', { inspRejs: ['REJECTED_B04', 'inspection_rejected'] })
                       .orWhere('repair.status_acceptance IN (:...accRejs)', { accRejs: ['REJECTED_B05', 'acceptance_rejected'] });
                 }));
            } else {
                query.andWhere('repair.status_request = :statusRequest', { statusRequest: filters.status_request });
            }
        }
        if (filters?.status_inspection) {
            query.andWhere('repair.status_inspection = :statusInspection', { statusInspection: filters.status_inspection });
        }

        const repairs = await query.getMany();

        // 🚀 Optimization: Batch fetch items for inspection_materials to avoid N+1
        const allItemIds = new Set<number>();
        repairs.forEach(r => {
            if (Array.isArray(r.inspection_materials)) {
                r.inspection_materials.forEach(m => {
                    if (m.item_id && !m.is_new) allItemIds.add(m.item_id);
                });
            }
        });

        const itemsMap = new Map<number, Item>();
        if (allItemIds.size > 0) {
            const items = await this.itemRepo.findByIds(Array.from(allItemIds));
            items.forEach(i => itemsMap.set(i.item_id, i));
        }

        // Enrich data in memory
        repairs.forEach(r => {
            if (Array.isArray(r.inspection_materials)) {
                r.inspection_materials = r.inspection_materials.map(m => {
                    if (m.item_id && !m.is_new && itemsMap.has(m.item_id)) {
                        const item = itemsMap.get(m.item_id)!;
                        return {
                            ...m,
                            item_name: item.name,
                            unit: item.quantity_unit,
                            category_name: item.category?.name,
                            item_code: item.code,
                        };
                    }
                    return m;
                });
            }
        });

        return repairs;
    }

    async findOne(id: number) {
        const repair = await this.repairRepo.findOne({
            where: { repair_id: id },
            relations: [
                'device',
                'created_by',
                'created_department',
                'approved_by_manager_request',
                'approved_by_admin_request',
                'approved_by_tech_request',
                'approved_by_manager_inspection',
                'approved_by_admin_inspection',
                'approved_by_manager_acceptance',
                'approved_by_admin_acceptance',
                'inspection_committee',
                'acceptance_committee',
            ],
        });
        if (!repair) throw new NotFoundException('Không tìm thấy phiếu');
        const stockOuts = await this.stockOutRepo.find({
            where: { repair: { repair_id: id } as any },
            relations: ['item', 'item.category', 'requested_by', 'approved_by'],
        });
        repair.stock_outs = stockOuts;

        // 🚀 Optimized: Batch fetch items for inspection_materials
        if (repair.inspection_materials && Array.isArray(repair.inspection_materials)) {
            const itemIds = new Set<number>();
            repair.inspection_materials.forEach(m => {
                if (m.item_id && !m.is_new) itemIds.add(m.item_id);
            });

            if (itemIds.size > 0) {
                const items = await this.itemRepo.find({
                    where: { item_id: In(Array.from(itemIds)) } as any,
                    relations: ['category'],
                });
                const itemsMap = new Map(items.map(i => [i.item_id, i]));

                repair.inspection_materials = repair.inspection_materials.map(m => {
                    if (m.item_id && !m.is_new && itemsMap.has(m.item_id)) {
                        const item = itemsMap.get(m.item_id)!;
                        return {
                            ...m,
                            item_name: item.name,
                            unit: item.quantity_unit,
                            category_name: item.category?.name,
                            item_code: item.code,
                        };
                    }
                    return m;
                }) as any;
            }
        }

        return repair;
    }

    async findByDevice(deviceId: number, options?: { page: number; limit: number }) {
        const page = options?.page || 1;
        const limit = options?.limit || 10;
        const skip = (page - 1) * limit;

        const [repairs, total] = await this.repairRepo.findAndCount({
            where: { device: { device_id: deviceId } },
            relations: [
                'device',
                'created_by',
                'created_department',
                'approved_by_manager_request',
                'approved_by_admin_request',
                'approved_by_manager_inspection',
                'approved_by_admin_inspection',
                'approved_by_manager_acceptance',
                'approved_by_admin_acceptance',
                'inspection_committee',
                'acceptance_committee',
            ],
            order: { created_at: 'DESC' },
        });

        // Collect all Repair IDs to fetch StockOuts in batch if possible, or keep loop if StockOuts are few.
        // The original code looped StockOuts. We can optimize that too, but let's stick to the N+1 Items fix first as requested.
        // Actually, let's just fix the Items N+1 inside the loop.

        // 1. Collect ALL Item IDs from ALL repairs
        const allItemIds = new Set<number>();
        repairs.forEach(r => {
            if (r.inspection_materials && Array.isArray(r.inspection_materials)) {
                r.inspection_materials.forEach(m => {
                    if (m.item_id && !m.is_new) allItemIds.add(m.item_id);
                });
            }
        });

        // 2. Fetch all unique Items
        let itemsMap = new Map<number, Item>();
        if (allItemIds.size > 0) {
            const items = await this.itemRepo.find({
                where: { item_id: In(Array.from(allItemIds)) } as any,
                relations: ['category'],
            });
            itemsMap = new Map(items.map(i => [i.item_id, i]));
        }

        // 3. Loop and enrich (and fetch StockOuts - kept inside loop for now as it's typically few per device history, but could be optimized later)
        for (const r of repairs) {
            const stockOuts = await this.stockOutRepo.find({
                where: { repair: { repair_id: r.repair_id } as any },
                relations: ['item', 'item.category', 'requested_by', 'approved_by'],
            });
            r.stock_outs = stockOuts;

            if (r.inspection_materials && Array.isArray(r.inspection_materials)) {
                r.inspection_materials = r.inspection_materials.map(m => {
                    if (m.item_id && !m.is_new && itemsMap.has(m.item_id)) {
                        const item = itemsMap.get(m.item_id)!;
                        return {
                            ...m,
                            item_name: item.name,
                            unit: item.quantity_unit,
                            category_name: item.category?.name,
                            item_code: item.code,
                        };
                    }
                    return m;
                }) as any;
            }
        }

        return { data: repairs, total };
    }

    async remove(id: number) {
        const repair = await this.repairRepo.findOne({
            where: { repair_id: id },
            relations: [
                'approved_by_manager_request',
                'approved_by_admin_request',
                'approved_by_manager_inspection',
                'approved_by_admin_inspection',
                'approved_by_manager_acceptance',
                'approved_by_admin_acceptance',
            ],
        });

        if (!repair) throw new NotFoundException('Không tìm thấy phiếu');

        const hasAnyApproval =
            repair.approved_by_manager_request ||
            repair.approved_by_admin_request ||
            repair.approved_by_manager_inspection ||
            repair.approved_by_admin_inspection ||
            repair.approved_by_manager_acceptance ||
            repair.approved_by_admin_acceptance;

        if (hasAnyApproval) {
            throw new BadRequestException('Không thể xóa phiếu đã được phê duyệt. Chỉ có thể xóa phiếu chưa có bất kỳ phê duyệt nào.');
        }

        const stockOuts = await this.stockOutRepo.find({
            where: { repair: { repair_id: id } as any },
        });
        if (stockOuts.length > 0) {
            await this.stockOutRepo.remove(stockOuts);
        }

        const result = await this.repairRepo.delete(id);
        this.repairsGateway.notifyRepairUpdate();
        if (!result.affected) throw new NotFoundException('Không tìm thấy phiếu');
    }

    async exportWord(id: number, type: 'request' | 'inspection' | 'acceptance', res: Response) {
        const repair = await this.findOne(id);

        let children: (Paragraph | Table)[] = [];

        if (type === 'request') children = this.exportRequestUI(repair);
        if (type === 'inspection') children = this.exportInspectionUI(repair);
        if (type === 'acceptance') children = this.exportAcceptanceUI(repair);

        const doc = new Document({
            sections: [
                {
                    properties: {
                        page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
                    },

                    // Header bạn đã có, giữ nguyên (ví dụ)
                    headers: {
                        default: new Header({
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.RIGHT,
                                    spacing: { after: 300 },
                                    children: [
                                        new TextRun({
                                            text: 'Biểu mẫu: B03.OT08/VCS-KT',
                                            italics: true,
                                            size: 20,
                                        }),
                                    ],
                                }),
                            ],
                        }),
                    },

                    // 👇 FOOTER MỚI – giống hình bạn gửi
                    footers: {
                        default: new Footer({
                            children: [
                                new Table({
                                    width: { size: 100, type: WidthType.PERCENTAGE },
                                    columnWidths: [3000, 5000, 1000],
                                    borders: {
                                        top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },   // đường gạch trên
                                        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                    },
                                    rows: [
                                        new TableRow({
                                            children: [
                                                // Cột trái: mã biểu mẫu
                                                new TableCell({
                                                    children: [
                                                        new Paragraph({
                                                            alignment: AlignmentType.LEFT,
                                                            children: [
                                                                new TextRun({
                                                                    text: 'B03.QT08/VCS-KT',
                                                                    italics: true,
                                                                    size: 20,
                                                                }),
                                                            ],
                                                        }),
                                                    ],
                                                }),


                                                new TableCell({
                                                    children: [
                                                        new Paragraph({
                                                            alignment: AlignmentType.CENTER,
                                                            children: [
                                                                new TextRun({
                                                                    text: 'Lần ban hành/sửa đổi: 01/00',
                                                                    italics: true,
                                                                    size: 20,
                                                                }),
                                                            ],
                                                        }),
                                                    ],
                                                }),


                                                new TableCell({
                                                    children: [
                                                        new Paragraph({
                                                            alignment: AlignmentType.RIGHT,
                                                            children: [
                                                                new TextRun({
                                                                    text: '1/1',
                                                                    italics: true,
                                                                    size: 20,
                                                                }),
                                                            ],
                                                        }),
                                                    ],
                                                }),
                                            ],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                    },

                    children,
                },
            ],
        });



        const buffer = await Packer.toBuffer(doc);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename=${type}_repair_${id}.docx`);
        res.send(buffer);
    }

    private exportRequestUI(repair: any): (Paragraph | Table)[] {
        return [
            ...this.buildHeaderCommon('PHIẾU YÊU CẦU KIỂM TRA BẢO DƯỠNG - SỬA CHỮA', 26, repair.created_at),
            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 150 },
                indent: { left: 600 },
                children: [new TextRun({ text: 'Lý lịch thiết bị:', bold: true, size: 26 })],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 100 },
                indent: { left: 600 },
                children: [new TextRun({ text: `-  Tên thiết bị: ${repair.device?.name || ''}`, size: 26 })],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 100 },
                indent: { left: 600 },
                children: [new TextRun({ text: `-  Số đăng ký: ${repair.device?.serial_number || ''}`, size: 26 })],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 200 },
                indent: { left: 600 },
                children: [new TextRun({ text: `-  Đơn vị quản lý tài sản: ${repair.created_department?.name || ''}`, size: 26 })],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 150 },
                indent: { left: 600 },
                children: [new TextRun({ text: '1.   Mô tả sự cố hỏng hóc:', bold: true, size: 26 })],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 200, before: 150 },
                indent: { left: 1000 },
                children: [new TextRun({ text: repair.location_issue || '', size: 26 })],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 150 },
                indent: { left: 600 },
                children: [new TextRun({ text: '2.   Kiến nghị, biện pháp khắc phục:', bold: true, size: 26 })],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 250, before: 150 },
                indent: { left: 1000 },
                children: [new TextRun({ text: repair.recommendation || '', size: 26 })],
            }),

            ...this.buildFooterCommon(repair),
        ];
    }

    private buildHeaderCommon(title: string, titleSize = 26, date?: Date): (Paragraph | Table)[] {
        const d = date ? new Date(date) : new Date();
        const day = d.getDate() < 10 ? '0' + d.getDate() : d.getDate();
        const month = d.getMonth() + 1 < 10 ? '0' + (d.getMonth() + 1) : d.getMonth() + 1;
        const year = d.getFullYear();

        const noCell = {
            top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        };

        const noTable = {
            top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        };

        return [
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE, },
                borders: noTable,

                columnWidths: [4500, 4500],
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                borders: noCell,

                                children: [
                                    new Paragraph({

                                        alignment: AlignmentType.CENTER,
                                        spacing: { after: 120 },
                                        children: [new TextRun({ text: 'CẢNG HÀNG KHÔNG CÔN ĐẢO', bold: true, size: 26 })],
                                    }),
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        spacing: { after: 120 },
                                        children: [new TextRun({
                                            text: 'ĐỘI KỸ THUẬT', bold: true, underline: {},
                                            size: 26
                                        })],
                                    }),
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        spacing: { after: 120 },
                                        children: [new TextRun({ text: 'Số: ….. /PYC-ĐKT', italics: true, bold: false, size: 26 })],
                                    }),
                                ],
                            }),
                            new TableCell({
                                borders: noCell,
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        spacing: { after: 90 },
                                        children: [
                                            new TextRun({
                                                text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                                                bold: true,
                                                size: 26,
                                            }),
                                        ],
                                    }),
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        spacing: { after: 70 },
                                        children: [
                                            new TextRun({
                                                text: 'Độc lập – Tự do – Hạnh phúc',
                                                bold: true,
                                                size: 26,
                                                underline: {},

                                            }),
                                        ],
                                    }),
                                    new Paragraph({
                                        alignment: AlignmentType.RIGHT,
                                        spacing: { before: 250, after: 200 },
                                        children: [
                                            new TextRun({
                                                text: `Côn Đảo, ngày ${day} tháng ${month} năm ${year}`,
                                                size: 26,
                                                italics: true
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
            }),

            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 350, after: 250 },
                children: [
                    new TextRun({
                        text: title,
                        bold: true,
                        size: 26,
                    }),
                ],
            }),
        ];
    }

    private buildFooterCommon(repair: any): (Paragraph | Table)[] {
        const d = new Date();
        const day = d.getDate() < 10 ? '0' + d.getDate() : d.getDate();
        const month = d.getMonth() + 1 < 10 ? '0' + (d.getMonth() + 1) : d.getMonth() + 1;
        const year = d.getFullYear();

        const noCell = {
            top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        };

        const noTable = {
            top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        };

        return [
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 600, after: 600 },
                children: [
                    new TextRun({
                        text: `Côn Đảo, ngày ${day} tháng ${month} năm ${year}`,
                        size: 26,
                        italics: true

                    }),
                ],
            }),

            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: noTable,
                columnWidths: [2250, 2250, 2250, 2250],
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                borders: noCell,
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [new TextRun({ text: 'TỔ VHTTBMĐ', bold: true, size: 26 })],
                                    }),
                                ],
                            }),
                            new TableCell({
                                borders: noCell,
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [new TextRun({ text: 'TỔ KỸ THUẬT', bold: true, size: 26 })],
                                    }),
                                ],
                            }),
                            new TableCell({
                                borders: noCell,
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [new TextRun({ text: 'CÁN BỘ ĐỘI', bold: true, size: 26 })],
                                    }),
                                ],
                            }),
                            new TableCell({
                                borders: noCell,
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [new TextRun({ text: 'BAN GIÁM ĐỐC', bold: true, size: 26 })],
                                    }),
                                ],
                            }),
                        ],
                    }),
                    new TableRow({
                        height: { value: 800, rule: HeightRule.EXACT },
                        children: [
                            new TableCell({ borders: noCell, children: [new Paragraph('')] }),
                            new TableCell({ borders: noCell, children: [new Paragraph('')] }),
                            new TableCell({ borders: noCell, children: [new Paragraph('')] }),
                            new TableCell({ borders: noCell, children: [new Paragraph('')] }),
                        ],
                    }),
                    new TableRow({
                        children: [
                            new TableCell({
                                borders: noCell,
                                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: repair.created_by?.name || '', size: 26, })] })],
                            }),
                             new TableCell({
                                borders: noCell,
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [new TextRun({ text: repair.inspection_created_by?.name || '', size: 26, })],
                                    }),
                                ],
                            }),
                            new TableCell({
                                borders: noCell,
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [
                                            new TextRun({
                                                text:
                                                    repair.approved_by_manager_acceptance?.name ||
                                                    repair.approved_by_manager_inspection?.name ||
                                                    repair.approved_by_manager_request?.name ||
                                                    '', size: 26,
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                            new TableCell({
                                borders: noCell,
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [
                                            new TextRun({
                                                text:
                                                    repair.approved_by_admin_acceptance?.name ||
                                                    repair.approved_by_admin_inspection?.name ||
                                                    repair.approved_by_admin_request?.name ||
                                                    '',
                                                size: 26,
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
            }),
        ];
    }



    private exportInspectionUI(repair: any): (Paragraph | Table)[] {
        return [
            ...this.buildHeaderCommon('PHIẾU KIỂM NGHIỆM KỸ THUẬT', 30, repair.inspection_created_at || repair.created_at),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 150, after: 80 },
                indent: { left: 600 },
                children: [new TextRun({ text: 'I.  PHẦN TỔNG QUÁT:', bold: true, size: 26 })],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                indent: { left: 600 },
                children: [new TextRun({ text: '1.  Lý lịch thiết bị:', bold: true, size: 26 })],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 50 },
                indent: { left: 600 },

                children: [new TextRun({ text: `-   Tên thiết bị: ${repair.device?.name || ''}`, size: 26 })],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 50 },
                indent: { left: 600 },
                children: [new TextRun({ text: `-   Số đăng ký: ${repair.device?.serial_number || ''}`, size: 26 })],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 50 },
                indent: { left: 600 },
                children: [new TextRun({ text: `-   Đơn vị quản lý: Đội Kỹ Thuật`, size: 26 })],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 120 },
                indent: { left: 600 },
                children: [new TextRun({ text: '2.  Thành phần kiểm nghiệm:', bold: true, size: 26 })],
            }),

            ...(repair.inspection_committee && Array.isArray(repair.inspection_committee) && repair.inspection_committee.length > 0
                ? [
                    /* new Paragraph({
                         alignment: AlignmentType.LEFT,
                         spacing: { after: 12 },
                         indent: { left: 600 },
                         children: [new TextRun({ text: 'Thành phần Ban Kiểm nghiệm kỹ thuật:', bold: true, size: 26 })],
                     }),*/

                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        margins: { left: 600 },
                        columnWidths: [7000, 2000],
                        rows: [
                            ...repair.inspection_committee.map(
                                (member: any, idx: number) =>
                                    new TableRow({
                                        children: [
                                            new TableCell({
                                                borders: {
                                                    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                                    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                                    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                                    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                                },
                                                children: [
                                                    new Paragraph({
                                                        alignment: AlignmentType.LEFT,
                                                        spacing: { after: 6 },
                                                        children: [new TextRun({ text: `${idx + 1}. ${member.name || ''}`, size: 26 })],
                                                    }),
                                                ],
                                            }),
                                            new TableCell({
                                                borders: {
                                                    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                                    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                                    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                                    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                                },
                                                children: [
                                                    new Paragraph({
                                                        alignment: AlignmentType.LEFT,
                                                        spacing: { after: 6 },
                                                        children: [
                                                            new TextRun({ text: member.position ? `Chức vụ: ${member.position}` : '', size: 26 }),
                                                        ],
                                                    }),
                                                ],
                                            }),
                                        ],
                                    }),
                            ),
                        ],
                    }),
                ]
                : []),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 120 },
                indent: { left: 600 },
                children: [new TextRun({ text: '3.  Thời gian kiểm nghiệm:', bold: true, size: 26, })],
            }),
            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 50 },
                indent: { left: 600 },
                children: [
                    new TextRun({
                        text:
                            repair.inspection_duration_minutes !== null && repair.inspection_duration_minutes !== undefined
                                ? Math.floor(repair.inspection_duration_minutes / 60) > 0
                                    ? `${Math.floor(repair.inspection_duration_minutes / 60)} giờ ${repair.inspection_duration_minutes % 60} phút`
                                    : `${repair.inspection_duration_minutes} phút`
                                : '.....................................................................................................',
                        size: 26,
                    }),
                ],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 150, after: 100 },
                indent: { left: 600 },
                children: [new TextRun({ text: 'II.     NỘI DUNG KIỂM NGHIỆM:', bold: true, size: 26 })],
            }),

            new Table({
                width: { size: 90, type: WidthType.PERCENTAGE },
                alignment: AlignmentType.CENTER,
                columnWidths: [600, 2200, 1400, 1400, 1400],
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'STT', bold: true, size: 26 })] })],
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Mô tả hư hỏng', bold: true, size: 26 })] }),
                                ],
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [new TextRun({ text: 'Nguyên nhân hư hỏng', bold: true, size: 26 })],
                                    }),
                                ],
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [new TextRun({ text: 'Biện pháp sửa chữa', bold: true, size: 26 })],
                                    }),
                                ],
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [new TextRun({ text: 'Ghi chú', bold: true, size: 26 })],
                                    }),
                                ],
                            }),
                        ],
                    }),
                    ...(repair.inspection_items || []).map(
                        (it, i) =>
                            new TableRow({

                                children: [
                                    // Cột số thứ tự
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                alignment: AlignmentType.CENTER,
                                                children: [
                                                    new TextRun({
                                                        text: String(i + 1),
                                                        size: 26,
                                                        bold: true
                                                    })
                                                ]
                                            })
                                        ]
                                    }),

                                    // Cột mô tả hư hỏng
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                alignment: AlignmentType.LEFT,
                                                children: [
                                                    new TextRun({
                                                        text: it.description || '',
                                                        size: 26,
                                                        // bold: true, // nếu muốn
                                                    })
                                                ]
                                            })
                                        ]
                                    }),

                                    // Cột nguyên nhân
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                alignment: AlignmentType.LEFT,
                                                children: [
                                                    new TextRun({
                                                        text: it.cause || '',
                                                        size: 26,
                                                    })
                                                ]
                                            })
                                        ]
                                    }),

                                    // Cột biện pháp
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                alignment: AlignmentType.LEFT,
                                                children: [
                                                    new TextRun({
                                                        text: it.solution || '',
                                                        size: 26,
                                                    })
                                                ]
                                            })
                                        ]
                                    }),

                                    // Cột ghi chú
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                alignment: AlignmentType.LEFT,
                                                children: [
                                                    new TextRun({
                                                        text: it.notes || '',
                                                        size: 26,
                                                    })
                                                ]
                                            })
                                        ]
                                    }),
                                ]
                            }),
                    ),
                ],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 20, after: 150 },
                indent: { left: 600 },
                children: [new TextRun({ text: 'III.     PHẦN ĐỀ NGHỊ CUNG CẤP VẬT TƯ:', bold: true, size: 26 })],
            }),

            new Table({
                width: { size: 90, type: WidthType.PERCENTAGE },
                alignment: AlignmentType.CENTER,
                columnWidths: [600, 2500, 1500, 1200, 1200],
                margins: { left: 600 },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'STT', bold: true, size: 26 })] })],
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [new TextRun({ text: 'Tên vật tư, phụ tùng cần thay thế', bold: true, size: 26 })],
                                    }),
                                ],
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Quy cách, mã số', bold: true, size: 26 })] }),
                                ],
                            }),
                            new TableCell({
                                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Số lượng', bold: true, size: 26 })] })],
                            }),
                            new TableCell({
                                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Ghi chú', bold: true, size: 26 })] })],
                            }),
                        ],
                    }),
                    ...(repair.inspection_materials || []).map(
                        (m: any, i: number) =>
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                alignment: AlignmentType.CENTER,
                                                children: [
                                                    new TextRun({
                                                        text: String(i + 1),
                                                        size: 26,
                                                        bold: true
                                                    })
                                                ]
                                            })
                                        ]
                                    }),
                                    new TableCell({ children: [new Paragraph(m.item_name || m.name || '')] }),
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                children: [
                                                    new TextRun({ text: m.item_code ? String(m.item_code) : '', size: 26 }),
                                                    new TextRun({ text: m.category_name ? ` - ${m.category_name}` : '', size: 26 }),
                                                    new TextRun({ text: m.spec ? ` - ${m.spec}` : '', size: 26 }),
                                                ],
                                            }),
                                        ],
                                    }),
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                alignment: AlignmentType.CENTER,
                                                children: [
                                                    new TextRun({
                                                        text: m.quantity && m.unit ? `${m.quantity} (${m.unit})` : String(m.quantity || ''),
                                                    }),
                                                ],
                                            }),
                                        ],
                                    }),
                                    new TableCell({ children: [new Paragraph(m.notes || '')] }),
                                ],
                            }),
                    ),
                ],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 200, after: 150 },
                indent: { left: 600 },
                children: [new TextRun({ text: 'IV.  CÁC Ý KIẾN KHÁC:', bold: true, size: 26 })],
            }),

            new Paragraph({
                spacing: { after: 250 },
                indent: { left: 600 },
                children: [
                    new TextRun({
                        text:
                            repair.inspection_other_opinions ||
                            '.....................................................................................................',
                        size: 24,
                    }),
                ],
            }),

            ...this.buildFooterCommon(repair),
        ];
    }

    private exportAcceptanceUI(repair: any): (Paragraph | Table)[] {
        return [
            ...this.buildHeaderCommon('BIÊN BẢN NGHIỆM THU THỰC SỬA CHỮA - BẢO DƯỠNG', 30, repair.acceptance_created_at || repair.created_at),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 20, after: 8 },
                children: [
                    new TextRun({ text: `Căn cứ: Theo nội dung yêu cầu sửa chữa ${repair?.created_department?.name || ''}`, bold: true, size: 26 }),
                ],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 120, after: 60 },
                children: [new TextRun({ text: 'I. PHẦN TỔNG QUÁT:', bold: true, size: 26 })],
            }),

            new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: '1. Lý lịch thiết bị:', bold: true, size: 26 })] }),
            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 40 },
                children: [new TextRun({ text: `- Tên thiết bị: ${repair.device?.name || ''}`, size: 24 })],
            }),
            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 40 },
                children: [new TextRun({ text: `- Số đăng ký: ${repair.device?.serial_number || ''}`, size: 24 })],
            }),
            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 40 },
                children: [new TextRun({ text: `- Đơn vị quản lý: ${repair.created_department?.name || 'Đội Kỹ Thuật'}`, size: 24 })],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 20, after: 8 },
                children: [new TextRun({ text: '2. Thành phần nghiệm thu:', bold: true, size: 26 })],
            }),

            ...(repair.acceptance_committee && Array.isArray(repair.acceptance_committee) && repair.acceptance_committee.length > 0
                ? [
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        columnWidths: [7000, 2000],
                        rows: [
                            ...repair.acceptance_committee.map(
                                (member: any, idx: number) =>
                                    new TableRow({
                                        children: [
                                            new TableCell({
                                                borders: {
                                                    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                                    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                                    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                                    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                                },
                                                children: [
                                                    new Paragraph({
                                                        alignment: AlignmentType.LEFT,
                                                        spacing: { after: 4 },
                                                        children: [new TextRun({ text: `${idx + 1}. ${member.name || ''}`, size: 22 })],
                                                    }),
                                                ],
                                            }),
                                            new TableCell({
                                                borders: {
                                                    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                                    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                                    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                                    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                                },
                                                children: [
                                                    new Paragraph({
                                                        alignment: AlignmentType.LEFT,
                                                        spacing: { after: 4 },
                                                        children: [
                                                            new TextRun({ text: member.position ? `Chức vụ: ${member.position}` : '', size: 22 }),
                                                        ],
                                                    }),
                                                ],
                                            }),
                                        ],
                                    }),
                            ),
                        ],
                    }),
                ]
                : []),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 20 },
                children: [new TextRun({ text: '3. Thời gian nghiệm thu:', bold: true, size: 26 })],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 50 },
                children: [
                    new TextRun({
                        text:
                            repair.acceptance_duration_minutes !== null && repair.acceptance_duration_minutes !== undefined
                                ? Math.floor(repair.acceptance_duration_minutes / 60) > 0
                                    ? `${Math.floor(repair.acceptance_duration_minutes / 60)} giờ ${repair.acceptance_duration_minutes % 60} phút`
                                    : `${repair.acceptance_duration_minutes} phút`
                                : '.....................................................................................................',
                        size: 26,
                    }),
                ],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 20, after: 12 },
                children: [new TextRun({ text: 'II. NỘI DUNG NGHIỆM THU:', bold: true, size: 26 })],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 8 },
                children: [new TextRun({ text: '1. Mô tả sự cố hỏng hóc:', bold: true, size: 24 })],
            }),
            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 20 },
                children: [new TextRun({ text: repair.location_issue || '—', size: 24 })],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 8 },
                children: [new TextRun({ text: '2. Xác định nguyên nhân hỏng hóc:', bold: true, size: 24 })],
            }),
            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 20 },
                children: [new TextRun({ text: repair.failure_cause || '—', size: 24 })],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 10, after: 6 },
                children: [
                    new TextRun({
                        text: '3. Vật tư cần thay thế: (Ghi rõ chủng loại, số lượng vật tư, phụ tùng thay thế, kèm phiếu đề nghị vật tư)',
                        bold: true,
                        size: 24,
                    }),
                ],
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                rowSpan: 2,
                                verticalAlign: 'center',
                                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Stt', bold: true })] })],
                            }),
                            new TableCell({
                                columnSpan: 3,
                                children: [
                                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Vật tư thay thế', bold: true })] }),
                                ],
                            }),
                            new TableCell({
                                columnSpan: 2,
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [new TextRun({ text: 'Vật tư thu hồi\nRecovered Material', bold: true })],
                                    }),
                                ],
                            }),
                            new TableCell({
                                columnSpan: 2,
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [new TextRun({ text: 'Vật tư cần hủy\nMaterial to Disposal', bold: true })],
                                    }),
                                ],
                            }),
                        ],
                    }),
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tên', bold: true })] })],
                            }),
                            new TableCell({
                                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ĐV', bold: true })] })],
                            }),
                            new TableCell({
                                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SL', bold: true })] })],
                            }),
                            new TableCell({
                                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SL', bold: true })] })],
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '% hư hỏng', bold: true })] }),
                                ],
                            }),
                            new TableCell({
                                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SL', bold: true })] })],
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '% hư hỏng', bold: true })] }),
                                ],
                            }),
                        ],
                    }),
                    ...(() => {
                        const rows: TableRow[] = [];
                        let rowIndex = 0;

                        if (repair.inspection_materials && repair.inspection_materials.length > 0) {
                            repair.inspection_materials.forEach((m: any) => {
                                rowIndex++;
                                rows.push(
                                    new TableRow({
                                        children: [
                                            new TableCell({
                                                children: [
                                                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(String(rowIndex))] }),
                                                ],
                                            }),
                                            new TableCell({
                                                children: [new Paragraph({ children: [new TextRun({ text: m.item_name || m.name || '' })] })],
                                            }),
                                            new TableCell({
                                                children: [
                                                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: m.unit || '' })] }),
                                                ],
                                            }),
                                            new TableCell({
                                                children: [
                                                    new Paragraph({
                                                        alignment: AlignmentType.CENTER,
                                                        children: [new TextRun(String(m.quantity || ''))],
                                                    }),
                                                ],
                                            }),
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun('')] })] }),
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun('')] })] }),
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun('')] })] }),
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun('')] })] }),
                                        ],
                                    }),
                                );
                            });
                        }

                        if (repair.recovered_materials && repair.recovered_materials.length > 0) {
                            repair.recovered_materials.forEach((m: any) => {
                                rowIndex++;
                                rows.push(
                                    new TableRow({
                                        children: [
                                            new TableCell({
                                                children: [
                                                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(String(rowIndex))] }),
                                                ],
                                            }),
                                            new TableCell({
                                                children: [new Paragraph({ children: [new TextRun({ text: m.item_name || m.name || '' })] })],
                                            }),
                                            new TableCell({
                                                children: [
                                                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: m.unit || '' })] }),
                                                ],
                                            }),
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun('')] })] }),
                                            new TableCell({
                                                children: [
                                                    new Paragraph({
                                                        alignment: AlignmentType.CENTER,
                                                        children: [new TextRun(String(m.quantity || ''))],
                                                    }),
                                                ],
                                            }),
                                            new TableCell({
                                                children: [
                                                    new Paragraph({
                                                        alignment: AlignmentType.CENTER,
                                                        children: [new TextRun(String(m.damage_percentage || ''))],
                                                    }),
                                                ],
                                            }),
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun('')] })] }),
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun('')] })] }),
                                        ],
                                    }),
                                );
                            });
                        }

                        if (repair.materials_to_scrap && repair.materials_to_scrap.length > 0) {
                            repair.materials_to_scrap.forEach((m: any) => {
                                rowIndex++;
                                rows.push(
                                    new TableRow({
                                        children: [
                                            new TableCell({
                                                children: [
                                                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(String(rowIndex))] }),
                                                ],
                                            }),
                                            new TableCell({
                                                children: [new Paragraph({ children: [new TextRun({ text: m.item_name || m.name || '' })] })],
                                            }),
                                            new TableCell({
                                                children: [
                                                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: m.unit || '' })] }),
                                                ],
                                            }),
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun('')] })] }),
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun('')] })] }),
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun('')] })] }),
                                            new TableCell({
                                                children: [
                                                    new Paragraph({
                                                        alignment: AlignmentType.CENTER,
                                                        children: [new TextRun(String(m.quantity || ''))],
                                                    }),
                                                ],
                                            }),
                                            new TableCell({
                                                children: [
                                                    new Paragraph({
                                                        alignment: AlignmentType.CENTER,
                                                        children: [new TextRun(String(m.damage_percentage || ''))],
                                                    }),
                                                ],
                                            }),
                                        ],
                                    }),
                                );
                            });
                        }

                        return rows;
                    })(),
                ],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 20, after: 8 },
                children: [new TextRun({ text: 'III. KẾT LUẬN:', bold: true, size: 26 })],
            }),
            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 20 },
                children: [new TextRun({ text: repair.failure_description || '—', size: 24 })],
            }),

            new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 8, after: 16 },
                children: [new TextRun({ text: 'IV. CÁC Ý KIẾN KHÁC (nếu có):', bold: true, size: 26 })],
            }),
            new Paragraph({
                spacing: { after: 250 },
                children: [
                    new TextRun({
                        text:
                            repair.acceptance_other_opinions ||
                            '.....................................................................................................',
                        size: 24,
                    }),
                ],
            }),

            ...this.buildFooterCommon(repair),
        ];
    }

    async exportPdf(id: number, type: 'B03' | 'B04' | 'B05' | 'COMBINED', hideNames: boolean = false, hideDates: boolean = false) {
        const repair = await this.findOne(id);

        if (type === 'COMBINED') {
            const pdfsToMerge: Uint8Array[] = [];

            // Generate each PDF individually to ensure independent page numbering (1/N)
            // If hideNames/hideDates is true, propagate it.
            const pdfB03 = await this.generateSinglePdf(repair, 'B03', true, hideNames, hideDates);
            pdfsToMerge.push(pdfB03);

            const pdfB04 = await this.generateSinglePdf(repair, 'B04', true, hideNames, hideDates);
            pdfsToMerge.push(pdfB04);

            const pdfB05 = await this.generateSinglePdf(repair, 'B05', true, hideNames, hideDates);
            pdfsToMerge.push(pdfB05);

            // Merge them
            const mergedPdf = await PDFDocument.create();
            for (const pdfBuffer of pdfsToMerge) {
                const pdf = await PDFDocument.load(pdfBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            const buffer = await mergedPdf.save();
            return Buffer.from(buffer);
        } else {
            return this.generateSinglePdf(repair, type, false, hideNames, hideDates);
        }
    }

    private async generateSinglePdf(repair: Repair, type: 'B03' | 'B04' | 'B05', showSignature: boolean = false, hideNames: boolean = false, hideDates: boolean = false) {
        try {
            // embedFooter=false so we can use Puppeteer's native footer which supports dynamic page numbers
            const htmlContent = buildRepairPdfTemplate(repair, type, false, showSignature, hideNames, hideDates);

            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, 
            });

            const page = await browser.newPage();
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

            const formCode = type === 'B03' ? 'B03.QT08/VCS-KT' :
                type === 'B04' ? 'B04.QT08/VCS-KT' :
                    type === 'B05' ? 'B05.QT08/VCS-KT' : '';

            const footerHTML = `
            <div style="font-size: 10pt; font-family: 'Times New Roman', serif; width: 100%; border-top: 1px solid black; padding-top: 5px; margin-left: 2cm; margin-right: 2cm; display: flex; justify-content: space-between;">
                <div style="font-style: italic;">${formCode}</div>
                <div style="font-style: italic;">Lần ban hành/sửa đổi: 01/00</div>
                <div style="font-style: italic;">
                    <span class="pageNumber"></span>/<span class="totalPages"></span>
                </div>
            </div>
        `;

            const buffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                displayHeaderFooter: true,
                footerTemplate: footerHTML,
                headerTemplate: '<div style="font-size:10px; width:100%; text-align:center;"></div>',
                margin: {
                    top: '20px',
                    bottom: '50px',
                    left: '20px',
                    right: '20px',
                },
            });

            await browser.close();
            return buffer;
        } catch (error: any) {
            console.error(`Error generating PDF (${type}) for Repair #${repair.repair_id}:`, error);
            throw new InternalServerErrorException(`Lỗi khi tạo file PDF (${type}): ${error?.message || error}`);
        }
        }

    async countPendingActions(user: any): Promise<number> {
        // Use logic similar to findAll but optimized for counting only actionable items
        const query = this.repairRepo.createQueryBuilder('repair')
            .leftJoin('repair.created_by', 'created_by')
            .leftJoin('repair.created_department', 'created_department') // Needed for Unit Head dept check
            .leftJoin('repair.device', 'device') // Needed for Operator group check
            .where('repair.canceled = :canceled', { canceled: false });

        const role = user.role;

        if (role === UserRole.ADMIN) {
             // Admin sees all actions? Or specifically actions admin needs to take?
             // Usually Admin is fallback for everything. Let's count all pending.
             query.andWhere(new Brackets(qb => {
                 qb.where("repair.status_request NOT IN ('COMPLETED', 'REJECTED', 'REJECTED_B03')")
                   .orWhere("repair.status_inspection NOT IN ('inspection_admin_approved', 'inspection_rejected', 'REJECTED_B04') AND repair.status_request = 'COMPLETED'")
                   .orWhere("repair.status_acceptance NOT IN ('acceptance_admin_approved', 'acceptance_rejected', 'REJECTED_B05') AND repair.status_inspection = 'inspection_admin_approved'");
             }));
        } else if (role === UserRole.TECHNICIAN) {
             query.andWhere("repair.status_request = 'WAITING_TECH'");
             // Also include redos?
             query.orWhere("repair.status_request = 'REJECTED_B03' AND created_by.user_id = :uid", { uid: user.user_id });
             query.orWhere("repair.status_inspection = 'REJECTED_B04'"); 
             query.orWhere("repair.status_acceptance = 'REJECTED_B05'");
        } else if (role === UserRole.TEAM_LEAD) {
             query.andWhere(new Brackets(qb => {
                 qb.where("repair.status_request = 'WAITING_TEAM_LEAD'")
                   .orWhere("repair.status_inspection = 'inspection_pending' AND repair.inspection_created_at IS NOT NULL")
                   .orWhere("repair.status_acceptance = 'acceptance_pending' AND repair.acceptance_created_at IS NOT NULL");
             }));
        } else if (role === UserRole.UNIT_HEAD) {
             query.andWhere(new Brackets(qb => {
                 qb.where("repair.status_request = 'WAITING_MANAGER'")
                   .orWhere("repair.status_inspection = 'inspection_lead_approved'")
                   .orWhere("repair.status_acceptance = 'acceptance_lead_approved'");
             }));
        } else if (role === UserRole.DIRECTOR) {
             query.andWhere(new Brackets(qb => {
                 qb.where("repair.status_request = 'WAITING_DIRECTOR'")
                   .orWhere("repair.status_inspection = 'inspection_manager_approved'")
                   .orWhere("repair.status_acceptance = 'acceptance_manager_approved'");
             }));
        } else {
            return 0; // Viewer has no actions
        }

        return await query.getCount();
    }
}
