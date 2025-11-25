import {ApiProperty} from '@nestjs/swagger';
import {User} from 'src/user/user.entity';
import {Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn} from 'typeorm';
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

    @CreateDateColumn()
    created_at?: Date;

    @UpdateDateColumn()
    updated_at?: Date;
}

