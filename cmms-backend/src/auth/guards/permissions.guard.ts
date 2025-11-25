import {CanActivate, ExecutionContext, ForbiddenException, Injectable} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {PERMISSIONS_KEY} from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

        if (!requiredPermissions || requiredPermissions.length === 0) return true;

        const {user} = context.switchToHttp().getRequest();
        if (!user) throw new ForbiddenException('Không xác định người dùng.');

        if (user.role === 'admin') return true;

        const userPermissions: string[] = user?.department?.permissions || [];
        const hasPermission = requiredPermissions.some((p) => userPermissions.includes(p));
        if (!hasPermission) throw new ForbiddenException('Bạn không có quyền thực hiện hành động này.');

        return true;
    }
}
