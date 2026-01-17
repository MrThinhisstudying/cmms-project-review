import {ApiProperty} from '@nestjs/swagger';
import {User} from 'src/user/user.entity';
import {Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn} from 'typeorm';
import { DEPARTMENT_PERMISSION_CODES } from './constant/department-permissions.constant';

@Entity()
export class Department {
    @ApiProperty()
    @PrimaryGeneratedColumn()
    dept_id: number;

    @ApiProperty()
    @Column({unique: true})
    name: string;

    @ApiProperty()
    @Column({nullable: true})
    description?: string;

    @ApiProperty({example: DEPARTMENT_PERMISSION_CODES})
    @Column('simple-array', {nullable: true})
    permissions?: string[];

    @OneToMany(() => User, (user) => user.department, {
        cascade: true,
    })
    users: User[];

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'manager_id' })
    manager?: User;

    @Column({ nullable: true })
    manager_id?: number;

    @ApiProperty({ enum: ['PERSONAL', 'GROUP', 'DEPARTMENT', 'ALL'], default: 'DEPARTMENT' })
    @Column({
        type: 'enum',
        enum: ['PERSONAL', 'GROUP', 'DEPARTMENT', 'ALL'],
        default: 'DEPARTMENT',
    })
    scope: 'PERSONAL' | 'GROUP' | 'DEPARTMENT' | 'ALL';

    @CreateDateColumn()
    created_at?: Date;

    @UpdateDateColumn()
    updated_at?: Date;
}

