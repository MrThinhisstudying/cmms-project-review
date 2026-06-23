import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/user.entity';

export enum ActivityAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    APPROVE = 'APPROVE',
    REJECT = 'REJECT',
    DELETE = 'DELETE',
    STATUS_CHANGE = 'STATUS_CHANGE',
}

export enum ActivityEntityType {
    REPAIR = 'REPAIR',
    DEVICE = 'DEVICE',
    USER = 'USER',
    DEPARTMENT = 'DEPARTMENT',
    MAINTENANCE = 'MAINTENANCE',
    CERTIFICATE = 'CERTIFICATE',
}

@Entity('activity_log')
export class ActivityLog {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'enum', enum: ActivityEntityType })
    entity_type: ActivityEntityType;

    @Column()
    entity_id: number;

    @Column({ type: 'enum', enum: ActivityAction })
    action: ActivityAction;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'changed_by_id' })
    changed_by: User;

    @Column({ nullable: true })
    changed_by_id: number;

    @Column({ type: 'text', nullable: true })
    old_value: string; // JSON

    @Column({ type: 'text', nullable: true })
    new_value: string; // JSON

    @Column({ type: 'text' })
    description: string;

    @Column({ nullable: true })
    field_name: string; // Tên field thay đổi (nếu là UPDATE)

    @CreateDateColumn()
    created_at: Date;
}
