import {ApiProperty} from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import {Exclude} from 'class-transformer';
import {Department} from 'src/departments/department.entity';
import {Device} from 'src/devices/entities/device.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    BeforeInsert,
    BeforeUpdate,
    ManyToMany,
    JoinTable,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';

import { UserRole } from './user-role.enum';
import { UserDeviceGroup } from '../device-groups/entities/user-device-group.entity';

@Entity()
export class User {
    @ApiProperty()
    @PrimaryGeneratedColumn()
    user_id: number;

    @ApiProperty()
    @Column({nullable: true})
    name?: string;

    @ApiProperty()
    @Column({nullable: true})
    email?: string;

    @ApiProperty({ enum: UserRole })
    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.OPERATOR,
        nullable: true
    })
    role?: UserRole;

    @ApiProperty()
    @Column({type: 'text', nullable: true})
    signature_url?: string;

    @ApiProperty()
    @Column({nullable: true})
    position?: string;

    @ApiProperty()
    @Column({nullable: true})
    @Exclude()
    password?: string;

    @ApiProperty()
    @Column({nullable: true})
    status?: string;

    @ApiProperty()
    @Column({nullable: true})
    citizen_identification_card?: string;

    @ApiProperty()
    @Column({nullable: true})
    avatar?: string;

    @CreateDateColumn()
    created_at?: Date;

    @UpdateDateColumn()
    updated_at?: Date;

    @ManyToMany(() => Device, (device) => device.users)
    @JoinTable()
    devices?: Device[];

    @OneToMany(() => UserDeviceGroup, (userDeviceGroup) => userDeviceGroup.user)
    user_device_groups?: UserDeviceGroup[];

    @ManyToOne(() => Department, (department) => department.users, {
        eager: true,
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({name: 'dept_id'})
    department?: Department;

    @Column({nullable: true})
    reset_token?: string;

    @Column({type: 'timestamp', nullable: true})
    reset_token_expiry?: Date;

    constructor(data: Partial<User> = {}) {
        Object.assign(this, data);
    }

    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword(): Promise<void> {
        const salt = await bcrypt.genSalt();
        if (this.password && !/^\$2[abxy]\$\d+\$/.test(this.password)) {
            this.password = await bcrypt.hash(this.password, salt);
        }
    }

    async checkPassword(plainPassword: string): Promise<boolean> {
        return await bcrypt.compare(plainPassword, this.password);
    }
}
