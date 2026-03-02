import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserCertificate } from './user-certificate.entity';

@Entity('training_programs')
export class TrainingProgram {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    group_name: string; // Tên nhóm chương trình

    @Column({ nullable: true })
    code: string; // Mã CTĐT

    @Column()
    name: string; // Tên CCCM / Khóa học

    @Column({ type: 'int', default: 36 })
    validity_months: number; // Thời hạn định kỳ (tháng)

    @Column({ type: 'int', default: 0 })
    evaluation_days: number; // Thời hạn đánh giá (ngày) sau khi về đơn vị

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @OneToMany(() => UserCertificate, cert => cert.program)
    certificates: UserCertificate[];
}
