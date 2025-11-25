import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {StockOutController} from './stock-out.controller';
import {StockOutService} from './stock-out.service';
import {StockOut} from './entities/stock-out.entity';
import {Item} from 'src/inventory_item/entities/item.entity';
import {ItemTransaction} from 'src/inventory_transaction/entities/item-transaction.entity';
import {Repair} from 'src/repairs/entities/repair.entity';

@Module({
    imports: [TypeOrmModule.forFeature([StockOut, Item, ItemTransaction, Repair])],
    controllers: [StockOutController],
    providers: [StockOutService],
})
export class StockOutModule {}
