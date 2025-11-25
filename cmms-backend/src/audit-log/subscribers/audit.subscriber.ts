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
    if (!isTrackedEntity(event.metadata.targetName)) return;
    (event as any).__audit_before__ = event.databaseEntity
      ? sanitizeSnapshot(event.metadata.targetName, event.databaseEntity)
      : null;
  }

  async afterUpdate(event: UpdateEvent<any>) {
    const name = event.metadata.targetName;
    if (!isTrackedEntity(name)) return;

    const before = (event as any).__audit_before__;
    const after = event.entity ? sanitizeSnapshot(name, event.entity) : null;

    const repo = event.manager.getRepository(AuditLog);
    const pk = event.metadata.primaryColumns[0].propertyName;
    const tx = await this.ensureTransaction(event.manager);

    await repo.save(repo.create({
      entity_name: name,
      entity_id: String((after ?? before)?.[pk]),
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

    const repo = event.manager.getRepository(AuditLog);
    const pk = event.metadata.primaryColumns[0].propertyName;
    const snapshot = sanitizeSnapshot(name, event.entity ?? event.databaseEntity);
    const tx = await this.ensureTransaction(event.manager);

    await repo.save(repo.create({
      entity_name: name,
      entity_id: String(snapshot?.[pk]),
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
