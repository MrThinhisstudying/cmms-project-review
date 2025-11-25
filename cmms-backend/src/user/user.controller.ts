import {Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Query, UseGuards} from '@nestjs/common';
import {UserService} from './user.service';
import {CreateUserDto} from './dto/user-create.dto';
import {ApiTags} from '@nestjs/swagger';
import {JWTAuthGuard} from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Users')
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post('create-admin')
    @HttpCode(HttpStatus.CREATED)
    async createAdmin() {
        try {
            const user = await this.userService.createAdmin();
            return {
                message: 'Tạo tài khoản admin thành công',
                data: user,
            };
        } catch (error: any) {
            throw new HttpException(error.message || 'Tạo tài khoản admin thất bại', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    async getAll() {
        try {
            const users = await this.userService.findAll();
            return {
                message: 'Lấy danh sách người dùng thành công',
                data: users,
            };
        } catch (error: any) {
            throw new HttpException(error.message || 'Lấy danh sách người dùng thất bại', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async findOne(@Param('id') id: string) {
        try {
            return await this.userService.findOne({
                where: {user_id: Number(id)},
            });
        } catch (error: any) {
            throw new HttpException(error.message || 'Tìm kiếm người dùng thất bại', HttpStatus.BAD_REQUEST);
        }
    }

    @Post()
    @UseGuards(JWTAuthGuard)
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() data: CreateUserDto) {
        try {
            const user = await this.userService.create(data);
            return {
                message: 'Thêm mới người dùng thành công',
                data: user,
            };
        } catch (error: any) {
            console.log(error);
            throw new HttpException(error.message || 'Thêm mới người dùng thất bại', HttpStatus.BAD_REQUEST);
        }
    }

    @Put(':id')
    @UseGuards(JWTAuthGuard)
    @HttpCode(HttpStatus.OK)
    async update(@Param('id') id: number, @Body() data: CreateUserDto) {
        try {
            const user = await this.userService.update(id, data);
            return {
                message: 'Cập nhật người dùng thành công',
                data: user,
            };
        } catch (error: any) {
            throw new HttpException(error.message || 'Cập nhật người dùng thất bại', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    @Delete(':id')
    @UseGuards(JWTAuthGuard)
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: number) {
        try {
            await this.userService.delete(id);
            return {message: 'Xoá người dùng thành công'};
        } catch (error: any) {
            throw new HttpException(error.message || 'Xoá người dùng thất bại', error.status || HttpStatus.BAD_REQUEST);
        }
    }
}
