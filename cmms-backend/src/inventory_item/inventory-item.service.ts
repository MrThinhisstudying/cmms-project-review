import {Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Between, ILike, LessThanOrEqual, MoreThanOrEqual, Repository} from 'typeorm';
import {CreateItemDto} from './dto/create-item.dto';
import {Item} from './entities/item.entity';
import {Category} from 'src/inventory_category/entities/category.entity';
import {ItemTransaction} from 'src/inventory_transaction/entities/item-transaction.entity';
import {User} from 'src/user/user.entity';
import * as XLSX from 'xlsx';
import {inventoryColumnMapping} from './enums/inventory.enum';
import {StockOut} from 'src/stock-out/entities/stock-out.entity';
import {StockOutStatus} from 'src/stock-out/enum/stock-out.enum';

@Injectable()
export class InventoryItemService {
    constructor(
        @InjectRepository(Item) private itemRepo: Repository<Item>,
        @InjectRepository(Category) private categoryRepo: Repository<Category>,
        @InjectRepository(ItemTransaction) private txRepo: Repository<ItemTransaction>,
        @InjectRepository(StockOut) private stockRepo: Repository<StockOut>,
    ) {}

    async getReport(start?: string, end?: string) {
        let dateFilter: any = undefined;

        if (start && end) {
            dateFilter = Between(new Date(start), new Date(end));
        } else if (start) {
            dateFilter = MoreThanOrEqual(new Date(start));
        } else if (end) {
            dateFilter = LessThanOrEqual(new Date(end));
        }

        const totalItems = await this.itemRepo.count();
        const totalCategories = await this.categoryRepo.count();

        const whereDate = dateFilter ? {created_at: dateFilter} : {};

        const totalStockOuts = await this.stockRepo.count({where: whereDate});

        const approvedStockOuts = await this.stockRepo.count({
            where: {...whereDate, status: StockOutStatus.APPROVED},
        });
        const pendingStockOuts = await this.stockRepo.count({
            where: {...whereDate, status: StockOutStatus.PENDING},
        });
        const canceledStockOuts = await this.stockRepo.count({
            where: {...whereDate, status: StockOutStatus.CANCELED},
        });

        return {
            total_items: totalItems,
            total_categories: totalCategories,
            total_stockouts: totalStockOuts,
            approved_stockouts: approvedStockOuts,
            pending_stockouts: pendingStockOuts,
            canceled_stockouts: canceledStockOuts,
            generated_at: new Date(),
        };
    }

    async importItemsFromExcel(buffer: Buffer, user?: User) {
        try {
            const workbook = XLSX.read(buffer, {type: 'buffer', codepage: 65001});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, {defval: ''});

            const normalizedMapping: Record<string, string> = {};
            for (const [vnKey, enKey] of Object.entries(inventoryColumnMapping)) {
                normalizedMapping[vnKey.trim().toLowerCase()] = enKey;
            }

            const results = [];

            for (const row of rows) {
                const mapped: Record<string, any> = {};
                for (const [vnKey, value] of Object.entries(row)) {
                    const key = normalizedMapping[vnKey.trim().toLowerCase()];
                    if (key) mapped[key] = typeof value === 'string' ? value.trim() : value;
                }

                const name = String(mapped.name ?? '').trim();
                const quantity = Number(String(mapped.quantity ?? '0').replace(/,/g, ''));
                const unit = String(mapped.quantity_unit ?? '').trim();
                const code = String(mapped.code ?? '').trim();
                const price = mapped.price ? Number(String(mapped.price).replace(/[^0-9.-]+/g, '')) : 0;
                const catName = String(mapped.category_name ?? '').trim();

                if (!name || !unit || !quantity || quantity <= 0) continue;

                let category = null;
                if (catName) {
                    category = await this.categoryRepo.findOne({where: {name: ILike(catName)}});
                    if (!category) {
                        category = this.categoryRepo.create({name: catName, description: ''});
                        await this.categoryRepo.save(category);
                    }
                }

                const existing = await this.itemRepo.findOne({
                    where: [{name: ILike(name)}, ...(code ? [{code: ILike(code)}] : [])],
                    relations: ['category'],
                });

                if (existing) {
                    const before = existing.quantity ?? 0;
                    existing.code = code || existing.code;
                    existing.price = price || existing.price;
                    existing.quantity = Number(before + quantity);
                    existing.quantity_unit = unit;
                    existing.updated_at = new Date();
                    if (category) existing.category = category;
                    await this.itemRepo.save(existing);

                    await this.txRepo.save({
                        item: existing,
                        delta: Number(quantity),
                        purpose: 'Import Excel Update',
                        note: 'Cộng dồn số lượng qua import',
                        user: user ?? null,
                        occurred_at: new Date(),
                    });

                    results.push({
                        name,
                        code,
                        quantity,
                        unit,
                        status: 'updated(+)',
                        old_quantity: before,
                        new_quantity: existing.quantity,
                    });
                } else {
                    const newItem = this.itemRepo.create({
                        code,
                        name,
                        category: category ?? null,
                        quantity,
                        quantity_unit: unit,
                        price,
                        enabled: true,
                    });
                    await this.itemRepo.save(newItem);

                    await this.txRepo.save({
                        item: newItem,
                        delta: Number(quantity),
                        purpose: 'Import Excel Create',
                        note: 'Tạo mới vật tư qua import',
                        user: user ?? null,
                        occurred_at: new Date(),
                    });

                    results.push({
                        name,
                        code,
                        quantity,
                        unit,
                        status: 'created',
                    });
                }
            }

            return results;
        } catch (err) {
            console.error(err);
            throw new HttpException('Không thể nhập dữ liệu vật tư', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async create(dto: CreateItemDto) {
        const category = await this.categoryRepo.findOne({where: {id: dto.category_id}});
        if (!category) throw new NotFoundException('Category not found');

        const it = this.itemRepo.create({
            category,
            name: dto.name,
            info: dto.info,
            quantity: dto.quantity ?? 0,
            quantity_unit: dto.quantity_unit,
            image: (dto as any).image,
            enabled: (dto as any).enabled ?? true,
            code: (dto as any).code,
            price: (dto as any).price,
        });

        const saved = await this.itemRepo.save(it);

        if ((dto.quantity ?? 0) > 0) {
            await this.txRepo.save({
                item: saved,
                delta: dto.quantity,
                purpose: 'Initial stock',
                occurred_at: new Date(),
            });
        }

        return saved;
    }

    async list() {
        return this.itemRepo.find({relations: ['category'], order: {updated_at: 'DESC'}});
    }

    async find(id: number) {
        const it = await this.itemRepo.findOne({where: {item_id: id}, relations: ['category']});
        if (!it) throw new NotFoundException('Item not found');
        return it;
    }

    async restock(itemId: number, qty: number, note?: string, user?: User) {
        if (qty <= 0) throw new BadRequestException('Restock quantity must be positive');
        const item = await this.find(itemId);
        item.quantity = Number((item.quantity + qty).toFixed(4));
        await this.itemRepo.save(item);

        const tx = this.txRepo.create({
            item,
            delta: qty,
            purpose: 'Restock',
            note,
            user: user ?? null,
            occurred_at: new Date(),
        });
        return this.txRepo.save(tx);
    }

    async update(id: number, dto: Partial<CreateItemDto>) {
        const item = await this.find(id);
        if (!item) throw new NotFoundException('Item not found');

        if (dto.category_id) {
            const category = await this.categoryRepo.findOne({
                where: {id: dto.category_id},
            });
            if (!category) throw new NotFoundException('Category not found');
            item.category = category;
        }

        if (dto.name !== undefined) item.name = dto.name;
        if (dto.info !== undefined) item.info = dto.info;
        if (dto.quantity_unit !== undefined) item.quantity_unit = dto.quantity_unit;
        if (dto.image !== undefined) item.image = dto.image;
        if (dto.enabled !== undefined) item.enabled = dto.enabled;
        if (dto.code !== undefined) item.code = dto.code;
        if (dto.price !== undefined) item.price = dto.price;

        await this.itemRepo.save(item);
        return item;
    }

    async remove(id: number) {
        const item = await this.find(id);
        if (!item) throw new NotFoundException('Item not found');

        await this.txRepo.delete({item: {item_id: id}});

        await this.itemRepo.remove(item);
        return {id, deleted: true};
    }
}
