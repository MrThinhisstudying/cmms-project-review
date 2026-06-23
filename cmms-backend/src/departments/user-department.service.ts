import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDepartment } from './entities/user-department.entity';
import { User } from '../user/user.entity';
import { Department } from './department.entity';
import { CreateUserDepartmentDto, UpdateUserDepartmentDto } from './dto/user-department.dto';

@Injectable()
export class UserDepartmentService {
    constructor(
        @InjectRepository(UserDepartment)
        private readonly userDeptRepo: Repository<UserDepartment>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(Department)
        private readonly deptRepo: Repository<Department>,
    ) {}

    /**
     * Lấy tất cả đơn vị mà 1 user thuộc
     */
    async findByUser(userId: number): Promise<UserDepartment[]> {
        return this.userDeptRepo.find({
            where: { user_id: userId },
            relations: ['department', 'department.parent'],
            order: { is_primary: 'DESC', created_at: 'ASC' },
        });
    }

    /**
     * Lấy tất cả thành viên của 1 đơn vị (Tổ/Đội)
     */
    async findByDepartment(deptId: number): Promise<UserDepartment[]> {
        return this.userDeptRepo.find({
            where: { dept_id: deptId },
            relations: ['user'],
            order: { role_in_dept: 'ASC', created_at: 'ASC' },
        });
    }

    /**
     * Gán 1 user vào 1 đơn vị
     */
    async create(dto: CreateUserDepartmentDto): Promise<UserDepartment> {
        // Validate user tồn tại
        const user = await this.userRepo.findOne({ where: { user_id: dto.user_id } });
        if (!user) throw new NotFoundException('Không tìm thấy người dùng');

        // Validate department tồn tại
        const dept = await this.deptRepo.findOne({ where: { dept_id: dto.dept_id } });
        if (!dept) throw new NotFoundException('Không tìm thấy đơn vị');

        // Kiểm tra trùng lặp
        const existing = await this.userDeptRepo.findOne({
            where: { user_id: dto.user_id, dept_id: dto.dept_id },
        });
        if (existing) throw new BadRequestException('Nhân viên đã thuộc đơn vị này');

        // Nếu is_primary = true, bỏ primary cũ
        if (dto.is_primary) {
            await this.userDeptRepo.update(
                { user_id: dto.user_id, is_primary: true },
                { is_primary: false },
            );
        }

        const record = this.userDeptRepo.create({
            user_id: dto.user_id,
            dept_id: dto.dept_id,
            role_in_dept: dto.role_in_dept || 'MEMBER',
            is_primary: dto.is_primary || false,
        });

        return this.userDeptRepo.save(record);
    }

    /**
     * Cập nhật vai trò / primary
     */
    async update(id: number, dto: UpdateUserDepartmentDto): Promise<UserDepartment> {
        const record = await this.userDeptRepo.findOne({ where: { id } });
        if (!record) throw new NotFoundException('Không tìm thấy bản ghi');

        // Nếu đổi thành primary, bỏ primary cũ
        if (dto.is_primary === true) {
            await this.userDeptRepo.update(
                { user_id: record.user_id, is_primary: true },
                { is_primary: false },
            );
        }

        if (dto.role_in_dept !== undefined) record.role_in_dept = dto.role_in_dept;
        if (dto.is_primary !== undefined) record.is_primary = dto.is_primary;

        return this.userDeptRepo.save(record);
    }

    /**
     * Xóa 1 user khỏi 1 đơn vị
     */
    async remove(id: number): Promise<void> {
        const result = await this.userDeptRepo.delete(id);
        if (result.affected === 0) throw new NotFoundException('Không tìm thấy bản ghi');
    }

    /**
     * Đồng bộ toàn bộ đơn vị của 1 user (xóa cũ → thêm mới)
     * Dùng khi cập nhật từ UserModal
     */
    async syncForUser(
        userId: number,
        departments: { dept_id: number; role_in_dept?: string; is_primary?: boolean }[],
    ): Promise<UserDepartment[]> {
        const user = await this.userRepo.findOne({ where: { user_id: userId } });
        if (!user) throw new NotFoundException('Không tìm thấy người dùng');

        // Xóa tất cả bản ghi cũ
        await this.userDeptRepo.delete({ user_id: userId });

        if (!departments || departments.length === 0) return [];

        // Kiểm tra xem có item nào đã được đánh dấu primary không
        const hasAnyPrimary = departments.some(d => d.is_primary === true);

        const records = departments.map((d, idx) => {
            // Chỉ fallback set primary cho item đầu tiên nếu KHÔNG có item nào được đánh dấu
            const isPrimary = d.is_primary === true || (!hasAnyPrimary && idx === 0);
            return this.userDeptRepo.create({
                user_id: userId,
                dept_id: d.dept_id,
                role_in_dept: (d.role_in_dept as any) || 'MEMBER',
                is_primary: isPrimary,
            });
        });

        const savedRecords = await this.userDeptRepo.save(records);

        // Auto-sync: cập nhật user.department = đơn vị chính (backward compatible)
        const primaryRecord = savedRecords.find(r => r.is_primary);
        if (primaryRecord) {
            const primaryDept = await this.userDeptRepo.manager
                .getRepository('Department')
                .findOne({ where: { dept_id: primaryRecord.dept_id } });
            if (primaryDept) {
                user.department = primaryDept as any;
                await this.userRepo.save(user);
            }
        }

        return savedRecords;
    }
}
