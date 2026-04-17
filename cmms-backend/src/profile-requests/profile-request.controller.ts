import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfileRequestService } from './profile-request.service';
import { CreateProfileRequestDto } from './dto/create-profile-request.dto';
import { ReviewProfileRequestDto } from './dto/review-profile-request.dto';
import { FileInterceptor } from '@nestjs/platform-express';
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
    @UseInterceptors(FileInterceptor('file', {
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
        @UploadedFile() file: any
    ) {
        let fileUrl: string | undefined;
        if (file) {
            const filePath = join(process.cwd(), 'uploads', 'certificates', file.filename);
            const result = await compressImage(filePath);
            const finalFilename = basename(result.outputPath);
            fileUrl = `/uploads/certificates/${finalFilename}`;
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
