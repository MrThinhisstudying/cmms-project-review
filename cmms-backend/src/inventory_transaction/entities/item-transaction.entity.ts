import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from 'src/user/user.entity';
import { Item } from 'src/inventory_item/entities/item.entity';

@Entity({ name: 'inventory_item_transaction' })
export class ItemTransaction {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @ManyToOne(() => Item)
  @JoinColumn({ name: 'item_id' })
  item: Item;

  @Column({ type: 'double precision' })
  delta: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  purpose?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'timestamp' })
  occurred_at: Date;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @CreateDateColumn()
  created_at: Date;
}
