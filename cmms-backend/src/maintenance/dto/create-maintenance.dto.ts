import { ApiProperty } from '@nestjs/swagger';
import { MaintenanceLevel, MaintenanceStatus } from '../enum/maintenance.enum';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMaintenanceDto {
  @ApiProperty()
  @IsNumber()
  device_id: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  user_id?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  dept_id?: number;

  @ApiProperty({ description: 'Ngày giờ bắt đầu bảo dưỡng' })
  @IsNotEmpty()
  @IsDateString()
  scheduled_date: string;

  @ApiProperty({ required: false, description: 'Ngày giờ hết hạn bảo dưỡng' })
  @IsOptional()
  @IsDateString()
  expired_date?: string;

  @ApiProperty({ enum: MaintenanceStatus, default: MaintenanceStatus.ACTIVE })
  @IsEnum(MaintenanceStatus)
  @IsOptional()
  status?: MaintenanceStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: MaintenanceLevel })
  @IsEnum(MaintenanceLevel)
  level: MaintenanceLevel;
}
