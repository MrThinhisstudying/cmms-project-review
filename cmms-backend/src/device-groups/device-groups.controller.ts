import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { DeviceGroupsService } from './device-groups.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Device Groups')
@Controller('device-groups')
export class DeviceGroupsController {
  constructor(private readonly deviceGroupsService: DeviceGroupsService) {}

  @Get()
  async findAll() {
    const groups = await this.deviceGroupsService.findAll();
    return { message: 'Lấy danh sách nhóm thiết bị thành công', data: groups };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const group = await this.deviceGroupsService.findOne(+id);
    return { message: 'Lấy thông tin nhóm thiết bị thành công', data: group };
  }

  @Post()
  create(@Body() body: { name: string; description?: string; dept_id?: number; leader_id?: number }) {
      return this.deviceGroupsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string; dept_id?: number; leader_id?: number }) {
      return this.deviceGroupsService.update(+id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
      return this.deviceGroupsService.remove(+id);
  }

  @Post(':id/devices/batch')
  setDevices(@Param('id') id: string, @Body() body: { deviceIds: number[] }) {
      return this.deviceGroupsService.setDevices(+id, body.deviceIds || []);
  }

  @Post(':id/members')
  setMembers(@Param('id') id: string, @Body() body: { members: { userId: number; is_group_lead?: boolean }[] }) {
      return this.deviceGroupsService.setMembers(+id, body.members || []);
  }

  @Post('assign-device')
  assignDevice(@Body() body: { deviceId: number; groupId: number | null }) {
      return this.deviceGroupsService.assignDevice(body.deviceId, body.groupId);
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
