import {ApiProperty} from '@nestjs/swagger';
import {IsNumber, IsOptional, IsString, IsEnum} from 'class-validator';
import { UserRole } from '../user-role.enum';

export class CreateUserDto {
    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    email?: string;

    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    position?: string;

    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    password?: string;

    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    status?: string;

    @ApiProperty({required: false, enum: UserRole})
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    citizen_identification_card?: string;

    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    avatar?: string;

    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    phone_number?: string;

    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    signature_url?: string;

    @ApiProperty({required: false, description: 'ID phòng ban'})
    @IsOptional()
    @IsNumber()
    dept_id?: number;

    @ApiProperty({required: false, description: 'ID nhóm thiết bị'})
    @IsOptional()
    @IsNumber()
    group_id?: number;

    @ApiProperty({required: false, description: 'Là trưởng nhóm?'})
    @IsOptional()
    is_group_lead?: boolean;

    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    employee_code?: string;

    @ApiProperty({required: false, description: 'Ngày sinh (YYYY-MM-DD)'})
    @IsOptional()
    @IsString()
    date_of_birth?: string;

    @ApiProperty({required: false, description: 'Nơi sinh'})
    @IsOptional()
    @IsString()
    place_of_birth?: string;

    @ApiProperty({required: false, description: 'Ngày cấp CCCD (YYYY-MM-DD)'})
    @IsOptional()
    @IsString()
    cccd_issue_date?: string;

    @ApiProperty({required: false, description: 'Nơi thường trú'})
    @IsOptional()
    @IsString()
    permanent_address?: string;

    @ApiProperty({required: false, description: 'Nơi tạm trú'})
    @IsOptional()
    @IsString()
    temporary_address?: string;

    @ApiProperty({required: false, description: 'Quê quán'})
    @IsOptional()
    @IsString()
    hometown?: string;
}
