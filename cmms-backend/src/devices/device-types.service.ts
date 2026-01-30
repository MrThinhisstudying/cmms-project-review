import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceType } from './entities/device-type.entity';
import { CreateDeviceTypeDto } from './dto/create-device-type.dto';
import { UpdateDeviceTypeDto } from './dto/update-device-type.dto';

@Injectable()
export class DeviceTypesService implements OnModuleInit {
    constructor(
        @InjectRepository(DeviceType)
        private deviceTypeRepo: Repository<DeviceType>,
    ) {}

    async onModuleInit() {
        const count = await this.deviceTypeRepo.count();
        if (count === 0) {
            const defaults = [
                { name: "Xe Đầu Kéo", code: "xe_dau_keo" },
                { name: "Xe Chở Khách (Bus)", code: "xe_cho_khach" },
                { name: "Xe Cấp Điện (GPU)", code: "xe_cap_dien" },
                { name: "Xe Cứu Hỏa", code: "xe_cuu_hoa" },
                { name: "Xe Băng Chuyền", code: "xe_bang_chuyen" },
                { name: "Xe Thang", code: "xe_thang" },
                { name: "Khác", code: "khac" },
            ];
            await this.deviceTypeRepo.save(defaults);
            console.log("Seeded default device types");
        }
    }

    async findAll() {
        return this.deviceTypeRepo.find({ order: { id: 'DESC' } });
    }

    async findOne(id: number) {
        return this.deviceTypeRepo.findOne({ where: { id } });
    }

    async create(dto: CreateDeviceTypeDto) {
        const newItem = this.deviceTypeRepo.create(dto);
        return this.deviceTypeRepo.save(newItem);
    }

    async update(id: number, dto: UpdateDeviceTypeDto) {
        await this.deviceTypeRepo.update(id, dto);
        return this.findOne(id);
    }

    async remove(id: number) {
        await this.deviceTypeRepo.delete(id);
        return { success: true };
    }
}
