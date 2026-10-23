import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateShiftDebtDto {
  @IsNotEmpty()
  @IsNumber()
  user_id: number;

  @IsNotEmpty()
  @IsNumber()
  year: number;

  @IsNotEmpty()
  @IsNumber()
  month: number;

  @IsOptional()
  @IsNumber()
  department_id?: number;

  @IsOptional()
  @IsNumber()
  opening_debt?: number;

  @IsOptional()
  @IsNumber()
  taken_days?: number;

  @IsOptional()
  @IsNumber()
  accrued_days?: number;

  @IsOptional()
  @IsNumber()
  closing_debt?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateShiftDebtDto {
  @IsOptional()
  @IsNumber()
  opening_debt?: number;

  @IsOptional()
  @IsNumber()
  taken_days?: number;

  @IsOptional()
  @IsNumber()
  accrued_days?: number;

  @IsOptional()
  @IsNumber()
  closing_debt?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
