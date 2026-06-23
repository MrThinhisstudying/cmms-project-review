import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog, ActivityAction, ActivityEntityType } from '../entities/activity-log.entity';

@Injectable()
export class ActivityLogService {
    constructor(
        @InjectRepository(ActivityLog)
        private readonly logRepo: Repository<ActivityLog>,
    ) {}

    /**
     * Ghi log một sự kiện
     */
    async log(params: {
        entityType: ActivityEntityType;
        entityId: number;
        action: ActivityAction;
        changedById?: number;
        oldValue?: any;
        newValue?: any;
        description: string;
        fieldName?: string;
    }): Promise<ActivityLog> {
        const entry = this.logRepo.create({
            entity_type: params.entityType,
            entity_id: params.entityId,
            action: params.action,
            changed_by_id: params.changedById,
            old_value: params.oldValue ? JSON.stringify(params.oldValue) : null,
            new_value: params.newValue ? JSON.stringify(params.newValue) : null,
            description: params.description,
            field_name: params.fieldName,
        });
        return this.logRepo.save(entry);
    }

    /**
     * Lấy lịch sử của 1 entity
     */
    async findByEntity(entityType: ActivityEntityType, entityId: number, limit = 50): Promise<ActivityLog[]> {
        return this.logRepo.find({
            where: { entity_type: entityType, entity_id: entityId },
            relations: ['changed_by'],
            order: { created_at: 'DESC' },
            take: limit,
        });
    }

    /**
     * Lấy lịch sử gần đây (dùng cho Dashboard)
     */
    async findRecent(limit = 30): Promise<ActivityLog[]> {
        return this.logRepo.find({
            relations: ['changed_by'],
            order: { created_at: 'DESC' },
            take: limit,
        });
    }

    /**
     * Lấy lịch sử theo user thực hiện
     */
    async findByUser(userId: number, limit = 30): Promise<ActivityLog[]> {
        return this.logRepo.find({
            where: { changed_by_id: userId },
            relations: ['changed_by'],
            order: { created_at: 'DESC' },
            take: limit,
        });
    }
}
