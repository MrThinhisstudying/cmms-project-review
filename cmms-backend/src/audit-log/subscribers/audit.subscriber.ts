import {
  Connection,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from 'typeorm';
import { AuditLog } from '../audit-log.entity';
import { AuditTransaction } from '../audit-transaction.entity';
import { ClsService } from 'nestjs-cls';
import { computeShallowDiff, isTrackedEntity, sanitizeSnapshot } from '../utils/audit.util';

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  private readonly beforeMap = new Map<string, any>();

  constructor(
    private readonly connection: Connection,
    private readonly cls: ClsService,
  ) {
    this.connection.subscribers.push(this);
  }

  private async ensureTransaction(eventManager: any) {
    let txId = this.cls.get('audit.txId');
    if (txId) {
      const t = await eventManager.getRepository(AuditTransaction).findOne({ where: { id: txId } });
      if (t) return t;
    }

    return this.cls.run(async () => {
      const tRepo = eventManager.getRepository(AuditTransaction);
      const t = tRepo.create({
        actor_user_id: this.cls.get('audit.userId'),
        reason: this.cls.get('audit.reason'),
      });
      const saved = await tRepo.save(t);
      this.cls.set('audit.txId', saved.id);
      return saved;
    });
  }

  async afterInsert(event: InsertEvent<any>) {
    const name = event.metadata.targetName;
    if (!isTrackedEntity(name)) return;
    if (this.cls.get('audit.skipAudit')) return;

    const repo = event.manager.getRepository(AuditLog);
    const pk = event.metadata.primaryColumns[0].propertyName;
    const after = sanitizeSnapshot(name, event.entity);
    const tx = await this.ensureTransaction(event.manager);

    await repo.save(repo.create({
      entity_name: name,
      entity_id: String(after?.[pk]),
      action: 'INSERT',
      actor_user_id: this.cls.get('audit.userId'),
      reason: this.cls.get('audit.reason'),
      before: null,
      after,
      diff: null,
      transaction: tx,
    }));
  }

  async beforeUpdate(event: UpdateEvent<any>) {
    const name = event.metadata.targetName;
    if (!isTrackedEntity(name)) return;
    if (this.cls.get('audit.skipAudit')) return;

    const pk = event.metadata.primaryColumns[0]?.propertyName;
    let idVal = event.entity?.[pk] ?? (event as any).entityId;
    if (idVal === undefined && (event as any).criteria) {
      const crit = (event as any).criteria;
      idVal = typeof crit === 'object' ? (crit?.[pk] ?? crit?.id) : crit;
    }

    let beforeData = event.databaseEntity;
    if (!beforeData && idVal !== undefined && idVal !== null) {
      try {
        const targetRepo = event.manager.getRepository(event.metadata.target);
        beforeData = await targetRepo.findOne({ where: { [pk]: idVal } as any });
      } catch (err) {
        console.error('AuditSubscriber beforeUpdate query error:', err);
      }
    }

    const snapshot = beforeData ? sanitizeSnapshot(name, beforeData) : null;
    (event as any).__audit_before__ = snapshot;

    if (idVal !== undefined && idVal !== null) {
      const key = `${name}:${idVal}`;
      this.beforeMap.set(key, snapshot);
      if (event.queryRunner && !event.queryRunner.data) {
        (event.queryRunner as any).data = {};
      }
      if (event.queryRunner?.data) {
        event.queryRunner.data[key] = snapshot;
      }
    }
  }

  async afterUpdate(event: UpdateEvent<any>) {
    const name = event.metadata.targetName;
    if (!isTrackedEntity(name)) return;
    if (this.cls.get('audit.skipAudit')) return;

    const pk = event.metadata.primaryColumns[0].propertyName;
    let idVal = event.entity?.[pk] ?? (event as any).entityId;
    if (idVal === undefined && (event as any).criteria) {
      const crit = (event as any).criteria;
      idVal = typeof crit === 'object' ? (crit?.[pk] ?? crit?.id) : crit;
    }

    const key = idVal !== undefined && idVal !== null ? `${name}:${idVal}` : null;
    const before =
      (key && this.beforeMap.has(key) ? this.beforeMap.get(key) : null) ??
      (key && event.queryRunner?.data ? event.queryRunner.data[key] : null) ??
      (event as any).__audit_before__ ??
      null;

    if (key) {
      this.beforeMap.delete(key);
      if (event.queryRunner?.data) {
        delete event.queryRunner.data[key];
      }
    }

    let afterData = event.entity;
    if (afterData && before) {
      afterData = { ...before, ...afterData };
    }
    const after = afterData ? sanitizeSnapshot(name, afterData) : null;

    const repo = event.manager.getRepository(AuditLog);
    const tx = await this.ensureTransaction(event.manager);

    const entityId = String((after ?? before)?.[pk] ?? idVal ?? 'unknown');

    await repo.save(repo.create({
      entity_name: name,
      entity_id: entityId,
      action: 'UPDATE',
      actor_user_id: this.cls.get('audit.userId'),
      reason: this.cls.get('audit.reason'),
      before,
      after,
      diff: computeShallowDiff(before, after),
      transaction: tx,
    }));
  }

  async beforeRemove(event: RemoveEvent<any>) {
    const name = event.metadata.targetName;
    if (!isTrackedEntity(name)) return;
    if (this.cls.get('audit.skipAudit')) return;

    const repo = event.manager.getRepository(AuditLog);
    const pk = event.metadata.primaryColumns[0].propertyName;

    let entityData = event.entity ?? event.databaseEntity;
    if (!entityData && event.entityId) {
      try {
        const targetRepo = event.manager.getRepository(event.metadata.target);
        entityData = await targetRepo.findOne({ where: { [pk]: event.entityId } as any });
      } catch (err) {
        // ignore
      }
    }

    const snapshot = sanitizeSnapshot(name, entityData);
    const rawId = snapshot?.[pk] ?? event.entityId;
    const entityId = rawId !== undefined && rawId !== null ? String(rawId) : 'unknown';
    const tx = await this.ensureTransaction(event.manager);

    await repo.save(repo.create({
      entity_name: name,
      entity_id: entityId,
      action: 'DELETE',
      actor_user_id: this.cls.get('audit.userId'),
      reason: this.cls.get('audit.reason'),
      before: snapshot,
      after: null,
      diff: null,
      transaction: tx,
    }));
  }
}
