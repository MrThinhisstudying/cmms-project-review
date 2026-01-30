import {ApiProperty} from '@nestjs/swagger';
import {User} from 'src/user/user.entity';
import {Repair} from 'src/repairs/entities/repair.entity';
import {DeviceStatus} from '../enums/device-status.enum';
import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, OneToMany, ManyToOne, JoinColumn, Index} from 'typeorm';
import { DeviceGroup } from '../../device-groups/entities/device-group.entity';
import { DeviceType } from './device-type.entity';

@Entity()
export class Device {
    @ApiProperty()
    @PrimaryGeneratedColumn()
    device_id: number;

    @ApiProperty()
    @Column({nullable: true, unique: true})
    device_code?: string; // Mã thiết bị

    @ApiProperty()
    @Column({nullable: true})
    name?: string;

    @ApiProperty()
    @Column({nullable: true})
    reg_number?: string; // Biển số đăng ký

    @ApiProperty()
    @Column({nullable: true})
    brand?: string;

    @ApiProperty({enum: DeviceStatus})
    @Index()
    @Column({
        type: 'enum',
        enum: DeviceStatus,
        default: DeviceStatus.DANG_SU_DUNG,
    })
    status: DeviceStatus;

    @ApiProperty()
    @Column({type: 'date', nullable: true})
    inspection_expiry?: Date; // Hạn đăng kiểm

    @ApiProperty()
    @Column({type: 'date', nullable: true})
    insurance_expiry?: Date; // Hạn bảo hiểm

    @ApiProperty()
    @Column({type: 'json', nullable: true})
    license_info?: any; // Thông tin giấy tờ (JSON)

    @ApiProperty()
    @Column({type: 'json', nullable: true})
    assessment_info?: any; // Thông tin đánh giá (JSON)

    @ApiProperty()
    @Column({nullable: true})
    note?: string;

    @ApiProperty()
    @Column({nullable: true})
    usage_purpose?: string;

    @ApiProperty()
    @Column({nullable: true})
    operating_scope?: string;

    @ApiProperty()
    @Column({nullable: true})
    country_of_origin?: string;

    @ApiProperty()
    @Column({nullable: true, default: 0})
    manufacture_year?: number;

    @ApiProperty()
    @Column({nullable: true, default: 0})
    usage_start_year?: number;

    @ApiProperty()
    @Column({nullable: true})
    serial_number?: string;

    @ApiProperty()
    @Column({nullable: true})
    technical_code_address?: string;

    @ApiProperty()
    @Column({nullable: true})
    location_coordinates?: string;

    @ApiProperty()
    @Column({nullable: true})
    daily_operation_time?: string;

    @ApiProperty()
    @Column({nullable: true})
    relocation_origin?: string;

    @ApiProperty()
    @Column({nullable: true, default: 0})
    relocation_year?: number;

    @ApiProperty()
    @Column({nullable: true})
    fixed_asset_code?: string;

    @ApiProperty()
    @Column({nullable: true})
    using_department?: string;

    @ApiProperty()
    @Column({nullable: true})
    weight?: string;

    @ApiProperty()
    @Column({nullable: true})
    length?: string;

    @ApiProperty()
    @Column({nullable: true})
    width?: string;

    @ApiProperty()
    @Column({nullable: true})
    height?: string;

    @ApiProperty()
    @Column({nullable: true})
    power_source?: string;

    @ApiProperty()
    @Column({nullable: true})
    power_consumption?: string;

    @ApiProperty()
    @Column({nullable: true})
    other_specifications?: string;

    @ApiProperty()
    @Column({type: 'json', nullable: true})
    components_inventory?: any; // Danh sách phụ tùng đi kèm

    @ApiProperty()
    @Column({type: 'json', nullable: true})
    relocation_history?: any; // Lịch sử di dời

    @CreateDateColumn()
    created_at?: Date;

    @UpdateDateColumn()
    updated_at?: Date;

    @ManyToMany(() => User, (user) => user.devices)
    users?: User[];

    @Index()
    @ManyToOne(() => DeviceGroup, (deviceGroup) => deviceGroup.devices, { nullable: true })
    @JoinColumn({ name: 'group_id' })
    device_group?: DeviceGroup;

    @OneToMany(() => Repair, (repair) => repair.device, {cascade: true})
    repairs?: Repair[];

    @ManyToOne(() => DeviceType, { nullable: true })
    @JoinColumn({ name: 'device_type_id' })
    deviceType?: DeviceType;

    constructor(data: Partial<Device> = {}) {
        Object.assign(this, data);
    }
}
