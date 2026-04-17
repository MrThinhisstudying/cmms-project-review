import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { RequestType } from '../enums/request-type.enum';

export class CreateProfileRequestDto {
    @ApiProperty({ enum: RequestType })
    @IsEnum(RequestType)
    request_type: RequestType;

    @ApiProperty({ description: 'The new data details' })
    @IsObject()
    data_payload: Record<string, any>;

    @ApiProperty({ required: false, description: 'File path/url if proof is needed (e.g. certificate scan)' })
    @IsOptional()
    @IsString()
    file_url?: string;
}
