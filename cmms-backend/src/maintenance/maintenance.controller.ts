import {Controller, Get, Post, Body, Param, Put, Delete, ParseIntPipe, HttpException, HttpStatus} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import {MaintenanceService} from './maintenance.service';
import {CreateMaintenanceDto} from './dto/create-maintenance.dto';
import {UpdateMaintenanceDto} from './dto/update-maintenance.dto';

@ApiTags('maintenance')
@Controller('maintenance')
export class MaintenanceController {
    constructor(private readonly maintenanceService: MaintenanceService) {}
    @Get('devices/:id/maintenance')
    async findByDevice(@Param('id', ParseIntPipe) deviceId: number) {
        try {
            const data = await this.maintenanceService.findByDevice(deviceId);
            return { message: 'Lấy lịch bảo dưỡng theo thiết bị thành công', data };
        } catch (error) {
            throw new HttpException('Lấy lịch bảo dưỡng thất bại', HttpStatus.NOT_FOUND);
        }
    }

    @Post()
    async create(@Body() dto: CreateMaintenanceDto) {
        try {
            const data = await this.maintenanceService.create(dto);
            return { message: 'Tạo lịch bảo dưỡng thành công', data };
        } catch (error) {
            throw new HttpException('Tạo lịch bảo dưỡng thất bại', HttpStatus.BAD_REQUEST);
        }
    }

    @Get()
    async findAll() {
        try {
            const data = await this.maintenanceService.findAll();
            return { message: 'Danh sách lịch bảo dưỡng', data };
        } catch (error) {
            throw new HttpException('Lấy danh sách thất bại', HttpStatus.NOT_FOUND);
        }
    }

    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        try {
            const data = await this.maintenanceService.findOne(id);
            return { message: 'Chi tiết lịch bảo dưỡng', data };
        } catch (error) {
            throw new HttpException('Lấy chi tiết thất bại', HttpStatus.NOT_FOUND);
        }
    }

    @Put(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMaintenanceDto) {
        try {
            const data = await this.maintenanceService.update(id, dto);
            return { message: 'Cập nhật lịch bảo dưỡng thành công', data };
        } catch (error) {
            throw new HttpException('Cập nhật thất bại', HttpStatus.BAD_REQUEST);
        }
    }

    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
        try {
            const data = await this.maintenanceService.remove(id);
            return { message: 'Xóa lịch bảo dưỡng thành công', data };
        } catch (error) {
            throw new HttpException('Xóa thất bại', HttpStatus.BAD_REQUEST);
        }
    }
}

