import {Category} from 'src/inventory_category/entities/category.entity';
import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn} from 'typeorm';

@Entity({name: 'inventory_item'})
export class Item {
    @PrimaryGeneratedColumn({type: 'int'})
    item_id: number;

    @ManyToOne(() => Category)
    @JoinColumn({name: 'category_id'})
    category: Category;

    @Column({type: 'varchar', length: 255})
    name: string;

    @Column({type: 'text', nullable: true})
    info?: string;

    @Column({type: 'double precision', default: 0})
    quantity: number;

    @Column({type: 'varchar', length: 64, nullable: true})
    quantity_unit?: string;

    @Column({type: 'boolean', default: true})
    enabled: boolean;

    @Column({type: 'text', nullable: true})
    image?: string;

    @Column({nullable: true})
    code?: string;

    @Column({type: 'float', nullable: true})
    price?: number;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
