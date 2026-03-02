import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/user.entity';
import { TrainingProgram } from './training-program.entity';

export enum TrainingRequirementStatus {
    PENDING = 'PENDING',
    FULFILLED = 'FULFILLED',
}

@Entity('user_training_requirements')
export class UserTrainingRequirement {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.user_id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => TrainingProgram, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'program_id' })
    program: TrainingProgram;

    @Column({ type: 'enum', enum: TrainingRequirementStatus, default: TrainingRequirementStatus.PENDING })
    status: TrainingRequirementStatus;

    @Column({ type: 'date', nullable: true })
    required_date: Date; // Deadline for completion

    @Column({ type: 'text', nullable: true })
    note: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
