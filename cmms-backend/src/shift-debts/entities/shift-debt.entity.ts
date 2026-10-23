import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/user.entity';
import { Department } from '../../departments/department.entity';

@Entity('shift_debts')
export class ShiftDebt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int', nullable: true, name: 'department_id' })
  department_id: number;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id', referencedColumnName: 'dept_id' })
  department: Department;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  month: number; // 1 -> 12

  // Nợ ca/lễ tồn tháng trước (số ngày)
  @Column({ type: 'float', default: 0 })
  opening_debt: number;

  // Nghỉ bù ca/lễ phát sinh trong tháng (số ngày)
  @Column({ type: 'float', default: 0 })
  taken_days: number;

  // Nợ ca/lễ phát sinh trong tháng (số ngày)
  @Column({ type: 'float', default: 0 })
  accrued_days: number;

  // Nợ ca/lễ tồn tính đến hết tháng báo cáo (số ngày) = opening_debt - taken_days + accrued_days
  @Column({ type: 'float', default: 0 })
  closing_debt: number;

  // Ghi chú lý do nợ ca/lễ trong tháng
  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
