import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AdminOrManageGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    return (
      !!user &&
      (user.role === 'admin' || user.role === 'manager' || user.isAdmin === true || user.isManager === true)
    );
  }
}
