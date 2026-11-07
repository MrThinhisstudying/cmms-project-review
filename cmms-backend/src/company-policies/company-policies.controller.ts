import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    ParseIntPipe,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import {diskStorage} from 'multer';
import {extname} from 'path';
import * as fs from 'fs';
import {ApiTags, ApiOperation} from '@nestjs/swagger';
import {CompanyPoliciesService} from './company-policies.service';
import {CreateCompanyPolicyDto, UpdateCompanyPolicyDto, QueryCompanyPolicyDto} from './dto/company-policy.dto';
import {JWTAuthGuard} from 'src/auth/guards/jwt-auth.guard';
import {AuthUser} from 'src/user/user.decorator';
import {User} from 'src/user/user.entity';

@ApiTags('Company Policies & Regulations')
@Controller('company-policies')
export class CompanyPoliciesController {
    constructor(private readonly service: CompanyPoliciesService) {}

    private canManagePolicies(user: User): boolean {
        if (!user) return false;
        const role = (user.role || '').toUpperCase();
        return ['ADMIN', 'HR_MANAGER', 'DIRECTOR'].includes(role);
    }

    @Post('upload-file')
    @UseGuards(JWTAuthGuard)
    @ApiOperation({summary: 'Tải lên văn bản quy chế / quy định (PDF, Word, Ảnh)'})
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (req, file, cb) => {
                    const uploadPath = './uploads/company_policies';
                    if (!fs.existsSync(uploadPath)) {
                        fs.mkdirSync(uploadPath, {recursive: true});
                    }
                    cb(null, uploadPath);
                },
                filename: (req, file, cb) => {
                    const randomName = Array(32)
                        .fill(null)
                        .map(() => Math.round(Math.random() * 16).toString(16))
                        .join('');
                    cb(null, `${randomName}${extname(file.originalname)}`);
                },
            }),
            fileFilter: (req, file, cb) => {
                if (!file.originalname.match(/\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png|webp)$/i)) {
                    return cb(new BadRequestException('Chỉ hỗ trợ file PDF, Word, Excel hoặc Hình ảnh!'), false);
                }
                cb(null, true);
            },
            limits: {fileSize: 20 * 1024 * 1024}, // Tối đa 20MB
        }),
    )
    uploadPolicyFile(@UploadedFile() file: Express.Multer.File, @AuthUser() currentUser: User) {
        if (!this.canManagePolicies(currentUser)) {
            throw new ForbiddenException('Chỉ Quản lý Nhân sự, Ban Giám đốc hoặc Quản trị viên mới có quyền tải lên văn bản quy chế');
        }
        if (!file) {
            throw new BadRequestException('Vui lòng chọn file đính kèm');
        }
        return {
            file_url: `/uploads/company_policies/${file.filename}`,
            file_name: Buffer.from(file.originalname, 'latin1').toString('utf8'),
        };
    }

    @Get()
    @UseGuards(JWTAuthGuard)
    @ApiOperation({summary: 'Lấy danh sách quy chế, quy định nội bộ'})
    findAll(@Query() queryDto: QueryCompanyPolicyDto, @AuthUser() currentUser: User) {
        return this.service.findAll(queryDto, currentUser);
    }

    @Get(':id')
    @UseGuards(JWTAuthGuard)
    @ApiOperation({summary: 'Xem chi tiết quy chế & danh sách người lao động đã xác nhận'})
    findOne(@Param('id', ParseIntPipe) id: number, @AuthUser() currentUser: User) {
        return this.service.findOne(id, currentUser);
    }

    @Post()
    @UseGuards(JWTAuthGuard)
    @ApiOperation({summary: 'Ban hành quy chế / quy định mới'})
    create(@Body() dto: CreateCompanyPolicyDto, @AuthUser() currentUser: User) {
        if (!this.canManagePolicies(currentUser)) {
            throw new ForbiddenException('Chỉ Quản lý Nhân sự, Ban Giám đốc hoặc Quản trị viên mới được ban hành quy chế');
        }
        return this.service.create(dto, currentUser);
    }

    @Patch(':id')
    @UseGuards(JWTAuthGuard)
    @ApiOperation({summary: 'Cập nhật quy chế / quy định'})
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCompanyPolicyDto, @AuthUser() currentUser: User) {
        if (!this.canManagePolicies(currentUser)) {
            throw new ForbiddenException('Chỉ Quản lý Nhân sự, Ban Giám đốc hoặc Quản trị viên mới được chỉnh sửa quy chế');
        }
        return this.service.update(id, dto, currentUser);
    }

    @Delete(':id')
    @UseGuards(JWTAuthGuard)
    @ApiOperation({summary: 'Xóa quy chế / quy định'})
    remove(@Param('id', ParseIntPipe) id: number, @AuthUser() currentUser: User) {
        if (!this.canManagePolicies(currentUser)) {
            throw new ForbiddenException('Chỉ Quản lý Nhân sự, Ban Giám đốc hoặc Quản trị viên mới được xóa quy chế');
        }
        return this.service.remove(id);
    }

    @Post(':id/acknowledge')
    @UseGuards(JWTAuthGuard)
    @ApiOperation({summary: 'Người lao động xác nhận Đã đọc và nắm rõ quy định'})
    acknowledge(@Param('id', ParseIntPipe) id: number, @AuthUser() currentUser: User) {
        return this.service.acknowledge(id, currentUser);
    }
}
