import {Injectable, NotFoundException, BadRequestException, Inject, CACHE_MANAGER} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {Cache} from 'cache-manager';
import {CreateDepartmentDto} from './dto/create-department.dto';
import {Department} from './department.entity';
import {UpdateDepartmentDto} from './dto/update-department.dto';
import {UserDepartment} from './entities/user-department.entity';
import {DeviceGroup} from '../device-groups/entities/device-group.entity';

@Injectable()
export class DepartmentService {
    constructor(
        @InjectRepository(Department)
        private readonly departmentRepository: Repository<Department>,
        @InjectRepository(UserDepartment)
        private readonly userDeptRepo: Repository<UserDepartment>,
        @InjectRepository(DeviceGroup)
        private readonly deviceGroupRepo: Repository<DeviceGroup>,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {}

    async findAll(): Promise<Department[]> {
        const cacheKey = 'departments_all';
        const cached = await this.cacheManager.get<Department[]>(cacheKey);
        if (cached) return cached;

        const data = await this.departmentRepository.find({
            relations: ['users', 'manager', 'deputy', 'parent', 'children', 'device_groups'],
            order: {
                updated_at: 'DESC',
            },
        });
        await this.cacheManager.set(cacheKey, data);
        return data;
    }

    async findOne(id: number): Promise<Department> {
        const dept = await this.departmentRepository.findOne({
            where: {dept_id: id},
            relations: ['users', 'manager', 'deputy', 'parent', 'children', 'device_groups'],
        });
        if (!dept) throw new NotFoundException('Không tìm thấy phòng ban');
        return dept;
    }

    async create(data: CreateDepartmentDto): Promise<Department> {
        const existing = await this.departmentRepository.findOne({where: {name: data.name}});
        if (existing) throw new BadRequestException('Tên phòng ban đã tồn tại');

        const dept = this.departmentRepository.create(data);

        if (data.parent_id) {
            const parent = await this.departmentRepository.findOne({ where: { dept_id: data.parent_id } });
            if (!parent) throw new BadRequestException('Đơn vị cấp trên không tồn tại');
            dept.parent = parent;
        }

        const result = await this.departmentRepository.save(dept);
        await this.cacheManager.del('departments_all');
        await this.cacheManager.del('departments_tree');
        return result;
    }

    async update(id: number, data: UpdateDepartmentDto): Promise<Department> {
        const dept = await this.findOne(id);
        
        if (data.parent_id !== undefined) {
            if (data.parent_id === id) throw new BadRequestException('Không thể chọn chính mình làm cấp trên');
            if (data.parent_id) {
                const parent = await this.departmentRepository.findOne({ where: { dept_id: data.parent_id } });
                if (!parent) throw new BadRequestException('Đơn vị cấp trên không tồn tại');
                dept.parent = parent;
                dept.parent_id = data.parent_id;
            } else {
                dept.parent = null;
                dept.parent_id = null;
            }
        }

        Object.assign(dept, data);
        const result = await this.departmentRepository.save(dept);
        await this.cacheManager.del('departments_all');
        await this.cacheManager.del('departments_tree');
        return result;
    }

    async delete(id: number): Promise<void> {
        const result = await this.departmentRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException('Xoá phòng ban thất bại');
        }
        await this.cacheManager.del('departments_all');
        await this.cacheManager.del('departments_tree');
    }

    /**
     * Trả về danh sách cây 3 cấp: Đội -> Tổ -> Nhóm (Thiết bị & Nhân sự)
     */
    async findTree(): Promise<any[]> {
        const cacheKey = 'departments_tree';
        const cached = await this.cacheManager.get<any[]>(cacheKey);
        if (cached) return cached;

        const allDepts = await this.departmentRepository.find({
            relations: ['manager', 'deputy', 'parent'],
            order: { name: 'ASC' },
        });

        const allGroups = await this.deviceGroupRepo.find({
            relations: ['leader', 'devices', 'user_device_groups', 'user_device_groups.user', 'department'],
            order: { name: 'ASC' },
        });

        // Đếm số thành viên của từng Department từ bảng user_department
        const memberCounts = await this.userDeptRepo
            .createQueryBuilder('ud')
            .select('ud.dept_id', 'dept_id')
            .addSelect('COUNT(*)', 'count')
            .groupBy('ud.dept_id')
            .getRawMany();

        const deptCountMap = new Map<number, number>();
        memberCounts.forEach(r => deptCountMap.set(Number(r.dept_id), Number(r.count)));

        // Gom nhóm các DeviceGroup theo dept_id (Tổ trực thuộc)
        const groupsByDept = new Map<number, any[]>();
        const unassignedGroups: any[] = [];

        allGroups.forEach(g => {
            const groupLeader = g.leader || g.user_device_groups?.find(u => u.is_group_lead)?.user;
            const groupNode = {
                dept_id: `group-${g.id}`,
                group_id: g.id,
                name: g.name,
                description: g.description,
                level: 'NHOM',
                is_technical: true,
                leader: groupLeader ? {
                    user_id: groupLeader.user_id,
                    name: groupLeader.name,
                    email: groupLeader.email,
                    phone_number: groupLeader.phone_number,
                    position: groupLeader.position,
                } : null,
                leader_id: g.leader_id || groupLeader?.user_id || null,
                member_count: g.user_device_groups?.length || 0,
                devices_count: g.devices?.length || 0,
                devices: g.devices || [],
                members: g.user_device_groups?.map(u => ({
                    user_id: u.user?.user_id,
                    name: u.user?.name,
                    email: u.user?.email,
                    phone_number: u.user?.phone_number,
                    position: u.user?.position,
                    is_group_lead: u.is_group_lead || u.user_id === g.leader_id,
                })) || [],
                dept_id_ref: g.dept_id,
                parent_id: g.dept_id,
                children: [],
            };

            if (g.dept_id) {
                if (!groupsByDept.has(g.dept_id)) {
                    groupsByDept.set(g.dept_id, []);
                }
                groupsByDept.get(g.dept_id).push(groupNode);
            } else {
                unassignedGroups.push(groupNode);
            }
        });

        // Xây dựng map Department nodes
        const deptMap = new Map<number, any>();
        allDepts.forEach(d => {
            const directGroups = groupsByDept.get(d.dept_id) || [];
            const directDevicesCount = directGroups.reduce((acc, curr) => acc + (curr.devices_count || 0), 0);
            
            const parentDept = d.parent_id ? allDepts.find(p => p.dept_id === d.parent_id) : null;
            const isInherit = d.inherit_parent_permissions ?? (d.level === 'TO');
            const parentPerms = parentDept?.permissions || [];
            const directPerms = d.permissions || [];
            const effectivePermissions = (isInherit && parentDept)
                ? [...new Set([...parentPerms, ...directPerms])]
                : directPerms;

            deptMap.set(d.dept_id, {
                dept_id: d.dept_id,
                name: d.name,
                description: d.description,
                level: d.level,
                is_technical: d.is_technical,
                permissions: d.permissions,
                inherit_parent_permissions: isInherit,
                effective_permissions: effectivePermissions,
                parent_permissions: parentPerms,
                scope: d.scope,
                manager_id: d.manager_id,
                manager: d.manager ? {
                    user_id: d.manager.user_id,
                    name: d.manager.name,
                    email: d.manager.email,
                    phone_number: d.manager.phone_number,
                    position: d.manager.position,
                } : null,
                deputy_id: d.deputy_id,
                deputy: d.deputy ? {
                    user_id: d.deputy.user_id,
                    name: d.deputy.name,
                    email: d.deputy.email,
                    phone_number: d.deputy.phone_number,
                    position: d.deputy.position,
                } : null,
                parent_id: d.parent_id,
                parent: d.parent ? {
                    dept_id: d.parent.dept_id,
                    name: d.parent.name,
                    permissions: d.parent.permissions,
                } : null,
                member_count: deptCountMap.get(d.dept_id) || 0,
                devices_count: directDevicesCount,
                device_groups: directGroups,
                children: [...directGroups], // Gắn các Nhóm vào làm con của Tổ
            });
        });

        // Xây dựng cây phân cấp Đội -> Tổ -> Nhóm
        const roots: any[] = [];
        allDepts.forEach(d => {
            const node = deptMap.get(d.dept_id);
            if (d.parent_id && deptMap.has(d.parent_id)) {
                const parentNode = deptMap.get(d.parent_id);
                parentNode.children.push(node);
                // Cộng dồn thiết bị và thành viên lên cấp Đội
                parentNode.devices_count = (parentNode.devices_count || 0) + (node.devices_count || 0);
            } else {
                roots.push(node);
            }
        });

        // Nếu có nhóm chưa phân Tổ, đưa vào một nhánh đặc biệt hoặc trả về
        if (unassignedGroups.length > 0) {
            roots.push({
                dept_id: 'unassigned-groups-root',
                name: '⚠️ Nhóm thiết bị chưa phân Tổ',
                description: 'Các nhóm thiết bị kỹ thuật chưa được chỉ định thuộc Tổ nào',
                level: 'UNASSIGNED',
                is_technical: true,
                manager: null,
                deputy: null,
                member_count: unassignedGroups.reduce((acc, g) => acc + g.member_count, 0),
                devices_count: unassignedGroups.reduce((acc, g) => acc + g.devices_count, 0),
                children: unassignedGroups,
            });
        }

        await this.cacheManager.set(cacheKey, roots);
        return roots;
    }
}

