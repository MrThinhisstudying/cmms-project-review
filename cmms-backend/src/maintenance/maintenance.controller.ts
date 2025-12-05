import {Controller, Get, Post, Body, Param, Put, Delete, ParseIntPipe, HttpException, HttpStatus, Query} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import {MaintenanceService} from './maintenance.service';
import {CreateMaintenanceDto} from './dto/create-maintenance.dto';
import {UpdateMaintenanceDto} from './dto/update-maintenance.dto';
import {UseInterceptors, UploadedFile} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
@ApiTags('maintenance')
@Controller('maintenance')
export class MaintenanceController {
    constructor(private readonly maintenanceService: MaintenanceService) {}
    @Get('devices/:id/maintenance')
    async findByDevice(@Param('id', ParseIntPipe) deviceId: number) {
        try {
            const data = await this.maintenanceService.findByDevice(deviceId);
            return {message: 'Lấy lịch bảo dưỡng theo thiết bị thành công', data};
        } catch (error) {
            throw new HttpException('Lấy lịch bảo dưỡng thất bại', HttpStatus.NOT_FOUND);
        }
    }

    @Post()
    async create(@Body() dto: CreateMaintenanceDto) {
        try {
            const data = await this.maintenanceService.create(dto);
            return {message: 'Tạo lịch bảo dưỡng thành công', data};
        } catch (error) {
            throw new HttpException('Tạo lịch bảo dưỡng thất bại', HttpStatus.BAD_REQUEST);
        }
    }

    @Get()
    async findAll() {
        try {
            const data = await this.maintenanceService.findAll();
            return {message: 'Danh sách lịch bảo dưỡng', data};
        } catch (error) {
            throw new HttpException('Lấy danh sách thất bại', HttpStatus.NOT_FOUND);
        }
    }

    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        try {
            const data = await this.maintenanceService.findOne(id);
            return {message: 'Chi tiết lịch bảo dưỡng', data};
        } catch (error) {
            throw new HttpException('Lấy chi tiết thất bại', HttpStatus.NOT_FOUND);
        }
    }

    @Put(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMaintenanceDto) {
        try {
            const data = await this.maintenanceService.update(id, dto);
            return {message: 'Cập nhật lịch bảo dưỡng thành công', data};
        } catch (error) {
            throw new HttpException('Cập nhật thất bại', HttpStatus.BAD_REQUEST);
        }
    }

    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
        try {
            const data = await this.maintenanceService.remove(id);
            return {message: 'Xóa lịch bảo dưỡng thành công', data};
        } catch (error) {
            throw new HttpException('Xóa thất bại', HttpStatus.BAD_REQUEST);
        }
    }
    // 9. Import Quy trình (Template) - ĐÃ CẬP NHẬT THEO YÊU CẦU CỦA BẠN
    @Post('templates/import')
    @UseInterceptors(FileInterceptor('file'))
    async importTemplate(
        @UploadedFile() file: Express.Multer.File,
        @Body('name') name: string,
        @Body('code') code: string, // <--- NHẬN THÊM CODE
        @Body('device_type') deviceType: string,
    ) {
        if (!file) throw new HttpException('File is required', HttpStatus.BAD_REQUEST);
        // Truyền đúng thứ tự sang Service
        return this.maintenanceService.importTemplate(file.buffer, name, code, deviceType);
    }

    // 2. API Lấy danh sách mẫu (cho Dropdown)
    @Get('templates/all')
    async findAllTemplates() {
        return this.maintenanceService.findAllTemplates();
    }

    // 3. API Lấy chi tiết mẫu (để vẽ Checklist)
    @Get('templates/:id')
    async findTemplateOne(@Param('id', ParseIntPipe) id: number) {
        return this.maintenanceService.findTemplateOne(id);
    }

    @Post('plans/import')
    @UseInterceptors(FileInterceptor('file'))
    async importPlan(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new HttpException('File is required', HttpStatus.BAD_REQUEST);
        return this.maintenanceService.importMaintenancePlan(file.buffer);
    }

    @Delete('templates/:id')
    async removeTemplate(@Param('id', ParseIntPipe) id: number) {
        return this.maintenanceService.removeTemplate(id);
    }

    @Put('templates/:id')
    async updateTemplate(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
        return this.maintenanceService.updateTemplate(id, body);
    }

    // THÊM API NÀY VÀO CONTROLLER
    @Get('device/:deviceId') // Endpoint sẽ là: GET /maintenance/device/:deviceId
    async findMaintenanceByDevice(@Param('deviceId', ParseIntPipe) deviceId: number) {
        try {
            const data = await this.maintenanceService.findByDevice(deviceId);
            return {message: 'Lịch bảo dưỡng chi tiết theo thiết bị', data};
        } catch (error) {
            throw new HttpException('Lỗi tải lịch bảo dưỡng chi tiết', HttpStatus.NOT_FOUND);
        }
    }

    @Put(':id/cancel')
    async cancel(@Param('id', ParseIntPipe) id: number) {
        return this.maintenanceService.cancel(id);
    }

    @Get('plan/yearly')
    async getYearlyPlan(@Query('year') year: number) {
        const y = year || new Date().getFullYear();
        const data = await this.maintenanceService.getYearlyPlan(y);
        return {message: 'Kế hoạch tổng thể', data};
    }

    @Get('plan/original-view')
    async getOriginalPlanView() {
        const data = await this.maintenanceService.getOriginalPlanView();
        return {message: 'Dữ liệu kế hoạch gốc', data};
    }
}

