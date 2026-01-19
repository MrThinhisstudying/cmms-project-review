import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Device } from '../devices/entities/device.entity';
import { MaintenanceTicket } from '../maintenance-ticket/entities/maintenance-ticket.entity';
import { Repair } from '../repairs/entities/repair.entity';
import * as puppeteer from 'puppeteer';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
    @InjectRepository(MaintenanceTicket)
    private readonly maintenanceTicketRepo: Repository<MaintenanceTicket>,
    @InjectRepository(Repair)
    private readonly repairRepo: Repository<Repair>,
  ) {}

  async generatePdf(htmlContent: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    
    // Set viewport to Printable A4 Landscape Width (297mm - 30mm margins = 267mm ~ 1010px)
    // This ensures width: 100% fits exactly into the printable area without clipping.
    await page.setViewport({ width: 1010, height: 794, deviceScaleFactor: 1 });

    // Guard Check
    if (htmlContent.includes('{/*') || htmlContent.includes('*/}')) {
        throw new Error('Invalid export HTML: JSX/React tokens detected. Please remove comments from the template string.');
    }

    // Set content
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Generate PDF with Template
    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      scale: 1,
      preferCSSPageSize: false,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size:0"></div>
      `,
      footerTemplate: `
        <div style="
          width:100%;
          font-family:'Times New Roman';
          font-size:12px;
          text-align:center;
          padding-bottom:10px;
        ">
          Trang <span class="pageNumber"></span>/<span class="totalPages"></span>
        </div>
      `,
      margin: {
        top: '20mm', // Standard top margin
        right: '15mm',
        bottom: '20mm', 
        left: '15mm'   // Matched with right margin
      }
    });

    await browser.close();
    return Buffer.from(pdf);
  }

  async getQuarterlyReport(quarter: number, year: number) {
    // ... existing logic ...
    // 1. Calculate Date Range
    const startMonth = (quarter - 1) * 3;
    const startDate = new Date(year, startMonth, 1);
    const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59);

    // 2. Fetch all devices (Maybe filter active ones?)
    const devices = await this.deviceRepo.find({
        order: {
            device_id: 'ASC', // Or device_name
        }
    });

    const reportData = [];
    let index = 1;

    for (const device of devices) {
        // 3. Count Maintenance Tickets (Completed in range?)
        // Assuming we count completed maintenance
        const maintenanceCount = await this.maintenanceTicketRepo.count({
            where: {
                device: { device_id: device.device_id },
                status: 'done',
                completed_at: Between(startDate, endDate),
            }
        });

        // 4. Repairs
        const repairs = await this.repairRepo.find({
            where: {
                device: { device_id: device.device_id },
                created_at: Between(startDate, endDate)
            },
            relations: ['stock_outs', 'stock_outs.item']
        });

        const repairCount = repairs.length;
        
        // Fix logic: Check if there are any PENDING repairs currently.
        const isPending = repairs.some(r => r.status_request !== 'COMPLETED');
        const isFixed = repairs.length > 0 && repairs.every(r => r.status_request === 'COMPLETED');

        // Replacement parts (Vật tư thay thế)
        const partsSet = new Set<string>();
        repairs.forEach(r => {
            if (r.stock_outs) {
                r.stock_outs.forEach(s => {
                    if (s.item && s.item.name) {
                        partsSet.add(s.item.name);
                    }
                });
            }
             // Also check inspection_materials jsonb if used
             if (r.inspection_materials && Array.isArray(r.inspection_materials)) {
                 r.inspection_materials.forEach((m: any) => {
                     if (m.item_name) partsSet.add(m.item_name);
                 });
             }
        });
        const replacementParts = Array.from(partsSet).join(', ');

        reportData.push({
            tt: index++,
            deviceId: device.device_id,
            deviceName: device.name,
            currentStatus: device.status, // Tình trạng KT hiện tại
            managementUnit: 'Cảng HK Côn Đảo', // Hardcode or from device.department?
            maintenanceCount: maintenanceCount,
            repairCount: repairCount,
            isPending: isPending ? 'X' : '',
            isFixed: (repairCount > 0 && !isPending) ? 'X' : '', 
            repairUnit: '', // TODO: Who fixed it? Internal or External?
            replacementParts: replacementParts,
            notes: '' 
        });
    }

    return {
        quarter,
        year,
        period: `Từ ${startDate.toLocaleDateString('vi-VN')} đến ${endDate.toLocaleDateString('vi-VN')}`,
        data: reportData
    };
  }
}
