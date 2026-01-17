import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { UserDeviceGroup } from './user-device-group.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class DeviceGroup {
    @ApiProperty()
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty()
    @Column()
    name: string;

    @ApiProperty()
    @Column({ nullable: true })
    description: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @OneToMany(() => Device, (device) => device.device_group)
    devices: Device[];

    @OneToMany(() => UserDeviceGroup, (userDeviceGroup) => userDeviceGroup.device_group)
    user_device_groups: UserDeviceGroup[];
}
