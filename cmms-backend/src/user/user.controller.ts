import {Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Patch, Query, UseGuards, UseInterceptors, UploadedFile} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {AuthUser} from './user.decorator';
import {User} from './user.entity';
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

    @Get('profile')
    @UseGuards(JWTAuthGuard)
    @HttpCode(HttpStatus.OK)
    async getProfile(@AuthUser() user: User) {
        try {
            const profile = await this.userService.getProfile(user.user_id);
            return {
                message: 'Lấy thông tin cá nhân thành công',
                data: profile,
            };
        } catch (error: any) {
            throw new HttpException(error.message || 'Lấy thông tin cá nhân thất bại', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Patch('profile')
    @UseGuards(JWTAuthGuard)
    @HttpCode(HttpStatus.OK)
    async updateProfile(@AuthUser() user: User, @Body() data: Partial<User>) {
        try {
            const updated = await this.userService.updateProfile(user.user_id, data);
            return {
                message: 'Cập nhật thông tin cá nhân thành công',
                data: updated,
            };
        } catch (error: any) {
            throw new HttpException(error.message || 'Cập nhật thông tin cá nhân thất bại', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get()
    @UseGuards(JWTAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Get()
    @UseGuards(JWTAuthGuard)
    @HttpCode(HttpStatus.OK)
    async getAll(@AuthUser() currentUser: User, @Query('groupId') groupId?: number) {
        try {
            const users = await this.userService.findAll(currentUser, groupId ? Number(groupId) : undefined);
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

    @Post(':id/signature')
    @UseGuards(JWTAuthGuard)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './uploads/signatures',
                filename: (req, file, cb) => {
                    const randomName = Array(32)
                        .fill(null)
                        .map(() => Math.round(Math.random() * 16).toString(16))
                        .join('');
                    cb(null, `${randomName}${extname(file.originalname)}`);
                },
            }),
            fileFilter: (req, file, cb) => {
                if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
                    return cb(new Error('Only image files are allowed!'), false);
                }
                cb(null, true);
            },
        }),
    )
    async uploadSignature(@Param('id') id: number, @UploadedFile() file: Express.Multer.File) {
        try {
             if (!file) throw new HttpException('File is required', HttpStatus.BAD_REQUEST);
             const signatureUrl = `/uploads/signatures/${file.filename}`;
             await this.userService.updateProfile(id, { signature_url: signatureUrl });
             return {
                 message: 'Cập nhật chữ ký thành công',
                 data: { signature_url: signatureUrl }
             };
        } catch (error: any) {
            throw new HttpException(error.message || 'Updated signature failed', HttpStatus.BAD_REQUEST);
        }
    }
}
