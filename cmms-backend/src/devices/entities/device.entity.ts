import {ApiProperty} from '@nestjs/swagger';
import {User} from 'src/user/user.entity';
import {Repair} from 'src/repairs/entities/repair.entity';
import {DeviceStatus} from '../enums/device-status.enum';
import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, OneToMany} from 'typeorm';

@Entity()
export class Device {
    @ApiProperty()
    @PrimaryGeneratedColumn()
    device_id: number;

    @ApiProperty()
    @Column({nullable: true})
    name?: string;

    @ApiProperty()
    @Column({nullable: true})
    brand?: string;

    @ApiProperty({enum: DeviceStatus})
    @Column({
        type: 'enum',
        enum: DeviceStatus,
        default: DeviceStatus.MOI,
    })
    status: DeviceStatus;

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

    @CreateDateColumn()
    created_at?: Date;

    @UpdateDateColumn()
    updated_at?: Date;

    @ManyToMany(() => User, (user) => user.devices)
    users?: User[];

    @OneToMany(() => Repair, (repair) => repair.device, {cascade: true})
    repairs?: Repair[];

    constructor(data: Partial<Device> = {}) {
        Object.assign(this, data);
    }
}
