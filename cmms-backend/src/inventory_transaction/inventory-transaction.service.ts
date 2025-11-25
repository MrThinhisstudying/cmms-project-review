import {Injectable, NotFoundException, BadRequestException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {CreateTransactionDto} from './dto/create-transaction.dto';
import {User} from 'src/user/user.entity';
import {ItemTransaction} from './entities/item-transaction.entity';
import {Item} from 'src/inventory_item/entities/item.entity';

@Injectable()
export class InventoryTransactionService {
    constructor(
        @InjectRepository(ItemTransaction) private txRepo: Repository<ItemTransaction>,
        @InjectRepository(Item) private itemRepo: Repository<Item>,
    ) {}

    async createTransaction(dto: CreateTransactionDto, user?: User) {
        const item = await this.itemRepo.findOne({where: {item_id: dto.item_id}});
        if (!item) throw new NotFoundException('Item not found');
        if (dto.quantity === 0) throw new BadRequestException('Quantity must be non-zero');
        const delta = -Math.abs(dto.quantity);
        if (item.quantity + delta < 0) {
            throw new BadRequestException('Insufficient stock');
        }
        item.quantity = Number((item.quantity + delta).toFixed(4));
        await this.itemRepo.save(item);
        const tx = this.txRepo.create({
            item,
            delta,
            purpose: dto.purpose,
            note: dto.note,
            user: user ?? null,
            occurred_at: new Date(),
        } as any);
        return await this.txRepo.save(tx);
    }

    async listForItem(itemId: number) {
        const item = await this.itemRepo.findOne({where: {item_id: itemId}});
        if (!item) throw new NotFoundException('Item not found');

        return await this.txRepo.find({
            where: {item: {item_id: item.item_id}} as any,
            relations: ['item', 'user'],
            order: {created_at: 'DESC'},
        });
    }
}
