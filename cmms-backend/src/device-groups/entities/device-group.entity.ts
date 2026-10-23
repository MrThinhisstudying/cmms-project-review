import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { UserDeviceGroup } from './user-device-group.entity';
import { Department } from '../../departments/department.entity';
import { User } from '../../user/user.entity';
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

    @ApiProperty({ required: false })
    @Column({ nullable: true })
    dept_id?: number;

    @ManyToOne(() => Department, (dept) => dept.device_groups, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'dept_id' })
    department?: Department;

    @ApiProperty({ required: false })
    @Column({ nullable: true })
    leader_id?: number;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'leader_id' })
    leader?: User;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @OneToMany(() => Device, (device) => device.device_group)
    devices: Device[];

    @OneToMany(() => UserDeviceGroup, (userDeviceGroup) => userDeviceGroup.device_group)
    user_device_groups: UserDeviceGroup[];
}
