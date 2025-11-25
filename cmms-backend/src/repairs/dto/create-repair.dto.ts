import {ApiProperty} from '@nestjs/swagger';
import {IsInt, IsNotEmpty, IsOptional, IsString} from 'class-validator';

export class CreateRepairDto {
    @ApiProperty({example: 1, description: 'ID thiết bị cần sửa chữa'})
    @IsInt({message: 'device_id phải là số nguyên'})
    @IsNotEmpty({message: 'Thiết bị là bắt buộc'})
    device_id: number;

    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    location_issue?: string;

    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    recommendation?: string;

    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    note?: string;
}
