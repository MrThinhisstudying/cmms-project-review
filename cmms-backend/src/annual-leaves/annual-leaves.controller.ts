import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { AnnualLeavesService } from './annual-leaves.service';
import { CreateAnnualLeaveDto } from './dto/create-annual-leave.dto';
import { UpdateAnnualLeaveDto } from './dto/update-annual-leave.dto';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../user/user-role.enum';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Annual Leaves')
@Controller('annual-leaves')
@UseGuards(JWTAuthGuard)
export class AnnualLeavesController {
  constructor(private readonly annualLeavesService: AnnualLeavesService) {}

  @Post()
  create(@Body() createDto: CreateAnnualLeaveDto, @Req() req: any) {
    if (req.user.role !== UserRole.ADMIN && req.user.role !== 'admin' && req.user.role !== UserRole.HR_MANAGER) {
        throw new ForbiddenException();
    }
    return this.annualLeavesService.create(createDto);
  }

  @Get()
  findAll(@Query('year') year: string, @Req() req: any) {
    const role = req.user.role;
    if (
        role !== UserRole.ADMIN && role !== 'admin' &&
        role !== UserRole.HR_MANAGER &&
        role !== UserRole.DIRECTOR
    ) {
        throw new ForbiddenException('Bạn không được phép xem quỹ phép của toàn công ty');
    }
    return this.annualLeavesService.findAll(year ? +year : undefined);
  }

  @Post('import')
  async importData(@Body() data: any[], @Req() req: any) {
    if (req.user.role !== UserRole.ADMIN && req.user.role !== 'admin' && req.user.role !== UserRole.HR_MANAGER) {
        throw new ForbiddenException();
    }
    // We expect an array of DTOs, but we will write a bulk upsert function in the service.
    return this.annualLeavesService.bulkUpsert(data);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string, @Query('year') year: string, @Req() req: any) {
    const role = req.user.role;
    if (
        role !== UserRole.ADMIN && role !== 'admin' &&
        role !== UserRole.HR_MANAGER &&
        role !== UserRole.DIRECTOR &&
        req.user.user_id !== +userId
    ) {
        throw new ForbiddenException('Bạn không được phép xem phép của người khác');
    }
    return this.annualLeavesService.findByUser(+userId, year ? +year : undefined);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateAnnualLeaveDto, @Req() req: any) {
    if (req.user.role !== UserRole.ADMIN && req.user.role !== 'admin' && req.user.role !== UserRole.HR_MANAGER) {
        throw new ForbiddenException();
    }
    return this.annualLeavesService.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    if (req.user.role !== UserRole.ADMIN && req.user.role !== 'admin' && req.user.role !== UserRole.HR_MANAGER) {
        throw new ForbiddenException();
    }
    return this.annualLeavesService.remove(+id);
  }
}
