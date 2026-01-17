import {Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus, UseGuards, UploadedFile, UseInterceptors, Res, Query, Req} from '@nestjs/common';
import { Response, Request } from 'express';
import {DevicesService} from './devices.service';
import {CreateDeviceDto} from './dto/create-device.dto';
import {ApiTags} from '@nestjs/swagger';
import {JWTAuthGuard} from 'src/auth/guards/jwt-auth.guard';
import {PermissionsGuard} from 'src/auth/guards/permissions.guard';
import {RequirePermissions} from 'src/auth/decorators/permissions.decorator';
import {FileInterceptor} from '@nestjs/platform-express';
import * as path from 'path';
import { DeviceStatus } from './enums/device-status.enum';

@ApiTags('Devices')
@Controller('devices')
export class DevicesController {
    constructor(private readonly devicesService: DevicesService) {}

    @Get()
    @UseGuards(JWTAuthGuard)
    async findAll(
        @Query('status') status?: DeviceStatus,
        @Query('name') name?: string,
        @Query('groupId') groupId?: string,
        @Req() request?: Request,
    ) {
        try {
            const filter = {
                status,
                name,
                groupId: groupId ? Number(groupId) : undefined
            };
             
            const user = (request as any).user;
            const devices = await this.devicesService.findAll(filter, user);
            return {message: 'Lấy danh sách trang thiết bị thành công', data: devices};
        } catch {
            throw new HttpException('Lấy danh sách trang thiết bị thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('report')
    async getReport() {
        try {
            const result = await this.devicesService.getReport();
            return {message: 'Thống kê thiết bị thành công', data: result};
        } catch {
            throw new HttpException('Thống kê thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('analytics/monthly')
    async getMonthlyAnalytics() {
        try {
            return await this.devicesService.getMonthlyAnalytics();
        } catch (e) {
             throw new HttpException('Lấy dữ liệu phân tích thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('export/pdf')
    async exportPdf(@Res() res: Response) {
        try {
            const buffer = await this.devicesService.exportDevicesToPdf();
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename=devices.pdf',
                'Content-Length': buffer.length,
            });
            res.end(buffer);
        } catch (e) {
            console.log(e);
            throw new HttpException('Xuất PDF thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        try {
            const device = await this.devicesService.findOne(+id);
            return {message: 'Tìm kiếm trang thiết bị thành công', data: device};
        } catch {
            throw new HttpException('Không tìm thấy trang thiết bị', HttpStatus.NOT_FOUND);
        }
    }

    @Get('user/:userId')
    async findByUserId(@Param('userId') userId: string) {
        try {
            const devices = await this.devicesService.findByUserId(+userId);
            return {message: 'Tìm kiếm trang thiết bị theo người dùng thành công', data: devices};
        } catch {
            throw new HttpException('Không tìm thấy thiết bị cho người dùng này', HttpStatus.NOT_FOUND);
        }
    }

    @Post()
    @UseGuards(JWTAuthGuard, PermissionsGuard)
    @RequirePermissions('ADD_DEVICE')
    async create(@Body() dto: CreateDeviceDto) {
        try {
            const device = await this.devicesService.create(dto);
            return {message: 'Thêm mới trang thiết bị thành công', data: device};
        } catch {
            throw new HttpException('Thêm mới trang thiết bị thất bại', HttpStatus.BAD_REQUEST);
        }
    }

    @Patch(':id')
    @UseGuards(JWTAuthGuard, PermissionsGuard)
    @RequirePermissions('UPDATE_DEVICE')
    async update(@Param('id') id: string, @Body() dto: CreateDeviceDto) {
        try {
            const device = await this.devicesService.update(+id, dto);
            return {message: 'Cập nhật trang thiết bị thành công', data: device};
        } catch {
            throw new HttpException('Cập nhật trang thiết bị thất bại', HttpStatus.BAD_REQUEST);
        }
    }

    @Delete(':id')
    @UseGuards(JWTAuthGuard, PermissionsGuard)
    @RequirePermissions('DELETE_DEVICE')
    async remove(@Param('id') id: string) {
        try {
            await this.devicesService.remove(+id);
            return {message: 'Xoá trang thiết bị thành công'};
        } catch {
            throw new HttpException('Xoá trang thiết bị thất bại', HttpStatus.BAD_REQUEST);
        }
    }

    @Post('upload_devices')
    @UseGuards(JWTAuthGuard, PermissionsGuard)
    @RequirePermissions('ADD_DEVICE')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: {fileSize: 5 * 1024 * 1024},
            fileFilter: (req, file, cb) => {
                const ext = path.extname(file.originalname);
                const allowed = ['.xlsx', '.xls', '.csv'];
                if (!allowed.includes(ext)) {
                    return cb(new HttpException('Chỉ cho phép các tệp Excel/CSV', HttpStatus.BAD_REQUEST), false);
                }
                cb(null, true);
            },
        }),
    )
    async upload(@UploadedFile() file: Express.Multer.File) {
        if (!file || !file.buffer) {
            throw new HttpException('Không nhận được tệp hoặc tệp trống', HttpStatus.BAD_REQUEST);
        }
        try {
            await this.devicesService.importDevicesFromExcel(file.buffer);
            return {message: 'Tệp được xử lý thành công', result: true};
        } catch {
            throw new HttpException('Xử lý tệp thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}

