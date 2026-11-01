import { IsNotEmpty, IsOptional, IsString, IsInt, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIncidentReportDto {
    @ApiProperty({ description: 'ID phương tiện / thiết bị' })
    @IsInt()
    @IsNotEmpty()
    device_id: number;

    @ApiProperty({ required: false, description: 'ID user nếu đã có tài khoản' })
    @IsOptional()
    @IsInt()
    reporter_user_id?: number;

    @ApiProperty({ description: 'Họ và tên người báo cáo' })
    @IsString()
    @IsNotEmpty()
    reporter_name: string;

    @ApiProperty({ required: false, description: 'Mã số nhân viên' })
    @IsOptional()
    @IsString()
    reporter_code?: string;

    @ApiProperty({ required: false, description: 'Phòng ban / Đơn vị' })
    @IsOptional()
    @IsString()
    reporter_department?: string;

    @ApiProperty({ required: false, description: 'Số điện thoại liên hệ' })
    @IsOptional()
    @IsString()
    reporter_phone?: string;

    @ApiProperty({ required: false, default: false })
    @IsOptional()
    @IsBoolean()
    is_external_reporter?: boolean;

    @ApiProperty({ required: false, description: 'Vị trí sự cố / Phương tiện đang đỗ' })
    @IsOptional()
    @IsString()
    location_issue?: string;

    @ApiProperty({ description: 'Nội dung báo cáo tình trạng xe' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ required: false, type: [String], description: 'Danh sách URLs ảnh hiện trường' })
    @IsOptional()
    @IsArray()
    images?: string[];
}
