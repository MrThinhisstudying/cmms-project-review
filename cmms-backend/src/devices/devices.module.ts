import {Module} from '@nestjs/common';
import {DevicesService} from './devices.service';
import {DevicesController} from './devices.controller';
import {TypeOrmModule} from '@nestjs/typeorm';
import {Device} from './entities/device.entity';
import {User} from 'src/user/user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Device, User])],
    controllers: [DevicesController],
    providers: [DevicesService],
})
export class DevicesModule {}

