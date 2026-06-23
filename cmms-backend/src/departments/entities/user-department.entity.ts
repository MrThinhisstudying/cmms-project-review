import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/user.entity';
import { Department } from '../department.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Bảng trung gian User ↔ Department (nhiều-nhiều)
 * Cho phép 1 nhân viên thuộc nhiều Tổ/Đội + vai trò khác nhau ở từng nơi
 */
@Entity('user_department')
export class UserDepartment {
    @ApiProperty()
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty()
    @Column()
    user_id: number;

    @ApiProperty()
    @Column()
    dept_id: number;

    @ApiProperty({ enum: ['MEMBER', 'DEPUTY_LEAD', 'LEAD'], default: 'MEMBER' })
    @Column({
        type: 'enum',
        enum: ['MEMBER', 'DEPUTY_LEAD', 'LEAD'],
        default: 'MEMBER',
    })
    role_in_dept: 'MEMBER' | 'DEPUTY_LEAD' | 'LEAD';
    // MEMBER = Thành viên
    // DEPUTY_LEAD = Tổ phó / Đội phó
    // LEAD = Tổ trưởng / Đội trưởng

    @ApiProperty({ description: 'Đơn vị chính của nhân viên', default: false })
    @Column({ default: false })
    is_primary: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToOne(() => User, (user) => user.user_departments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Department, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'dept_id' })
    department: Department;
}
