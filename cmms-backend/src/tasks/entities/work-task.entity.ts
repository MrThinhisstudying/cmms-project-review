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
import { User } from '../../user/user.entity';
import { Department } from '../../departments/department.entity';
import { DeviceGroup } from '../../device-groups/entities/device-group.entity';
import { TaskProject } from './task-project.entity';
import { TaskComment } from './task-comment.entity';

export type WorkTaskType = 'PROJECT' | 'RECURRING' | 'DIRECTIVE';
export type WorkTaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type WorkTaskStatus =
    | 'NEW'
    | 'CHANGE_REQUESTED'
    | 'IN_PROGRESS'
    | 'PENDING_REVIEW'
    | 'COMPLETED'
    | 'REJECTED'
    | 'CANCELLED';

export interface ITaskCollaborator {
    user_id: number;
    name: string;
    role?: 'COLLABORATOR' | 'WATCHER';
    avatar?: string;
    position?: string;
}

export interface ITaskChecklistItem {
    id: string;
    title: string;
    completed: boolean;
    completed_at?: string | null;
    completed_by?: string | null;
}

export interface ITaskAttachment {
    name: string;
    url: string;
    uploaded_by?: string;
    uploaded_at?: string;
    type?: 'ATTACHMENT' | 'EVIDENCE';
}

@Entity('work_tasks')
export class WorkTask {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    code: string;

    @Column()
    title: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'varchar', length: 30, default: 'DIRECTIVE' })
    task_type: WorkTaskType;

    @Column({ type: 'varchar', length: 20, default: 'NORMAL' })
    priority: WorkTaskPriority;

    @Column({ type: 'varchar', length: 30, default: 'NEW' })
    status: WorkTaskStatus;

    @Column({ type: 'int', default: 0 })
    progress: number;

    @Column({ nullable: true })
    project_id?: number | null;

    @ManyToOne(() => TaskProject, (project) => project.tasks, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'project_id' })
    project?: TaskProject;

    @Column({ nullable: true })
    parent_id?: number | null;

    @ManyToOne(() => WorkTask, (task) => task.subtasks, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'parent_id' })
    parent?: WorkTask;

    @OneToMany(() => WorkTask, (task) => task.parent)
    subtasks?: WorkTask[];

    @Column()
    assigner_id: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'assigner_id' })
    assigner: User;

    @Column()
    assignee_id: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'assignee_id' })
    assignee: User;

    @Column({ nullable: true })
    dept_id?: number | null;

    @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'dept_id' })
    department?: Department;

    @Column({ nullable: true })
    device_group_id?: number | null;

    @ManyToOne(() => DeviceGroup, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'device_group_id' })
    device_group?: DeviceGroup;

    @Column({ type: 'jsonb', default: () => "'[]'" })
    collaborators: ITaskCollaborator[];

    @Column({ type: 'jsonb', default: () => "'[]'" })
    checklist: ITaskChecklistItem[];

    @Column({ type: 'jsonb', default: () => "'[]'" })
    tags: string[];

    @Column({ type: 'jsonb', default: () => "'[]'" })
    attachments: ITaskAttachment[];

    @Column({ type: 'text', nullable: true })
    completion_note?: string;

    @Column({ type: 'text', nullable: true })
    review_note?: string;

    @Column({ type: 'text', nullable: true })
    change_request_note?: string;

    @Column({ type: 'text', nullable: true })
    change_request_reason?: string;

    @Column({ type: 'timestamp', nullable: true })
    proposed_deadline?: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    start_date?: Date;

    @Column({ type: 'timestamp' })
    deadline: Date;

    @Column({ type: 'timestamp', nullable: true })
    accepted_at?: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    submitted_at?: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    completed_at?: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    last_reminded_at?: Date | null;

    @Column({ type: 'float', default: 1.0 })
    kpi_weight: number;

    @Column({ type: 'float', nullable: true })
    kpi_score?: number | null;

    @OneToMany(() => TaskComment, (comment) => comment.task)
    comments?: TaskComment[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
