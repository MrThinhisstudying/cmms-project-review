import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Connection } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditTransaction } from './audit-transaction.entity';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class AuditService {
  constructor(
    private readonly connection: Connection,
    private readonly cls: ClsService,
  ) {}

  async listHistory(entityName: string, entityId: string | number, page = 1, limit = 20) {
    const repo = this.connection.getRepository(AuditLog);
    const [items, total] = await repo.findAndCount({
      where: { entity_name: entityName, entity_id: String(entityId) },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['transaction'],
    });
    return { items, total, page, limit };
  }

  async getLog(logId: number) {
    const repo = this.connection.getRepository(AuditLog);
    const item = await repo.findOne({ where: { id: logId }, relations: ['transaction'] });
    if (!item) throw new NotFoundException('Audit log not found');
    return item;
  }

  async getAllLogs(
    filters: { actorUserId?: string; entity?: string; entityId?: string },
    page = 1,
    limit = 20,
  ) {
    const repo = this.connection.getRepository(AuditLog);
    const where: any = {};
    if (filters.actorUserId) where.actor_user_id = Number(filters.actorUserId);
    if (filters.entity) where.entity_name = filters.entity;
    if (filters.entityId) where.entity_id = String(filters.entityId);

    const [items, total] = await repo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['transaction'],
    });
    return { items, total, page, limit };
  }

  async rollbackToLog(logId: number, reasonFromBody?: string) {
    return this.connection.transaction(async (manager) => {
      const auditRepo = manager.getRepository(AuditLog);
      const log = await auditRepo.findOne({ where: { id: logId } });
      if (!log) throw new NotFoundException('Audit log not found');
      if (log.rolled_back) throw new BadRequestException('Log này đã rollback trước đó');

      const meta = this.connection.getMetadata(log.entity_name);
      if (!meta) throw new BadRequestException('Unknown entity_name');

      const pk = meta.primaryColumns[0].propertyName;
      const repo = manager.getRepository(meta.target as any);
      const idVal: any = this.coercePk(meta, log.entity_id);

      let beforeSnapshot: any = null;
      let afterSnapshot: any = null;

      if (log.action === 'DELETE') {
        if (!log.before) throw new BadRequestException('No snapshot to restore');
        const restored = await repo.save({ ...log.before });
        beforeSnapshot = null;
        afterSnapshot = restored;
      } else if (log.action === 'INSERT') {
        const existing = await repo.findOne({ where: { [pk]: idVal } as any });
        if (!existing) throw new NotFoundException('Entity not found for rollback (INSERT)');
        beforeSnapshot = existing;
        await repo.remove(existing);
        afterSnapshot = null;
      } else if (log.action === 'UPDATE') {
        if (!log.before) throw new BadRequestException('No snapshot to revert to');
        const existing = await repo.findOne({ where: { [pk]: idVal } as any });
        if (!existing) throw new NotFoundException('Entity not found for rollback');
        beforeSnapshot = JSON.parse(JSON.stringify(existing));
        Object.assign(existing, log.before);
        const saved = await repo.save(existing);
        afterSnapshot = saved;
      } else {
        throw new BadRequestException(`Rollback not supported for action ${log.action}`);
      }

      log.rolled_back = true;
      log.rolled_back_at = new Date();
      await auditRepo.save(log);

      await auditRepo.save(
        auditRepo.create({
          entity_name: log.entity_name,
          entity_id: log.entity_id,
          action: 'ROLLBACK',
          actor_user_id: this.cls.get('audit.userId'),
          reason: reasonFromBody || this.cls.get('audit.reason') || `rollback to log #${log.id}`,
          before: beforeSnapshot,
          after: afterSnapshot,
          diff: null,
          rolled_back: false,
          rolled_back_at: null,
        }),
      );

      return { rolled_back_to: log.id };
    });
  }

  async rollbackTransaction(transactionId: number, reason?: string) {
    return this.connection.transaction(async (manager) => {
      const tRepo = manager.getRepository(AuditTransaction);
      const logRepo = manager.getRepository(AuditLog);

      const transaction = await tRepo.findOne({
        where: { id: transactionId },
        relations: ['logs'],
      });
      if (!transaction) throw new NotFoundException('Transaction not found');

      if (transaction.logs.every((l) => l.rolled_back)) {
        throw new BadRequestException('Transaction này đã rollback');
      }

      const logs = [...(transaction.logs || [])].sort((a, b) => b.id - a.id);

      for (const log of logs) {
        if (log.rolled_back) continue;
        const meta = this.connection.getMetadata(log.entity_name);
        if (!meta) continue;

        const pk = meta.primaryColumns[0].propertyName;
        const repo = manager.getRepository(meta.target as any);
        const idVal = this.coercePk(meta, log.entity_id);

        if (log.action === 'DELETE') {
          if (log.before) await repo.save({ ...log.before });
        } else if (log.action === 'INSERT') {
          const existing = await repo.findOne({ where: { [pk]: idVal } as any });
          if (existing) await repo.remove(existing);
        } else if (log.action === 'UPDATE') {
          if (!log.before) continue;
          const existing = await repo.findOne({ where: { [pk]: idVal } as any });
          if (existing) {
            Object.assign(existing, log.before);
            await repo.save(existing);
          }
        }

        log.rolled_back = true;
        log.rolled_back_at = new Date();
        await logRepo.save(log);
      }

      await logRepo.save(
        logRepo.create({
          entity_name: 'Transaction',
          entity_id: String(transactionId),
          action: 'ROLLBACK',
          actor_user_id: this.cls.get('audit.userId'),
          reason: reason || 'Rollback toàn bộ transaction',
          before: null,
          after: null,
          diff: null,
          rolled_back: false,
          rolled_back_at: null,
        }),
      );

      return { rolled_back_transaction: transactionId };
    });
  }

  private coercePk(meta: any, value: string) {
    const column = meta.primaryColumns[0];
    const type = column.type;
    if (typeof value === 'number') return value;
    if (['int', 'integer', 'bigint', Number].includes(type)) return Number(value);
    return value;
  }
}
