import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestRepairDossierDto {
    @ApiProperty({ description: 'ID người được giao làm hồ sơ (nếu có tài khoản)', required: false })
    @IsOptional()
    @IsNumber()
    assigned_user_id?: number;

    @ApiProperty({ description: 'Tên người được giao làm hồ sơ', required: false })
    @IsOptional()
    @IsString()
    assigned_user_name?: string;

    @ApiProperty({ description: 'Ghi chú / Yêu cầu làm hồ sơ sửa chữa của KTV' })
    @IsNotEmpty({ message: 'Vui lòng nhập nội dung ghi chú yêu cầu làm hồ sơ sửa chữa' })
    @IsString()
    request_note: string;
}
