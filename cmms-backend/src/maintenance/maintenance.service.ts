import {Injectable, NotFoundException, Inject, forwardRef, ForbiddenException, BadRequestException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {Device} from 'src/devices/entities/device.entity';
import {User} from 'src/user/user.entity';
import {Department} from 'src/departments/department.entity';
import {MaintenanceLevel, MaintenanceStatus} from './enum/maintenance.enum';
import {Maintenance} from './entities/maintenance.entity';
import {CreateMaintenanceDto} from './dto/create-maintenance.dto';
import {UpdateMaintenanceDto} from './dto/update-maintenance.dto';
import {MaintenanceTicketService} from 'src/maintenance-ticket/maintenance-ticket.service';
import {MaintenanceChecklistTemplate} from './entities/maintenance-checklist-template.entity';
import * as XLSX from 'xlsx';
@Injectable()
export class MaintenanceService {
    constructor(
        @InjectRepository(Maintenance) private maintenanceRepo: Repository<Maintenance>,
        @InjectRepository(Device) private deviceRepo: Repository<Device>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(Department) private deptRepo: Repository<Department>,
        @Inject(forwardRef(() => MaintenanceTicketService)) private ticketService: MaintenanceTicketService,
        @InjectRepository(MaintenanceChecklistTemplate)
        private templateRepo: Repository<MaintenanceChecklistTemplate>,
    ) {}

    private toDateOrNull(input?: string | Date | null): Date | null {
        if (input === null || input === undefined) return null;
        const d = input instanceof Date ? input : new Date(input);
        return isNaN(d.getTime()) ? null : d;
    }

    private levelToMonths(level: MaintenanceLevel | string): number {
        const v = level.toString(); // Chuyển về chuỗi để so sánh cho chắc ăn

        if (v === MaintenanceLevel.ONE_MONTH || v === '1M') return 1;
        if (v === MaintenanceLevel.THREE_MONTH || v === '3M') return 3;
        if (v === MaintenanceLevel.SIX_MONTH || v === '6M') return 6;
        if (v === MaintenanceLevel.NINE_MONTH || v === '9M') return 9;
        if (v === MaintenanceLevel.ONE_YEAR || v === '1Y') return 12;
        if (v === MaintenanceLevel.TWO_YEARS || v === '2Y') return 24; // Thêm cấp 2 năm

        return 0; // Mặc định
    }

    private addMonths(date: Date, months: number): Date {
        const d = new Date(date);
        d.setMonth(d.getMonth() + months);
        return d;
    }

    async create(dto: CreateMaintenanceDto) {
        const device = await this.deviceRepo.findOne({where: {device_id: dto.device_id}});
        if (!device) throw new NotFoundException('Device not found');
        let user: User = null;
        if (dto.user_id !== undefined && dto.user_id !== null) {
            user = await this.userRepo.findOne({where: {user_id: dto.user_id}});
            if (!user) throw new NotFoundException('User not found');
        }
        let department: Department = null;
        if (dto.dept_id !== undefined && dto.dept_id !== null) {
            department = await this.deptRepo.findOne({where: {dept_id: dto.dept_id}});
            if (!department) throw new NotFoundException('Department not found');
        }
        const maintenance = this.maintenanceRepo.create({
            ...dto,
            scheduled_date: this.toDateOrNull(dto.scheduled_date),
            expired_date: this.toDateOrNull(dto.expired_date),
            device,
            user,
            department,
        });
        const saved: Maintenance = await this.maintenanceRepo.save(maintenance);
        if (saved.status === MaintenanceStatus.ACTIVE) {
            await this.ticketService.createForMaintenance(saved.maintenance_id);
        }
        return saved;
    }

    async findAll() {
        return await this.maintenanceRepo.find({order: {updated_at: 'DESC'}, relations: ['device', 'user', 'department']});
    }

    async findOne(id: number) {
        const m = await this.maintenanceRepo.findOne({where: {maintenance_id: id}, relations: ['device', 'user', 'department']});
        if (!m) throw new NotFoundException('Maintenance not found');
        return m;
    }

    async findByDevice(deviceId: number) {
        return await this.maintenanceRepo
            .createQueryBuilder('m')
            .leftJoinAndSelect('m.device', 'device')
            .leftJoinAndSelect('m.user', 'user')
            .leftJoinAndSelect('m.department', 'department')
            .where('device.device_id = :deviceId', {deviceId})
            .orderBy('m.scheduled_date', 'DESC')
            .getMany();
    }

    async update(id: number, dto: UpdateMaintenanceDto) {
        const maintenance = await this.maintenanceRepo.findOne({where: {maintenance_id: id}, relations: ['device', 'user', 'department']});
        if (!maintenance) throw new NotFoundException('Maintenance not found');
        if (maintenance.status !== MaintenanceStatus.ACTIVE) {
            throw new ForbiddenException('Cannot modify a non-active maintenance schedule');
        }
        if ('device_id' in dto) {
            if (dto.device_id == null) throw new NotFoundException('Device not found');
            const dev = await this.deviceRepo.findOne({where: {device_id: dto.device_id}});
            if (!dev) throw new NotFoundException('Device not found');
            maintenance.device = dev;
        }
        if ('user_id' in dto) {
            if (dto.user_id == null) maintenance.user = null;
            else {
                const usr = await this.userRepo.findOne({where: {user_id: dto.user_id}});
                if (!usr) throw new NotFoundException('User not found');
                maintenance.user = usr;
            }
        }
        if ('dept_id' in dto) {
            if (dto.dept_id == null) maintenance.department = null;
            else {
                const dep = await this.deptRepo.findOne({where: {dept_id: dto.dept_id}});
                if (!dep) throw new NotFoundException('Department not found');
                maintenance.department = dep;
            }
        }
        if ('scheduled_date' in dto) maintenance.scheduled_date = this.toDateOrNull(dto.scheduled_date ?? null);
        if ('expired_date' in dto) maintenance.expired_date = this.toDateOrNull(dto.expired_date ?? null);
        if ('status' in dto) maintenance.status = dto.status;
        if ('level' in dto) maintenance.level = dto.level;
        if ('description' in dto) maintenance.description = dto.description;
        const saved: Maintenance = await this.maintenanceRepo.save(maintenance);
        return saved;
    }

    async remove(id: number) {
        const maintenance = await this.maintenanceRepo.findOne({where: {maintenance_id: id}});
        if (!maintenance) throw new NotFoundException('Maintenance not found');
        if (maintenance.status !== MaintenanceStatus.ACTIVE) {
            throw new ForbiddenException('Cannot remove a non-active maintenance schedule');
        }
        const result = await this.maintenanceRepo.delete(id);
        if (result.affected === 0) throw new NotFoundException('Maintenance not found');
        return {success: true};
    }

    async createNextFrom(maintenanceId: number) {
        const current = await this.findOne(maintenanceId);
        const months = this.levelToMonths(current.level);
        if (!months || !current.scheduled_date) return null;
        let nextDate = this.addMonths(current.scheduled_date, months);
        while (nextDate.getTime() <= Date.now()) nextDate = this.addMonths(nextDate, months);
        const next = this.maintenanceRepo.create({
            device: current.device,
            user: current.user ?? null,
            department: current.department ?? null,
            level: current.level,
            status: MaintenanceStatus.ACTIVE,
            scheduled_date: nextDate,
            expired_date: null,
            description: null,
        });
        const saved: Maintenance = await this.maintenanceRepo.save(next);
        if (saved.status === MaintenanceStatus.ACTIVE) {
            await this.ticketService.createForMaintenance(saved.maintenance_id);
        }
        return saved;
    }

    async markCompletedAndSpawnNext(maintenanceId: number) {
        const m = await this.findOne(maintenanceId);
        const originalStatus = m.status;
        if (originalStatus !== MaintenanceStatus.INACTIVE && originalStatus !== MaintenanceStatus.CANCELED) {
            m.status = MaintenanceStatus.INACTIVE;
            await this.maintenanceRepo.save(m);
        }
        if (originalStatus !== MaintenanceStatus.CANCELED) {
            return await this.createNextFrom(maintenanceId);
        }
        return null;
    }
    async importTemplate(fileBuffer: Buffer, name: string, deviceType: string) {
        const workbook = XLSX.read(fileBuffer, {type: 'buffer'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet);

        const structure = [];
        let currentCategory = null;

        // Giả sử file Excel có các cột: Category, Task, Type, 1M, 6M, 1Y...
        for (const row of rawData) {
            if (!currentCategory || currentCategory.category !== row['Category']) {
                currentCategory = {category: row['Category'], items: []};
                structure.push(currentCategory);
            }

            currentCategory.items.push({
                code: row['Code'] || `ITEM_${Date.now()}_${Math.random()}`, // Tạo mã nếu excel không có
                task: row['Task'],
                type: row['Type'] === 'M' ? 'input_number' : 'checkbox',
                requirements: {
                    '1M': row['1M'],
                    '3M': row['3M'],
                    '6M': row['6M'],
                    '1Y': row['1Y'],
                    '2Y': row['2Y'],
                },
            });
        }

        const newTemplate = this.templateRepo.create({
            name: name,
            device_type: deviceType,
            checklist_structure: structure,
        });

        return await this.templateRepo.save(newTemplate);
    }

    // Hàm lấy danh sách Template để hiện lên Dropdown Frontend
    async findAllTemplates() {
        return await this.templateRepo.find({order: {created_at: 'DESC'}});
    }

    async findTemplateOne(id: number) {
        return await this.templateRepo.findOne({where: {id}});
    }

    // --- HÀM IMPORT THÔNG MINH (ĐÃ SỬA LỖI LOOP) ---
    async importMaintenancePlan(fileBuffer: Buffer) {
        const workbook = XLSX.read(fileBuffer, {type: 'buffer'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        // Đọc dữ liệu dạng Mảng các dòng
        const rows = XLSX.utils.sheet_to_json(sheet, {header: 1}) as any[][];
        const results = [];

        // Tự động dò tìm vị trí các cột
        let nameColIdx = -1;
        let col1M = -1,
            col3M = -1,
            col6M = -1,
            col1Y = -1,
            col2Y = -1;
        let dataStartRow = 0;

        // Quét 15 dòng đầu để tìm Header
        for (let i = 0; i < Math.min(rows.length, 15); i++) {
            const row = rows[i];
            if (!row) continue;

            row.forEach((cell, idx) => {
                const val = String(cell).toLowerCase().trim();
                if (val.includes('tên trang thiết bị') || val.includes('tên phương tiện')) {
                    nameColIdx = idx;
                    dataStartRow = i + 1;
                }
                if (val.includes('1 tháng')) col1M = idx;
                else if (val.includes('3 tháng')) col3M = idx;
                else if (val.includes('6 tháng')) col6M = idx;
                else if (val.includes('1 năm')) col1Y = idx;
                else if (val.includes('2 năm')) col2Y = idx;
            });
        }

        if (nameColIdx === -1) {
            return {message: 'Lỗi: Không tìm thấy cột "TÊN TRANG THIẾT BỊ" trong file Excel'};
        }

        // --- BẮT ĐẦU VÒNG LẶP ---
        for (let i = dataStartRow; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[nameColIdx]) continue;

            const deviceName = String(row[nameColIdx]).trim();
            if (deviceName.toLowerCase().includes('tên trang thiết bị')) continue;

            // Tìm thiết bị
            const device = await this.deviceRepo
                .createQueryBuilder('d')
                .where('d.name ILIKE :name OR d.serial_number ILIKE :name', {name: `%${deviceName}%`})
                .getOne();

            if (!device) {
                results.push({name: deviceName, status: 'Skipped - Device Not Found'});
                continue;
            }

            // Xác định cấp độ
            let startLevel: MaintenanceLevel = MaintenanceLevel.ONE_MONTH;
            const hasX = (colIdx: number) => colIdx !== -1 && row[colIdx] && String(row[colIdx]).toLowerCase().includes('x');

            if (hasX(col1M)) startLevel = MaintenanceLevel.ONE_MONTH;
            else if (hasX(col3M)) startLevel = MaintenanceLevel.THREE_MONTH;
            else if (hasX(col6M)) startLevel = MaintenanceLevel.SIX_MONTH;
            else if (hasX(col1Y)) startLevel = MaintenanceLevel.ONE_YEAR;
            else if (hasX(col2Y)) startLevel = MaintenanceLevel.TWO_YEARS;

            // Lưu vào DB
            let plan = await this.maintenanceRepo.findOne({where: {device: {device_id: device.device_id}}});

            if (plan) {
                plan.level = startLevel;
                plan.status = MaintenanceStatus.ACTIVE;
                await this.maintenanceRepo.save(plan);
                results.push({name: deviceName, status: 'Updated Plan'});
            } else {
                const newPlan = this.maintenanceRepo.create({
                    device: device,
                    level: startLevel,
                    status: MaintenanceStatus.ACTIVE,
                    scheduled_date: new Date(),
                    next_maintenance_date: new Date(),
                    description: 'Imported from Excel Plan',
                });
                await this.maintenanceRepo.save(newPlan);
                results.push({name: deviceName, status: 'Created Plan'});
            }
        } // <--- KẾT THÚC VÒNG LẶP TẠI ĐÂY

        // Trả về kết quả sau khi ĐÃ chạy hết tất cả các dòng
        return {message: 'Import hoàn tất', processed: results.length, details: results};
    }

    // Xóa mềm quy trình (Soft Delete)
    async removeTemplate(id: number) {
        // Hàm softDelete sẽ tự động update cột deleted_at = now()
        // Nó KHÔNG xóa row khỏi DB, nên không bị lỗi khóa ngoại (Foreign Key)
        const result = await this.templateRepo.softDelete(id);

        if (result.affected === 0) {
            throw new NotFoundException('Không tìm thấy quy trình');
        }
        return {success: true, message: 'Đã lưu trữ quy trình thành công'};
    }

    // Cập nhật tên hoặc loại thiết bị
    async updateTemplate(id: number, data: {name?: string; device_type?: string}) {
        const template = await this.templateRepo.findOne({where: {id}});
        if (!template) throw new NotFoundException('Không tìm thấy quy trình');

        if (data.name) template.name = data.name;
        if (data.device_type) template.device_type = data.device_type;

        return await this.templateRepo.save(template);
    }
}

