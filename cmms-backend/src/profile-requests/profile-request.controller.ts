import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile, UploadedFiles, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfileRequestService } from './profile-request.service';
import { CreateProfileRequestDto } from './dto/create-profile-request.dto';
import { ReviewProfileRequestDto } from './dto/review-profile-request.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join, extname, basename } from 'path';
import { compressImage } from '../common/utils/image-compression.util';

@ApiTags('Profile Requests')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard)
@Controller('profile-requests')
export class ProfileRequestController {
    constructor(private readonly profileRequestService: ProfileRequestService) {}

    @Post()
    @ApiOperation({ summary: 'Submit a new profile update request' })
    @UseInterceptors(FilesInterceptor('files', 5, {
        storage: diskStorage({
            destination: './uploads/certificates',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
            },
        }),
    }))
    async createRequest(
        @Request() req, 
        @Body() body: any,
        @UploadedFile() oldFile?: any,
        @UploadedFiles() files?: any[]
    ) {
        let fileUrl: string | undefined;
        let fileList = files || [];
        if (!files && oldFile) fileList = [oldFile]; // backward compatible
        
        if (fileList && fileList.length > 0) {
            const urls = [];
            for (const f of fileList) {
                const filePath = join(process.cwd(), 'uploads', 'certificates', f.filename);
                try {
                    const result = await compressImage(filePath);
                    const finalFilename = basename(result.outputPath);
                    urls.push(`/uploads/certificates/${finalFilename}`);
                } catch (e) {
                    // Fallback to original image if compression fails
                    urls.push(`/uploads/certificates/${f.filename}`);
                }
            }
            if (urls.length > 0) fileUrl = JSON.stringify(urls);
        }
        
        let dataPayload = body.data_payload;
        if (typeof dataPayload === 'string') {
            try {
                dataPayload = JSON.parse(dataPayload);
            } catch (e) {
                throw new BadRequestException('Invalid JSON payload');
            }
        }
        
        const dto: CreateProfileRequestDto = {
            request_type: body.request_type,
            data_payload: dataPayload,
            file_url: fileUrl
        };
        
        return await this.profileRequestService.createRequest(req.user.user_id, dto);
    }

    @Get('me')
    @ApiOperation({ summary: 'Get all my requests' })
    async getMyRequests(@Request() req) {
        return await this.profileRequestService.getMyRequests(req.user.user_id);
    }

    @Get('all')
    @ApiOperation({ summary: 'Get all requests (history included)' })
    async getAllRequests() {
        return await this.profileRequestService.getAllRequests();
    }

    @Get('pending')
    @ApiOperation({ summary: 'Get all pending requests (HR/Admin only)' })
    async getPendingRequests() {
        return await this.profileRequestService.getPendingRequests();
    }

    @Put(':id/review')
    @ApiOperation({ summary: 'Approve or reject a request (HR/Admin only)' })
    async reviewRequest(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: ReviewProfileRequestDto
    ) {
        return await this.profileRequestService.reviewRequest(+id, req.user.user_id, dto);
    }
}
