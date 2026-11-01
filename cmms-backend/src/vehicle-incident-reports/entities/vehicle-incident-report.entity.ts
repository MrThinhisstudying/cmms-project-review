import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn, Index } from 'typeorm';
import { Device } from 'src/devices/entities/device.entity';
import { User } from 'src/user/user.entity';

export enum IncidentReportStatus {
    PENDING = 'PENDING',                     // Chờ KTV tiếp nhận
    IN_PROGRESS = 'IN_PROGRESS',             // KTV đã tiếp nhận, đang xử lý
    RESOLVED_QUICK = 'RESOLVED_QUICK',       // Đã khắc phục nhanh tại chỗ (đã có xác nhận của người vận hành)
    REQUESTED_REPAIR = 'REQUESTED_REPAIR',   // Đã gửi yêu cầu làm hồ sơ sửa chữa (chờ người vận hành / tổ xe lập hồ sơ)
    CONVERTED_REPAIR = 'CONVERTED_REPAIR',   // Đã chuyển thành Hồ sơ sửa chữa chính thức (B03)
}

@Entity('vehicle_incident_reports')
export class VehicleIncidentReport {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ type: 'int' })
    device_id: number;

    @ManyToOne(() => Device, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'device_id' })
    device: Device;

    // Người báo cáo (Nếu có tài khoản trong hệ thống)
    @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'reporter_user_id' })
    reporter_user?: User;

    @Column({ type: 'int', nullable: true })
    reporter_user_id?: number;

    @Column({ type: 'varchar', length: 150 })
    reporter_name: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    reporter_code?: string; // MSNV

    @Column({ type: 'varchar', length: 150, nullable: true })
    reporter_department?: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    reporter_phone?: string;

    @Column({ type: 'boolean', default: false })
    is_external_reporter: boolean; // true nếu người báo chưa có tài khoản hoặc thuê ngoài

    @Column({ type: 'varchar', length: 255, nullable: true })
    location_issue?: string; // Vị trí xảy ra sự cố / Phương tiện đang đỗ

    @Column({ type: 'text' })
    description: string; // Nội dung báo cáo tình trạng xe

    @Column({ type: 'jsonb', default: [] })
    images: string[]; // Danh sách link ảnh hiện trường (đã nén)

    @Index()
    @Column({
        type: 'enum',
        enum: IncidentReportStatus,
        default: IncidentReportStatus.PENDING,
    })
    status: IncidentReportStatus;

    // Kỹ thuật viên tiếp nhận / xử lý
    @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'technician_id' })
    technician?: User;

    @Column({ type: 'timestamp', nullable: true })
    technician_accepted_at?: Date;

    @Column({ type: 'text', nullable: true })
    quick_solution?: string; // Biện pháp khắc phục nhanh

    // Người vận hành xác nhận kết quả khắc phục
    @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'operator_confirmed_by_id' })
    operator_confirmed_by?: User;

    @Column({ type: 'varchar', length: 150, nullable: true })
    operator_confirmed_name?: string;

    @Column({ type: 'timestamp', nullable: true })
    operator_confirmed_at?: Date;

    @Column({ type: 'text', nullable: true })
    operator_notes?: string;

    // Yêu cầu làm hồ sơ sửa chữa
    @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'assigned_dossier_user_id' })
    assigned_dossier_user?: User;

    @Column({ type: 'int', nullable: true })
    assigned_dossier_user_id?: number;

    @Column({ type: 'varchar', length: 150, nullable: true })
    assigned_dossier_user_name?: string;

    @Column({ type: 'text', nullable: true })
    dossier_request_note?: string; // Ghi chú yêu cầu của KTV khi đề nghị lập hồ sơ B03

    @Column({ type: 'timestamp', nullable: true })
    dossier_requested_at?: Date; // Thời điểm KTV gửi yêu cầu làm hồ sơ

    @Column({ type: 'boolean', default: false })
    is_reporter_in_vehicle_group: boolean; // Kết quả kiểm tra chéo: người báo cáo có thuộc nhóm quản lý xe không

    // Liên kết với phiếu sửa chữa chính quy (Nếu sau này đã tạo Repair B03)
    @Column({ type: 'int', nullable: true })
    converted_repair_id?: number;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;
}
