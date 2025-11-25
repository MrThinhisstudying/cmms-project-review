import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index} from 'typeorm';
import {AuditTransaction} from './audit-transaction.entity';

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'ROLLBACK';

@Entity('audit_logs')
@Index(['entity_name', 'entity_id', 'created_at'])
export class AuditLog {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    entity_name: string;

    @Column()
    entity_id: string;

    @Column({type: 'enum', enum: ['INSERT', 'UPDATE', 'DELETE', 'ROLLBACK']})
    action: AuditAction;

    @Column({nullable: true})
    actor_user_id?: number;

    @Column({type: 'json', nullable: true})
    before?: any;

    @Column({type: 'json', nullable: true})
    after?: any;

    @Column({type: 'json', nullable: true})
    diff?: any;

    @Column({nullable: true})
    reason?: string;

    @CreateDateColumn()
    created_at: Date;

    @Column({type: 'boolean', default: false})
    rolled_back: boolean;

    @Column({type: 'timestamp', nullable: true})
    rolled_back_at?: Date;

    @ManyToOne(() => AuditTransaction, (t) => t.logs, {onDelete: 'CASCADE', nullable: true})
    transaction?: AuditTransaction;
}
