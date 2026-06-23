import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsDateString, IsNumber, IsString, IsOptional } from 'class-validator';

export class RecordLeaveDto {
  @ApiProperty({ example: 1, description: 'ID của nhân viên' })
  @IsInt()
  @IsNotEmpty()
  user_id: number;

  @ApiProperty({ example: '2026-04-20', description: 'Từ ngày' })
  @IsDateString()
  @IsNotEmpty()
  from_date: string;

  @ApiProperty({ example: '2026-04-21', description: 'Đến ngày' })
  @IsDateString()
  @IsNotEmpty()
  to_date: string;

  @ApiProperty({ example: 2, description: 'Số ngày nghỉ' })
  @IsNumber()
  @IsNotEmpty()
  days_taken: number;

  @ApiProperty({ example: 4, description: 'Trừ phép vào tháng (1-12)' })
  @IsInt()
  @IsNotEmpty()
  applied_month: number;

  @ApiProperty({ example: 2026, description: 'Năm áp dụng' })
  @IsInt()
  @IsNotEmpty()
  year: number;

  @ApiPropertyOptional({ example: 'Nghỉ ốm', description: 'Lý do' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ example: 'TP.HCM', description: 'Địa điểm' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: ['/uploads/abc.pdf'], description: 'Đính kèm' })
  @IsOptional()
  attachments?: string[];
}
