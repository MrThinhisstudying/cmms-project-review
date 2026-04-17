import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateAnnualLeaveDto {
  @IsNotEmpty()
  @IsNumber()
  user_id: number;

  @IsNotEmpty()
  @IsNumber()
  year: number;

  @IsOptional()
  @IsNumber()
  leave_balance_n2?: number;

  @IsOptional()
  @IsNumber()
  leave_balance_n1?: number;

  @IsOptional()
  @IsNumber()
  current_year_leave?: number;

  @IsOptional() @IsNumber() m1_taken?: number;
  @IsOptional() @IsNumber() m2_taken?: number;
  @IsOptional() @IsNumber() m3_taken?: number;
  @IsOptional() @IsNumber() m4_taken?: number;
  @IsOptional() @IsNumber() m5_taken?: number;
  @IsOptional() @IsNumber() m6_taken?: number;
  @IsOptional() @IsNumber() m7_taken?: number;
  @IsOptional() @IsNumber() m8_taken?: number;
  @IsOptional() @IsNumber() m9_taken?: number;
  @IsOptional() @IsNumber() m10_taken?: number;
  @IsOptional() @IsNumber() m11_taken?: number;
  @IsOptional() @IsNumber() m12_taken?: number;
}
