import {Controller, Post, Body, UseGuards, HttpException, HttpStatus, Get, Param, ParseIntPipe, Patch} from '@nestjs/common';
import {CreateStockOutDto} from './dto/create-stock-out.dto';
import {JWTAuthGuard} from 'src/auth/guards/jwt-auth.guard';
import {CurrentUser} from 'src/auth/current-user.decorator';
import {AdminOrManageGuard} from './guards/admin-or-manage.guard';
import {ApiTags} from '@nestjs/swagger';
import {StockOutService} from './stock-out.service';

@ApiTags('stock-out')
@Controller('stock-out')
export class StockOutController {
    constructor(private readonly svc: StockOutService) {}

    @UseGuards(JWTAuthGuard)
    @Get('item/:id')
    async getByItem(@Param('id', ParseIntPipe) id: number) {
        try {
            const data = await this.svc.findByItemId(id);
            return {message: 'Danh sách phiếu xuất theo vật tư', data};
        } catch {
            throw new HttpException('Không thể lấy danh sách phiếu xuất', HttpStatus.BAD_REQUEST);
        }
    }

    @Post()
    @UseGuards(JWTAuthGuard)
    async request(@Body() dto: CreateStockOutDto, @CurrentUser() user?: any) {
        try {
            const data = await this.svc.request(dto, user);
            return {message: 'Stock out requested', data};
        } catch {
            throw new HttpException('Request failed', HttpStatus.BAD_REQUEST);
        }
    }

    @Get()
    @UseGuards(JWTAuthGuard, AdminOrManageGuard)
    async listAll() {
        try {
            const data = await this.svc.listAll();
            return {message: 'Stock out list', data};
        } catch {
            throw new HttpException('List failed', HttpStatus.NOT_FOUND);
        }
    }

    @Patch(':id/approve')
    @UseGuards(JWTAuthGuard, AdminOrManageGuard)
    async approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user?: any) {
        try {
            const data = await this.svc.approve(id, user);
            return {message: 'Approved', data};
        } catch (error) {
            const err = error as Error;
            throw new HttpException(err.message || 'Approve failed', HttpStatus.BAD_REQUEST);
        }
    }

    @Patch(':id/cancel')
    @UseGuards(JWTAuthGuard)
    async cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user?: any) {
        try {
            const data = await this.svc.cancel(id, user);
            return {message: 'Canceled', data};
        } catch (error) {
            const err = error as Error;
            throw new HttpException(err.message || 'Cancel failed', HttpStatus.BAD_REQUEST);
        }
    }

    @Get(':id')
    @UseGuards(JWTAuthGuard)
    async get(@Param('id', ParseIntPipe) id: number) {
        try {
            const data = await this.svc.get(id);
            return {message: 'Stock out detail', data};
        } catch {
            throw new HttpException('Get failed', HttpStatus.NOT_FOUND);
        }
    }
}
