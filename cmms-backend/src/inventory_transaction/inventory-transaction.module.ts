import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryTransactionController } from './inventory-transaction.controller';
import { InventoryTransactionService } from './inventory-transaction.service';
import { ItemTransaction } from './entities/item-transaction.entity';
import { Item } from 'src/inventory_item/entities/item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ItemTransaction, Item])],
  controllers: [InventoryTransactionController],
  providers: [InventoryTransactionService],
  exports: [InventoryTransactionService],
})
export class InventoryTransactionModule {}
