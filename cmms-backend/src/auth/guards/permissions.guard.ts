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

        // Helper hàm resolve quyền thực tế (kế thừa từ Đội cấp trên nếu có)
        const resolveDeptPermissions = (dept: any): string[] => {
            if (!dept) return [];
            const directPerms = dept.permissions || [];
            if (dept.parent && (dept.inherit_parent_permissions !== false)) {
                const parentPerms = dept.parent.permissions || [];
                return [...new Set([...parentPerms, ...directPerms])];
            }
            return directPerms;
        };

        // Tổng hợp permissions từ department chính + tất cả user_departments
        const primaryPermissions = resolveDeptPermissions(user?.department);
        const multiDeptPermissions = (user?.user_departments || []).flatMap(
            (ud: any) => resolveDeptPermissions(ud?.department)
        );
        const allPermissions = [...new Set([...primaryPermissions, ...multiDeptPermissions])];

        const hasPermission = requiredPermissions.some((p) => allPermissions.includes(p));
        if (!hasPermission) throw new ForbiddenException('Bạn không có quyền thực hiện hành động này.');

        return true;
    }
}
