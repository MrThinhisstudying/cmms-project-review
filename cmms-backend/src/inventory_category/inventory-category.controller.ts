import {Controller, Get, Post, Body, Param, Put, Delete, ParseIntPipe, HttpException, HttpStatus} from '@nestjs/common';
import {CreateCategoryDto} from './dto/create-category.dto';
import {ApiTags} from '@nestjs/swagger';
import {InventoryCategoryService} from './inventory-category.service';

@ApiTags('inventory-category')
@Controller('inventory-category')
export class InventoryCategoryController {
    constructor(private readonly svc: InventoryCategoryService) {}

    @Post()
    async create(@Body() dto: CreateCategoryDto) {
        try {
            const data = await this.svc.create(dto);
            return {message: 'Category created', data};
        } catch (error) {
            throw new HttpException('Create category failed', HttpStatus.BAD_REQUEST);
        }
    }

    @Get()
    async list() {
        try {
            const data = await this.svc.list();
            return {message: 'Category list', data};
        } catch (error) {
            throw new HttpException('List categories failed', HttpStatus.NOT_FOUND);
        }
    }

    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        try {
            const data = await this.svc.findOne(id);
            return {message: 'Category detail', data};
        } catch (error) {
            throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
        }
    }

    @Put(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateCategoryDto) {
        try {
            const data = await this.svc.update(id, dto);
            return {message: 'Category updated', data};
        } catch (error) {
            throw new HttpException('Update category failed', HttpStatus.BAD_REQUEST);
        }
    }

    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
        try {
            await this.svc.remove(id);
            return {message: 'Category deleted'};
        } catch (error) {
            throw new HttpException('Delete category failed', HttpStatus.BAD_REQUEST);
        }
    }
}
