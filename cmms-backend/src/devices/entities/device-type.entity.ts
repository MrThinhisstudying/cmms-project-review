import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class DeviceType {
    @ApiProperty()
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty()
    @Column({ unique: true })
    name: string; // Display label (e.g., "Xe Đầu Kéo")

    @ApiProperty()
    @Column({ unique: true })
    code: string; // System value (e.g., "xe_dau_keo")

    @ApiProperty()
    @Column({ nullable: true })
    description?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
