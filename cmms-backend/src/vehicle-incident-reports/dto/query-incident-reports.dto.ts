import { IsOptional, IsString, IsInt, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { IncidentReportStatus } from '../entities/vehicle-incident-report.entity';

export class QueryIncidentReportsDto {
    @IsOptional()
    @IsEnum(IncidentReportStatus)
    status?: IncidentReportStatus;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    device_id?: number;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    from_date?: string;

    @IsOptional()
    @IsString()
    to_date?: string;
}
