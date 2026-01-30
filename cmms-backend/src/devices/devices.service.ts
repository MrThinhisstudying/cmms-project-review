import {HttpException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException} from '@nestjs/common';
import {CreateDeviceDto} from './dto/create-device.dto';
import {Device} from './entities/device.entity';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {User} from 'src/user/user.entity';
import * as ExcelJS from 'exceljs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake');
import {columnMapping, DeviceStatus} from './enums/device-status.enum';
import {DeviceReportSummary} from './types/device-report.type';
import { UserRole } from 'src/user/user-role.enum';

@Injectable()
export class DevicesService {
    constructor(
        @InjectRepository(Device)
        private readonly deviceRepository: Repository<Device>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    async importDevicesFromExcel(buffer: Buffer): Promise<{ imported: number; skipped: number; details: any[] }> {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as any);
        
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
            throw new HttpException('Worksheet not found in Excel file', HttpStatus.BAD_REQUEST);
        }

        const existingDevices = await this.deviceRepository.find({
            select: ['name', 'serial_number', 'reg_number']
        });

        // Create a lookup map for faster checking
        // Key could be simplified or we check dynamically. 
        // Let's check dynamically to be safe with normalization.

        const importedDevices: Device[] = [];
        const skippedDevices: any[] = [];

        // Headers mapping
        const headers: string[] = [];
        worksheet.getRow(1).eachCell((cell) => {
            headers.push(cell.text?.toString().trim());
        });

        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const mapped: Record<string, any> = {};
            
            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber - 1];
                const normalizedHeader = header ? header.replace(/\s+/g, ' ').trim() : '';
                const key = columnMapping[normalizedHeader];
                if (key) {
                   // Handle specialized fields if needed, else text
                   mapped[key] = cell.text?.toString().trim();
                }
            });

            const name = mapped.name;
            if (!name) continue; // Skip empty rows

            // Duplicate Check Logic
            // Condition: Same Name AND (Same Serial OR Same Reg Number)
            const isDuplicate = existingDevices.some(d => {
                const sameName = d.name.toLowerCase() === name.toLowerCase();
                const serial = mapped.serial_number || '';
                const reg = mapped.reg_number || '';
                
                const sameSerial = d.serial_number && serial && d.serial_number.toLowerCase() === serial.toLowerCase();
                const sameReg = d.reg_number && reg && d.reg_number.toLowerCase() === reg.toLowerCase();

                return sameName && (sameSerial || sameReg);
            });

            if (isDuplicate) {
                skippedDevices.push({
                    name,
                    reason: 'Duplicate Name and Serial/Reg Number',
                    row: i
                });
                continue;
            }

            const deviceDto: Partial<Device> = {
                name,
                brand: mapped.brand,
                serial_number: mapped.serial_number,
                reg_number: mapped.reg_number,
                device_code: mapped.device_code, 
                usage_purpose: mapped.usage_purpose,
                operating_scope: mapped.operating_scope,
                country_of_origin: mapped.country_of_origin,
                manufacture_year: mapped.manufacture_year ? Number(mapped.manufacture_year) : 0,
                note: mapped.note,
                usage_start_year: mapped.usage_start_year ? Number(mapped.usage_start_year) : 0,
                technical_code_address: mapped.technical_code_address,
                location_coordinates: mapped.location_coordinates,
                daily_operation_time: mapped.daily_operation_time,
                relocation_origin: mapped.relocation_origin,
                relocation_year: mapped.relocation_year ? Number(mapped.relocation_year) : 0,
                fixed_asset_code: mapped.fixed_asset_code,
                using_department: mapped.using_department,
                weight: mapped.weight,
                width: mapped.width,
                length: mapped.length,
                height: mapped.height,
                power_source: mapped.power_source,
                power_consumption: mapped.power_consumption,
                other_specifications: mapped.other_specifications,
                status: this.mapImportStatus(mapped.status_import_raw)
            };

            try {
                const device = await this.create(deviceDto as CreateDeviceDto);
                importedDevices.push(device);
                
                // Add to existing list to catch duplicates within the file itself
                existingDevices.push(device); 
            } catch (e) {
                console.error(`Error importing row ${i}`, e);
                // Optionally add to skipped with error reason
            }
        }

        return {
            imported: importedDevices.length,
            skipped: skippedDevices.length,
            details: skippedDevices
        };
    }

    async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
        try {
            const {userIds, groupId, deviceTypeId, ...deviceData} = createDeviceDto;

            const device = this.deviceRepository.create(deviceData);
            // Validation for enums handled by DTO or database constraints
            
            if (userIds && userIds.length > 0) {
                const users = await this.userRepository.findByIds(userIds);
                device.users = users;
            }

            if (groupId) {
                device.device_group = { id: groupId } as any; 
            }

            if (deviceTypeId) {
                device.deviceType = { id: deviceTypeId } as any;
            }

            const savedDevice = await this.deviceRepository.save(device);
            return this.sanitizeDeviceUsers(savedDevice);
        } catch (error) {
            console.error(error);
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException('Thêm mới trang thiết bị thất bại');
        }
    }

    async findAll(
        filter: { status?: DeviceStatus; name?: string; groupId?: number; deviceTypeId?: number } = {},
        user?: User
    ): Promise<{result: Device[]}> {
        try {
            const query = this.deviceRepository
                .createQueryBuilder('device')
                .leftJoinAndSelect('device.users', 'users')
                .leftJoinAndSelect('device.device_group', 'device_group')
                .leftJoinAndSelect('device.deviceType', 'deviceType')
                .orderBy('device.updated_at', 'DESC');

            if (filter.status) {
                query.andWhere('device.status = :status', { status: filter.status });
            }

            if (filter.name) {
                query.andWhere('LOWER(device.name) LIKE LOWER(:name)', { name: `%${filter.name}%` });
            }

            if (filter.groupId) {
                query.andWhere('device.group_id = :groupId', { groupId: filter.groupId });
            }

            if (filter.deviceTypeId) {
                query.andWhere('device.device_type_id = :deviceTypeId', { deviceTypeId: filter.deviceTypeId });
            }

            // RBAC: Filter by User's Device Groups if OPERATOR
            if (user && user.role === UserRole.OPERATOR) {
                 // Check if user has assigned groups
                 // We need to fetch user's groups first or join them
                 // Let's assume user object passed might not have relations loaded, so safe to query or join.
                 
                 // Option 1: Subquery
                 // device.group_id IN (SELECT group_id FROM user_device_group WHERE user_id = :userId)
                 
                 query.innerJoin(
                     'user_device_group', 
                     'udg', 
                     'udg.group_id = device.group_id AND udg.user_id = :userId', 
                     { userId: user.user_id }
                 );
            }

            const devices = await query.getMany();
            const sanitized = devices.map(this.sanitizeDeviceUsers);

            return {result: sanitized};
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException('Lấy danh sách thiết bị thất bại');
        }
    }

    async findOne(id: number): Promise<Device> {
        try {
            const device = await this.deviceRepository.findOne({
                where: {device_id: id},
                relations: ['users', 'repairs', 'deviceType'],
            });

            if (!device) {
                throw new NotFoundException(`Tìm kiếm trang thiết bị thất bại`);
            }
            return this.sanitizeDeviceUsers(device);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException('Tìm kiếm trang thiết bị thất bại');
        }
    }
    
    // Updated findByUserId similar to previous

    async update(id: number, updateDeviceDto: CreateDeviceDto): Promise<Device> {
        try {
            const device = await this.deviceRepository.findOne({
                where: {device_id: id},
                relations: ['users'],
            });
            if (!device) {
                throw new NotFoundException(`Lấy thông tin trang thiết bị thất bại`);
            }

            const {userIds, groupId, deviceTypeId, ...deviceData} = updateDeviceDto;

            Object.assign(device, deviceData);

            if (userIds) {
                const users = await this.userRepository.findByIds(userIds);
                device.users = users;
            }
            
            if (groupId) {
                device.device_group = { id: groupId } as any;
            }

            if (deviceTypeId) {
                device.deviceType = { id: deviceTypeId } as any;
            }

            const updatedDevice = await this.deviceRepository.save(device);
            return this.sanitizeDeviceUsers(updatedDevice);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException('Cập nhật trang thiết bị thất bại');
        }
    }

    async remove(id: number): Promise<void> {
        try {
            const result = await this.deviceRepository.delete(id);
            if (result.affected === 0) {
                throw new NotFoundException(`Xoá trang thiết bị thất bại`);
            }
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException('Xoá trang thiết bị thất bại');
        }
    }

    private sanitizeDeviceUsers(device: Device): Device {
        if (device.users) {
            device.users = device.users.map(({password, ...rest}) => rest as User);
        }
        return device;
    }

    async getReport(): Promise<DeviceReportSummary> {
        const query = this.deviceRepository.createQueryBuilder('device');
        const total = await query.getCount();
        const counts = await query
            .select('device.status', 'status')
            .addSelect('COUNT(device.device_id)', 'count')
            .groupBy('device.status')
            .getRawMany();

        const summary: any = {
            total,
        };
        // Initialize all statuses to 0
        Object.values(DeviceStatus).forEach(status => {
            summary[status] = 0;
        });

        for (const item of counts) {
            const status = item.status as DeviceStatus;
             // Safe assignment
             summary[status] = Number(item.count);
        }
        return summary as DeviceReportSummary;
    }

    async getMonthlyAnalytics() {
        // Example: Repairs per device, Most frequent cause
        const devices = await this.deviceRepository.find({
            relations: ['repairs']
        });

        const analytics = devices.map(d => {
            const repairCount = d.repairs?.length || 0;
            // Simplified fault cause logic (assuming repair object has cause field or similar log)
            // For now returning basic stats
            return {
                id: d.device_id,
                name: d.name,
                repairCount
            };
        });
        
        return analytics.sort((a,b) => b.repairCount - a.repairCount).slice(0, 5); // Top 5
    }

    async exportDevicesToPdf(): Promise<Buffer> {
        // Minimal PdfMake implementation
        const fonts = {
            Roboto: {
                normal: 'Helvetica',
                bold: 'Helvetica-Bold',
                italics: 'Helvetica-Oblique',
                bolditalics: 'Helvetica-BoldOblique'
            }
        };
        // In real app, load Roboto font files from assets
        const printer = new PdfPrinter(fonts);
        const devices = await this.deviceRepository.find();

        const docDefinition = {
            content: [
                { text: 'Danh sách thiết bị', style: 'header' },
                {
                    table: {
                        body: [
                            ['ID', 'Tên thiết bị', 'Biển số', 'Trạng thái'],
                            ...devices.map(d => [d.device_id, d.name, d.reg_number || '', d.status])
                        ]
                    }
                }
            ],
            styles: {
                header: {
                    fontSize: 18,
                    bold: true,
                    margin: [0, 0, 0, 10]
                }
            },
            defaultStyle: {
                font: 'Roboto'
            }
        };

        // Create PDF
        return new Promise((resolve, reject) => {
             const pdfDoc = printer.createPdfKitDocument(docDefinition);
             const chunks: any[] = [];
             pdfDoc.on('data', (chunk) => chunks.push(chunk));
             pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
             pdfDoc.on('error', (err) => reject(err));
             pdfDoc.end();
        });
    }

    // Restore findByUserId if needed or assume standard findOne allows relations
    async findByUserId(userId: number): Promise<Device[]> {
        const user = await this.userRepository.findOne({
            where: {user_id: userId},
            relations: ['devices'],
        });
        if (!user) {
            throw new NotFoundException(`User not found`);
        }
        const devices = await this.deviceRepository.find({
            where: {users: {user_id: userId}},
            relations: ['users'],
        });
        return devices.map((device) => this.sanitizeDeviceUsers(device));
    }
    private mapImportStatus(statusString: string): DeviceStatus {
        if (!statusString) return DeviceStatus.MOI;
        const normalized = statusString.trim().toLowerCase();
        if (normalized.includes('đang sử dụng')) return DeviceStatus.DANG_SU_DUNG;
        if (normalized.includes('thanh lý')) return DeviceStatus.THANH_LY;
        if (normalized.includes('hỏng') || normalized.includes('sửa chữa')) return DeviceStatus.DANG_SUA_CHUA;
        if (normalized.includes('mới')) return DeviceStatus.MOI;
        return DeviceStatus.MOI;
    }
}
