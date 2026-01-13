import {HttpException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException} from '@nestjs/common';
import {CreateDeviceDto} from './dto/create-device.dto';
import {Device} from './entities/device.entity';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {User} from 'src/user/user.entity';
import * as XLSX from 'xlsx';
import {columnMapping, DeviceStatus} from './enums/device-status.enum';
import {DeviceReportSummary} from './types/device-report.type';

@Injectable()
export class DevicesService {
    constructor(
        @InjectRepository(Device)
        private readonly deviceRepository: Repository<Device>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    async importDevicesFromExcel(buffer: Buffer): Promise<Device[]> {
        const workbook = XLSX.read(buffer, {type: 'buffer', codepage: 65001});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, {defval: ''});

        const createdDevices: Device[] = [];

        const normalizedMapping: Record<string, string> = {};
        for (const [k, v] of Object.entries(columnMapping)) {
            normalizedMapping[k.trim().toLowerCase()] = v;
        }

        for (const row of rows) {
            const mapped: Record<string, any> = {};
            for (const [vnKey, value] of Object.entries(row)) {
                const key = normalizedMapping[vnKey.trim().toLowerCase()];
                if (key) mapped[key] = typeof value === 'string' ? value.trim() : value;
            }

            const name = String(mapped.name ?? '').trim();
            const brand = String(mapped.brand ?? '').trim();
            const serial_number = String(mapped.serial_number ?? '').trim();
            if (!name) continue;

            const deviceDto: CreateDeviceDto = {
                name,
                brand,
                serial_number,
                usage_purpose: mapped.usage_purpose ?? '',
                operating_scope: mapped.operating_scope ?? '',
                country_of_origin: mapped.country_of_origin ?? '',
                manufacture_year: mapped.manufacture_year ? Number(mapped.manufacture_year) : 0,
                note: mapped.note ?? '',
                usage_start_year: mapped.usage_start_year ? Number(mapped.usage_start_year) : 0,
                technical_code_address: mapped.technical_code_address ?? '',
                location_coordinates: mapped.location_coordinates ?? '',
                daily_operation_time: mapped.daily_operation_time ?? '',
                relocation_origin: mapped.relocation_origin ?? '',
                relocation_year: mapped.relocation_year ? Number(mapped.relocation_year) : 0,
                fixed_asset_code: mapped.fixed_asset_code ?? '',
                using_department: mapped.using_department ?? '',
                weight: mapped.weight ?? '',
                width: mapped.width ?? '',
                height: mapped.height ?? '',
                power_source: mapped.power_source ?? '',
                power_consumption: mapped.power_consumption ?? '',
                other_specifications: mapped.other_specifications ?? '',
                userIds: Array.isArray(mapped.userIds) ? mapped.userIds : [],
            };

            const device = await this.create(deviceDto);
            createdDevices.push(device);
        }

        return createdDevices;
    }

    normalizeHeader(header: string): string {
        return header.replace(/\s+/g, ' ').trim();
    }

    async parseExcelBuffer(buffer: Buffer): Promise<{columns: string[]; rows: any[]}> {
        try {
            const workbook = XLSX.read(buffer, {
                type: 'buffer',
                codepage: 65001,
            });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet, {defval: ''});

            if (data.length === 0) {
                return {columns: [], rows: []};
            }

            const mappedRows = data.map((row: any) => {
                const mapped: any = {};
                for (const col of Object.keys(row)) {
                    const normalizedCol = this.normalizeHeader(col);
                    const engKey = columnMapping[normalizedCol];
                    if (engKey) {
                        mapped[engKey] = row[col];
                    } else {
                        mapped[normalizedCol] = row[col];
                    }
                }
                return mapped;
            });

            const columns = Object.keys(mappedRows[0]);

            return {
                columns,
                rows: mappedRows,
            };
        } catch (err) {
            throw new HttpException('Không phân tích được tệp', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
        try {
            const {userIds, ...deviceData} = createDeviceDto;

            const device = this.deviceRepository.create(deviceData);

            if (userIds && userIds.length > 0) {
                const users = await this.userRepository.findByIds(userIds);
                device.users = users;
            }

            const savedDevice = await this.deviceRepository.save(device);
            return this.sanitizeDeviceUsers(savedDevice);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException('Thêm mới trang thiết bị thất bại');
        }
    }

    async findAll(): Promise<{result: Device[]}> {
        try {
            const devices = await this.deviceRepository.find({
                relations: ['users', 'device_group'],
                order: {
                    updated_at: 'DESC',
                },
            });

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
                relations: ['users'],
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

    async findByUserId(userId: number): Promise<Device[]> {
        try {
            const user = await this.userRepository.findOne({
                where: {user_id: userId},
                relations: ['devices'],
            });
            if (!user) {
                throw new NotFoundException(`Tìm kiếm trang thiết bị thất bại`);
            }

            const devices = await this.deviceRepository.find({
                where: {users: {user_id: userId}},
                relations: ['users'],
            });

            return devices.map((device) => this.sanitizeDeviceUsers(device));
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException('Tìm kiếm trang thiết bị thất bại');
        }
    }

    async update(id: number, updateDeviceDto: CreateDeviceDto): Promise<Device> {
        try {
            const device = await this.deviceRepository.findOne({
                where: {device_id: id},
                relations: ['users'],
            });
            if (!device) {
                throw new NotFoundException(`Lấy thông tin trang thiết bị thất bại`);
            }

            const {userIds, ...deviceData} = updateDeviceDto;

            Object.assign(device, deviceData);

            if (userIds) {
                const users = await this.userRepository.findByIds(userIds);
                device.users = users;
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

        const summary: DeviceReportSummary = {
            total,
            [DeviceStatus.MOI]: 0,
            [DeviceStatus.DANG_SU_DUNG]: 0,
            [DeviceStatus.THANH_LY]: 0,
            [DeviceStatus.HUY_BO]: 0,
        };

        for (const item of counts) {
            const status = item.status as DeviceStatus;
            if (summary.hasOwnProperty(status)) {
                summary[status] = Number(item.count);
            }
        }

        return summary;
    }
}
