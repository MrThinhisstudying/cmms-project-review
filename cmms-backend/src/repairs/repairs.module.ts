import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {RepairsController} from './repairs.controller';
import {RepairsService} from './repairs.service';
import {Device} from 'src/devices/entities/device.entity';
import {User} from 'src/user/user.entity';
import {Repair} from './entities/repair.entity';
import {NotificationService} from 'src/notification/notification.service';
import {Notification} from 'src/notification/notification.entity';
import {StockOut} from 'src/stock-out/entities/stock-out.entity';
import {Item} from 'src/inventory_item/entities/item.entity';
import { ExportDocxService } from './export-docx.service';
import { RepairsGateway } from './repairs.gateway';
import { UserDeviceGroup } from 'src/device-groups/entities/user-device-group.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Repair, Device, User, StockOut, Item, Notification, UserDeviceGroup])],
    controllers: [RepairsController],
    providers: [RepairsService, NotificationService, ExportDocxService, RepairsGateway],
    exports: [ExportDocxService],
})
export class RepairsModule {}
