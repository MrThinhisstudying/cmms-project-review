import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { User } from '../../user/user.entity';

export enum ContractType {
    ONE_MONTH = '1_MONTH',
    PROBATION = 'PROBATION',
    TWELVE_MONTHS = '12_MONTHS',
    TWENTY_FOUR_MONTHS = '24_MONTHS',
    THIRTY_SIX_MONTHS = '36_MONTHS',
    INDEFINITE = 'INDEFINITE'
}

export enum ContractStatus {
    ACTIVE = 'ACTIVE',
    EXPIRED = 'EXPIRED',
    TERMINATED = 'TERMINATED'
}

@Entity('labor_contracts')
export class LaborContract {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.user_id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ nullable: true }) // Sometimes might not have user_id if orphaned (though onDelete CASCADE handles it)
    user_id: number;

    @Column({ type: 'varchar', length: 100, unique: true })
    contract_number: string;

    @Column({ type: 'enum', enum: ContractType })
    contract_type: ContractType;

    @Column({ type: 'date' })
    start_date: Date;

    @Column({ type: 'date', nullable: true })
    end_date: Date;

    @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.ACTIVE })
    status: ContractStatus;

    @Column({ type: 'varchar', length: 255, nullable: true })
    job_title: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    file_url: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
