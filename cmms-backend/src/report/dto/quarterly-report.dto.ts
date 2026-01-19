import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class QuarterlyReportDto {
  @IsNumber()
  @Type(() => Number)
  quarter: number;

  @IsNumber()
  @Type(() => Number)
  year: number;
}
