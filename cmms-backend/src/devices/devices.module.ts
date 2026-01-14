import {Module} from '@nestjs/common';
import {DevicesService} from './devices.service';
import {DevicesController} from './devices.controller';
import {TypeOrmModule} from '@nestjs/typeorm';
import {Device} from './entities/device.entity';
import {User} from 'src/user/user.entity';
import { DevicesScheduler } from './devices.scheduler';

@Module({
    imports: [TypeOrmModule.forFeature([Device, User])],
    controllers: [DevicesController],
    providers: [DevicesService, DevicesScheduler],
})
export class DevicesModule {}

