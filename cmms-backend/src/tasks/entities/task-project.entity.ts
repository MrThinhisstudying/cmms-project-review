import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Department } from '../../departments/department.entity';
import { User } from '../../user/user.entity';
import { WorkTask } from './work-task.entity';

export type TaskProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

@Entity('task_projects')
export class TaskProject {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    code: string;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ nullable: true })
    dept_id?: number;

    @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'dept_id' })
    department?: Department;

    @Column({ nullable: true })
    manager_id?: number;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'manager_id' })
    manager?: User;

    @Column({ type: 'varchar', length: 30, default: 'ACTIVE' })
    status: TaskProjectStatus;

    @Column({ type: 'date', nullable: true })
    start_date?: string;

    @Column({ type: 'date', nullable: true })
    end_date?: string;

    @OneToMany(() => WorkTask, (task) => task.project)
    tasks?: WorkTask[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}

