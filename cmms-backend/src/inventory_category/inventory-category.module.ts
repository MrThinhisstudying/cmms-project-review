import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryCategoryController } from './inventory-category.controller';
import { InventoryCategoryService } from './inventory-category.service';
import { Category } from './entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [InventoryCategoryController],
  providers: [InventoryCategoryService],
  exports: [InventoryCategoryService],
})
export class InventoryCategoryModule {}
