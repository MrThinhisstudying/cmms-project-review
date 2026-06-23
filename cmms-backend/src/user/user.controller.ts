import {Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, Patch, Query, UseGuards, UseInterceptors, UploadedFile, ForbiddenException} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { compressImage } from '../common/utils/image-compression.util';
import {AuthUser} from './user.decorator';
import {User} from './user.entity';
import {UserService} from './user.service';
import {CreateUserDto} from './dto/user-create.dto';
import {ApiTags} from '@nestjs/swagger';
import {JWTAuthGuard} from 'src/auth/guards/jwt-auth.guard';
import { RepairsGateway } from 'src/repairs/repairs.gateway';
import { UserRole } from './user-role.enum';


@ApiTags('Users')
@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly gateway: RepairsGateway,
    ) {}

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
            this.gateway.notifyUserUpdate(user.user_id);
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
    @UseGuards(JWTAuthGuard)
    @HttpCode(HttpStatus.OK)
    async findOne(@AuthUser() currentUser: User, @Param('id') id: string) {
        try {
            const targetUserId = Number(id);
            const isAllowed = [UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.DIRECTOR, UserRole.UNIT_HEAD].includes(currentUser.role) || currentUser.user_id === targetUserId;
            if (!isAllowed) {
                throw new ForbiddenException('Bạn không có quyền truy cập thông tin nhân viên này');
            }
            return await this.userService.findOne({
                where: {user_id: targetUserId},
            });
        } catch (error: any) {
            throw new HttpException(error.message || 'Tìm kiếm người dùng thất bại', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    @Post()
    @UseGuards(JWTAuthGuard)
    @HttpCode(HttpStatus.CREATED)
    async create(@AuthUser() currentUser: User, @Body() data: CreateUserDto) {
        if (![UserRole.ADMIN, UserRole.HR_MANAGER].includes(currentUser.role)) {
            throw new ForbiddenException('Bạn không có quyền tạo mới nhân sự');
        }
        try {
            const user = await this.userService.create(data);
            this.gateway.notifyUserUpdate();
            this.gateway.notifyDashboardRefresh();
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
    async update(@AuthUser() currentUser: User, @Param('id') id: number, @Body() data: CreateUserDto) {
        if (![UserRole.ADMIN, UserRole.HR_MANAGER].includes(currentUser.role)) {
            throw new ForbiddenException('Bạn không có quyền cập nhật nhân sự');
        }
        try {
            const user = await this.userService.update(id, data);
            this.gateway.notifyUserUpdate(id);
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
    async delete(@AuthUser() currentUser: User, @Param('id') id: number) {
        if (![UserRole.ADMIN, UserRole.HR_MANAGER].includes(currentUser.role)) {
            throw new ForbiddenException('Bạn không có quyền xóa nhân sự');
        }
        try {
            await this.userService.delete(id);
            this.gateway.notifyUserUpdate();
            this.gateway.notifyDashboardRefresh();
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
            limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
        }),
    )
    async uploadSignature(@AuthUser() currentUser: User, @Param('id') id: number, @UploadedFile() file: Express.Multer.File) {
        if (![UserRole.ADMIN, UserRole.HR_MANAGER].includes(currentUser.role) && currentUser.user_id !== Number(id)) {
            throw new ForbiddenException('Bạn không có quyền cập nhật chữ ký cho người dùng này');
        }
        try {
             if (!file) throw new HttpException('File is required', HttpStatus.BAD_REQUEST);

             // Compress signature (keep PNG for transparency)
             const filePath = join(process.cwd(), 'uploads', 'signatures', file.filename);
             const result = await compressImage(filePath, { keepPng: true, skipBelowBytes: 500 * 1024 });
             const finalFilename = require('path').basename(result.outputPath);
             const signatureUrl = `/uploads/signatures/${finalFilename}`;

             await this.userService.updateProfile(id, { signature_url: signatureUrl });
             return {
                 message: 'Cập nhật chữ ký thành công',
                 data: { signature_url: signatureUrl }
             };
        } catch (error: any) {
            throw new HttpException(error.message || 'Updated signature failed', HttpStatus.BAD_REQUEST);
        }
    }

    @Post(':id/avatar')
    @UseGuards(JWTAuthGuard)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (req, file, cb) => {
                    const uploadPath = join(process.cwd(), 'uploads', 'avatars');
                    if (!fs.existsSync(uploadPath)) {
                        fs.mkdirSync(uploadPath, { recursive: true });
                    }
                    cb(null, uploadPath);
                },
                filename: (req, file, cb) => {
                    const randomName = Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
                    cb(null, `${randomName}${extname(file.originalname)}`);
                },
            }),
            fileFilter: (req, file, cb) => {
                if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                    return cb(new Error('Only image files are allowed!'), false);
                }
                cb(null, true);
            },
            limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB input before compression
        }),
    )
    async uploadAvatar(@AuthUser() currentUser: User, @Param('id') id: number, @UploadedFile() file: Express.Multer.File) {
        if (![UserRole.ADMIN, UserRole.HR_MANAGER].includes(currentUser.role) && currentUser.user_id !== Number(id)) {
            throw new ForbiddenException('Bạn không có quyền cập nhật ảnh đại diện cho người dùng này');
        }
        try {
             if (!file) throw new HttpException('File is required', HttpStatus.BAD_REQUEST);

             const filePath = join(process.cwd(), 'uploads', 'avatars', file.filename);
             const result = await compressImage(filePath, { keepPng: false, skipBelowBytes: 300 * 1024 });
             const finalFilename = require('path').basename(result.outputPath);
             const avatarUrl = `/uploads/avatars/${finalFilename}`;

             await this.userService.updateProfile(id, { avatar: avatarUrl });
             return {
                 message: 'Cập nhật ảnh đại diện thành công',
                 data: { avatar: avatarUrl }
             };
        } catch (error: any) {
            throw new HttpException(error.message || 'Updated avatar failed', HttpStatus.BAD_REQUEST);
        }
    }
}
