import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { WorkTask } from './work-task.entity';

export type TaskCommentActionType =
    | 'COMMENT'
    | 'CREATED'
    | 'ACCEPTED'
    | 'CHANGE_REQUEST'
    | 'CHANGE_APPROVED'
    | 'CHANGE_REJECTED'
    | 'PROGRESS_UPDATE'
    | 'SUBMITTED'
    | 'APPROVED'
    | 'REJECTED'
    | 'SUBTASK_CREATED'
    | 'REMINDER';

@Entity('task_comments')
export class TaskComment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    task_id: number;

    @ManyToOne(() => WorkTask, (task) => task.comments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'task_id' })
    task: WorkTask;

    @Column()
    user_id: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'varchar', length: 30, default: 'COMMENT' })
    action_type: TaskCommentActionType;

    @Column({ type: 'varchar', length: 20, default: 'COMMENT' })
    type: 'COMMENT' | 'SYSTEM_LOG';

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'jsonb', default: () => "'[]'" })
    attachments: Array<{ name: string; url: string }>;

    @CreateDateColumn()
    created_at: Date;
}
