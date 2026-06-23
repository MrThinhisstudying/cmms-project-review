import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/user.entity';
import { AnnualLeave } from './annual-leave.entity';

@Entity('leave_histories')
export class LeaveHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int', nullable: true, name: 'annual_leave_id' })
  annual_leave_id: number;

  @ManyToOne(() => AnnualLeave, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'annual_leave_id' })
  annual_leave: AnnualLeave;

  @Column({ type: 'date' })
  from_date: Date;

  @Column({ type: 'date' })
  to_date: Date;

  @Column({ type: 'float' })
  days_taken: number;

  @Column({ type: 'int' })
  applied_month: number;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'text', nullable: true })
  location: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments: string[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
