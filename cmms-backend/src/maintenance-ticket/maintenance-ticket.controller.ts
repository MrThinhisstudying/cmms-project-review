import {Controller, Get, Param, ParseIntPipe, Post, Body, Put, Delete, Query, HttpException, HttpStatus, UseGuards} from '@nestjs/common';
import {JWTAuthGuard} from 'src/auth/guards/jwt-auth.guard';
import {CurrentUser} from 'src/auth/current-user.decorator';
import {User} from 'src/user/user.entity';
import {ApiTags} from '@nestjs/swagger';
import {MaintenanceTicketService} from './maintenance-ticket.service';
import {TicketStatus} from './enum/ticket.enum';
import {Response} from 'express'; // Import từ express
import {Res, Header} from '@nestjs/common';
@ApiTags('maintenance-tickets')
@Controller('maintenance-tickets')
export class MaintenanceTicketController {
    constructor(private readonly ticketService: MaintenanceTicketService) {}

    @Post('maintenance/:id')
    async createForMaintenance(@Param('id', ParseIntPipe) maintenanceId: number) {
        try {
            const data = await this.ticketService.createForMaintenance(maintenanceId);
            return {message: 'Tạo phiếu bảo dưỡng thành công', data};
        } catch (error) {
            throw new HttpException('Tạo phiếu bảo dưỡng thất bại', HttpStatus.BAD_REQUEST);
        }
    }

    // --- THÊM API NÀY ĐỂ FRONTEND GỌI KHI BẤM "LƯU PHIẾU" ---
    @Post()
    @UseGuards(JWTAuthGuard)
    async createFromApp(@Body() body: any, @CurrentUser() user: User) {
        // body sẽ chứa: { device_id, template_id, maintenance_level, checklist_result, arising_issues }
        try {
            const data = await this.ticketService.createFromApp(body, user);
            return {message: 'Lưu phiếu thành công', data};
        } catch (error) {
            throw new HttpException('Lưu phiếu thất bại', HttpStatus.BAD_REQUEST);
        }
    }

    @Get()
    @UseGuards(JWTAuthGuard)
    async list(@CurrentUser() user?: User, @Query('userId') userId?: string, @Query('deptId') deptId?: string) {
        try {
            if (userId || deptId) {
                if (!user) throw new HttpException('Chưa xác thực', HttpStatus.UNAUTHORIZED);
                if (user.role !== 'admin' && user.role !== 'manager') throw new HttpException('Bạn không có quyền', HttpStatus.FORBIDDEN);
                const data = await this.ticketService.listForAssignee(userId ? Number(userId) : undefined, deptId ? Number(deptId) : undefined);
                return {message: 'Danh sách phiếu', data};
            }

            const data = await this.ticketService.listForUser(user);
            return {message: 'Danh sách phiếu', data};
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new HttpException('Lấy danh sách phiếu thất bại', HttpStatus.NOT_FOUND);
        }
    }

    @Get(':id')
    async detail(@Param('id', ParseIntPipe) id: number) {
        try {
            const data = await this.ticketService.findOne(id);
            return {message: 'Chi tiết phiếu', data};
        } catch (error) {
            throw new HttpException('Lấy chi tiết phiếu thất bại', HttpStatus.NOT_FOUND);
        }
    }

    @Put(':id/status')
    @UseGuards(JWTAuthGuard)
    async updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: {status: TicketStatus}, @CurrentUser() user?: User) {
        try {
            const data = await this.ticketService.updateStatus(id, body.status, user);
            return {message: 'Cập nhật trạng thái thành công', data};
        } catch (error) {
            throw new HttpException('Cập nhật trạng thái thất bại', HttpStatus.BAD_REQUEST);
        }
    }

    @Post(':id/complete')
    @UseGuards(JWTAuthGuard)
    async complete(@Param('id', ParseIntPipe) id: number, @Body() body: {description: string}, @CurrentUser() user?: User) {
        try {
            const data = await this.ticketService.complete(id, {description: body?.description}, user);
            return {message: 'Hoàn thành phiếu thành công', data};
        } catch (error) {
            throw new HttpException('Hoàn thành phiếu thất bại', HttpStatus.BAD_REQUEST);
        }
    }

    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
        try {
            const data = await this.ticketService.remove(id);
            return {message: 'Xóa phiếu thành công', data};
        } catch (error) {
            throw new HttpException('Xóa phiếu thất bại', HttpStatus.BAD_REQUEST);
        }
    }

    @Get()
    @UseGuards(JWTAuthGuard)
    async findAllTickets(@Query() query: any) {
        // Lấy tất cả phiếu, sắp xếp mới nhất
        return this.ticketService.findAll();
    }

    @Get('history/all')
    @UseGuards(JWTAuthGuard)
    async getHistory() {
        const data = await this.ticketService.findAllHistory();
        return {message: 'Lấy lịch sử thành công', data};
    }

    @Get(':id/pdf')
    @Header('Content-Type', 'application/pdf')
    @Header('Content-Disposition', 'attachment; filename=maintenance_ticket.pdf')
    async downloadPdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
        const buffer = await this.ticketService.exportPdf(id);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Phieu_Bao_Duong_${id}.pdf"`,
            'Content-Length': buffer.length,
        });

        res.end(buffer);
    }
}

