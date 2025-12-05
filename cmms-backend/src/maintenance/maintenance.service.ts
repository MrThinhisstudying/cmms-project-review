import {Injectable, NotFoundException, Inject, forwardRef, ForbiddenException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository, In, IsNull, LessThan, ILike, Between} from 'typeorm';
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
import dayjs from 'dayjs';

@Injectable()
export class MaintenanceService {
    constructor(
        @InjectRepository(Maintenance) private maintenanceRepo: Repository<Maintenance>,
        @InjectRepository(Device) private deviceRepo: Repository<Device>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(Department) private deptRepo: Repository<Department>,
        @InjectRepository(MaintenanceChecklistTemplate) private templateRepo: Repository<MaintenanceChecklistTemplate>,
        @Inject(forwardRef(() => MaintenanceTicketService)) private ticketService: MaintenanceTicketService,
    ) {}

    // =================================================================
    // 1. HELPERS (CÁC HÀM PHỤ TRỢ)
    // =================================================================

    private toDateOrNull(input?: string | Date | null): Date | null {
        if (!input) return null;
        const d = new Date(input);
        return isNaN(d.getTime()) ? null : d;
    }

    private excelDateToJSDate(serial: any): Date | null {
        if (!serial) return null;
        const s = String(serial).toLowerCase().trim();
        if (s === 'n/a' || s === '-' || s === '') return null;

        if (typeof serial === 'number') {
            const utc_days = Math.floor(serial - 25569);
            const utc_value = utc_days * 86400;
            const date_info = new Date(utc_value * 1000);
            return date_info;
        }
        if (typeof serial === 'string') {
            const parts = serial.split('/');
            if (parts.length === 3) {
                const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
                if (!isNaN(d.getTime())) return d;
            }
        }
        const d = new Date(serial);
        return isNaN(d.getTime()) ? null : d;
    }

    private levelToMonths(level: MaintenanceLevel | string): number {
        const v = String(level);
        if (v === '1M' || v === '01 Tháng') return 1;
        if (v === '3M' || v === '03 Tháng') return 3;
        if (v === '6M' || v === '06 Tháng') return 6;
        if (v === '9M' || v === '09 Tháng') return 9;
        if (v === '1Y' || v === '01 Năm') return 12;
        if (v === '2Y' || v === '02 Năm') return 24;
        return 1;
    }

    private calculateLevelForMonth(k: number, cycles: string[]): string {
        if (cycles.includes('2Y') && k % 24 === 0) return '2Y';
        if (cycles.includes('1Y') && k % 12 === 0) return '1Y';
        if (cycles.includes('9M') && k % 9 === 0) return '9M';
        if (cycles.includes('6M') && k % 6 === 0) return '6M';
        if (cycles.includes('3M') && k % 3 === 0) return '3M';
        return '1M';
    }

    private addMonths(date: Date, months: number): Date {
        const d = new Date(date);
        d.setMonth(d.getMonth() + months);
        return d;
    }

    // =================================================================
    // 2. CRUD CƠ BẢN
    // =================================================================

    async create(dto: CreateMaintenanceDto) {
        const device = await this.deviceRepo.findOne({where: {device_id: dto.device_id}});
        if (!device) throw new NotFoundException('Device not found');
        const m = this.maintenanceRepo.create({
            ...dto,
            device,
            scheduled_date: this.toDateOrNull(dto.scheduled_date),
            next_maintenance_date: this.toDateOrNull(dto.scheduled_date),
            status: MaintenanceStatus.ACTIVE,
        });
        return await this.maintenanceRepo.save(m);
    }

    // Trang chủ: Chỉ lấy các kế hoạch ĐANG CHẠY (ACTIVE) để báo cáo/thực hiện
    async findAll() {
        return await this.maintenanceRepo.find({
            where: {status: MaintenanceStatus.ACTIVE},
            order: {next_maintenance_date: 'ASC'},
            relations: ['device', 'user', 'department'],
        });
    }

    // Modal chi tiết: Lấy TOÀN BỘ (Active + Inactive + Completed) để vẽ Timeline 2 năm
    async findByDevice(deviceId: number) {
        return await this.maintenanceRepo.find({
            where: {device: {device_id: deviceId}},
            order: {next_maintenance_date: 'ASC'},
            relations: ['device', 'user', 'department'],
        });
    }

    async findOne(id: number) {
        return await this.maintenanceRepo.findOne({where: {maintenance_id: id}, relations: ['device']});
    }

    async update(id: number, dto: UpdateMaintenanceDto) {
        const m = await this.findOne(id);
        if (!m) throw new NotFoundException('Maintenance not found');

        if (m.status === MaintenanceStatus.INACTIVE || m.status === MaintenanceStatus.CANCELED) {
            throw new ForbiddenException('Không thể sửa kế hoạch đã đóng');
        }

        if (dto.scheduled_date) {
            const d = this.toDateOrNull(dto.scheduled_date);
            m.scheduled_date = d;
            m.next_maintenance_date = d;
        }
        if (dto.level) m.level = dto.level;
        if (dto.status) m.status = dto.status;

        return await this.maintenanceRepo.save(m);
    }

    // Hủy kế hoạch (Dừng theo dõi)
    async cancel(id: number) {
        const maintenance = await this.findOne(id);
        maintenance.status = MaintenanceStatus.CANCELED;
        maintenance.next_maintenance_date = null;
        return await this.maintenanceRepo.save(maintenance);
    }

    async remove(id: number) {
        await this.maintenanceRepo.delete(id);
        return {success: true};
    }

    // =================================================================
    // 3. LOGIC HOÀN THÀNH & TỰ ĐỘNG KÍCH HOẠT (Rolling Wave)
    // =================================================================

    // --- CẬP NHẬT: THÊM THAM SỐ actualDate ---
    async markCompletedAndSpawnNext(maintenanceId: number, actualDate: Date) {
        const current = await this.findOne(maintenanceId);

        // 1. Đánh dấu kế hoạch hiện tại là ĐÃ XONG
        current.status = MaintenanceStatus.INACTIVE;

        // QUAN TRỌNG: Dùng ngày thực tế từ phiếu, không dùng new Date()
        current.last_maintenance_date = actualDate;

        await this.maintenanceRepo.save(current);

        // 2. Tìm kế hoạch DỰ KIẾN tiếp theo
        const nextPlan = await this.maintenanceRepo.findOne({
            where: {
                device: {device_id: current.device.device_id},
                status: MaintenanceStatus.INACTIVE,
                last_maintenance_date: IsNull(),
            },
            order: {next_maintenance_date: 'ASC'},
        });

        // 3. Kích hoạt nó lên
        if (nextPlan) {
            nextPlan.status = MaintenanceStatus.ACTIVE;
            // Gán ngày làm gần nhất cho phiếu tiếp theo để hiển thị liên kết
            nextPlan.last_maintenance_date = actualDate;
            await this.maintenanceRepo.save(nextPlan);
        }
    }

    // =================================================================
    // 4. CHỨC NĂNG IMPORT (Logic 2 Năm & Smart Archive)
    // =================================================================

    // --- IMPORT SINH LỊCH 2 NĂM (ĐÃ FIX LOGIC NGÀY CUỐI THÁNG) ---
    // --- IMPORT SINH LỊCH 2 NĂM (ĐÃ FIX LỖI LẶP & TRẠNG THÁI) ---
    async importMaintenancePlan(fileBuffer: Buffer) {
        const workbook = XLSX.read(fileBuffer, {type: 'buffer'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(sheet, {header: 1}) as any[][];

        // 1. Dò tìm Header
        let headerRowIdx = 0,
            colNameIdx = -1,
            dateColIdx = -1;
        for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
            const rowStr = rawRows[i].map((c) => String(c).trim().toUpperCase());
            if (rowStr.includes('TÊN TRANG THIẾT BỊ')) {
                headerRowIdx = i;
                colNameIdx = rowStr.indexOf('TÊN TRANG THIẾT BỊ');
                rawRows[i].forEach((val, idx) => {
                    const v = String(val).toUpperCase();
                    if (v.includes('NGÀY') && (v.includes('BD') || v.includes('GẦN NHẤT') || v.includes('THỰC HIỆN'))) dateColIdx = idx;
                });
                break;
            }
        }

        if (colNameIdx === -1) return {message: 'Lỗi format file Excel'};

        const headers = rawRows[headerRowIdx] as string[];
        const dataRows = rawRows.slice(headerRowIdx + 1);
        const results = [];

        for (const rowArray of dataRows) {
            const row: any = {};
            headers.forEach((h, idx) => {
                if (h) row[h.trim()] = rowArray[idx];
            });

            const deviceName = row['TÊN TRANG THIẾT BỊ'];
            if (!deviceName) continue;

            const device = await this.deviceRepo
                .createQueryBuilder('d')
                .where('d.name ILIKE :name OR d.serial_number ILIKE :name', {name: `%${deviceName}%`})
                .getOne();

            if (!device) {
                results.push({name: deviceName, status: 'Skipped'});
                continue;
            }

            // --- QUAN TRỌNG: XÓA SẠCH DỮ LIỆU CŨ CỦA XE NÀY TRƯỚC ---
            // Để đảm bảo không bị trùng lặp khi import nhiều lần
            await this.maintenanceRepo.delete({device: {device_id: device.device_id}});
            // ---------------------------------------------------------

            // 2. Xác định Mốc thời gian (Ưu tiên Excel)

            // Lấy từ Excel
            let excelLastDate = dateColIdx !== -1 && rowArray[dateColIdx] ? this.excelDateToJSDate(rowArray[dateColIdx]) : null;

            // (Tùy chọn: Lấy từ DB cũ nếu muốn giữ lại lịch sử, nhưng ở trên đã xóa rồi nên ta dùng Excel là chính)
            // Nếu bạn muốn giữ lịch sử cũ thì phải query trước khi delete.
            // Ở đây ta ưu tiên làm mới lộ trình từ Excel.

            let lastDate = excelLastDate;
            const baseDate = lastDate ? dayjs(lastDate) : dayjs();

            // 3. Đọc cấu hình chu kỳ
            const cycles: string[] = [];
            const checkX = (k: string) => row[k] && String(row[k]).toLowerCase().includes('x');
            if (checkX('1 Tháng')) cycles.push('1M');
            if (checkX('3 Tháng')) cycles.push('3M');
            if (checkX('6 Tháng')) cycles.push('6M');
            if (checkX('9 Tháng')) cycles.push('9M');
            if (checkX('1 Năm')) cycles.push('1Y');
            if (checkX('2 Năm')) cycles.push('2Y');
            if (cycles.length === 0) cycles.push('1M');

            const plansToSave = [];

            // 4. Sinh 24 tháng
            for (let k = 1; k <= 24; k++) {
                // Tính ngày cuối tháng
                // k=1 (Phiếu đầu): baseDate + 0 tháng -> Cuối tháng 11 (30/11)
                // k=2 (Phiếu sau): baseDate + 1 tháng -> Cuối tháng 12 (31/12)
                const nextDate = baseDate
                    .add(k - 1, 'month')
                    .endOf('month')
                    .toDate();

                const level = this.calculateLevelForMonth(k, cycles);

                // Phiếu đầu tiên (k=1) là ACTIVE
                const status = k === 1 ? MaintenanceStatus.ACTIVE : MaintenanceStatus.INACTIVE;

                // --- SỬA LỖI HIỂN THỊ "HOÀN THÀNH" ---
                // Chỉ gán ngày làm gần nhất cho phiếu đầu tiên (k=1)
                // Các phiếu sau (k > 1) phải để null để hệ thống hiểu là "Chưa làm"
                const planLastDate = k === 1 ? lastDate : null;
                // -------------------------------------

                plansToSave.push(
                    this.maintenanceRepo.create({
                        device,
                        level,
                        status: status as any,
                        scheduled_date: nextDate,
                        next_maintenance_date: nextDate,
                        last_maintenance_date: planLastDate,
                        cycle_config: cycles,
                        start_date: baseDate.toDate(),
                        description: `Kế hoạch tháng ${dayjs(nextDate).format('MM/YYYY')} (Tự động)`,
                    }),
                );
            }

            await this.maintenanceRepo.save(plansToSave);
            results.push({name: deviceName, status: 'Generated 2 Years'});
        }

        return {message: 'Import thành công', details: results};
    }

    // --- IMPORT TEMPLATE (CẬP NHẬT 4 THAM SỐ) ---
    async importTemplate(fileBuffer: Buffer, name: string, code: string, deviceType: string) {
        const workbook = XLSX.read(fileBuffer, {type: 'buffer'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet);

        const structure = [];
        let currentCategory = null;

        for (const row of rawData) {
            if (!currentCategory || currentCategory.category !== row['Category']) {
                currentCategory = {category: row['Category'], items: []};
                structure.push(currentCategory);
            }
            currentCategory.items.push({
                code: row['Code'] || `ITEM_${Date.now()}_${Math.random()}`,
                task: row['Task'],
                type: row['Type'] === 'M' ? 'input_number' : 'checkbox',
                requirements: {'1M': row['1M'], '3M': row['3M'], '6M': row['6M'], '1Y': row['1Y'], '2Y': row['2Y']},
            });
        }

        const newTemplate = this.templateRepo.create({
            name: name,
            code: code,
            device_type: deviceType,
            checklist_structure: structure,
        });

        return await this.templateRepo.save(newTemplate);
    }

    // --- CÁC HÀM KHÁC (Template/Dashboard) ---

    async findAllTemplates() {
        return await this.templateRepo.find({order: {created_at: 'DESC'}});
    }

    async findTemplateOne(id: number) {
        return await this.templateRepo.findOne({where: {id}});
    }

    async removeTemplate(id: number) {
        await this.templateRepo.softDelete(id);
        return {success: true};
    }

    async updateTemplate(id: number, data: any) {
        const t = await this.templateRepo.findOne({where: {id}});
        if (data.name) t.name = data.name;
        if (data.code) t.code = data.code;
        if (data.device_type) t.device_type = data.device_type;
        return await this.templateRepo.save(t);
    }

    // API Thống kê cho Dashboard
    async getDashboardStats() {
        const totalDevices = await this.deviceRepo.count();
        const activePlans = await this.maintenanceRepo.find({where: {status: MaintenanceStatus.ACTIVE}});

        let overdue = 0,
            warning = 0,
            monitoring = 0;
        const today = dayjs().startOf('day');

        activePlans.forEach((p) => {
            if (p.next_maintenance_date) {
                const diff = dayjs(p.next_maintenance_date).diff(today, 'day');
                if (diff < -3) overdue++;
                else if (diff <= 3) warning++; // Trong khoảng ân hạn 3 ngày tính là Warning/Doing
                else monitoring++;
            }
        });

        return {totalDevices, totalActive: activePlans.length, overdue, warning, monitoring};
    }

    // --- LẤY KẾ HOẠCH TỔNG THỂ (MASTER PLAN) ---
    async getYearlyPlan(year: number) {
        // Lấy tất cả kế hoạch có ngày đến hạn trong năm được chọn
        const startOfYear = new Date(`${year}-01-01`);
        const endOfYear = new Date(`${year}-12-31`);

        const plans = await this.maintenanceRepo.find({
            where: {
                next_maintenance_date: Between(startOfYear, endOfYear),
            },
            relations: ['device'],
            order: {device: {name: 'ASC'}, next_maintenance_date: 'ASC'},
        });

        // Group dữ liệu theo Device để Frontend dễ hiển thị
        // Cấu trúc trả về: [ { device: {...}, plans: [ ... ] }, ... ]
        const result = [];
        const deviceMap = new Map();

        for (const p of plans) {
            const dId = p.device.device_id;
            if (!deviceMap.has(dId)) {
                deviceMap.set(dId, {
                    device: p.device,
                    monthlyData: {}, // Object lưu: '1': plan, '2': plan...
                });
                result.push(deviceMap.get(dId));
            }

            // Lấy tháng (0-11) -> cộng 1 thành (1-12)
            const month = p.next_maintenance_date.getMonth() + 1;
            deviceMap.get(dId).monthlyData[month] = p;
        }

        return result;
    }

    // --- LẤY VIEW GIỐNG FILE EXCEL GỐC ---
    async getOriginalPlanView() {
        // Chỉ cần lấy các dòng ACTIVE là đủ (vì nó đại diện cho xe đó)
        // Dòng Active chứa: device, last_maintenance_date, và cycle_config
        const plans = await this.maintenanceRepo.find({
            where: {status: MaintenanceStatus.ACTIVE},
            relations: ['device'],
            order: {device: {name: 'ASC'}},
        });

        return plans;
    }
}

