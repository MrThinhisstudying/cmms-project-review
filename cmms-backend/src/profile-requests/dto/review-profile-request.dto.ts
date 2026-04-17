import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RequestStatus } from '../enums/request-status.enum';

export class ReviewProfileRequestDto {
    @ApiProperty({ enum: [RequestStatus.APPROVED, RequestStatus.REJECTED] })
    @IsEnum(RequestStatus)
    status: RequestStatus;

    @ApiProperty({ required: false, description: 'Reason for rejection or approval notes' })
    @IsOptional()
    @IsString()
    notes?: string;
}
