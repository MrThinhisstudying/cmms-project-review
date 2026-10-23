import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { LaborContractsService } from './labor-contracts.service';
import { CreateLaborContractDto } from './dto/create-labor-contract.dto';
import { UpdateLaborContractDto } from './dto/update-labor-contract.dto';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../user/user-role.enum';
import { ApiTags } from '@nestjs/swagger';



// Roles có quyền đọc dữ liệu HR
const HR_READ_ROLES: string[] = [UserRole.ADMIN, 'admin', UserRole.HR_MANAGER, UserRole.DIRECTOR, UserRole.UNIT_HEAD];
// Roles có quyền ghi/sửa/xoá dữ liệu HR
const HR_WRITE_ROLES: string[] = [UserRole.ADMIN, 'admin', UserRole.HR_MANAGER];

@ApiTags('Labor Contracts')
@Controller('labor-contracts')
@UseGuards(JWTAuthGuard)
export class LaborContractsController {
  constructor(private readonly laborContractsService: LaborContractsService) {}

  @Post('bulk')
  createBulk(@Body() dtos: CreateLaborContractDto[], @Req() req: any) {
    if (!HR_WRITE_ROLES.includes(req.user.role)) {
      throw new ForbiddenException();
    }
    return this.laborContractsService.createBulk(dtos);
  }

  @Post()
  create(@Body() createLaborContractDto: CreateLaborContractDto, @Req() req: any) {
    if (!HR_WRITE_ROLES.includes(req.user.role)) {
        throw new ForbiddenException();
    }
    return this.laborContractsService.create(createLaborContractDto);
  }

  @Get()
  findAll(@Req() req: any) {
    if (!HR_READ_ROLES.includes(req.user.role)) {
        throw new ForbiddenException();
    }
    return this.laborContractsService.findAll();
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string, @Req() req: any) {
    if (!HR_READ_ROLES.includes(req.user.role) && req.user.user_id !== +userId) {
        throw new ForbiddenException('Bạn không được phép xem hợp đồng của người khác');
    }
    return this.laborContractsService.findByUserId(+userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    if (!HR_READ_ROLES.includes(req.user.role)) {
        throw new ForbiddenException();
    }
    return this.laborContractsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLaborContractDto: UpdateLaborContractDto, @Req() req: any) {
    if (!HR_WRITE_ROLES.includes(req.user.role)) {
        throw new ForbiddenException();
    }
    return this.laborContractsService.update(+id, updateLaborContractDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    if (!HR_WRITE_ROLES.includes(req.user.role)) {
        throw new ForbiddenException();
    }
    return this.laborContractsService.remove(+id);
  }
}
