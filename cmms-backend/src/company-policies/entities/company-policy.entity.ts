import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn} from 'typeorm';
import {User} from 'src/user/user.entity';
import {CompanyPolicyAck} from './company-policy-ack.entity';

export enum PolicyCategory {
    LABOR_RULES = 'LABOR_RULES', // Nội quy lao động & Kỷ luật
    SAFETY_SECURITY = 'SAFETY_SECURITY', // An toàn lao động & An ninh hàng không
    BENEFITS_LEAVE = 'BENEFITS_LEAVE', // Chế độ phúc lợi, Lương thưởng & Phép năm
    WORKFLOW_PROCESS = 'WORKFLOW_PROCESS', // Quy trình phối hợp liên bộ phận
    GENERAL_NOTICE = 'GENERAL_NOTICE', // Thông báo & Quyết định chung
}

@Entity('company_policies')
export class CompanyPolicy {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({type: 'varchar', length: 100, nullable: true})
    code?: string;

    @Column({type: 'varchar', length: 300})
    title: string;

    @Column({
        type: 'enum',
        enum: PolicyCategory,
        default: PolicyCategory.LABOR_RULES,
    })
    category: PolicyCategory;

    @Column({type: 'text', nullable: true})
    summary?: string;

    @Column({type: 'text', nullable: true})
    content?: string;

    @Column({type: 'text', nullable: true})
    file_url?: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    file_name?: string;

    @Column({type: 'date', nullable: true})
    effective_date?: string;

    @Column({type: 'boolean', default: false})
    is_pinned: boolean;

    @Column({type: 'timestamp', nullable: true})
    pinned_until?: Date | null;

    @Column({type: 'boolean', default: true})
    is_mandatory_ack: boolean;

    @Column({type: 'boolean', default: true})
    is_active: boolean;

    @Column({nullable: true})
    created_by_id?: number;

    @ManyToOne(() => User, {eager: true, nullable: true, onDelete: 'SET NULL'})
    @JoinColumn({name: 'created_by_id'})
    created_by?: User;

    @OneToMany(() => CompanyPolicyAck, (ack) => ack.policy)
    acknowledgments?: CompanyPolicyAck[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
