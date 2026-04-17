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

export enum RewardDisciplineType {
    REWARD = 'REWARD',
    DISCIPLINE = 'DISCIPLINE'
}

@Entity('reward_disciplines')
export class RewardDiscipline {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.user_id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ nullable: true })
    user_id: number;

    @Column({ type: 'enum', enum: RewardDisciplineType })
    record_type: RewardDisciplineType;

    @Column({ type: 'varchar', length: 100 })
    decision_number: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'date' })
    effective_date: Date;

    @Column({ type: 'varchar', length: 500, nullable: true })
    file_url: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
