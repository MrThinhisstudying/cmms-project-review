import { Injectable, NotFoundException, Inject, CACHE_MANAGER } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class InventoryCategoryService {
  constructor(
    @InjectRepository(Category) private repo: Repository<Category>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(dto: CreateCategoryDto) {
    const c = this.repo.create(dto as any);
    const saved = await this.repo.save(c);
    await this.cacheManager.del('categories_list');
    return saved;
  }

  async list() {
    const cacheKey = 'categories_list';
    const cached = await this.cacheManager.get<Category[]>(cacheKey);
    if (cached) return cached;
    
    const data = await this.repo.find({ order: { created_at: 'DESC' } });
    await this.cacheManager.set(cacheKey, data);
    return data;
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
    const saved = await this.repo.save(merged);
    await this.cacheManager.del('categories_list');
    return saved;
  }

  async remove(id: number) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Category not found');
    await this.repo.remove(c);
    await this.cacheManager.del('categories_list');
    return true;
  }
}
