import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RollbackDto {
  @ApiPropertyOptional({ description: 'Reason for rollback' })
  @IsOptional()
  @IsString()
  reason?: string;
}
