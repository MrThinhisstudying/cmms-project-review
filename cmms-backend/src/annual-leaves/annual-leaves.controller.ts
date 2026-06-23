import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req, ForbiddenException, UseInterceptors, UploadedFiles, HttpException, HttpStatus } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { AnnualLeavesService } from './annual-leaves.service';
import { CreateAnnualLeaveDto } from './dto/create-annual-leave.dto';
import { UpdateAnnualLeaveDto } from './dto/update-annual-leave.dto';
import { RecordLeaveDto } from './dto/record-leave.dto';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../user/user-role.enum';
import { ApiTags } from '@nestjs/swagger';



// Roles có quyền đọc dữ liệu HR
const HR_READ_ROLES: string[] = [UserRole.ADMIN, 'admin', UserRole.HR_MANAGER, UserRole.DIRECTOR, UserRole.UNIT_HEAD];
// Roles có quyền ghi/sửa/xoá dữ liệu HR
const HR_WRITE_ROLES: string[] = [UserRole.ADMIN, 'admin', UserRole.HR_MANAGER];

@ApiTags('Annual Leaves')
@Controller('annual-leaves')
@UseGuards(JWTAuthGuard)
export class AnnualLeavesController {
  constructor(private readonly annualLeavesService: AnnualLeavesService) {}

  @Post()
  create(@Body() createDto: CreateAnnualLeaveDto, @Req() req: any) {
    if (!HR_WRITE_ROLES.includes(req.user.role)) {
        throw new ForbiddenException();
    }
    return this.annualLeavesService.create(createDto);
  }

  @Get()
  findAll(@Query('year') year: string, @Req() req: any) {
    if (!HR_READ_ROLES.includes(req.user.role)) {
        throw new ForbiddenException('Bạn không được phép xem quỹ phép của toàn công ty');
    }
    return this.annualLeavesService.findAll(year ? +year : undefined);
  }

  @Post('import')
  async importData(@Body() data: any[], @Req() req: any) {
    if (!HR_WRITE_ROLES.includes(req.user.role)) {
        throw new ForbiddenException();
    }
    // We expect an array of DTOs, but we will write a bulk upsert function in the service.
    return this.annualLeavesService.bulkUpsert(data);
  }

  @Post('record')
  async recordLeave(@Body() recordLeaveDto: RecordLeaveDto, @Req() req: any) {
    if (!HR_WRITE_ROLES.includes(req.user.role)) {
        throw new ForbiddenException();
    }
    return this.annualLeavesService.recordLeave(recordLeaveDto);
  }

  @Post('upload-attachments')
  @UseInterceptors(
      FilesInterceptor('files', 3, {
          storage: diskStorage({
              destination: (req, file, cb) => {
                  const uploadPath = './uploads/leaves';
                  if (!fs.existsSync(uploadPath)) {
                      fs.mkdirSync(uploadPath, { recursive: true });
                  }
                  cb(null, uploadPath);
              },
              filename: (req, file, cb) => {
                  const randomName = Array(32)
                      .fill(null)
                      .map(() => Math.round(Math.random() * 16).toString(16))
                      .join('');
                  cb(null, `${randomName}${extname(file.originalname)}`);
              },
          }),
          fileFilter: (req, file, cb) => {
              if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf)$/i)) {
                  return cb(new Error('Chỉ cho phép tải lên file ảnh hoặc pdf!'), false);
              }
              cb(null, true);
          },
          limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
      }),
  )
  async uploadAttachments(@UploadedFiles() files: Array<Express.Multer.File>) {
      if (!files || files.length === 0) {
          throw new HttpException('Vui lòng chọn file tải lên', HttpStatus.BAD_REQUEST);
      }
      
      const pdfCount = files.filter(f => f.originalname.toLowerCase().endsWith('.pdf')).length;
      if (pdfCount > 0 && files.length > 1) {
          throw new HttpException('Nếu tải file PDF thì chỉ được phép tải 1 file duy nhất!', HttpStatus.BAD_REQUEST);
      }

      const urls = files.map(f => `/uploads/leaves/${f.filename}`);
      return {
          message: 'Tải file thành công',
          data: urls
      };
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string, @Query('year') year: string, @Req() req: any) {
    if (!HR_READ_ROLES.includes(req.user.role) && req.user.user_id !== +userId) {
        throw new ForbiddenException('Bạn không được phép xem phép của người khác');
    }
    return this.annualLeavesService.findByUser(+userId, year ? +year : undefined);
  }

  @Get('user/:userId/histories')
  findHistoriesByUser(@Param('userId') userId: string, @Query('year') year: string, @Req() req: any) {
    if (!HR_READ_ROLES.includes(req.user.role) && req.user.user_id !== +userId) {
        throw new ForbiddenException('Bạn không được phép xem lịch sử phép của người khác');
    }
    return this.annualLeavesService.findLeaveHistoriesByUser(+userId, year ? +year : undefined);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateAnnualLeaveDto, @Req() req: any) {
    if (!HR_WRITE_ROLES.includes(req.user.role)) {
        throw new ForbiddenException();
    }
    return this.annualLeavesService.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    if (!HR_WRITE_ROLES.includes(req.user.role)) {
        throw new ForbiddenException();
    }
    return this.annualLeavesService.remove(+id);
  }
}
