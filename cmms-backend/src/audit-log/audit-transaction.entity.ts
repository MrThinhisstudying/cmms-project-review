import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { AuditLog } from './audit-log.entity';

@Entity('audit_transactions')
export class AuditTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  actor_user_id?: number;

  @Column({ nullable: true })
  reason?: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => AuditLog, (log) => log.transaction, { cascade: true })
  logs: AuditLog[];
}
