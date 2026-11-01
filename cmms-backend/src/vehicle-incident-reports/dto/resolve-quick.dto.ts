import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveQuickDto {
    @ApiProperty({ description: 'Biện pháp khắc phục nhanh' })
    @IsString()
    @IsNotEmpty()
    quick_solution: string;

    @ApiProperty({ required: false, description: 'ID người vận hành xác nhận (nếu có user trong hệ thống)' })
    @IsOptional()
    @IsInt()
    operator_confirmed_by_id?: number;

    @ApiProperty({ description: 'Họ tên người vận hành xác nhận' })
    @IsString()
    @IsNotEmpty()
    operator_confirmed_name: string;

    @ApiProperty({ required: false, description: 'Ghi chú thêm của người vận hành' })
    @IsOptional()
    @IsString()
    operator_notes?: string;
}
