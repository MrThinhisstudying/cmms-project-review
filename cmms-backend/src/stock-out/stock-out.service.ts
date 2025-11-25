import {Injectable, NotFoundException, BadRequestException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {CreateStockOutDto} from './dto/create-stock-out.dto';
import {User} from 'src/user/user.entity';
import {StockOut} from './entities/stock-out.entity';
import {Item} from 'src/inventory_item/entities/item.entity';
import {ItemTransaction} from 'src/inventory_transaction/entities/item-transaction.entity';
import {StockOutStatus} from './enum/stock-out.enum';
import {Repair} from 'src/repairs/entities/repair.entity';

@Injectable()
export class StockOutService {
    constructor(
        @InjectRepository(StockOut) private repo: Repository<StockOut>,
        @InjectRepository(Item) private itemRepo: Repository<Item>,
        @InjectRepository(ItemTransaction) private txRepo: Repository<ItemTransaction>,
        @InjectRepository(Repair) private readonly repairRepo: Repository<Repair>,
    ) {}

    async findByItemId(itemId: number) {
        const item = await this.itemRepo.findOne({where: {item_id: itemId}});
        if (!item) throw new NotFoundException('Không tìm thấy vật tư');
        return await this.repo.find({
            where: {item: {item_id: itemId}},
            relations: ['requested_by', 'approved_by', 'item', 'item.category', 'repair'],
            order: {created_at: 'DESC'},
        });
    }

    async request(dto: CreateStockOutDto, user?: User) {
        const item = await this.itemRepo.findOne({where: {item_id: dto.item_id}});
        if (!item) throw new NotFoundException('Item not found');
        if (dto.quantity <= 0) throw new BadRequestException('Quantity must be positive');

        let repair: Repair | null = null;
        if (dto.repair_id) {
            const repairId = Number(dto.repair_id);
            if (isNaN(repairId)) throw new BadRequestException('repair_id không hợp lệ');
            repair = await this.repairRepo.findOne({where: {repair_id: repairId}});
            if (!repair) throw new NotFoundException('Không tìm thấy phiếu sửa chữa');
            if (repair.canceled) throw new BadRequestException('Phiếu đã bị hủy');
        }

        const stockOut = this.repo.create({
            item,
            quantity: Number(dto.quantity),
            purpose: dto.purpose ?? (repair ? `Phục vụ sửa chữa #${repair.repair_id}` : 'Xuất vật tư'),
            note: dto.note,
            requested_by: user ?? null,
            repair: repair ?? null,
            status: StockOutStatus.PENDING,
        });

        return await this.repo.save(stockOut);
    }

    async listAll() {
        return await this.repo.find({relations: ['item', 'item.category', 'requested_by', 'approved_by', 'repair'], order: {created_at: 'DESC'}});
    }

    async get(id: number) {
        const so = await this.repo.findOne({where: {id}, relations: ['item', 'item.category', 'requested_by', 'approved_by', 'repair']});
        if (!so) throw new NotFoundException('Stock out not found');
        return so;
    }

    async approve(id: number, approver?: User) {
        const so = await this.get(id);
        if (so.status !== StockOutStatus.PENDING) throw new BadRequestException('Only pending requests can be approved');
        const item = await this.itemRepo.findOne({where: {item_id: so.item.item_id}});
        if (!item) throw new NotFoundException('Item not found');
        if (item.quantity - so.quantity < 0) throw new BadRequestException('Insufficient stock to approve');
        item.quantity = Number((item.quantity - so.quantity).toFixed(4));
        await this.itemRepo.save(item);
        so.status = StockOutStatus.APPROVED;
        so.approved_by = approver ?? null;
        so.occurred_at = new Date();
        await this.repo.save(so);
        await this.txRepo.save({
            item,
            delta: -Math.abs(so.quantity),
            purpose: `StockOut#${so.id}`,
            note: so.note,
            user: approver ?? null,
            occurred_at: new Date(),
        } as any);
        return so;
    }

    async cancel(id: number, requester?: User) {
        const so = await this.get(id);
        if (so.status === StockOutStatus.CANCELED) throw new BadRequestException('Already canceled');
        if (so.status === StockOutStatus.APPROVED) {
            const item = await this.itemRepo.findOne({where: {item_id: so.item.item_id}});
            if (!item) throw new NotFoundException('Item not found');
            item.quantity = Number((item.quantity + so.quantity).toFixed(4));
            await this.itemRepo.save(item);
            await this.txRepo.save({
                item,
                delta: Number(so.quantity),
                purpose: `StockOutCancel#${so.id}`,
                note: so.note,
                user: requester ?? null,
                occurred_at: new Date(),
            } as any);
        }
        so.status = StockOutStatus.CANCELED;
        so.approved_by = requester ?? null;
        so.occurred_at = new Date();
        await this.repo.save(so);
        return so;
    }
}
