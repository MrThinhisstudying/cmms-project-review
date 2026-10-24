import {ApiProperty, PartialType} from '@nestjs/swagger';
import {CreateMaintenanceDto} from './create-maintenance.dto';
import {IsDateString, IsOptional} from 'class-validator';

export class UpdateMaintenanceDto extends PartialType(CreateMaintenanceDto) {
    @ApiProperty({required: false, description: 'Ngày dự kiến thực hiện'})
    @IsOptional()
    @IsDateString()
    next_maintenance_date?: string;

    @ApiProperty({required: false, description: 'Ngày hoàn thành bảo dưỡng thực tế'})
    @IsOptional()
    @IsDateString()
    last_maintenance_date?: string;
}

