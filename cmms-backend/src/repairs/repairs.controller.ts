import {Controller, Get, Post, Body, Param, Delete, Patch, Req, Res, UseGuards, Query} from '@nestjs/common';
import {RepairsService} from './repairs.service';
import {CreateRepairDto} from './dto/create-repair.dto';
import {ReviewRepairDto} from './dto/review-repair.dto';
import {UpdateInspectionDto} from './dto/update-inspection.dto';
import {UpdateAcceptanceDto} from './dto/update-acceptance.dto';
import {JWTAuthGuard} from 'src/auth/guards/jwt-auth.guard';
import {PermissionsGuard} from 'src/auth/guards/permissions.guard';
import {RequirePermissions} from 'src/auth/decorators/permissions.decorator';
import {ApiTags} from '@nestjs/swagger';
import {Response} from 'express';

@ApiTags('Repairs')
@Controller('repairs')
export class RepairsController {
    constructor(private readonly repairService: RepairsService) {}

    @UseGuards(JWTAuthGuard, PermissionsGuard)
    @RequirePermissions('CREATE_REPAIR')
    @Post()
    async create(@Body() dto: CreateRepairDto, @Req() req) {
        const repair = await this.repairService.create(dto, req.user.user_id);
        return {message: 'Tạo phiếu sửa chữa thành công', data: repair};
    }

    @UseGuards(JWTAuthGuard, PermissionsGuard)
    @RequirePermissions('UPDATE_REPAIR')
    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: CreateRepairDto, @Req() req) {
        // Enforce user ownership check in service
        const repair = await this.repairService.update(+id, dto, req.user.user_id, req.user.role);
        return {message: 'Cập nhật phiếu sửa chữa thành công', data: repair};
    }

    @UseGuards(JWTAuthGuard, PermissionsGuard)
    @RequirePermissions('APPROVE_REPAIR')
    @Patch(':id/review-request')
    async reviewRequest(@Param('id') id: string, @Body() dto: ReviewRepairDto, @Req() req) {
        const repair = await this.repairService.reviewPhase(+id, req.user.user_id, dto, 'request');
        return {message: 'Cập nhật phiếu thành công', data: repair};
    }

    @UseGuards(JWTAuthGuard, PermissionsGuard)
    @RequirePermissions('CREATE_REPAIR')
    @Patch(':id/inspection')
    async updateInspection(@Param('id') id: string, @Body() dto: UpdateInspectionDto, @Req() req) {
        const repair = await this.repairService.updateInspection(+id, dto, req.user.user_id);
        return {message: 'Cập nhật kiểm nghiệm thành công', data: repair};
    }

    @UseGuards(JWTAuthGuard, PermissionsGuard)
    @RequirePermissions('APPROVE_REPAIR')
    @Patch(':id/review-inspection')
    async reviewInspection(@Param('id') id: string, @Body() dto: ReviewRepairDto, @Req() req) {
        const repair = await this.repairService.reviewPhase(+id, req.user.user_id, dto, 'inspection');
        return {message: 'Cập nhật phiếu thành công', data: repair};
    }

    @UseGuards(JWTAuthGuard, PermissionsGuard)
    @RequirePermissions('CREATE_REPAIR')
    @Patch(':id/acceptance')
    async updateAcceptance(@Param('id') id: string, @Body() dto: UpdateAcceptanceDto, @Req() req) {
        const repair = await this.repairService.updateAcceptance(+id, dto, req.user.user_id);
        return {message: 'Cập nhật nghiệm thu thành công', data: repair};
    }

    @UseGuards(JWTAuthGuard, PermissionsGuard)
    @RequirePermissions('APPROVE_REPAIR')
    @Patch(':id/review-acceptance')
    async reviewAcceptance(@Param('id') id: string, @Body() dto: ReviewRepairDto, @Req() req) {
        const repair = await this.repairService.reviewPhase(+id, req.user.user_id, dto, 'acceptance');
        return {message: 'Cập nhật phiếu thành công', data: repair};
    }

    @Get()
    @Get()
    async findAll(
        @Query('status_request') status_request?: string,
        @Query('status_inspection') status_inspection?: string,
        @Query('device_id') device_id?: string,
        @Req() req?,
    ) {
        const filters = {
            status_request,
            status_inspection,
            device_id: device_id ? +device_id : undefined,
        };
        const data = await this.repairService.findAll(req?.user, filters);
        return {message: 'Lấy danh sách phiếu thành công', data};
    }

    @Get('device/:deviceId')
    async findByDevice(@Param('deviceId') deviceId: string) {
        const data = await this.repairService.findByDevice(+deviceId);
        return {message: 'Lấy lịch sử sửa chữa thiết bị thành công', data};
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const data = await this.repairService.findOne(+id);
        return {message: 'Lấy thông tin phiếu thành công', data};
    }

    @UseGuards(JWTAuthGuard)
    @Get(':id/export/:type')
    async export(@Param('id') id: string, @Param('type') type: 'request' | 'inspection' | 'acceptance', @Res() res: Response) {
        return this.repairService.exportWord(+id, type, res);
    }

    @UseGuards(JWTAuthGuard, PermissionsGuard)
    @RequirePermissions('DELETE_REPAIR')
    @Delete(':id')
    async remove(@Param('id') id: string) {
        await this.repairService.remove(+id);
        return {message: 'Xóa phiếu thành công'};
    }
}
