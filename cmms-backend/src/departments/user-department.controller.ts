import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus, ParseIntPipe, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserDepartmentService } from './user-department.service';
import { CreateUserDepartmentDto, UpdateUserDepartmentDto, SyncUserDepartmentsDto } from './dto/user-department.dto';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthUser } from 'src/user/user.decorator';
import { User } from 'src/user/user.entity';
import { UserRole } from 'src/user/user-role.enum';


@ApiTags('User-Department')
@Controller('user-department')
export class UserDepartmentController {
    constructor(private readonly service: UserDepartmentService) {}

    @Get('user/:userId')
    @ApiOperation({ summary: 'Lấy tất cả đơn vị của 1 user' })
    @HttpCode(HttpStatus.OK)
    async findByUser(@Param('userId', ParseIntPipe) userId: number) {
        const data = await this.service.findByUser(userId);
        return { message: 'Thành công', data };
    }

    @Get('dept/:deptId')
    @ApiOperation({ summary: 'Lấy tất cả thành viên của 1 đơn vị' })
    @HttpCode(HttpStatus.OK)
    async findByDept(@Param('deptId', ParseIntPipe) deptId: number) {
        const data = await this.service.findByDepartment(deptId);
        return { message: 'Thành công', data };
    }

    @Post()
    @UseGuards(JWTAuthGuard)
    @ApiOperation({ summary: 'Gán user vào đơn vị' })
    @HttpCode(HttpStatus.CREATED)
    async create(@AuthUser() currentUser: User, @Body() dto: CreateUserDepartmentDto) {
        if (![UserRole.ADMIN, UserRole.HR_MANAGER].includes(currentUser.role)) {
            throw new ForbiddenException('Bạn không có quyền gán đơn vị');
        }
        const data = await this.service.create(dto);
        return { message: 'Gán thành công', data };
    }

    // ⚠️ Route cụ thể PHẢI đặt TRƯỚC route generic (:id) để tránh conflict
    @Put('user/:userId/sync')
    @UseGuards(JWTAuthGuard)
    @ApiOperation({ summary: 'Đồng bộ toàn bộ đơn vị của 1 user' })
    @HttpCode(HttpStatus.OK)
    async syncForUser(
        @AuthUser() currentUser: User,
        @Param('userId', ParseIntPipe) userId: number,
        @Body() dto: SyncUserDepartmentsDto,
    ) {
        if (![UserRole.ADMIN, UserRole.HR_MANAGER].includes(currentUser.role)) {
            throw new ForbiddenException('Bạn không có quyền đồng bộ đơn vị');
        }
        const data = await this.service.syncForUser(userId, dto.departments as any);
        return { message: 'Đồng bộ thành công', data };
    }

    @Put(':id')
    @UseGuards(JWTAuthGuard)
    @ApiOperation({ summary: 'Cập nhật vai trò trong đơn vị' })
    @HttpCode(HttpStatus.OK)
    async update(
        @AuthUser() currentUser: User,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateUserDepartmentDto,
    ) {
        if (![UserRole.ADMIN, UserRole.HR_MANAGER].includes(currentUser.role)) {
            throw new ForbiddenException('Bạn không có quyền cập nhật vai trò trong đơn vị');
        }
        const data = await this.service.update(id, dto);
        return { message: 'Cập nhật thành công', data };
    }

    @Delete(':id')
    @UseGuards(JWTAuthGuard)
    @ApiOperation({ summary: 'Xóa user khỏi đơn vị' })
    @HttpCode(HttpStatus.OK)
    async remove(@AuthUser() currentUser: User, @Param('id', ParseIntPipe) id: number) {
        if (![UserRole.ADMIN, UserRole.HR_MANAGER].includes(currentUser.role)) {
            throw new ForbiddenException('Bạn không có quyền xóa user khỏi đơn vị');
        }
        await this.service.remove(id);
        return { message: 'Xóa thành công' };
    }
}
