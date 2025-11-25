import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentService } from './departments.service';

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

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: number) {
    const dept = await this.departmentService.findOne(id);
    return { message: 'Lấy phòng ban thành công', data: dept };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: CreateDepartmentDto) {
    const dept = await this.departmentService.create(data);
    return { message: 'Tạo phòng ban thành công', data: dept };
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: number, @Body() data: UpdateDepartmentDto) {
    const dept = await this.departmentService.update(id, data);
    return { message: 'Cập nhật phòng ban thành công', data: dept };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: number) {
    await this.departmentService.delete(id);
    return { message: 'Xoá phòng ban thành công' };
  }
}
