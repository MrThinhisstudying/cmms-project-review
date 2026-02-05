import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn, JoinColumn, Index} from 'typeorm';
import {Device} from 'src/devices/entities/device.entity';
import {User} from 'src/user/user.entity';
import {Department} from 'src/departments/department.entity';
import {StockOut} from 'src/stock-out/entities/stock-out.entity';

@Entity('repair')
export class Repair {
    @PrimaryGeneratedColumn()
    repair_id: number;

    @Index()
    @ManyToOne(() => Device, {eager: true, onDelete: 'CASCADE'})
    @JoinColumn({name: 'device_id'})
    device: Device;

    @ManyToOne(() => User, {eager: true})
    @JoinColumn({name: 'created_by'})
    created_by: User;

    @Index()
    @ManyToOne(() => Department, {eager: true})
    @JoinColumn({name: 'created_department_id'})
    created_department: Department;

    @Column({nullable: true})
    location_issue?: string;

    @Column({nullable: true})
    recommendation?: string;

    @Column({nullable: true})
    note?: string;

    @Index()
    @Column({default: 'WAITING_TECH'})
    status_request: 'WAITING_TECH' | 'WAITING_MANAGER' | 'WAITING_DIRECTOR' | 'REJECTED_B03' | 'COMPLETED';
    
    @ManyToOne(() => User, {eager: true, nullable: true})
    @JoinColumn({name: 'approved_by_tech_request'})
    approved_by_tech_request?: User;

    @ManyToOne(() => User, {eager: true, nullable: true})
    @JoinColumn({name: 'approved_by_manager_request'})
    approved_by_manager_request?: User;

    @ManyToOne(() => User, {eager: true, nullable: true})
    @JoinColumn({name: 'approved_by_admin_request'})
    approved_by_admin_request?: User;

    @Column({type: 'jsonb', nullable: true})
    inspection_materials: {
        item_id?: number;
        item_name?: string;
        unit?: string;
        specifications?: string;
        quantity?: number;
        is_new?: boolean;
        notes?: string;
        phase?: 'inspection' | 'acceptance';
    }[];

    @ManyToOne(() => User, {eager: true, nullable: true})
    @JoinColumn({name: 'inspection_created_by'})
    inspection_created_by?: User;

    @Column({type: 'timestamp', nullable: true})
    inspection_created_at?: Date;

    @Column({type: 'timestamp', nullable: true})
    inspection_approved_at?: Date;

    @Column({type: 'int', nullable: true})
    inspection_duration_minutes?: number;

    @Column({type: 'jsonb', nullable: true})
    inspection_items?: {
        description: string;
        cause?: string;
        solution?: string;
        notes?: string;
    }[];

    @Column({type: 'text', nullable: true})
    inspection_other_opinions?: string;

    @ManyToMany(() => User, {eager: true})
    @JoinTable({
        name: 'repair_inspection_committee',
        joinColumn: {name: 'repair_id', referencedColumnName: 'repair_id'},
        inverseJoinColumn: {name: 'user_id', referencedColumnName: 'user_id'}
    })
    inspection_committee?: User[];

    @Index()
    @Column({default: 'inspection_pending'})
    status_inspection: 'inspection_pending' | 'inspection_lead_approved' | 'inspection_manager_approved' | 'inspection_admin_approved' | 'REJECTED_B04';

    @ManyToOne(() => User, {eager: true, nullable: true})
    @JoinColumn({name: 'approved_by_manager_inspection'})
    approved_by_manager_inspection?: User;

    @ManyToOne(() => User, {eager: true, nullable: true})
    @JoinColumn({name: 'approved_by_admin_inspection'})
    approved_by_admin_inspection?: User;

    @Column({type: 'text', nullable: true})
    acceptance_note?: string;

    @ManyToOne(() => User, {eager: true, nullable: true})
    @JoinColumn({name: 'acceptance_created_by'})
    acceptance_created_by?: User;

    @Column({type: 'timestamp', nullable: true})
    acceptance_created_at?: Date;

    @Column({type: 'timestamp', nullable: true})
    acceptance_approved_at?: Date;

    @Column({type: 'int', nullable: true})
    acceptance_duration_minutes?: number;

    @Column({type: 'text', nullable: true})
    failure_cause?: string;

    @Column({type: 'text', nullable: true})
    failure_description?: string;

    @Column({type: 'jsonb', nullable: true})
    recovered_materials?: Array<{
        name: string;
        quantity: number;
        unit: string;
        damage_percentage: number;
    }>;

    @Column({type: 'jsonb', nullable: true})
    materials_to_scrap?: Array<{
        name: string;
        quantity: number;
        unit: string;
        damage_percentage: number;
    }>;

    @Column({type: 'text', nullable: true})
    acceptance_other_opinions?: string;

    @ManyToMany(() => User, {eager: true})
    @JoinTable({
        name: 'repair_acceptance_committee',
        joinColumn: {name: 'repair_id', referencedColumnName: 'repair_id'},
        inverseJoinColumn: {name: 'user_id', referencedColumnName: 'user_id'}
    })
    acceptance_committee?: User[];

    @Index()
    @Column({default: 'acceptance_pending'})
    status_acceptance: 'acceptance_pending' | 'acceptance_lead_approved' | 'acceptance_manager_approved' | 'acceptance_admin_approved' | 'REJECTED_B05';

    @ManyToOne(() => User, {eager: true, nullable: true})
    @JoinColumn({name: 'approved_by_manager_acceptance'})
    approved_by_manager_acceptance?: User;

    @ManyToOne(() => User, {eager: true, nullable: true})
    @JoinColumn({name: 'approved_by_admin_acceptance'})
    approved_by_admin_acceptance?: User;

    // --- Strict Workflow Additions ---

    @ManyToOne(() => User, { eager: true, nullable: true })
    @JoinColumn({ name: 'approved_by_operator_lead_inspection' })
    approved_by_operator_lead_inspection?: User;

    @ManyToOne(() => User, { eager: true, nullable: true })
    @JoinColumn({ name: 'approved_by_operator_lead_acceptance' })
    approved_by_operator_lead_acceptance?: User;

    @Column({ type: 'text', nullable: true })
    rejection_reason?: string;

    @ManyToOne(() => User, { eager: true, nullable: true })
    @JoinColumn({ name: 'rejected_by' })
    rejected_by?: User;

    @Column({ default: 'PENDING', nullable: true })
    limited_use_status?: 'PENDING' | 'APPROVED' | 'REJECTED';

    @OneToMany(() => StockOut, (s) => s.repair)
    stock_outs?: StockOut[];

    @Column({default: false})
    canceled: boolean;

    @Column({type: 'timestamp', nullable: true})
    canceled_at?: Date;

    @Index()
    @CreateDateColumn()
    created_at: Date;

    @Column({type: 'jsonb', nullable: true})
    extra_config?: any;

    @UpdateDateColumn()
    updated_at: Date;
}
