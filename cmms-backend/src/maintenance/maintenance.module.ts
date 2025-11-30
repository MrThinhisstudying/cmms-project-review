import {Module, forwardRef} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {Maintenance} from './entities/maintenance.entity';
import {MaintenanceTicket} from 'src/maintenance-ticket/entities/maintenance-ticket.entity';
import {MaintenanceService} from './maintenance.service';
import {MaintenanceController} from './maintenance.controller';
import {Device} from 'src/devices/entities/device.entity';
import {User} from 'src/user/user.entity';
import {Department} from 'src/departments/department.entity';
import {MaintenanceScheduler} from './maintenance.scheduler';
import {NotificationModule} from 'src/notification/notification.module';
import {MaintenanceTicketModule} from 'src/maintenance-ticket/maintenance-ticket.module';
import {MaintenanceChecklistTemplate} from './entities/maintenance-checklist-template.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Maintenance, Device, User, Department, MaintenanceTicket, MaintenanceChecklistTemplate]),
        NotificationModule,
        forwardRef(() => MaintenanceTicketModule),
    ],
    providers: [MaintenanceService, MaintenanceScheduler],
    controllers: [MaintenanceController],
    exports: [MaintenanceService],
})
export class MaintenanceModule {}

