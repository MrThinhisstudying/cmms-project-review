import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { DeviceGroupsService } from './device-groups.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Device Groups')
@Controller('device-groups')
export class DeviceGroupsController {
  constructor(private readonly deviceGroupsService: DeviceGroupsService) {}

  @Get()
  findAll() {
    return this.deviceGroupsService.findAll();
  }

  @Post()
  create(@Body() body: { name: string; description?: string }) {
      return this.deviceGroupsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
      return this.deviceGroupsService.update(+id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
      return this.deviceGroupsService.remove(+id);
  }

  @Post(':id/devices')
  addDevice(@Param('id') id: string, @Body() body: { deviceId: number }) {
      return this.deviceGroupsService.addDevice(+id, body.deviceId);
  }

  @Delete('devices/:deviceId')
  removeDevice(@Param('deviceId') deviceId: string) {
      return this.deviceGroupsService.removeDevice(+deviceId);
  }
}
