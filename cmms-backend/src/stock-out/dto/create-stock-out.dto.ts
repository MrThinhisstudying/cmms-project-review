import {ApiProperty} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {IsInt, IsNotEmpty, IsNumber, IsOptional, IsString} from 'class-validator';

export class CreateStockOutDto {
    @IsNotEmpty()
    @IsNumber()
    item_id: number;

    @IsNotEmpty()
    @IsNumber()
    quantity: number;

    @IsOptional()
    @IsString()
    purpose?: string;

    @IsOptional()
    @IsString()
    note?: string;

    @ApiProperty({example: 12, required: false, description: 'ID phiếu sửa chữa liên quan'})
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    repair_id?: number;
}
