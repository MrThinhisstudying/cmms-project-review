import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { RewardDisciplinesService } from './reward-disciplines.service';
import { CreateRewardDisciplineDto } from './dto/create-reward-discipline.dto';
import { CreateBatchRewardDisciplineDto } from './dto/create-batch-reward-discipline.dto';
import { UpdateRewardDisciplineDto } from './dto/update-reward-discipline.dto';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../user/user-role.enum';
import { ApiTags } from '@nestjs/swagger';



// Roles có quyền đọc dữ liệu HR
const HR_READ_ROLES: string[] = [UserRole.ADMIN, 'admin', UserRole.HR_MANAGER, UserRole.DIRECTOR, UserRole.UNIT_HEAD];
// Roles có quyền ghi/sửa/xoá dữ liệu HR
const HR_WRITE_ROLES: string[] = [UserRole.ADMIN, 'admin', UserRole.HR_MANAGER];

@ApiTags('Reward and Disciplines')
@Controller('reward-disciplines')
@UseGuards(JWTAuthGuard)
export class RewardDisciplinesController {
  constructor(private readonly rewardDisciplinesService: RewardDisciplinesService) {}

  @Post('batch')
  createBatch(@Body() createBatchDto: CreateBatchRewardDisciplineDto, @Req() req: any) {
    if (!HR_WRITE_ROLES.includes(req.user.role)) {
        throw new ForbiddenException();
    }
    return this.rewardDisciplinesService.createBatch(createBatchDto.records);
  }

  @Post()
  create(@Body() createRewardDisciplineDto: CreateRewardDisciplineDto, @Req() req: any) {
    if (!HR_WRITE_ROLES.includes(req.user.role)) {
        throw new ForbiddenException();
    }
    return this.rewardDisciplinesService.create(createRewardDisciplineDto);
  }

  @Get()
  findAll(@Req() req: any) {
    if (!HR_READ_ROLES.includes(req.user.role)) {
        throw new ForbiddenException();
    }
    return this.rewardDisciplinesService.findAll();
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string, @Req() req: any) {
    if (!HR_READ_ROLES.includes(req.user.role) && req.user.user_id !== +userId) {
        throw new ForbiddenException('Bạn không được phép xem thông tin của người khác');
    }
    return this.rewardDisciplinesService.findByUserId(+userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    if (!HR_READ_ROLES.includes(req.user.role)) {
        throw new ForbiddenException();
    }
    return this.rewardDisciplinesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRewardDisciplineDto: UpdateRewardDisciplineDto, @Req() req: any) {
    if (!HR_WRITE_ROLES.includes(req.user.role)) {
        throw new ForbiddenException();
    }
    return this.rewardDisciplinesService.update(+id, updateRewardDisciplineDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    if (!HR_WRITE_ROLES.includes(req.user.role)) {
        throw new ForbiddenException();
    }
    return this.rewardDisciplinesService.remove(+id);
  }
}
