import {Module, forwardRef} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {MaintenanceTicket} from './entities/maintenance-ticket.entity';
import {MaintenanceTicketService} from './maintenance-ticket.service';
import {MaintenanceTicketController} from './maintenance-ticket.controller';
import {MaintenanceModule} from 'src/maintenance/maintenance.module';
import {Maintenance} from 'src/maintenance/entities/maintenance.entity';
import {MaintenanceChecklistTemplate} from 'src/maintenance/entities/maintenance-checklist-template.entity';

@Module({
    imports: [TypeOrmModule.forFeature([MaintenanceTicket, Maintenance, MaintenanceChecklistTemplate]), forwardRef(() => MaintenanceModule)],
    providers: [MaintenanceTicketService],
    controllers: [MaintenanceTicketController],
    exports: [MaintenanceTicketService],
})
export class MaintenanceTicketModule {}

