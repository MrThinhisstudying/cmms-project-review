import {Injectable, NotFoundException, BadRequestException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {CreateDepartmentDto} from './dto/create-department.dto';
import {Department} from './department.entity';
import {UpdateDepartmentDto} from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
    constructor(
        @InjectRepository(Department)
        private readonly departmentRepository: Repository<Department>,
    ) {}

    async findAll(): Promise<Department[]> {
        return await this.departmentRepository.find({
            relations: ['users'],
            order: {
                updated_at: 'DESC',
            },
        });
    }

    async findOne(id: number): Promise<Department> {
        const dept = await this.departmentRepository.findOne({
            where: {dept_id: id},
            relations: ['users'],
        });
        if (!dept) throw new NotFoundException('Không tìm thấy phòng ban');
        return dept;
    }

    async create(data: CreateDepartmentDto): Promise<Department> {
        const existing = await this.departmentRepository.findOne({where: {name: data.name}});
        if (existing) throw new BadRequestException('Tên phòng ban đã tồn tại');
        const dept = this.departmentRepository.create(data);
        return await this.departmentRepository.save(dept);
    }

    async update(id: number, data: UpdateDepartmentDto): Promise<Department> {
        const dept = await this.findOne(id);
        Object.assign(dept, data);
        return await this.departmentRepository.save(dept);
    }

    async delete(id: number): Promise<void> {
        const result = await this.departmentRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException('Xoá phòng ban thất bại');
        }
    }
}

