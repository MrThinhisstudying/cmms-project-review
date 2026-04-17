import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/user.entity';
import { TrainingProgram } from './training-program.entity';

export enum CertificateType {
    CCCM = 'CCCM',
    QDCN = 'QDCN',
    GIAY_PHEP = 'GIAY_PHEP',
    NANG_DINH = 'NANG_DINH',
    BANG_CAP = 'BANG_CAP',
}

export enum CertificateStatus {
    ACTIVE = 'ACTIVE',
    EXPIRED = 'EXPIRED',
    REVOKED = 'REVOKED',
}

@Entity('user_certificates')
export class UserCertificate {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.user_id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => TrainingProgram, program => program.certificates, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'program_id' })
    program: TrainingProgram;

    @Column({ type: 'enum', enum: CertificateType, default: CertificateType.CCCM })
    type: CertificateType;

    @Column({ nullable: true })
    file_url: string; // Link tải file scan

    @Column({ type: 'date', nullable: true })
    start_date: Date; // Ngày bắt đầu khóa học

    @Column({ type: 'date', nullable: true })
    end_date: Date; // Ngày kết thúc

    @Column({ nullable: true })
    decision_number: string; // Số quyết định

    @Column({ type: 'date', nullable: true })
    issue_date: Date; // Ngày cấp

    @Column({ nullable: true })
    certificate_number: string; // Số chứng chỉ/giấy phép

    @Column({ type: 'date', nullable: true })
    return_date: Date; // Ngày học viên trở về đơn vị

    @Column({ type: 'date', nullable: true })
    evaluation_submit_date: Date; // Ngày nộp phiếu đánh giá

    @Column({ nullable: true })
    grading: string; // Xếp loại

    @Column({ type: 'int', default: 0 })
    evaluation_days: number; // Số ngày đánh giá

    @Column({ type: 'date', nullable: true })
    next_training_date: Date; // Ngày phải học định kỳ

    @Column({ type: 'enum', enum: CertificateStatus, default: CertificateStatus.ACTIVE })
    status: CertificateStatus;

    // === Bằng cấp (Degree) fields ===
    @Column({ nullable: true })
    degree_type: string; // Cao đẳng, Cử nhân, Thạc sĩ, Tiến sĩ...

    @Column({ nullable: true })
    major: string; // Chuyên ngành

    @Column({ nullable: true })
    school_name: string; // Tên trường

    @Column({ type: 'int', nullable: true })
    graduation_year: number; // Năm tốt nghiệp

    @Column({ nullable: true })
    study_mode: string; // Hình thức đào tạo: Chính quy, Tại chức, Từ xa

    // === Giấy phép lái xe (Driver License) fields ===
    @Column({ nullable: true })
    license_class: string; // Hạng: A1, A2, B1, B2, C, D, E

    @Column({ nullable: true })
    issuing_place: string; // Nơi cấp

    @Column({ type: 'date', nullable: true })
    expiry_date: Date; // Có giá trị đến

    @Column({ type: 'boolean', default: false })
    is_permanent: boolean; // Không thời hạn

    @Column({ nullable: true })
    qualification_type: string; // 'BANG_CAP' | 'GIAY_PHEP_LAI_XE' - phân biệt loại trong tab Quản lý trình độ

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
