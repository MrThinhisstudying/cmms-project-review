import {Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn} from 'typeorm';

@Entity()
export class MaintenanceChecklistTemplate {
    @PrimaryGeneratedColumn()
    id: number;
    @Column({nullable: true})
    code: string;
    @Column()
    name: string; // Tên mẫu (Vd: Xe Toyota)

    @Column({nullable: true})
    device_type: string;

    @Column({nullable: true})
    release_no?: string; // Lần ban hành

    @Column({nullable: true})
    revision_no?: string; // Lần sửa đổi

    @Column({type: 'jsonb'})
    checklist_structure: any; // Chứa dữ liệu Excel

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @DeleteDateColumn()
    deleted_at: Date; // Nếu cột này có dữ liệu => Coi như đã xóa
}

