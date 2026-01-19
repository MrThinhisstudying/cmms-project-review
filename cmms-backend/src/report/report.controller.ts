import { Controller, Get, Post, Query, Body, Res } from '@nestjs/common';
import { ReportService } from './report.service';
import { QuarterlyReportDto } from './dto/quarterly-report.dto';
import { GenerateReportPdfDto } from './dto/generate-report-pdf.dto';
import { Response } from 'express';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('quarterly')
  async getQuarterlyReport(@Query() query: QuarterlyReportDto) {
    return this.reportService.getQuarterlyReport(query.quarter, query.year);
  }

  @Post('export-pdf')
  async exportPdf(@Body() body: GenerateReportPdfDto, @Res() res: Response) {
    const buffer = await this.reportService.generatePdf(body.htmlContent);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=report.pdf',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
