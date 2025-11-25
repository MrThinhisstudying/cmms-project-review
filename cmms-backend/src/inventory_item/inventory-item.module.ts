import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryItemController } from './inventory-item.controller';
import { InventoryItemService } from './inventory-item.service';
import { Item } from './entities/item.entity';
import { Category } from 'src/inventory_category/entities/category.entity';
import { ItemTransaction } from 'src/inventory_transaction/entities/item-transaction.entity';
import { StockOut } from 'src/stock-out/entities/stock-out.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Item, Category, ItemTransaction, StockOut])],
  controllers: [InventoryItemController],
  providers: [InventoryItemService],
  exports: [InventoryItemService],
})
export class InventoryItemModule {}
