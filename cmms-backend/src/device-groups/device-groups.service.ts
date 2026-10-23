import { Injectable, NotFoundException, Inject, CACHE_MANAGER } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cache } from 'cache-manager';
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
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll() {
    return this.deviceGroupsRepository.find({ 
        relations: [
          'user_device_groups', 
          'user_device_groups.user', 
          'devices', 
          'department', 
          'department.parent', 
          'leader'
        ],
        order: { id: 'ASC' }
    });
  }

  async findOne(id: number) {
    const group = await this.deviceGroupsRepository.findOne({
      where: { id },
      relations: [
        'user_device_groups', 
        'user_device_groups.user', 
        'devices', 
        'department', 
        'department.parent', 
        'leader'
      ],
    });
    if (!group) throw new NotFoundException('Không tìm thấy nhóm thiết bị');
    return group;
  }

  async create(data: { name: string; description?: string; dept_id?: number; leader_id?: number }) {
      const group = await this.deviceGroupsRepository.save(data);
      if (data.leader_id) {
          await this.userDeviceGroupRepository.save({
              group_id: group.id,
              user_id: data.leader_id,
              is_group_lead: true,
          });
      }
      await this.cacheManager.del('departments_tree');
      return this.findOne(group.id);
  }

  async update(id: number, data: { name?: string; description?: string; dept_id?: number; leader_id?: number }) {
      await this.deviceGroupsRepository.update(id, data);

      if (data.leader_id !== undefined) {
          // Gỡ lead của các thành viên khác trong nhóm này
          await this.userDeviceGroupRepository.update(
              { group_id: id },
              { is_group_lead: false }
          );

          if (data.leader_id) {
              const existingMember = await this.userDeviceGroupRepository.findOne({
                  where: { group_id: id, user_id: data.leader_id }
              });
              if (existingMember) {
                  existingMember.is_group_lead = true;
                  await this.userDeviceGroupRepository.save(existingMember);
              } else {
                  await this.userDeviceGroupRepository.save({
                      group_id: id,
                      user_id: data.leader_id,
                      is_group_lead: true,
                  });
              }
          }
      }

      await this.cacheManager.del('departments_tree');
      return this.findOne(id);
  }

  async remove(id: number) {
      // Gỡ bỏ liên kết nhóm khỏi các thiết bị
      await this.deviceRepository.update({ device_group: { id } }, { device_group: null });
      // Xoá quan hệ user_device_group
      await this.userDeviceGroupRepository.delete({ group_id: id });
      const res = await this.deviceGroupsRepository.delete(id);
      await this.cacheManager.del('departments_tree');
      return res;
  }

  async setDevices(groupId: number, deviceIds: number[]) {
      const group = await this.deviceGroupsRepository.findOne({ where: { id: groupId } });
      if (!group) throw new NotFoundException('Không tìm thấy nhóm');

      // Gỡ nhóm cho các thiết bị cũ không còn trong danh sách
      if (deviceIds.length > 0) {
          await this.deviceRepository
              .createQueryBuilder()
              .update(Device)
              .set({ device_group: null })
              .where('group_id = :groupId AND device_id NOT IN (:...deviceIds)', { groupId, deviceIds })
              .execute();

          // Gán nhóm cho danh sách mới
          await this.deviceRepository
              .createQueryBuilder()
              .update(Device)
              .set({ device_group: group })
              .where('device_id IN (:...deviceIds)', { deviceIds })
              .execute();
      } else {
          // Bỏ toàn bộ
          await this.deviceRepository.update({ device_group: { id: groupId } }, { device_group: null });
      }

      await this.cacheManager.del('departments_tree');
      return this.findOne(groupId);
  }

  async setMembers(groupId: number, members: { userId: number; is_group_lead?: boolean }[]) {
      const group = await this.deviceGroupsRepository.findOne({ where: { id: groupId } });
      if (!group) throw new NotFoundException('Không tìm thấy nhóm');

      // Xóa thành viên cũ
      await this.userDeviceGroupRepository.delete({ group_id: groupId });

      let leaderId: number | null = null;
      if (members.length > 0) {
          const entities = members.map(m => {
              if (m.is_group_lead) leaderId = m.userId;
              return this.userDeviceGroupRepository.create({
                  group_id: groupId,
                  user_id: m.userId,
                  is_group_lead: !!m.is_group_lead,
              });
          });
          await this.userDeviceGroupRepository.save(entities);
      }

      // Cập nhật leader_id trên nhóm
      await this.deviceGroupsRepository.update(groupId, { leader_id: leaderId });
      await this.cacheManager.del('departments_tree');
      return this.findOne(groupId);
  }

  async assignDevice(deviceId: number, groupId: number | null) {
      const device = await this.deviceRepository.findOne({ where: { device_id: deviceId } });
      if (!device) throw new NotFoundException('Không tìm thấy thiết bị');

      if (groupId) {
          const group = await this.deviceGroupsRepository.findOne({ where: { id: groupId } });
          if (!group) throw new NotFoundException('Không tìm thấy nhóm');
          device.device_group = group;
      } else {
          device.device_group = null;
      }

      const saved = await this.deviceRepository.save(device);
      await this.cacheManager.del('departments_tree');
      return saved;
  }

  async addDevice(groupId: number, deviceId: number) {
      return this.assignDevice(deviceId, groupId);
  }

  async removeDevice(deviceId: number) {
      return this.assignDevice(deviceId, null);
  }
}
