import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ShiftDebtsService } from './shift-debts.service';
import { CreateShiftDebtDto, UpdateShiftDebtDto } from './dto/shift-debt.dto';

@Controller('shift-debts')
export class ShiftDebtsController {
  constructor(private readonly shiftDebtsService: ShiftDebtsService) {}

  @Get()
  async findAll(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('department_id') departmentId?: string,
  ) {
    return this.shiftDebtsService.findAll(
      year ? +year : undefined,
      month ? +month : undefined,
      departmentId ? +departmentId : undefined,
    );
  }

  @Post()
  async create(@Body() dto: CreateShiftDebtDto) {
    return this.shiftDebtsService.create(dto);
  }

  @Post('bulk')
  async createBulk(@Body() items: any[]) {
    return this.shiftDebtsService.bulkUpsert(items);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateShiftDebtDto) {
    return this.shiftDebtsService.update(+id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.shiftDebtsService.remove(+id);
    return { success: true, message: 'Đã xóa bản ghi nợ ca thành công' };
  }
}
