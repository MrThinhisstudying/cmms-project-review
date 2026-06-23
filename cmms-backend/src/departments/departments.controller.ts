import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentService } from './departments.service';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthUser } from 'src/user/user.decorator';
import { User } from 'src/user/user.entity';
import { UserRole } from 'src/user/user-role.enum';


@ApiTags('Departments')
@Controller('department')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    const depts = await this.departmentService.findAll();
    return { message: 'Lấy danh sách phòng ban thành công', data: depts };
  }

  // ⚠️ Route cụ thể TRƯỚC :id
  @Get('tree')
  @HttpCode(HttpStatus.OK)
  async findTree() {
    const tree = await this.departmentService.findTree();
    return { message: 'Lấy cây phòng ban thành công', data: tree };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: number) {
    const dept = await this.departmentService.findOne(id);
    return { message: 'Lấy phòng ban thành công', data: dept };
  }

  @Post()
  @UseGuards(JWTAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@AuthUser() currentUser: User, @Body() data: CreateDepartmentDto) {
    if (![UserRole.ADMIN, UserRole.HR_MANAGER].includes(currentUser.role)) {
      throw new ForbiddenException('Bạn không có quyền tạo phòng ban');
    }
    const dept = await this.departmentService.create(data);
    return { message: 'Tạo phòng ban thành công', data: dept };
  }

  @Put(':id')
  @UseGuards(JWTAuthGuard)
  @HttpCode(HttpStatus.OK)
  async update(@AuthUser() currentUser: User, @Param('id') id: number, @Body() data: UpdateDepartmentDto) {
    if (![UserRole.ADMIN, UserRole.HR_MANAGER].includes(currentUser.role)) {
      throw new ForbiddenException('Bạn không có quyền cập nhật phòng ban');
    }
    const dept = await this.departmentService.update(id, data);
    return { message: 'Cập nhật phòng ban thành công', data: dept };
  }

  @Delete(':id')
  @UseGuards(JWTAuthGuard)
  @HttpCode(HttpStatus.OK)
  async delete(@AuthUser() currentUser: User, @Param('id') id: number) {
    if (![UserRole.ADMIN, UserRole.HR_MANAGER].includes(currentUser.role)) {
      throw new ForbiddenException('Bạn không có quyền xoá phòng ban');
    }
    await this.departmentService.delete(id);
    return { message: 'Xoá phòng ban thành công' };
  }
}
