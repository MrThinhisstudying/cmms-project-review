import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceGroup } from './entities/device-group.entity';
import { UserDeviceGroup } from './entities/user-device-group.entity';
import { DeviceGroupsService } from './device-groups.service';
import { DeviceGroupsController } from './device-groups.controller';
import { User } from '../user/user.entity';
import { Device } from 'src/devices/entities/device.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceGroup, UserDeviceGroup, User, Device])],
  controllers: [DeviceGroupsController],
  providers: [DeviceGroupsService],
  exports: [DeviceGroupsService],
})
export class DeviceGroupsModule {}
