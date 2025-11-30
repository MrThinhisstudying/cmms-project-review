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

    // --- CẬP NHẬT 1: Đổi kiểu Enum sang String để linh hoạt trạng thái (active, overdue...) ---
    @ApiProperty({enum: MaintenanceStatus, default: MaintenanceStatus.ACTIVE})
    @Column({default: MaintenanceStatus.ACTIVE}) // Bỏ type: 'enum' đi để tránh lỗi DB
    status: string;

    @ApiProperty()
    @Column({type: 'text', nullable: true})
    description?: string;

    // --- CẬP NHẬT 2: Đổi kiểu Enum sang String để hỗ trợ 1M, 2Y... ---
    @ApiProperty({enum: MaintenanceLevel})
    @Column()
    level: string;
    @ApiProperty({required: false})
    @Column({type: 'timestamp', nullable: true})
    last_notified_slot?: Date;

    // --- CẬP NHẬT 3: THÊM 3 CỘT QUAN TRỌNG NÀY (Đang bị thiếu gây lỗi) ---
    @ApiProperty({required: false})
    @Column({type: 'timestamp', nullable: true})
    last_maintenance_date: Date;

    @ApiProperty({required: false})
    @Column({type: 'timestamp', nullable: true})
    next_maintenance_date: Date;

    @ApiProperty({required: false})
    @Column({nullable: true})
    current_level: string;
    // ---------------------------------------------------------------------

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @OneToMany(() => MaintenanceTicket, (t) => t.maintenance, {cascade: false})
    tickets?: MaintenanceTicket[];
}

