import { Injectable, NestMiddleware } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';

@Injectable()
export class AuditContextMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: any, res: any, next: () => void) {
    if (!this.cls.isActive()) {
      return next();
    }

    const actor = req.user?.id ?? req.headers['x-actor-id'];
    const correlationId = req.headers['x-correlation-id'] || randomUUID();
    const reason = req.headers['x-change-reason'] || undefined;

    this.cls.set('audit.userId', actor ? Number(actor) : undefined);
    this.cls.set('audit.correlationId', String(correlationId));
    this.cls.set('audit.reason', reason);
    this.cls.set('audit.txId', undefined);

    next();
  }
}
