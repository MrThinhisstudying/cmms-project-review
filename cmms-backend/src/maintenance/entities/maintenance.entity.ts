import {ApiProperty} from '@nestjs/swagger';
import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany} from 'typeorm';
import {Device} from 'src/devices/entities/device.entity';
import {User} from 'src/user/user.entity';
import {Department} from 'src/departments/department.entity';
import {MaintenanceLevel, MaintenanceStatus} from '../enum/maintenance.enum';
import {MaintenanceTicket} from 'src/maintenance-ticket/entities/maintenance-ticket.entity';

@Entity()
export class Maintenance {
    @ApiProperty()
    @PrimaryGeneratedColumn()
    maintenance_id: number;

    @ApiProperty({type: () => Device})
    @ManyToOne(() => Device, {eager: true, onDelete: 'CASCADE'})
    @JoinColumn({name: 'device_id'})
    device: Device;

    @ApiProperty({type: () => User, required: false})
    @ManyToOne(() => User, {eager: true, nullable: true, onDelete: 'SET NULL'})
    @JoinColumn({name: 'user_id'})
    user?: User;

    @ApiProperty({type: () => Department, required: false})
    @ManyToOne(() => Department, {eager: true, nullable: true, onDelete: 'SET NULL'})
    @JoinColumn({name: 'dept_id'})
    department?: Department;

    @ApiProperty()
    @Column({type: 'timestamp', nullable: true})
    scheduled_date: Date;

    @ApiProperty({required: false})
    @Column({type: 'timestamp', nullable: true})
    expired_date?: Date;

    @ApiProperty({enum: MaintenanceStatus, default: MaintenanceStatus.ACTIVE})
    @Column({type: 'enum', enum: MaintenanceStatus, default: MaintenanceStatus.ACTIVE})
    status: MaintenanceStatus;

    @ApiProperty()
    @Column({type: 'text', nullable: true})
    description?: string;

    @ApiProperty({enum: MaintenanceLevel})
    @Column({type: 'enum', enum: MaintenanceLevel})
    level: MaintenanceLevel;

    @ApiProperty({required: false})
    @Column({type: 'timestamp', nullable: true})
    last_notified_slot?: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @OneToMany(() => MaintenanceTicket, (t) => t.maintenance, {cascade: false})
    tickets?: MaintenanceTicket[];
}

