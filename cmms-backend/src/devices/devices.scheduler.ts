import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Device } from './entities/device.entity';
import { LessThan, Repository } from 'typeorm';
import { DeviceStatus } from './enums/device-status.enum';

@Injectable()
export class DevicesScheduler {
  private readonly logger = new Logger(DevicesScheduler.name);

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDeviceStatusUpdate() {
    this.logger.debug('Running daily device status check...');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
        const devicesToUpdate = await this.deviceRepository.find({
            where: {
                status: DeviceStatus.MOI,
                created_at: LessThan(sevenDaysAgo)
            }
        });

        if (devicesToUpdate.length > 0) {
            this.logger.debug(`Found ${devicesToUpdate.length} devices to update from MOI to DANG_SU_DUNG.`);
            
            // Bulk update or loop save? Loop save triggers subscribers if any (audit logs). 
            // For now bulk update is more efficient.
            await this.deviceRepository.update(
                { 
                    status: DeviceStatus.MOI, 
                    created_at: LessThan(sevenDaysAgo) 
                }, 
                { status: DeviceStatus.DANG_SU_DUNG }
            );
            
            this.logger.debug(`Updated ${devicesToUpdate.length} devices successfully.`);
        } else {
            this.logger.debug('No devices need status update.');
        }

    } catch (error) {
        this.logger.error('Error updating device statuses', error);
    }
  }
}
