import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { Device } from '../devices/entities/device.entity';
import { MaintenanceTicket } from '../maintenance-ticket/entities/maintenance-ticket.entity';
import { Repair } from '../repairs/entities/repair.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, MaintenanceTicket, Repair]),
  ],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
