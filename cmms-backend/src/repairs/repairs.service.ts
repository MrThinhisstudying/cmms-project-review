import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Repair } from './entities/repair.entity';
import { Device } from 'src/devices/entities/device.entity';
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

@Injectable()
export class RepairsService {
    constructor(
        @InjectRepository(Repair) private readonly repairRepo: Repository<Repair>,
        @InjectRepository(Device) private readonly deviceRepo: Repository<Device>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        @InjectRepository(StockOut) private readonly stockOutRepo: Repository<StockOut>,
        @InjectRepository(Item) private readonly itemRepo: Repository<Item>,
        private readonly notificationService: NotificationService,
    ) { }

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
            status_request: 'pending',
            status_inspection: 'inspection_pending',
            status_acceptance: 'acceptance_pending',
            canceled: false,
        });
        const saved = await this.repairRepo.save(repair);
        const managers = await this.userRepo.find({ where: { role: 'manager' }, relations: ['department'] });
        const approverManagers = managers.filter(
            (m) => Array.isArray(m.department?.permissions) && m.department.permissions.includes('APPROVE_REPAIR'),
        );
        const admins = await this.userRepo.find({ where: { role: 'admin' } });

        for (const manager of approverManagers) {
            await this.notificationService.createForUser(
                manager,
                `Phòng ${creator.department?.name || ''} vừa lập phiếu sửa chữa thiết bị "${device.name}".`,
            );
        }

        for (const admin of admins) {
            await this.notificationService.createForUser(admin, `Có phiếu sửa chữa mới #${saved.repair_id} do ${creator.name} lập.`);
        }
        return saved;
    }

    async update(id: number, dto: CreateRepairDto) {
        const repair = await this.repairRepo.findOne({ where: { repair_id: id }, relations: ['device', 'created_by', 'created_department'] });
        if (!repair) throw new NotFoundException('Không tìm thấy phiếu');
        if (repair.canceled) throw new BadRequestException('Phiếu đã bị hủy');
        if (repair.status_inspection !== 'inspection_pending' || repair.status_acceptance !== 'acceptance_pending') {
            throw new BadRequestException('Phiếu đã chuyển sang bước tiếp theo, không được sửa nội dung yêu cầu');
        }
        if (repair.status_request !== 'pending') throw new BadRequestException('Chỉ phiếu trạng thái chờ duyệt mới được chỉnh sửa');
        const device = await this.deviceRepo.findOne({ where: { device_id: dto.device_id } });
        if (!device) throw new NotFoundException('Không tìm thấy thiết bị');
        if (![DeviceStatus.MOI, DeviceStatus.DANG_SU_DUNG].includes(device.status))
            throw new BadRequestException('Chỉ thiết bị mới hoặc đang sử dụng mới được lập phiếu');
        repair.device = device;
        repair.location_issue = dto.location_issue;
        repair.recommendation = dto.recommendation;
        repair.note = dto.note;
        return this.repairRepo.save(repair);
    }

    async updateInspection(id: number, dto: UpdateInspectionDto, userId: number) {
        const repair = await this.repairRepo.findOne({
            where: { repair_id: id },
            relations: ['inspection_committee'],
        });

        if (!repair) throw new NotFoundException('Không tìm thấy phiếu');
        if (repair.canceled) throw new BadRequestException('Phiếu đã bị hủy');
        if (repair.status_request !== 'admin_approved') throw new BadRequestException('Phiếu yêu cầu chưa được phê duyệt');

        if (repair.status_inspection === 'inspection_rejected') throw new BadRequestException('Kiểm nghiệm đã bị từ chối, không thể chỉnh sửa');

        if (['inspection_manager_approved', 'inspection_admin_approved'].includes(repair.status_inspection))
            throw new BadRequestException('Kiểm nghiệm đã được phê duyệt, không thể chỉnh sửa');

        if (repair.status_acceptance !== 'acceptance_pending')
            throw new BadRequestException('Phiếu đã chuyển sang nghiệm thu, không thể chỉnh sửa kiểm nghiệm');

        if (dto.inspection_materials) {
            dto.inspection_materials = dto.inspection_materials.map((m) => ({
                item_id: m.is_new ? null : m.item_id,
                item_name: m.is_new ? m.item_name : undefined,
                quantity: m.quantity,
                unit: m.unit || null,
                is_new: m.is_new,
                notes: m.notes || null,
            }));
        }

        repair.inspection_materials = dto.inspection_materials ?? repair.inspection_materials;

        if (!repair.inspection_created_at) {
            repair.inspection_created_at = new Date();
        }

        if (!repair.inspection_created_by) {
            repair.inspection_created_by = await this.userRepo.findOne({ where: { user_id: userId } });
        }

        repair.inspection_items = dto.inspection_items ?? repair.inspection_items;
        repair.inspection_other_opinions = dto.inspection_other_opinions ?? repair.inspection_other_opinions;

        if (dto.inspection_committee_ids && dto.inspection_committee_ids.length > 0) {
            const users = await this.userRepo.findByIds(dto.inspection_committee_ids);
            if (users.length !== dto.inspection_committee_ids.length) {
                throw new BadRequestException('Một hoặc nhiều người dùng không tồn tại');
            }
            repair.inspection_committee = users;
        }

        const savedRepair = await this.repairRepo.save(repair);

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

        return savedRepair;
    }

    async updateAcceptance(id: number, dto: UpdateAcceptanceDto, userId: number) {
        const repair = await this.repairRepo.findOne({
            where: { repair_id: id },
            relations: ['acceptance_committee'],
        });
        if (!repair) throw new NotFoundException('Không tìm thấy phiếu');
        if (repair.canceled) throw new BadRequestException('Phiếu đã bị hủy');
        if (repair.status_inspection !== 'inspection_admin_approved') throw new BadRequestException('Kiểm nghiệm chưa hoàn tất');
        if (['acceptance_manager_approved', 'acceptance_admin_approved', 'acceptance_rejected'].includes(repair.status_acceptance)) {
            throw new BadRequestException('Nghiệm thu đã được phê duyệt hoặc bị từ chối, không thể chỉnh sửa');
        }
        repair.acceptance_note = dto.acceptance_note ?? repair.acceptance_note;

        if (!repair.acceptance_created_at) {
            repair.acceptance_created_at = new Date();
        }

        if (!repair.acceptance_created_by) {
            repair.acceptance_created_by = await this.userRepo.findOne({ where: { user_id: userId } });
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
            repair.acceptance_committee = users;
        }

        return this.repairRepo.save(repair);
    }

    async reviewPhase(id: number, userId: number, dto: ReviewRepairDto, phase: 'request' | 'inspection' | 'acceptance') {
        const repair = await this.repairRepo.findOne({
            where: { repair_id: id },
            relations: [
                'created_department',
                'device',
                'approved_by_manager_request',
                'approved_by_admin_request',
                'approved_by_manager_inspection',
                'approved_by_admin_inspection',
                'approved_by_manager_acceptance',
                'approved_by_admin_acceptance',
            ],
        });
        if (!repair) throw new NotFoundException('Không tìm thấy phiếu');
        if (repair.canceled) throw new BadRequestException('Phiếu đã bị hủy');
        const user = await this.userRepo.findOne({ where: { user_id: userId }, relations: ['department'] });
        if (!user) throw new NotFoundException('Không tìm thấy người dùng');

        if (phase === 'request') {
            if (repair.status_inspection !== 'inspection_pending' || repair.status_acceptance !== 'acceptance_pending') {
                throw new BadRequestException('Phiếu đã chuyển sang bước kiểm nghiệm hoặc nghiệm thu, không thể thay đổi phê duyệt yêu cầu');
            }
            if (repair.status_request === 'rejected') throw new BadRequestException('Phiếu đã bị từ chối');
            if (repair.status_request === 'admin_approved') {
                throw new BadRequestException('Phiếu yêu cầu đã được duyệt xong, không thể thao tác lại');
            }
            if (dto.action === 'approve') {
                if (user.role === 'manager' && repair.status_request === 'pending') {
                    repair.status_request = 'manager_approved';
                    repair.approved_by_manager_request = user;
                    const admins = await this.userRepo.find({ where: { role: 'admin' } });
                    if (repair.created_by) {
                        await this.notificationService.createForUser(
                            repair.created_by,
                            `Phiếu sửa chữa #${repair.repair_id} đã được Trưởng bộ phận phê duyệt.`,
                        );
                    }
                    for (const admin of admins) {
                        await this.notificationService.createForUser(
                            admin,
                            `Phiếu sửa chữa #${repair.repair_id} đang chờ bạn phê duyệt (đã qua Manager).`,
                        );
                    }
                } else if (user.role === 'admin' && repair.status_request === 'manager_approved') {
                    repair.status_request = 'admin_approved';
                    repair.approved_by_admin_request = user;
                    const managers = await this.userRepo.find({ where: { role: 'manager' }, relations: ['department'] });
                    const approverManagers = managers.filter(
                        (m) => Array.isArray(m.department?.permissions) && m.department.permissions.includes('APPROVE_REPAIR'),
                    );
                    if (repair.created_by) {
                        await this.notificationService.createForUser(
                            repair.created_by,
                            `Phiếu sửa chữa #${repair.repair_id} đã được phê duyệt hoàn tất bước yêu cầu.`,
                        );
                    }
                    for (const manager of approverManagers) {
                        await this.notificationService.createForUser(
                            manager,
                            `Phiếu sửa chữa #${repair.repair_id} đã được Admin phê duyệt bước yêu cầu.`,
                        );
                    }
                } else {
                    throw new ForbiddenException('Không có quyền duyệt ở bước này');
                }
            } else {
                if (!['pending', 'manager_approved'].includes(repair.status_request)) {
                    throw new BadRequestException('Không thể từ chối phiếu yêu cầu đã duyệt xong hoặc đã chuyển bước');
                }
                repair.status_request = 'rejected';
                repair.canceled = true;
                repair.canceled_at = new Date();
            }
        }

        if (phase === 'inspection') {
            if (repair.status_request !== 'admin_approved') throw new BadRequestException('Phiếu yêu cầu chưa được phê duyệt');
            if (repair.status_acceptance !== 'acceptance_pending') {
                throw new BadRequestException('Phiếu đã chuyển sang nghiệm thu, không thể thay đổi phê duyệt kiểm nghiệm');
            }
            if (['inspection_rejected'].includes(repair.status_inspection)) throw new BadRequestException('Kiểm nghiệm đã bị từ chối');
            if (repair.status_inspection === 'inspection_admin_approved') {
                throw new BadRequestException('Kiểm nghiệm đã được phê duyệt xong, không thể thao tác lại');
            }
            if (dto.action === 'approve') {
                if (user.role === 'manager' && repair.status_inspection === 'inspection_pending') {
                    repair.status_inspection = 'inspection_manager_approved';
                    repair.approved_by_manager_inspection = user;

                    repair.inspection_approved_at = new Date();
                    if (repair.inspection_created_at) {
                        const durationMs = repair.inspection_approved_at.getTime() - repair.inspection_created_at.getTime();
                        repair.inspection_duration_minutes = Math.floor(durationMs / (1000 * 60));
                    }

                    const admins = await this.userRepo.find({ where: { role: 'admin' } });
                    if (repair.created_by) {
                        await this.notificationService.createForUser(
                            repair.created_by,
                            `Phiếu sửa chữa #${repair.repair_id} đã được Trưởng bộ phận phê duyệt bước kiểm nghiệm.`,
                        );
                    }
                    for (const admin of admins) {
                        await this.notificationService.createForUser(
                            admin,
                            `Phiếu sửa chữa #${repair.repair_id} đang chờ bạn phê duyệt bước kiểm nghiệm (đã qua Manager).`,
                        );
                    }
                } else if (user.role === 'admin' && repair.status_inspection === 'inspection_manager_approved') {
                    repair.status_inspection = 'inspection_admin_approved';
                    repair.approved_by_admin_inspection = user;
                    const managers = await this.userRepo.find({ where: { role: 'manager' }, relations: ['department'] });
                    const approverManagers = managers.filter(
                        (m) => Array.isArray(m.department?.permissions) && m.department.permissions.includes('APPROVE_REPAIR'),
                    );
                    if (repair.created_by) {
                        await this.notificationService.createForUser(
                            repair.created_by,
                            `Phiếu sửa chữa #${repair.repair_id} đã được phê duyệt hoàn tất bước kiểm nghiệm.`,
                        );
                    }
                    for (const manager of approverManagers) {
                        await this.notificationService.createForUser(
                            manager,
                            `Phiếu sửa chữa #${repair.repair_id} đã được Admin phê duyệt bước kiểm nghiệm.`,
                        );
                    }

                    const pendingStockOuts = await this.stockOutRepo.find({
                        where: { repair: { repair_id: id } as any, status: StockOutStatus.PENDING },
                        relations: ['item'],
                    });

                    for (const so of pendingStockOuts) {
                        if (so.item) {
                            const currentItem = await this.itemRepo.findOne({ where: { item_id: so.item.item_id } });
                            if (!currentItem) {
                                throw new BadRequestException(`Không tìm thấy vật tư ${so.item.name} trong kho`);
                            }
                            if (currentItem.quantity < so.quantity) {
                                throw new BadRequestException(
                                    `Không đủ số lượng vật tư "${currentItem.name}". Tồn kho: ${currentItem.quantity} ${currentItem.quantity_unit || ''
                                    }, yêu cầu: ${so.quantity} ${currentItem.quantity_unit || ''}`,
                                );
                            }
                        }
                    }

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
                } else {
                    throw new ForbiddenException('Không có quyền duyệt ở bước này');
                }
            } else {
                if (!['inspection_pending', 'inspection_manager_approved'].includes(repair.status_inspection)) {
                    throw new BadRequestException('Không thể từ chối kiểm nghiệm đã duyệt xong hoặc đã chuyển bước');
                }
                repair.status_inspection = 'inspection_rejected';
                repair.canceled = true;
                repair.canceled_at = new Date();
            }
        }

        if (phase === 'acceptance') {
            if (repair.status_inspection !== 'inspection_admin_approved') throw new BadRequestException('Kiểm nghiệm chưa được phê duyệt');
            if (['acceptance_rejected'].includes(repair.status_acceptance)) throw new BadRequestException('Nghiệm thu đã bị từ chối');
            if (repair.status_acceptance === 'acceptance_admin_approved') {
                throw new BadRequestException('Nghiệm thu đã được phê duyệt xong, không thể thao tác lại');
            }
            if (dto.action === 'approve') {
                if (user.role === 'manager' && repair.status_acceptance === 'acceptance_pending') {
                    repair.status_acceptance = 'acceptance_manager_approved';
                    repair.approved_by_manager_acceptance = user;

                    repair.acceptance_approved_at = new Date();
                    if (repair.acceptance_created_at) {
                        const durationMs = repair.acceptance_approved_at.getTime() - repair.acceptance_created_at.getTime();
                        repair.acceptance_duration_minutes = Math.floor(durationMs / (1000 * 60));
                    }

                    const admins = await this.userRepo.find({ where: { role: 'admin' } });
                    if (repair.created_by) {
                        await this.notificationService.createForUser(
                            repair.created_by,
                            `Phiếu sửa chữa #${repair.repair_id} đã được Trưởng bộ phận phê duyệt bước nghiệm thu.`,
                        );
                    }
                    for (const admin of admins) {
                        await this.notificationService.createForUser(
                            admin,
                            `Phiếu sửa chữa #${repair.repair_id} đang chờ bạn phê duyệt bước nghiệm thu (đã qua Manager).`,
                        );
                    }
                } else if (user.role === 'admin' && repair.status_acceptance === 'acceptance_manager_approved') {
                    repair.status_acceptance = 'acceptance_admin_approved';
                    repair.approved_by_admin_acceptance = user;

                    const managers = await this.userRepo.find({ where: { role: 'manager' }, relations: ['department'] });
                    const approverManagers = managers.filter(
                        (m) => Array.isArray(m.department?.permissions) && m.department.permissions.includes('APPROVE_REPAIR'),
                    );
                    if (repair.created_by) {
                        await this.notificationService.createForUser(
                            repair.created_by,
                            `Phiếu sửa chữa #${repair.repair_id} đã được phê duyệt hoàn tất bước nghiệm thu.`,
                        );
                    }
                    for (const manager of approverManagers) {
                        await this.notificationService.createForUser(
                            manager,
                            `Phiếu sửa chữa #${repair.repair_id} đã được Admin phê duyệt bước nghiệm thu.`,
                        );
                    }
                } else {
                    throw new ForbiddenException('Không có quyền duyệt ở bước này');
                }
            } else {
                if (!['acceptance_pending', 'acceptance_manager_approved'].includes(repair.status_acceptance)) {
                    throw new BadRequestException('Không thể từ chối nghiệm thu đã duyệt xong');
                }
                repair.status_acceptance = 'acceptance_rejected';
                repair.canceled = true;
                repair.canceled_at = new Date();
            }
        }

        return this.repairRepo.save(repair);
    }

    async findAll() {
        const repairs = await this.repairRepo.find({
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
        for (const r of repairs) {
            const stockOuts = await this.stockOutRepo.find({
                where: { repair: { repair_id: r.repair_id } as any },
                relations: ['item', 'item.category', 'requested_by', 'approved_by'],
            });
            r.stock_outs = stockOuts;

            if (r.inspection_materials && Array.isArray(r.inspection_materials)) {
                const enrichedMaterials = await Promise.all(
                    r.inspection_materials.map(async (m) => {
                        if (m.item_id && !m.is_new) {
                            const item = await this.itemRepo.findOne({
                                where: { item_id: m.item_id },
                                relations: ['category'],
                            });
                            if (item) {
                                return {
                                    ...m,
                                    item_name: item.name,
                                    unit: item.quantity_unit,
                                    category_name: item.category?.name,
                                    item_code: item.code,
                                };
                            }
                        }
                        return m;
                    }),
                );
                r.inspection_materials = enrichedMaterials as any;
            }
        }
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

        // Populate inspection_materials with full item details
        if (repair.inspection_materials && Array.isArray(repair.inspection_materials)) {
            const enrichedMaterials = await Promise.all(
                repair.inspection_materials.map(async (m) => {
                    if (m.item_id && !m.is_new) {
                        const item = await this.itemRepo.findOne({
                            where: { item_id: m.item_id },
                            relations: ['category'],
                        });
                        if (item) {
                            return {
                                ...m,
                                item_name: item.name,
                                unit: item.quantity_unit,
                                category_name: item.category?.name,
                                item_code: item.code,
                            };
                        }
                    }
                    return m;
                }),
            );
            repair.inspection_materials = enrichedMaterials as any;
        }

        return repair;
    }

    async findByDevice(deviceId: number) {
        const repairs = await this.repairRepo.find({
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

        for (const r of repairs) {
            const stockOuts = await this.stockOutRepo.find({
                where: { repair: { repair_id: r.repair_id } as any },
                relations: ['item', 'item.category', 'requested_by', 'approved_by'],
            });
            r.stock_outs = stockOuts;

            if (r.inspection_materials && Array.isArray(r.inspection_materials)) {
                const enrichedMaterials = await Promise.all(
                    r.inspection_materials.map(async (m) => {
                        if (m.item_id && !m.is_new) {
                            const item = await this.itemRepo.findOne({
                                where: { item_id: m.item_id },
                                relations: ['category'],
                            });
                            if (item) {
                                return {
                                    ...m,
                                    item_name: item.name,
                                    unit: item.quantity_unit,
                                    category_name: item.category?.name,
                                    item_code: item.code,
                                };
                            }
                        }
                        return m;
                    }),
                );
                r.inspection_materials = enrichedMaterials as any;
            }
        }

        return repairs;
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
            ...this.buildHeaderCommon('PHIẾU YÊU CẦU KIỂM TRA BẢO DƯỠNG - SỬA CHỮA', 26),
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

    private buildHeaderCommon(title: string, titleSize = 26): (Paragraph | Table)[] {
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
                                        children: [new TextRun({ text: 'TỔ KỸ THUẬT', bold: true, size: 26 })],
                                    }),
                                ],
                            }),
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
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [new TextRun({ text: repair.inspection_created_by?.name || repair.acceptance_created_by?.name || '', size: 26, })],
                                    }),
                                ],
                            }),
                            new TableCell({
                                borders: noCell,
                                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: repair.created_by?.name || '', size: 26, })] })],
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
            ...this.buildHeaderCommon('BIÊN BẢN KIỂM NGHIỆM KỸ THUẬT VÀ ĐỀ NGHỊ VẬT TƯ SỬA CHỮA', 30),

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
            ...this.buildHeaderCommon('BIÊN BẢN NGHIỆM THU THỰC SỬA CHỮA - BẢO DƯỠNG', 30),

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
}
