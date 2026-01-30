import {Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, CreateDateColumn, UpdateDateColumn} from 'typeorm';
import {Maintenance} from 'src/maintenance/entities/maintenance.entity';
import {Device} from 'src/devices/entities/device.entity';
import {User} from 'src/user/user.entity';
import {Department} from 'src/departments/department.entity';
import {MaintenanceChecklistTemplate} from 'src/maintenance/entities/maintenance-checklist-template.entity';
import {TicketStatus} from '../enum/ticket.enum';

@Entity({name: 'maintenance_tickets'})
export class MaintenanceTicket {
    @PrimaryGeneratedColumn()
    ticket_id: number;

    // --- CÁC CỘT MỚI (ĐÃ THÊM name ĐỂ ÉP KIỂU) ---

    // 1. Link tới Mẫu phiếu
    @ManyToOne(() => MaintenanceChecklistTemplate, {
        nullable: true,
        onDelete: 'SET NULL', // <--- QUAN TRỌNG: Đổi thành SET NULL
    })
    @JoinColumn({name: 'checklist_template_id'})
    template: MaintenanceChecklistTemplate;

    // 2. Cấp bảo dưỡng
    @Column({name: 'maintenance_level', nullable: true})
    maintenance_level: string;

    // 3. Kết quả kiểm tra chi tiết (JSON)
    @Column({name: 'checklist_result', type: 'jsonb', nullable: true})
    checklist_result: any;

    // 4. Kết quả nghiệm thu tổng hợp (JSON)
    @Column({name: 'result_summary', type: 'jsonb', nullable: true})
    result_summary: any;

    // 5. Vấn đề phát sinh
    @Column({name: 'arising_issues', type: 'text', nullable: true})
    arising_issues: string;

    // 6. Đường dẫn file PDF
    @Column({name: 'pdf_file_path', nullable: true})
    pdf_file_path: string;

    // ------------------------------------------

    @ManyToOne(() => Maintenance, (m) => m.tickets, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'maintenance_id'})
    maintenance: Maintenance;

    @ManyToOne(() => Device, {onDelete: 'CASCADE', eager: true})
    @JoinColumn({name: 'device_id'})
    device: Device;

    @ManyToOne(() => User, {nullable: true, onDelete: 'SET NULL', eager: true})
    @JoinColumn({name: 'user_id'})
    user: User | null;

    @ManyToOne(() => Department, {nullable: true, onDelete: 'SET NULL', eager: true})
    @JoinColumn({name: 'dept_id'})
    department: Department | null;

    @Column({type: 'enum', enum: ['open', 'in_progress', 'done', 'canceled'], default: 'open'})
    status: TicketStatus;

    @Column({type: 'timestamp', nullable: true})
    scheduled_at: Date | null;

    @Column({type: 'timestamp', nullable: true})
    started_at: Date | null;

    @Column({type: 'timestamp', nullable: true})
    completed_at: Date | null;

    @Column({type: 'text', nullable: true})
    description: string | null;

    @Column({type: 'timestamp', nullable: true})
    last_notified_slot?: Date | null;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    // --- CÁC CỘT MỚI THÊM (COPY ĐOẠN NÀY VÀO) ---

    @Column({name: 'working_hours', type: 'float', nullable: true})
    working_hours: number;

    @Column({name: 'execution_team', type: 'jsonb', nullable: true})
    execution_team: any;

    @Column({name: 'acceptance_result', type: 'jsonb', nullable: true})
    acceptance_result: any;

    @Column({name: 'final_conclusion', type: 'boolean', nullable: true})
    final_conclusion: boolean;

    @Column({name: 'execution_date', type: 'timestamp', nullable: true})
    execution_date: Date;

    // ---------------------------------------------

    // Người ký: Đội trưởng/Đội phó
    @ManyToOne(() => User, {eager: true})
    @JoinColumn({name: 'leader_user_id'})
    leader_user: User;

    // @Column({nullable: true})
    //leader_user_id: number;

    // Người ký: Tổ viên
    @ManyToOne(() => User, {eager: true})
    @JoinColumn({name: 'operator_user_id'})
    operator_user: User;

    //@Column({nullable: true})
    // operator_user_id: number;

    // --- THÔNG TIN HỦY PHIẾU ---
    @Column({type: 'text', nullable: true})
    cancel_reason: string;

    @ManyToOne(() => User, {nullable: true, eager: true})
    @JoinColumn({name: 'cancelled_by_id'})
    cancelled_by: User;
}

