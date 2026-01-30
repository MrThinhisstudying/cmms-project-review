import {Module} from '@nestjs/common';
import {DevicesService} from './devices.service';
import {DevicesController} from './devices.controller';
import {TypeOrmModule} from '@nestjs/typeorm';
import {Device} from './entities/device.entity';
import {User} from 'src/user/user.entity';
import { DevicesScheduler } from './devices.scheduler';
import { DeviceType } from './entities/device-type.entity';
import { DeviceTypesController } from './device-types.controller';
import { DeviceTypesService } from './device-types.service';

@Module({
    imports: [TypeOrmModule.forFeature([Device, User, DeviceType])],
    controllers: [DevicesController, DeviceTypesController],
    providers: [DevicesService, DevicesScheduler, DeviceTypesService],
})
export class DevicesModule {}

