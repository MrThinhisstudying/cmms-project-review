import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (this.cls.isActive() && user) {
      // Support both id and user_id formats depending on auth strategy/entity
      const userId = user.id || user.user_id;
      if (userId) {
        this.cls.set('audit.userId', Number(userId));
      }
    }

    return next.handle();
  }
}
