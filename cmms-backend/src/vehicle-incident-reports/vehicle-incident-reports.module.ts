import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleIncidentReport } from './entities/vehicle-incident-report.entity';
import { Device } from 'src/devices/entities/device.entity';
import { User } from 'src/user/user.entity';
import { UserDeviceGroup } from 'src/device-groups/entities/user-device-group.entity';
import { DeviceGroup } from 'src/device-groups/entities/device-group.entity';
import { RepairsModule } from 'src/repairs/repairs.module';
import { NotificationModule } from 'src/notification/notification.module';
import { VehicleIncidentReportsService } from './vehicle-incident-reports.service';
import { VehicleIncidentReportsController } from './vehicle-incident-reports.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([VehicleIncidentReport, Device, User, UserDeviceGroup, DeviceGroup]),
        RepairsModule,
        NotificationModule,
    ],
    controllers: [VehicleIncidentReportsController],
    providers: [VehicleIncidentReportsService],
    exports: [VehicleIncidentReportsService],
})
export class VehicleIncidentReportsModule {}
