import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn} from 'typeorm';
import {User} from 'src/user/user.entity';
import {Item} from 'src/inventory_item/entities/item.entity';
import {StockOutStatus} from '../enum/stock-out.enum';
import {Repair} from 'src/repairs/entities/repair.entity';

@Entity({name: 'inventory_stock_out'})
export class StockOut {
    @PrimaryGeneratedColumn({type: 'int'})
    id: number;

    @ManyToOne(() => Item)
    @JoinColumn({name: 'item_id'})
    item: Item;

    @Column({type: 'double precision'})
    quantity: number;

    @Column({type: 'varchar', length: 255, nullable: true})
    purpose?: string;

    @ManyToOne(() => User, {nullable: true})
    @JoinColumn({name: 'requested_by'})
    requested_by?: User;

    @ManyToOne(() => User, {nullable: true})
    @JoinColumn({name: 'approved_by'})
    approved_by?: User;

    @ManyToOne(() => Repair, {nullable: true})
    @JoinColumn({name: 'repair_id'})
    repair?: Repair;

    @Column({type: 'enum', enum: StockOutStatus, default: StockOutStatus.PENDING})
    status: StockOutStatus;

    @Column({type: 'timestamp', nullable: true})
    occurred_at?: Date;

    @Column({type: 'text', nullable: true})
    note?: string;

    @CreateDateColumn()
    created_at: Date;
}
