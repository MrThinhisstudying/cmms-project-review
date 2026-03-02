import {ApiProperty} from '@nestjs/swagger';
import {IsArray, IsInt, IsNotEmpty, IsOptional, IsString} from 'class-validator';

export class CreateRepairBulkDto {
    @ApiProperty({example: [1, 2, 3], description: 'Mảng các ID thiết bị cần sửa chữa'})
    @IsArray({message: 'device_ids phải là một mảng'})
    @IsInt({each: true, message: 'Mỗi phần tử trong device_ids phải là số nguyên'})
    @IsNotEmpty({message: 'Phải chọn ít nhất 1 thiết bị'})
    device_ids: number[];

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
