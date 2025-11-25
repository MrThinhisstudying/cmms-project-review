import {ApiProperty} from '@nestjs/swagger';
import {IsNumber, IsOptional, IsString} from 'class-validator';

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

    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    role?: string;

    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    citizen_identification_card?: string;

    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    avatar?: string;

    @ApiProperty({required: false, description: 'ID phòng ban'})
    @IsOptional()
    @IsNumber()
    dept_id?: number;
}
