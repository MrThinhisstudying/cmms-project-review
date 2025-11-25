import { Module, MiddlewareConsumer } from '@nestjs/common';
import { AuditLog } from './audit-log.entity';
import { AuditTransaction } from './audit-transaction.entity';
import { AuditSubscriber } from './subscribers/audit.subscriber';
import { AuditContextMiddleware } from './middlewares/audit-context.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit-log.controller';
import { AuditService } from './audit-log.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, AuditTransaction]),
  ],
  controllers: [AuditController],
  providers: [AuditService, AuditSubscriber],
  exports: [AuditService],
})
export class AuditModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditContextMiddleware).forRoutes('*');
  }
}
