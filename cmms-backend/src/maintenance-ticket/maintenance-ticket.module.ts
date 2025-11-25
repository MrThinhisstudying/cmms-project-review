import {Module, forwardRef} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {MaintenanceTicket} from './entities/maintenance-ticket.entity';
import {MaintenanceTicketService} from './maintenance-ticket.service';
import {MaintenanceTicketController} from './maintenance-ticket.controller';
import {MaintenanceModule} from 'src/maintenance/maintenance.module';

@Module({
    imports: [TypeOrmModule.forFeature([MaintenanceTicket]), forwardRef(() => MaintenanceModule)],
    providers: [MaintenanceTicketService],
    controllers: [MaintenanceTicketController],
    exports: [MaintenanceTicketService],
})
export class MaintenanceTicketModule {}
