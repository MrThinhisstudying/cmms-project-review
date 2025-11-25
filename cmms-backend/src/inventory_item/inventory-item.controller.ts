import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    ParseIntPipe,
    HttpException,
    HttpStatus,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Query,
} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import {JWTAuthGuard} from 'src/auth/guards/jwt-auth.guard';
import {InventoryItemService} from './inventory-item.service';
import {CreateItemDto} from './dto/create-item.dto';
import {CurrentUser} from 'src/auth/current-user.decorator';
import {FileInterceptor} from '@nestjs/platform-express';
import * as path from 'path';

@ApiTags('inventory-item')
@Controller('inventory-item')
export class InventoryItemController {
    constructor(private readonly svc: InventoryItemService) {}

    @Get('report')
    async getReport(@Query('start') start?: string, @Query('end') end?: string) {
        try {
            const result = await this.svc.getReport(start, end);
            return {
                message: 'Thống kê kho vật tư thành công',
                data: result,
            };
        } catch (error) {
            console.error(error);
            throw new HttpException('Không thể thống kê vật tư', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('import')
    @UseGuards(JWTAuthGuard)
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
    async import(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
        if (!file || !file.buffer) {
            throw new HttpException('Không nhận được tệp hoặc tệp trống', HttpStatus.BAD_REQUEST);
        }

        const result = await this.svc.importItemsFromExcel(file.buffer, user);
        return {
            message: 'Nhập vật tư thành công',
            imported: result.length,
            data: result,
        };
    }

    @Post()
    @UseGuards(JWTAuthGuard)
    async create(@Body() dto: CreateItemDto) {
        try {
            const data = await this.svc.create(dto);
            return {message: 'Item created', data};
        } catch (error) {
            throw new HttpException('Create item failed', HttpStatus.BAD_REQUEST);
        }
    }

    @Get()
    async list() {
        try {
            const data = await this.svc.list();
            return {message: 'Item list', data};
        } catch (error) {
            throw new HttpException('List items failed', HttpStatus.NOT_FOUND);
        }
    }

    @Get(':id')
    async get(@Param('id', ParseIntPipe) id: number) {
        try {
            const data = await this.svc.find(id);
            return {message: 'Item detail', data};
        } catch (error) {
            throw new HttpException('Get item failed', HttpStatus.NOT_FOUND);
        }
    }

    @Post(':id/restock')
    @UseGuards(JWTAuthGuard)
    async restock(@Param('id', ParseIntPipe) id: number, @Body() body: {qty: number; note?: string}, @CurrentUser() user?: any) {
        try {
            const data = await this.svc.restock(id, body.qty, body.note, user);
            return {message: 'Restocked', data};
        } catch (error) {
            throw new HttpException('Restock failed', HttpStatus.BAD_REQUEST);
        }
    }

    @Put(':id')
    @UseGuards(JWTAuthGuard)
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: Partial<CreateItemDto>) {
        try {
            const data = await this.svc.update(id, body);
            return {message: 'Item updated', data};
        } catch (error) {
            throw new HttpException('Update failed', HttpStatus.BAD_REQUEST);
        }
    }

    @Delete(':id')
    @UseGuards(JWTAuthGuard)
    async remove(@Param('id', ParseIntPipe) id: number) {
        try {
            const data = await this.svc.remove(id);
            return {message: 'Item deleted', data};
        } catch (error) {
            throw new HttpException('Delete failed', HttpStatus.BAD_REQUEST);
        }
    }
}
