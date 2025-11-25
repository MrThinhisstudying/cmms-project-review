import {Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, CreateDateColumn, UpdateDateColumn} from 'typeorm';
import {Maintenance} from 'src/maintenance/entities/maintenance.entity';
import {Device} from 'src/devices/entities/device.entity';
import {User} from 'src/user/user.entity';
import {Department} from 'src/departments/department.entity';
import {TicketStatus} from '../enum/ticket.enum';

@Entity({name: 'maintenance_tickets'})
export class MaintenanceTicket {
    @PrimaryGeneratedColumn()
    ticket_id: number;

    @ManyToOne(() => Maintenance, (m) => m.tickets, {onDelete: 'CASCADE', eager: true})
    @JoinColumn({name: 'maintenance_id'})
    maintenance: Maintenance;

    @ManyToOne(() => Device, {onDelete: 'CASCADE', eager: true})
    @JoinColumn({name: 'device_id'})
    device: Device;

    @ManyToOne(() => User, {nullable: true, onDelete: 'SET NULL', eager: true})
    @JoinColumn({name: 'user_id'})
    user: User | null;

    @ManyToOne(() => Department, {nullable: true, onDelete: 'SET NULL', eager: true})
    @JoinColumn({name: 'dept_id'})
    department: Department | null;

    @Column({type: 'enum', enum: ['open', 'in_progress', 'done', 'canceled'], default: 'open'})
    status: TicketStatus;

    @Column({type: 'timestamp', nullable: true})
    scheduled_at: Date | null;

    @Column({type: 'timestamp', nullable: true})
    started_at: Date | null;

    @Column({type: 'timestamp', nullable: true})
    completed_at: Date | null;

    @Column({type: 'text', nullable: true})
    description: string | null;

    @Column({type: 'timestamp', nullable: true})
    last_notified_slot?: Date | null;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
