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

    // API Dashboard: Group By Device, lấy phiếu gần nhất
    async getDashboardOverview() {
        const allActive = await this.maintenanceRepo.find({
            where: { status: MaintenanceStatus.ACTIVE },
            order: { next_maintenance_date: 'ASC' },
            relations: ['device']
        });

        // Dedup: Chỉ lấy phiếu đầu tiên (gần nhất) cho mỗi Device
        const uniqueMap = new Map();
        allActive.forEach(plan => {
            const dId = plan.device.device_id;
            if (!uniqueMap.has(dId)) {
                uniqueMap.set(dId, plan);
            }
        });

        return Array.from(uniqueMap.values());
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
            // FIX: Không gán last_maintenance_date cho phiếu tiếp theo
            // Nếu gán, hệ thống sẽ hiểu là phiếu đó ĐÃ hoàn thành
            nextPlan.last_maintenance_date = null;
            await this.maintenanceRepo.save(nextPlan);
        }
    }

    // =================================================================
    // 4. CHỨC NĂNG IMPORT (Logic 2 Năm & Smart Archive)
    // =================================================================

    // --- IMPORT SINH LỊCH 2 NĂM (ĐÃ FIX LOGIC NGÀY CUỐI THÁNG) ---
    // --- IMPORT SINH LỊCH 2 NĂM (ĐÃ FIX LỖI LẶP & TRẠNG THÁI) ---
    // --- IMPORT SINH LỊCH 2 NĂM (ĐÃ TỐI ƯU & FIX LỖI HIỂN THỊ) ---
    // --- IMPORT LOGIC SONG HÀNH (CỘNG DỒN) ---
    async importMaintenancePlan(fileBuffer: Buffer) {
        const workbook = XLSX.read(fileBuffer, {type: 'buffer'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ''}) as any[][];

        // 1. Tìm Header (Giữ nguyên logic cũ)
        let headerRowIdx = -1,
            colNameIdx = -1,
            dateColIdx = -1;
        for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
            const rowStr = rawRows[i].map((c) => String(c).trim().toUpperCase());
            if (rowStr.findIndex((s) => s.includes('TÊN') && (s.includes('THIẾT BỊ') || s.includes('TB'))) !== -1) {
                headerRowIdx = i;
                colNameIdx = rowStr.findIndex((s) => s.includes('TÊN') && (s.includes('THIẾT BỊ') || s.includes('TB')));
                dateColIdx = rowStr.findIndex((s) => s.includes('NGÀY') && (s.includes('BD') || s.includes('GẦN') || s.includes('LAST')));
                break;
            }
        }

        if (headerRowIdx === -1) return {message: 'Lỗi: Không tìm thấy dòng tiêu đề'};
        const headers = rawRows[headerRowIdx].map((h) => String(h).trim());
        const dataRows = rawRows.slice(headerRowIdx + 1);
        const results = [];

        for (const rowArray of dataRows) {
            if (!rowArray || rowArray.length === 0) continue;
            const deviceName = rowArray[colNameIdx];
            if (!deviceName) continue;

            const device = await this.deviceRepo
                .createQueryBuilder('d')
                .where('d.name ILIKE :name OR d.serial_number ILIKE :name', {name: `%${deviceName}%`})
                .getOne();

            if (!device) {
                results.push({name: deviceName, status: 'Skipped (Not Found)'});
                continue;
            }

            // Xóa sạch dữ liệu cũ của thiết bị này
            await this.maintenanceRepo.delete({device: {device_id: device.device_id}});

            // Lấy ngày gốc (Base Date)
            const excelDate = dateColIdx !== -1 ? this.excelDateToJSDate(rowArray[dateColIdx]) : null;
            const baseDate = excelDate ? dayjs(excelDate) : dayjs().startOf('year');

            // --- BƯỚC 1: XÁC ĐỊNH CÁC CHU KỲ ĐƯỢC CHỌN ---
            // Chúng ta cần biết người dùng đã tích vào những ô nào
            const cycles: string[] = [];
            const checkHeader = (key: string) => {
                const idx = headers.findIndex((h) => h.toUpperCase().includes(key.toUpperCase()));
                return (
                    idx !== -1 &&
                    String(rowArray[idx] || '')
                        .toLowerCase()
                        .includes('x')
                );
            };

            // Định nghĩa danh sách các chu kỳ cần check
            const config = {
                hasWeekly: checkHeader('Tuần') || checkHeader('Weekly'), // Cần thêm cột này trong Excel nếu chưa có
                has1M: checkHeader('1 Tháng') || checkHeader('1M'),
                has3M: checkHeader('3 Tháng') || checkHeader('3M'),
                has6M: checkHeader('6 Tháng') || checkHeader('6M'),
                has1Y: checkHeader('1 Năm') || checkHeader('1Y'),
                has2Y: checkHeader('2 Năm') || checkHeader('2Y'),
            };

            // Lưu vào DB để tham khảo (nếu cần)
            if (config.hasWeekly) cycles.push('Tuần');
            if (config.has1M) cycles.push('1M');
            if (config.has3M) cycles.push('3M');
            if (config.has6M) cycles.push('6M');
            if (config.has1Y) cycles.push('1Y');
            if (config.has2Y) cycles.push('2Y');

            const plansToSave = [];

            // --- BƯỚC 2: SINH LỊCH TUẦN (WEEKLY) ---
            // Tuần chạy độc lập với tháng, cứ 7 ngày 1 lần
            if (config.hasWeekly) {
                // Sinh cho 2 năm (104 tuần)
                for (let w = 1; w <= 104; w++) {
                    const nextDate = baseDate.add(w * 7, 'day').toDate();
                    plansToSave.push(this.createPlanEntity(device, 'Tuần', nextDate, cycles, w === 1 && !!excelDate));
                }
            }

            // --- BƯỚC 3: SINH LỊCH THÁNG/NĂM (MONTHLY/YEARLY) ---
            // Chạy vòng lặp 24 tháng
            for (let k = 1; k <= 24; k++) {
                const nextDateInfo = baseDate.add(k, 'month').endOf('month').toDate();

                // Logic CỘNG DỒN: Không dùng else if, dùng if riêng lẻ

                // 1. Kiểm tra 1 Tháng
                if (config.has1M) {
                    // Tháng nào cũng làm
                    plansToSave.push(this.createPlanEntity(device, '1M', nextDateInfo, cycles, k === 1 && !!excelDate));
                }

                // 2. Kiểm tra 3 Tháng
                if (config.has3M && k % 3 === 0) {
                    plansToSave.push(this.createPlanEntity(device, '3M', nextDateInfo, cycles, false));
                }

                // 3. Kiểm tra 6 Tháng
                if (config.has6M && k % 6 === 0) {
                    plansToSave.push(this.createPlanEntity(device, '6M', nextDateInfo, cycles, false));
                }

                // 4. Kiểm tra 1 Năm
                if (config.has1Y && k % 12 === 0) {
                    plansToSave.push(this.createPlanEntity(device, '1Y', nextDateInfo, cycles, false));
                }

                // 5. Kiểm tra 2 Năm
                if (config.has2Y && k % 24 === 0) {
                    plansToSave.push(this.createPlanEntity(device, '2Y', nextDateInfo, cycles, false));
                }
            }

            // Lưu tất cả vào DB (Batch Insert)
            await this.maintenanceRepo.save(plansToSave);
            results.push({name: deviceName, status: `Đã tạo ${plansToSave.length} phiếu (Bao gồm trùng lịch)`});
        }

        return {message: 'Import thành công theo logic song hành', details: results};
    }

    // Helper tạo Entity để code gọn hơn
    private createPlanEntity(device: any, level: string, date: Date, cycles: string[], isFirstActive: boolean, customLastDate?: Date) {
        // Chỉ phiếu đầu tiên của chu kỳ nhỏ nhất (thường là 1M hoặc Weekly) mới Active
        // Hoặc bạn có thể để tất cả Inactive chờ đến ngày
        // Ở đây tôi để Active nếu là phiếu đầu tiên và có ngày thực tế
        const status = isFirstActive ? MaintenanceStatus.ACTIVE : MaintenanceStatus.INACTIVE;

        return this.maintenanceRepo.create({
            device,
            level: level,
            status: status,
            scheduled_date: date,
            next_maintenance_date: date,
            last_maintenance_date: customLastDate ? customLastDate : (isFirstActive ? date : null), // Ưu tiên customLastDate
            cycle_config: cycles,
            description: `Bảo dưỡng cấp ${level} - ${dayjs(date).format('DD/MM/YYYY')}`,
        });
    }

    // Helper kiểm tra tháng này có rơi vào chu kỳ không (để gán Level đúng)
    private isCycleMatch(monthIndex: number, cycles: string[]): boolean {
        if (cycles.includes('1M')) return true;
        if (cycles.includes('3M') && monthIndex % 3 === 0) return true;
        if (cycles.includes('6M') && monthIndex % 6 === 0) return true;
        if (cycles.includes('9M') && monthIndex % 9 === 0) return true;
        if (cycles.includes('1Y') && monthIndex % 12 === 0) return true;
        if (cycles.includes('2Y') && monthIndex % 24 === 0) return true;
        return false;
    }

    // --- IMPORT TEMPLATE (CẬP NHẬT 4 THAM SỐ) ---
    async importTemplate(fileBuffer: Buffer, name: string, code: string, deviceType: string) {
        const workbook = XLSX.read(fileBuffer, {type: 'buffer'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet);

        const structure = [];
        let currentCategory = null;

        for (const row of rawData) {
            // FIX: Handle missing Category -> Use "Hạng mục chung"
            const categoryName = row['Category'] || 'Hạng mục chung';

            if (!currentCategory || currentCategory.category !== categoryName) {
                // Check if category already exists in structure to avoid duplicates if rows are not sorted
                const existingCategory = structure.find(c => c.category === categoryName);
                if (existingCategory) {
                    currentCategory = existingCategory;
                } else {
                    currentCategory = {category: categoryName, items: []};
                    structure.push(currentCategory);
                }
            }
            // Helper: Find value by key (Case Insensitive & Trimmed)
            const getValue = (r: any, keys: string[]) => {
                const rowKeys = Object.keys(r);
                for (const key of keys) {
                    // 1. Try exact match
                    if (r[key] !== undefined) return r[key];
                    // 2. Try case-insensitive + trim match
                    const normalize = (s: string) => s.trim().toUpperCase();
                    const foundKey = rowKeys.find(k => normalize(k) === normalize(key));
                    if (foundKey && r[foundKey] !== undefined) return r[foundKey];
                }
                return undefined;
            };

            currentCategory.items.push({
                code: row['Code'] || `ITEM_${Date.now()}_${Math.random()}`,
                task: row['Task'],
                type: row['Type'] === 'M' ? 'input_number' : 'checkbox',
                requirements: {
                    'Tuần': getValue(row, ['Tuần', 'Weekly', 'Week']), 
                    '1M': getValue(row, ['1M', '1 Tháng', 'Month']), 
                    '3M': getValue(row, ['3M', '3 Tháng']), 
                    '6M': getValue(row, ['6M', '6 Tháng']), 
                    '1Y': getValue(row, ['1Y', '1 Năm', 'Year']), 
                    '2Y': getValue(row, ['2Y', '2 Năm'])
                },
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
            
            if (!deviceMap.get(dId).monthlyData[month]) {
                deviceMap.get(dId).monthlyData[month] = [];
            }
            deviceMap.get(dId).monthlyData[month].push(p);
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
    // =================================================================
    // 5. IMPORT WITH PRIORITY & WEEKLY CONSTRAINT
    // =================================================================

    async importMaintenanceWithPriority(fileBuffer: Buffer) {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

        // 1. Tìm Header
        let headerRowIdx = -1, colNameIdx = -1, dateColIdx = -1, modelColIdx = -1;
        for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
            const rowStr = rawRows[i].map(c => String(c).trim().toUpperCase());
            if (rowStr.findIndex(s => s.includes('TÊN') && (s.includes('THIẾT BỊ') || s.includes('TB'))) !== -1) {
                headerRowIdx = i;
                colNameIdx = rowStr.findIndex(s => s.includes('TÊN') && (s.includes('THIẾT BỊ') || s.includes('TB')));
                dateColIdx = rowStr.findIndex(s => s.includes('NGÀY') && (s.includes('BD') || s.includes('GẦN')));
                modelColIdx = rowStr.findIndex(s => (s.includes('KÝ HIỆU') || s.includes('MODEL')) && !s.includes('SỐ'));
                break;
            }
        }

        if (headerRowIdx === -1) return { message: 'Lỗi: Không tìm thấy dòng tiêu đề' };
        
        const headers = rawRows[headerRowIdx].map(h => String(h).trim());
        const dataRows = rawRows.slice(headerRowIdx + 1);
        const results = [];

        for (const rowArray of dataRows) {
            if (!rowArray || rowArray.length === 0) continue;
            const deviceName = rowArray[colNameIdx];
            if (!deviceName) continue;

            const device = await this.deviceRepo.findOne({
                where: [
                    { name: ILike(`%${deviceName}%`) },
                    { serial_number: ILike(`%${deviceName}%`) }
                ]
            });

            if (!device) {
                results.push({ name: deviceName, status: 'Skipped (Device Not Found)' });
                continue;
            }

            // Cập nhật Model (Brand) nếu có trong Excel
            if (modelColIdx !== -1 && rowArray[modelColIdx]) {
                device.brand = String(rowArray[modelColIdx]).trim();
                await this.deviceRepo.save(device);
            }

            // Xóa dữ liệu cũ
            await this.maintenanceRepo.delete({ device: { device_id: device.device_id } });

            // Base Date & First Month Logic
            const excelDate = dateColIdx !== -1 ? this.excelDateToJSDate(rowArray[dateColIdx]) : null;
            // Nếu không có ngày excel -> lấy ngày 1 của tháng hiện tại làm mốc
            const rawBaseDate = excelDate ? dayjs(excelDate) : dayjs().startOf('month');
            
            // LOGIC THÁNG ĐẦU TIÊN
            let startMonthDate = rawBaseDate.startOf('month');
            // Nếu ngày import > 20 -> Bắt đầu tính từ tháng sau
            if (rawBaseDate.date() > 20) {
                startMonthDate = startMonthDate.add(1, 'month');
            }

            // Detect Config
            const checkHeader = (key: string) => {
                const idx = headers.findIndex(h => h.toUpperCase().includes(key.toUpperCase()));
                return idx !== -1 && String(rowArray[idx] || '').toLowerCase().includes('x');
            };

            const config = {
                hasWeekly: checkHeader('Tuần') || checkHeader('Weekly'),
                has1M: checkHeader('1 Tháng') || checkHeader('1M'),
                has3M: checkHeader('3 Tháng') || checkHeader('3M'),
                has6M: checkHeader('6 Tháng') || checkHeader('6M'),
                has9M: checkHeader('9 Tháng') || checkHeader('9M'),
                has1Y: checkHeader('1 Năm') || checkHeader('1Y'),
                has2Y: checkHeader('2 Năm') || checkHeader('2Y'),
            };

            const jobCycles = [];
            if (config.hasWeekly) jobCycles.push('Tuần');
            if (config.has1M) jobCycles.push('1M');
            if (config.has3M) jobCycles.push('3M');
            if (config.has6M) jobCycles.push('6M');
            if (config.has9M) jobCycles.push('9M');
            if (config.has1Y) jobCycles.push('1Y');
            if (config.has2Y) jobCycles.push('2Y');

            const plansToSave = [];
            let hasSetFirstActive = false; // Cờ để đánh dấu phiếu đầu tiên là Active

            // VÒNG LẶP CHÍNH: DUYỆT 24 THÁNG (2 NĂM)
            for (let m = 0; m < 24; m++) {
                const currentMonth = startMonthDate.add(m, 'month');
                const monthIndex = m + 1; // Tháng thứ 1, 2, 3...

                // --- BƯỚC 1: LỚP NỀN (MANDATORY LAYER) ---
                
                // 1.1 Weekly (Luôn sinh 4 phiếu cố định: 1, 8, 15, 22)
                if (config.hasWeekly) {
                    const days = [1, 8, 15, 22];
                    for (const d of days) {
                        const wDate = currentMonth.date(d).toDate();
                        
                        // Xác định status: Nếu chưa có phiếu Active nào -> Phiếu này Active
                        let status = MaintenanceStatus.INACTIVE;
                        if (!hasSetFirstActive) {
                            status = MaintenanceStatus.ACTIVE;
                            hasSetFirstActive = true;
                        }

                        plansToSave.push(this.maintenanceRepo.create({
                            device,
                            level: 'Tuần',
                            status: status,
                            scheduled_date: wDate,
                            next_maintenance_date: wDate,
                            last_maintenance_date: (status === MaintenanceStatus.ACTIVE && excelDate) ? excelDate : null, // Set ngày cơ sở cho lần đầu
                            cycle_config: jobCycles, // Gắn full config để hiển thị đúng trên bảng View
                            description: `Bảo dưỡng Tuần - Ngày ${d}/${currentMonth.format('MM/YYYY')}`
                        }));
                    }
                }

                // 1.2 Monthly (Luôn sinh 1 phiếu cuối tháng)
                if (config.has1M) {
                    const mDate = currentMonth.endOf('month').toDate();
                    
                    let status = MaintenanceStatus.INACTIVE;
                    // Nếu chưa có active (ví dụ không có Weekly), thì Monthly đầu tiên sẽ Active
                    // Tuy nhiên nếu có Weekly rồi, thì Monthly vẫn cứ Inactive, chờ đến lượt (Rolling Wave)
                    // Hoặc nếu muốn Monthly ưu tiên hơn?
                    // Theo logic "Sắp tới" thì ngày nào đến trước sẽ Active.
                    // Ở đây ta cứ gán active cho phiếu ĐẦU TIÊN được tạo ra trong hệ thống.
                    if (!hasSetFirstActive) {
                        status = MaintenanceStatus.ACTIVE;
                        hasSetFirstActive = true;
                    }

                    // Fix: Truyền excelDate nếu status là ACTIVE để hiển thị trên bảng View
                    const lastDate = (status === MaintenanceStatus.ACTIVE && excelDate) ? excelDate : null;
                    
                    // Note: createPlanEntity có logic riêng, nhưng ta sẽ override last_maintenance_date ở đây nếu cần thiết
                    // Tuy nhiên createPlanEntity đang dùng tham số cuối isFirstActive để set.
                    // Ta cần update createPlanEntity để nhận param lastDate cụ thể hoặc tự xử lý.
                    // NHƯNG để an toàn và nhanh, ta sửa trực tiếp createPlanEntity hoặc sửa cách gọi.
                    // Ở đây gọi createPlanEntity với isFirstActive=true sẽ gán date hiện tại làm last_date.
                    // Cần sửa createPlanEntity để hỗ trợ custom lastDate.
                    
                    // Thay vì sửa createPlanEntity (ảnh hưởng chỗ khác), ta copy logic ra hoặc sửa createPlanEntity.
                    // Phương án: Sửa createPlanEntity để nhận lastMaintenanceDate optional.
                    plansToSave.push(this.createPlanEntity(device, '1M', mDate, jobCycles, status === MaintenanceStatus.ACTIVE, status === MaintenanceStatus.ACTIVE ? excelDate : null));
                }

                // --- BƯỚC 2: LỚP ƯU TIÊN (PRIORITY LAYER - EXCLUSIVE) ---
                let priorityLevel = null;
                
                if (config.has2Y && monthIndex % 24 === 0) {
                    priorityLevel = '2Y';
                } else if (config.has1Y && monthIndex % 12 === 0) {
                    priorityLevel = '1Y';
                } else if (config.has9M && monthIndex % 9 === 0) {
                    priorityLevel = '9M';
                } else if (config.has6M && monthIndex % 6 === 0) {
                    priorityLevel = '6M';
                } else if (config.has3M && monthIndex % 3 === 0) {
                    priorityLevel = '3M';
                }

                if (priorityLevel) {
                    const pDate = currentMonth.endOf('month').toDate(); // Trùng ngày với Monthly
                    // Đây là phiếu riêng biệt theo yêu cầu "2 dòng riêng biệt"

                    let status = MaintenanceStatus.INACTIVE;
                    // Nếu trùng ngày với Monthly, ta có 2 phiếu cùng ngày.
                    // Phiếu nào Active? Thường là phiếu to hơn quan trọng hơn?
                    // Nhưng ở đây logic simple: Cái nào đến lượt thì Active. 
                    // Nếu chưa set Active thì cái này Active.
                    if (!hasSetFirstActive) {
                        status = MaintenanceStatus.ACTIVE;
                        hasSetFirstActive = true;
                    }

                    plansToSave.push(this.createPlanEntity(device, priorityLevel, pDate, jobCycles, status === MaintenanceStatus.ACTIVE, status === MaintenanceStatus.ACTIVE ? excelDate : null));
                }
            }

            await this.maintenanceRepo.save(plansToSave);
            results.push({ name: deviceName, status: `Đã sinh lịch 2 năm (${plansToSave.length} phiếu). Bắt đầu: ${startMonthDate.format('MM/YYYY')}` });
        }
        return { message: 'Import Priority Full Schedule Success', details: results };
    }
}

