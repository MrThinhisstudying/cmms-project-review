import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { VehicleIncidentReport, IncidentReportStatus } from './entities/vehicle-incident-report.entity';
import { CreateIncidentReportDto } from './dto/create-incident-report.dto';
import { ResolveQuickDto } from './dto/resolve-quick.dto';
import { QueryIncidentReportsDto } from './dto/query-incident-reports.dto';
import { RequestRepairDossierDto } from './dto/request-repair-dossier.dto';
import { Device } from 'src/devices/entities/device.entity';
import { User } from 'src/user/user.entity';
import { UserRole } from 'src/user/user-role.enum';
import { UserDeviceGroup } from 'src/device-groups/entities/user-device-group.entity';
import { DeviceGroup } from 'src/device-groups/entities/device-group.entity';
import { RepairsService } from 'src/repairs/repairs.service';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class VehicleIncidentReportsService {
    constructor(
        @InjectRepository(VehicleIncidentReport)
        private readonly reportRepo: Repository<VehicleIncidentReport>,
        @InjectRepository(Device)
        private readonly deviceRepo: Repository<Device>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(UserDeviceGroup)
        private readonly userDeviceGroupRepo: Repository<UserDeviceGroup>,
        @InjectRepository(DeviceGroup)
        private readonly deviceGroupRepo: Repository<DeviceGroup>,
        private readonly repairsService: RepairsService,
        private readonly notificationService: NotificationService,
    ) {}

    // 1. Tạo báo cáo tình trạng xe công khai từ quét QR
    async createPublicReport(dto: CreateIncidentReportDto): Promise<VehicleIncidentReport> {
        const device = await this.deviceRepo.findOne({ where: { device_id: dto.device_id } });
        if (!device) {
            throw new NotFoundException(`Không tìm thấy phương tiện với ID ${dto.device_id}`);
        }

        let reporterUser: User | undefined;
        if (dto.reporter_user_id) {
            reporterUser = await this.userRepo.findOne({ where: { user_id: dto.reporter_user_id } }) || undefined;
        }

        const report = this.reportRepo.create({
            device_id: dto.device_id,
            device,
            reporter_user: reporterUser,
            reporter_user_id: reporterUser?.user_id,
            reporter_name: dto.reporter_name,
            reporter_code: dto.reporter_code,
            reporter_department: dto.reporter_department,
            reporter_phone: dto.reporter_phone,
            is_external_reporter: dto.is_external_reporter ?? !reporterUser,
            location_issue: dto.location_issue,
            description: dto.description,
            images: dto.images || [],
            status: IncidentReportStatus.PENDING,
        });

        return this.reportRepo.save(report);
    }

    // 2. Tìm kiếm nhân viên thông minh phục vụ AutoComplete tại màn hình QR
    async searchReporters(query: string): Promise<Array<{ user_id: number; name: string; employee_code?: string; department?: string; phone?: string }>> {
        if (!query || query.trim().length === 0) {
            return [];
        }

        const q = `%${query.trim().toLowerCase()}%`;
        const users = await this.userRepo
            .createQueryBuilder('u')
            .leftJoinAndSelect('u.department', 'd')
            .where('LOWER(u.name) LIKE :q OR LOWER(u.employee_code) LIKE :q', { q })
            .take(10)
            .getMany();

        return users.map(u => ({
            user_id: u.user_id,
            name: u.name,
            employee_code: u.employee_code,
            department: u.department?.name,
            phone: u.phone_number,
        }));
    }

    // 3. Danh sách báo cáo có bộ lọc (Dành cho trang Quản lý)
    async findAll(dto: QueryIncidentReportsDto, currentUser?: User) {
        const queryBuilder = this.reportRepo
            .createQueryBuilder('r')
            .leftJoinAndSelect('r.device', 'd')
            .leftJoinAndSelect('r.reporter_user', 'ru')
            .leftJoinAndSelect('r.technician', 'tech')
            .leftJoinAndSelect('r.operator_confirmed_by', 'op')
            .leftJoinAndSelect('r.assigned_dossier_user', 'adu')
            .orderBy('r.created_at', 'DESC');

        if (dto.status) {
            queryBuilder.andWhere('r.status = :status', { status: dto.status });
        }

        if (dto.device_id) {
            queryBuilder.andWhere('r.device_id = :deviceId', { deviceId: dto.device_id });
        }

        if (dto.search && dto.search.trim()) {
            const s = `%${dto.search.trim().toLowerCase()}%`;
            queryBuilder.andWhere(
                '(LOWER(r.reporter_name) LIKE :s OR LOWER(r.reporter_code) LIKE :s OR LOWER(r.description) LIKE :s OR LOWER(d.name) LIKE :s OR LOWER(d.reg_number) LIKE :s)',
                { s }
            );
        }

        if (dto.from_date && dto.to_date) {
            queryBuilder.andWhere('r.created_at BETWEEN :from AND :to', {
                from: new Date(`${dto.from_date}T00:00:00`),
                to: new Date(`${dto.to_date}T23:59:59`),
            });
        }

        // RBAC: Lọc theo phân quyền vai trò người dùng
        if (currentUser && currentUser.role === UserRole.OPERATOR) {
            const userGroups = await this.userDeviceGroupRepo.find({
                where: { user_id: currentUser.user_id },
            });
            const groupIds = userGroups.map(ug => ug.group_id).filter(Boolean);
            const userName = currentUser.name?.trim().toLowerCase() || '';

            if (groupIds.length > 0) {
                queryBuilder.andWhere(
                    '(d.group_id IN (:...groupIds) OR r.reporter_user_id = :userId OR r.assigned_dossier_user_id = :userId OR (r.assigned_dossier_user_name IS NOT NULL AND LOWER(r.assigned_dossier_user_name) = :userName))',
                    { groupIds, userId: currentUser.user_id, userName }
                );
            } else {
                queryBuilder.andWhere(
                    '(r.reporter_user_id = :userId OR r.assigned_dossier_user_id = :userId OR (r.assigned_dossier_user_name IS NOT NULL AND LOWER(r.assigned_dossier_user_name) = :userName))',
                    { userId: currentUser.user_id, userName }
                );
            }
        }

        return queryBuilder.getMany();
    }

    // 4. Lấy danh sách báo cáo đang PENDING hoặc IN_PROGRESS (Hiển thị popup cho KTV khi đăng nhập)
    async findPendingReports() {
        return this.reportRepo.find({
            where: {
                status: In([IncidentReportStatus.PENDING, IncidentReportStatus.IN_PROGRESS]),
            },
            relations: ['device', 'reporter_user', 'technician', 'assigned_dossier_user'],
            order: { created_at: 'DESC' },
        });
    }

    // 5. Xem chi tiết 1 báo cáo
    async findOne(id: number): Promise<VehicleIncidentReport> {
        const report = await this.reportRepo.findOne({
            where: { id },
            relations: ['device', 'reporter_user', 'technician', 'operator_confirmed_by', 'assigned_dossier_user'],
        });
        if (!report) {
            throw new NotFoundException(`Không tìm thấy báo cáo sự cố ID ${id}`);
        }
        return report;
    }

    // 6. Thao tác 1: Kỹ thuật viên tiếp nhận
    async acceptReport(id: number, technician: User): Promise<VehicleIncidentReport> {
        const report = await this.findOne(id);
        if (report.status === IncidentReportStatus.RESOLVED_QUICK || report.status === IncidentReportStatus.CONVERTED_REPAIR) {
            throw new BadRequestException('Báo cáo này đã được hoàn tất trước đó.');
        }

        report.status = IncidentReportStatus.IN_PROGRESS;
        report.technician = technician;
        report.technician_accepted_at = new Date();

        return this.reportRepo.save(report);
    }

    // 7. Thao tác 2: Xác nhận đã khắc phục nhanh (Cả khi sửa trực tiếp tại chỗ hoặc KTV đã linh động sửa xong trước đó)
    async resolveQuick(id: number, technician: User, dto: ResolveQuickDto): Promise<VehicleIncidentReport> {
        const report = await this.findOne(id);

        let operatorUser: User | undefined;
        if (dto.operator_confirmed_by_id) {
            operatorUser = await this.userRepo.findOne({ where: { user_id: dto.operator_confirmed_by_id } }) || undefined;
        }

        report.status = IncidentReportStatus.RESOLVED_QUICK;
        report.technician = technician;
        report.quick_solution = dto.quick_solution;
        report.operator_confirmed_by = operatorUser;
        report.operator_confirmed_name = dto.operator_confirmed_name;
        report.operator_confirmed_at = new Date();
        report.operator_notes = dto.operator_notes;

        return this.reportRepo.save(report);
    }

    // 8. KIỂM TRA CHÉO: Người báo cáo có đang quản lý hoặc nằm trong nhóm xe có chiếc xe đó không
    async checkVehicleGroupMembership(id: number) {
        const report = await this.reportRepo.findOne({
            where: { id },
            relations: ['device', 'reporter_user'],
        });
        if (!report) {
            throw new NotFoundException(`Không tìm thấy báo cáo sự cố ID ${id}`);
        }

        const device = await this.deviceRepo.findOne({
            where: { device_id: report.device_id },
            relations: ['device_group', 'device_group.leader', 'users'],
        });

        const groupMembers: Array<{
            user_id: number;
            name: string;
            employee_code?: string;
            is_group_lead?: boolean;
            phone?: string;
            department?: string;
        }> = [];

        let isInGroup = false;

        if (device?.device_group) {
            const udgs = await this.userDeviceGroupRepo.find({
                where: { group_id: device.device_group.id },
                relations: ['user', 'user.department'],
            });

            for (const udg of udgs) {
                if (udg.user) {
                    groupMembers.push({
                        user_id: udg.user.user_id,
                        name: udg.user.name,
                        employee_code: udg.user.employee_code,
                        is_group_lead: udg.is_group_lead || udg.user.user_id === device.device_group.leader_id,
                        phone: udg.user.phone_number,
                        department: udg.user.department?.name,
                    });
                }
            }

            // Check group leader if not already in array
            if (device.device_group.leader && !groupMembers.some(m => m.user_id === device.device_group.leader?.user_id)) {
                groupMembers.push({
                    user_id: device.device_group.leader.user_id,
                    name: device.device_group.leader.name,
                    employee_code: device.device_group.leader.employee_code,
                    is_group_lead: true,
                    phone: device.device_group.leader.phone_number,
                });
            }
        }

        const assignedUsers = (device?.users || []).map(u => ({
            user_id: u.user_id,
            name: u.name,
            employee_code: u.employee_code,
        }));

        if (report.reporter_user?.user_id) {
            const reporterId = report.reporter_user.user_id;
            const inGroupMembers = groupMembers.some(m => m.user_id === reporterId);
            const inAssigned = assignedUsers.some(u => u.user_id === reporterId);
            isInGroup = inGroupMembers || inAssigned;
        }

        let message = '';
        if (report.is_external_reporter || !report.reporter_user) {
            message = 'Người báo cáo là nhân viên mới hoặc ngoài danh mục (chưa có tài khoản trên hệ thống). Ghi nhận yêu cầu làm hồ sơ sửa chữa.';
        } else if (isInGroup) {
            message = `Hợp lệ: Nhân viên báo cáo (${report.reporter_name}) thuộc nhóm quản lý của phương tiện này.`;
        } else {
            message = `Cảnh báo: Nhân viên báo cáo (${report.reporter_name}) KHÔNG thuộc nhóm quản lý hoặc danh sách phụ trách xe này!`;
        }

        return {
            report_id: report.id,
            device_id: device?.device_id || report.device_id,
            device_name: device?.name,
            reg_number: device?.reg_number,
            device_group_name: device?.device_group?.name || null,
            reporter_user: report.reporter_user ? {
                user_id: report.reporter_user.user_id,
                name: report.reporter_user.name,
                employee_code: report.reporter_user.employee_code,
                department: report.reporter_user.department?.name,
            } : null,
            reporter_name: report.reporter_name,
            reporter_code: report.reporter_code,
            is_external_reporter: report.is_external_reporter || !report.reporter_user,
            is_in_group: isInGroup,
            group_members: groupMembers,
            assigned_users: assignedUsers,
            message,
        };
    }

    // 9. Thao tác 3 MỚI: Gửi yêu cầu làm hồ sơ sửa chữa (Không tự ý tạo hồ sơ B03)
    async requestRepairDossier(id: number, currentUser: User, dto: RequestRepairDossierDto): Promise<VehicleIncidentReport> {
        const report = await this.findOne(id);
        if (report.status === IncidentReportStatus.RESOLVED_QUICK) {
            throw new BadRequestException('Sự cố này đã được hoàn tất khắc phục nhanh.');
        }
        if (report.status === IncidentReportStatus.CONVERTED_REPAIR) {
            throw new BadRequestException(`Sự cố này đã có hồ sơ sửa chữa #${report.converted_repair_id}.`);
        }

        // Cross-check
        const groupCheck = await this.checkVehicleGroupMembership(id);

        let assignedUserId = dto.assigned_user_id;
        let assignedUserName = dto.assigned_user_name;

        // Nếu người báo cáo có tài khoản và KTV không chỉ định người khác, gán cho người báo cáo
        if (!assignedUserId && report.reporter_user?.user_id) {
            assignedUserId = report.reporter_user.user_id;
            assignedUserName = report.reporter_name;
        }

        report.status = IncidentReportStatus.REQUESTED_REPAIR;
        report.technician = currentUser;
        report.dossier_requested_at = new Date();
        report.dossier_request_note = dto.request_note;
        report.assigned_dossier_user_id = assignedUserId;
        report.assigned_dossier_user_name = assignedUserName || (report.is_external_reporter ? 'Tổ kỹ thuật / Tổ xe ghi nhận' : report.reporter_name);
        report.is_reporter_in_vehicle_group = groupCheck.is_in_group;

        if (assignedUserId) {
            const targetUser = await this.userRepo.findOne({ where: { user_id: assignedUserId } });
            if (targetUser) {
                report.assigned_dossier_user = targetUser;
                report.assigned_dossier_user_name = targetUser.name;

                // Gửi thông báo đến tài khoản nhân viên được yêu cầu
                try {
                    const notifyMsg = `KTV ${currentUser.name} yêu cầu bạn lập Hồ sơ sửa chữa (B03) cho xe ${report.device?.name} (${report.device?.reg_number || ''}). Nội dung: ${dto.request_note}`;
                    await this.notificationService.createForUser(targetUser, notifyMsg);
                } catch (notifErr) {
                    console.error('Lỗi gửi thông báo:', notifErr);
                }
            }
        }

        return this.reportRepo.save(report);
    }

    // 10. Liên kết mã hồ sơ sửa chữa B03 (Khi người vận hành hoặc KTV đã tạo hồ sơ)
    async linkRepairDossier(id: number, repairId: number, currentUser: User): Promise<VehicleIncidentReport> {
        const report = await this.findOne(id);
        report.status = IncidentReportStatus.CONVERTED_REPAIR;
        report.converted_repair_id = repairId;
        report.technician = currentUser;
        return this.reportRepo.save(report);
    }

    // 11. Chuyển thành hồ sơ sửa chữa chính thức (Dành cho Quản trị viên khi cần tạo trực tiếp)
    async convertToRepair(id: number, currentUser: User): Promise<{ report: VehicleIncidentReport; repair: any }> {
        const report = await this.findOne(id);
        if (report.status === IncidentReportStatus.CONVERTED_REPAIR && report.converted_repair_id) {
            throw new BadRequestException(`Báo cáo này đã được chuyển thành hồ sơ sửa chữa #${report.converted_repair_id}`);
        }

        const newRepair = await this.repairsService.create(
            {
                device_id: report.device_id,
                location_issue: report.location_issue || 'Bãi đỗ sân bay',
                recommendation: `[Chuyển từ Báo cáo tình trạng xe #${report.id}] ${report.description}`,
                note: `Người báo cáo tại xe: ${report.reporter_name} (${report.reporter_code || 'Không có mã'}) - Đơn vị: ${report.reporter_department || 'N/A'} - SĐT: ${report.reporter_phone || 'N/A'}`,
            },
            currentUser.user_id
        );

        report.status = IncidentReportStatus.CONVERTED_REPAIR;
        report.converted_repair_id = newRepair.repair_id;
        report.technician = currentUser;

        const updatedReport = await this.reportRepo.save(report);

        return {
            report: updatedReport,
            repair: newRepair,
        };
    }
}
