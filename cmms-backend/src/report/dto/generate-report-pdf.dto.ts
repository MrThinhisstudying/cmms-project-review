import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateReportPdfDto {
  @IsNotEmpty()
  @IsString()
  htmlContent: string;
}
