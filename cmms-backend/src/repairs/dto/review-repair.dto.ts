import {ApiProperty} from '@nestjs/swagger';
import {IsIn, IsOptional, IsString} from 'class-validator';

export class ReviewRepairDto {
    @ApiProperty({enum: ['approve', 'reject']})
    @IsIn(['approve', 'reject'])
    action: 'approve' | 'reject';

    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    reason?: string;
}
