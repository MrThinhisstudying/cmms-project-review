import {ApiPropertyOptional} from '@nestjs/swagger';
import {IsOptional, IsString, IsNumber, IsArray, IsEnum} from 'class-validator';
import {DeviceStatus} from '../enums/device-status.enum';

export class CreateDeviceDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    brand?: string;

    @IsOptional()
    @IsEnum(DeviceStatus, {
        message: `status phải thuộc một trong các giá trị: ${Object.values(DeviceStatus).join(', ')}`,
    })
    status?: DeviceStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    note?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    usage_purpose?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    operating_scope?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    country_of_origin?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    manufacture_year?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    usage_start_year?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    serial_number?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    technical_code_address?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    location_coordinates?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    daily_operation_time?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    relocation_origin?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    relocation_year?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    fixed_asset_code?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    using_department?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    weight?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    width?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    height?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    power_source?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    power_consumption?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    other_specifications?: string;

    @ApiPropertyOptional({type: [Number]})
    @IsOptional()
    @IsArray()
    @IsNumber({}, {each: true})
    userIds?: number[];
}

