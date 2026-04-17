import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/user.entity';

@Entity('annual_leaves')
export class AnnualLeave {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int' })
  year: number;

  // Tồn phép từ 2 năm trước (Vd: Tồn 2024 tính trong năm 2026)
  @Column({ type: 'float', default: 0 })
  leave_balance_n2: number;

  // Tồn phép từ 1 năm trước (Vd: Tồn 2025 tính trong năm 2026)
  @Column({ type: 'float', default: 0 })
  leave_balance_n1: number;

  // Phép chuẩn cấp năm nay (Vd: Phép 2026)
  @Column({ type: 'float', default: 0 })
  current_year_leave: number;

  // Số lượng phép đã sử dụng theo từng tháng ( Tháng 1 -> 12)
  @Column({ type: 'float', default: 0 }) m1_taken: number;
  @Column({ type: 'float', default: 0 }) m2_taken: number;
  @Column({ type: 'float', default: 0 }) m3_taken: number;
  @Column({ type: 'float', default: 0 }) m4_taken: number;
  @Column({ type: 'float', default: 0 }) m5_taken: number;
  @Column({ type: 'float', default: 0 }) m6_taken: number;
  @Column({ type: 'float', default: 0 }) m7_taken: number;
  @Column({ type: 'float', default: 0 }) m8_taken: number;
  @Column({ type: 'float', default: 0 }) m9_taken: number;
  @Column({ type: 'float', default: 0 }) m10_taken: number;
  @Column({ type: 'float', default: 0 }) m11_taken: number;
  @Column({ type: 'float', default: 0 }) m12_taken: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
