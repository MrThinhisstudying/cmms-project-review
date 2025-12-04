import {ApiProperty} from '@nestjs/swagger';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    DeleteDateColumn,
} from 'typeorm';
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

    // Đã đổi sang varchar để linh hoạt status (active, overdue...)
    @ApiProperty({enum: MaintenanceStatus, default: MaintenanceStatus.ACTIVE})
    @Column({type: 'varchar', default: MaintenanceStatus.ACTIVE})
    status: string;

    @ApiProperty()
    @Column({type: 'text', nullable: true})
    description?: string;

    // Đã đổi sang varchar để linh hoạt level
    @ApiProperty({enum: MaintenanceLevel})
    @Column({type: 'varchar'})
    level: string;

    @ApiProperty({required: false})
    @Column({type: 'timestamp', nullable: true})
    last_notified_slot?: Date;

    // --- CÁC CỘT TIẾN ĐỘ ---
    @ApiProperty({required: false})
    @Column({type: 'timestamp', nullable: true})
    last_maintenance_date: Date;

    @ApiProperty({required: false})
    @Column({type: 'timestamp', nullable: true})
    next_maintenance_date: Date;

    @ApiProperty({required: false})
    @Column({nullable: true})
    current_level: string;
    // ------------------------

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    // --- BỔ SUNG CỘT SOFT DELETE (QUAN TRỌNG) ---
    @DeleteDateColumn()
    deleted_at: Date;
    // ----------------------------------------------

    @OneToMany(() => MaintenanceTicket, (t) => t.maintenance, {cascade: false})
    tickets?: MaintenanceTicket[];

    @Column({type: 'jsonb', nullable: true})
    cycle_config: string[]; // Lưu cấu hình chu kỳ: ['1M', '6M', '1Y']

    @Column({type: 'timestamp', nullable: true})
    start_date: Date; // Mốc thời gian bắt đầu tính chu kỳ
}
