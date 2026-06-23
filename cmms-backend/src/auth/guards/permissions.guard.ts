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

        if (user.role === 'admin' || user.role === 'ADMIN') return true;

        // Tổng hợp permissions từ department chính (legacy) + tất cả user_departments (mới)
        const primaryPermissions: string[] = user?.department?.permissions || [];
        const multiDeptPermissions: string[] = (user?.user_departments || []).flatMap(
            (ud: any) => ud?.department?.permissions || []
        );
        const allPermissions = [...new Set([...primaryPermissions, ...multiDeptPermissions])];

        const hasPermission = requiredPermissions.some((p) => allPermissions.includes(p));
        if (!hasPermission) throw new ForbiddenException('Bạn không có quyền thực hiện hành động này.');

        return true;
    }
}
