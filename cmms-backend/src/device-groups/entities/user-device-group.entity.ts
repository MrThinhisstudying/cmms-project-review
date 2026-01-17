import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/user.entity';
import { DeviceGroup } from './device-group.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class UserDeviceGroup {
    @ApiProperty()
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty()
    @Column()
    user_id: number;

    @ApiProperty()
    @Column()
    group_id: number;

    @ApiProperty()
    @Column({ default: false })
    is_group_lead: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToOne(() => User, (user) => user.user_device_groups)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => DeviceGroup, (deviceGroup) => deviceGroup.user_device_groups)
    @JoinColumn({ name: 'group_id' })
    device_group: DeviceGroup;
}
