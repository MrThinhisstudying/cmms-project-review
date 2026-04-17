import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../user/user.entity';
import { RequestStatus } from './enums/request-status.enum';
import { RequestType } from './enums/request-type.enum';

@Entity('profile_update_requests')
export class ProfileUpdateRequest {
    @ApiProperty()
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ApiProperty({ enum: RequestType })
    @Column({
        type: 'enum',
        enum: RequestType,
        default: RequestType.UPDATE_INFO
    })
    request_type: RequestType;

    @ApiProperty({ description: 'JSON payload containing the requested changes' })
    @Column({ type: 'json' })
    data_payload: Record<string, any>;

    @ApiProperty({ description: 'Optional uploaded file for proof, e.g. a certificate PDF/image' })
    @Column({ nullable: true })
    file_url?: string;

    @ApiProperty({ enum: RequestStatus })
    @Column({
        type: 'enum',
        enum: RequestStatus,
        default: RequestStatus.PENDING
    })
    status: RequestStatus;

    @ManyToOne(() => User, { eager: true, nullable: true })
    @JoinColumn({ name: 'reviewer_id' })
    reviewer?: User;

    @ApiProperty({ description: 'Notes or reasoning from the reviewer' })
    @Column({ type: 'text', nullable: true })
    notes?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
