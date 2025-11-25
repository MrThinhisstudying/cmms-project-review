import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class InventoryCategoryService {
  constructor(@InjectRepository(Category) private repo: Repository<Category>) {}

  async create(dto: CreateCategoryDto) {
    const c = this.repo.create(dto as any);
    return await this.repo.save(c);
  }

  async list() {
    return await this.repo.find({ order: { created_at: 'DESC' } });
  }

  async findOne(id: number) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Category not found');
    return c;
  }

  async update(id: number, dto: CreateCategoryDto) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Category not found');
    const merged = this.repo.merge(c, dto as any);
    return await this.repo.save(merged);
  }

  async remove(id: number) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Category not found');
    await this.repo.remove(c);
    return true;
  }
}
