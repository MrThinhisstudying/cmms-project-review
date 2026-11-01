import {
    Controller, Get, Post, Patch, Body, Param, Query, UseGuards, UseInterceptors,
    UploadedFiles, ParseIntPipe, HttpCode, HttpStatus, ForbiddenException
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VehicleIncidentReportsService } from './vehicle-incident-reports.service';
import { CreateIncidentReportDto } from './dto/create-incident-report.dto';
import { ResolveQuickDto } from './dto/resolve-quick.dto';
import { QueryIncidentReportsDto } from './dto/query-incident-reports.dto';
import { RequestRepairDossierDto } from './dto/request-repair-dossier.dto';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthUser } from 'src/user/user.decorator';
import { User } from 'src/user/user.entity';
import { UserRole } from 'src/user/user-role.enum';

@ApiTags('Vehicle Incident Reports')
@Controller('vehicle-incident-reports')
export class VehicleIncidentReportsController {
    constructor(private readonly service: VehicleIncidentReportsService) {}

    // 1. PUBLIC: Báo cáo tình trạng xe từ quét QR (Không bắt buộc login)
    @Post('public')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Gửi báo cáo tình trạng xe từ quét mã QR' })
    createPublicReport(@Body() dto: CreateIncidentReportDto) {
        return this.service.createPublicReport(dto);
    }

    // 2. PUBLIC: Tìm kiếm nhân viên nhanh phục vụ AutoComplete
    @Get('reporters/search')
    @ApiOperation({ summary: 'Tìm kiếm nhân viên để tự động điền thông tin người báo' })
    searchReporters(@Query('q') query: string) {
        return this.service.searchReporters(query);
    }

    // 3. PUBLIC: Tải lên hình ảnh hiện trường (Tối đa 5 ảnh)
    @Post('upload-images')
    @UseInterceptors(
        FilesInterceptor('files', 5, {
            storage: diskStorage({
                destination: (req, file, cb) => {
                    const uploadPath = './uploads/incident_reports';
                    if (!fs.existsSync(uploadPath)) {
                        fs.mkdirSync(uploadPath, { recursive: true });
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
                if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
                    return cb(new Error('Chỉ chấp nhận file ảnh (JPG, PNG, WebP)!'), false);
                }
                cb(null, true);
            },
            limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB mỗi ảnh
        })
    )
    uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
        if (!files || files.length === 0) {
            return [];
        }
        return files.map(file => `/uploads/incident_reports/${file.filename}`);
    }

    // 4. PROTECTED: Lấy danh sách báo cáo đang chờ xử lý (Cho popup khi KTV đăng nhập)
    @Get('pending')
    @UseGuards(JWTAuthGuard)
    @ApiOperation({ summary: 'Lấy các báo cáo chờ KTV xử lý để hiển thị thông báo' })
    findPendingReports() {
        return this.service.findPendingReports();
    }

    // 5. PROTECTED: Danh sách tổng hợp báo cáo tình trạng xe (Trang quản lý, có filter)
    @Get()
    @UseGuards(JWTAuthGuard)
    @ApiOperation({ summary: 'Lấy danh sách báo cáo tình trạng xe có bộ lọc' })
    findAll(
        @Query() queryDto: QueryIncidentReportsDto,
        @AuthUser() currentUser: User,
    ) {
        return this.service.findAll(queryDto, currentUser);
    }

    // 6. PROTECTED: Chi tiết báo cáo
    @Get(':id')
    @UseGuards(JWTAuthGuard)
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.service.findOne(id);
    }

    // 7. PROTECTED: Kiểm tra chéo người báo cáo có thuộc nhóm quản lý xe không
    @Get(':id/check-vehicle-group')
    @UseGuards(JWTAuthGuard)
    @ApiOperation({ summary: 'Kiểm tra chéo người báo cáo có thuộc nhóm quản lý xe không' })
    checkVehicleGroupMembership(@Param('id', ParseIntPipe) id: number) {
        return this.service.checkVehicleGroupMembership(id);
    }

    // 8. PROTECTED: Thao tác 1 - KTV tiếp nhận
    @Patch(':id/accept')
    @UseGuards(JWTAuthGuard)
    @ApiOperation({ summary: 'KTV tiếp nhận xử lý sự cố' })
    acceptReport(
        @Param('id', ParseIntPipe) id: number,
        @AuthUser() technician: User
    ) {
        if (![UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.TEAM_LEAD].includes(technician.role as UserRole)) {
            throw new ForbiddenException('Chỉ Kỹ thuật viên hoặc Quản trị viên mới được tiếp nhận xử lý sự cố');
        }
        return this.service.acceptReport(id, technician);
    }

    // 9. PROTECTED: Thao tác 2 - Xác nhận đã khắc phục nhanh (Có xác nhận của người vận hành)
    @Patch(':id/resolve-quick')
    @UseGuards(JWTAuthGuard)
    @ApiOperation({ summary: 'KTV xác nhận đã khắc phục nhanh với nghiệm thu của người vận hành' })
    resolveQuick(
        @Param('id', ParseIntPipe) id: number,
        @AuthUser() technician: User,
        @Body() dto: ResolveQuickDto
    ) {
        if (![UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.TEAM_LEAD].includes(technician.role as UserRole)) {
            throw new ForbiddenException('Chỉ Kỹ thuật viên hoặc Quản trị viên mới được xác nhận đã khắc phục sự cố');
        }
        return this.service.resolveQuick(id, technician, dto);
    }

    // 10. PROTECTED: Thao tác 3 MỚI - Gửi yêu cầu người báo cáo/tổ xe làm hồ sơ sửa chữa
    @Post(':id/request-repair-dossier')
    @UseGuards(JWTAuthGuard)
    @ApiOperation({ summary: 'Gửi yêu cầu người báo cáo hoặc người phụ trách xe đi lập hồ sơ sửa chữa B03' })
    requestRepairDossier(
        @Param('id', ParseIntPipe) id: number,
        @AuthUser() currentUser: User,
        @Body() dto: RequestRepairDossierDto
    ) {
        if (![UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.TEAM_LEAD].includes(currentUser.role as UserRole)) {
            throw new ForbiddenException('Chỉ Kỹ thuật viên hoặc Quản trị viên mới được gửi yêu cầu lập hồ sơ sửa chữa');
        }
        return this.service.requestRepairDossier(id, currentUser, dto);
    }

    // 11. PROTECTED: Gắn mã phiếu sửa chữa đã tạo
    @Post(':id/link-repair-dossier')
    @UseGuards(JWTAuthGuard)
    @ApiOperation({ summary: 'Gắn liên kết mã phiếu sửa chữa B03 cho báo cáo sự cố' })
    async linkRepairDossier(
        @Param('id', ParseIntPipe) id: number,
        @AuthUser() currentUser: User,
        @Body('repair_id', ParseIntPipe) repairId: number
    ) {
        const isTechOrAdmin = [UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.TEAM_LEAD].includes(currentUser.role as UserRole);
        const report = await this.service.findOne(id);
        const isAssignedOrReporter = report.assigned_dossier_user_id === currentUser.user_id || report.reporter_user_id === currentUser.user_id;
        if (!isTechOrAdmin && !isAssignedOrReporter) {
            throw new ForbiddenException('Bạn không có quyền gắn mã hồ sơ sửa chữa cho báo cáo này');
        }
        return this.service.linkRepairDossier(id, repairId, currentUser);
    }

    // 12. PROTECTED: Chuyển trực tiếp thành hồ sơ sửa chữa B03 (Dành cho Quản trị viên khi cần)
    @Post(':id/convert-to-repair')
    @UseGuards(JWTAuthGuard)
    @ApiOperation({ summary: 'Chuyển đổi sự cố thành Hồ sơ sửa chữa chính thức (Repair B03)' })
    convertToRepair(
        @Param('id', ParseIntPipe) id: number,
        @AuthUser() currentUser: User
    ) {
        if (![UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.TEAM_LEAD].includes(currentUser.role as UserRole)) {
            throw new ForbiddenException('Chỉ Kỹ thuật viên hoặc Quản trị viên mới có quyền thực hiện chuyển đổi');
        }
        return this.service.convertToRepair(id, currentUser);
    }
}
