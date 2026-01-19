import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class AdminOrManageGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const role = user?.role?.toLowerCase() || "";
    console.log('AdminOrManageGuard Check:', { user, role });
    return (
      !!user &&
      (role.includes('admin') || 
       role.includes('manager') || 
       role.includes('team_lead') || 
       role.includes('unit_head') || 
       role.includes('director'))
    );
  }
}
