import {Injectable, NotFoundException, BadRequestException, Inject, CACHE_MANAGER} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {Cache} from 'cache-manager';
import {CreateDepartmentDto} from './dto/create-department.dto';
import {Department} from './department.entity';
import {UpdateDepartmentDto} from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
    constructor(
        @InjectRepository(Department)
        private readonly departmentRepository: Repository<Department>,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {}

    async findAll(): Promise<Department[]> {
        const cacheKey = 'departments_all';
        const cached = await this.cacheManager.get<Department[]>(cacheKey);
        if (cached) return cached;

        const data = await this.departmentRepository.find({
            relations: ['users', 'manager', 'parent', 'children'],
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
            relations: ['users', 'manager', 'parent', 'children'],
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
        return result;
    }

    async update(id: number, data: UpdateDepartmentDto): Promise<Department> {
        const dept = await this.findOne(id);
        
        if (data.parent_id) {
            if (data.parent_id === id) throw new BadRequestException('Không thể chọn chính mình làm cấp trên');
            const parent = await this.departmentRepository.findOne({ where: { dept_id: data.parent_id } });
            if (!parent) throw new BadRequestException('Đơn vị cấp trên không tồn tại');
            dept.parent = parent;
        } else if (data.parent_id === null) {
            dept.parent = null;
        }

        Object.assign(dept, data);
        const result = await this.departmentRepository.save(dept);
        await this.cacheManager.del('departments_all');
        return result;
    }

    async delete(id: number): Promise<void> {
        const result = await this.departmentRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException('Xoá phòng ban thất bại');
        }
        await this.cacheManager.del('departments_all');
    }
}

