import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceGroup } from './entities/device-group.entity';
import { UserDeviceGroup } from './entities/user-device-group.entity';
import { Device } from 'src/devices/entities/device.entity';

@Injectable()
export class DeviceGroupsService {
  constructor(
    @InjectRepository(DeviceGroup)
    private deviceGroupsRepository: Repository<DeviceGroup>,
    @InjectRepository(UserDeviceGroup)
    private userDeviceGroupRepository: Repository<UserDeviceGroup>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

  findAll() {
    return this.deviceGroupsRepository.find({ 
        relations: ['user_device_groups', 'user_device_groups.user', 'devices'],
        order: { id: 'ASC' }
    });
  }

  async create(data: { name: string; description?: string }) {
      return this.deviceGroupsRepository.save(data);
  }

  async update(id: number, data: { name?: string; description?: string }) {
      await this.deviceGroupsRepository.update(id, data);
      return this.deviceGroupsRepository.findOne({ where: { id } });
  }

  async remove(id: number) {
      return this.deviceGroupsRepository.delete(id);
  }

  async addDevice(groupId: number, deviceId: number) {
      const device = await this.deviceRepository.findOne({ where: { device_id: deviceId } });
      if (!device) throw new NotFoundException('Device not found');
      
      const group = await this.deviceGroupsRepository.findOne({ where: { id: groupId } });
      if (!group) throw new NotFoundException('Group not found');

      device.device_group = group;
      return this.deviceRepository.save(device);
  }

  async removeDevice(deviceId: number) {
      const device = await this.deviceRepository.findOne({ where: { device_id: deviceId } });
      if (!device) throw new NotFoundException('Device not found');
      
      device.device_group = null; // Unassign
      return this.deviceRepository.save(device);
  }
}
