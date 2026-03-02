import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CertificatesService } from './certificates.service';
import { CertificateType } from './entities/user-certificate.entity';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('certificates')
export class CertificatesController {
    constructor(private readonly certificatesService: CertificatesService) {}

    @Get('programs')
    async getTrainingPrograms() {
        return this.certificatesService.getAllTrainingPrograms();
    }

    @Post('programs')
    async createTrainingProgram(@Body() data: any) {
        return this.certificatesService.createTrainingProgram(data);
    }

    @Get('user/:userId')
    async getUserCertificates(
        @Param('userId') userId: string,
        @Query('type') type?: CertificateType,
    ) {
        return this.certificatesService.getCertificatesByUser(parseInt(userId), type);
    }

    @Post('user/:userId')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads/certificates',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
            },
        }),
    }))
    async createCertificate(
        @Param('userId') userId: string,
        @Body() body: any,
        @UploadedFile() file: any,
    ) {
        const fileUrl = file ? `/uploads/certificates/${file.filename}` : undefined;
        return this.certificatesService.createCertificate(parseInt(userId), body, fileUrl);
    }

    @Put(':id')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads/certificates',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
            },
        }),
    }))
    async updateCertificate(
        @Param('id') id: number,
        @Body() body: any,
        @UploadedFile() file: any,
    ) {
        const fileUrl = file ? `/uploads/certificates/${file.filename}` : undefined;
        return this.certificatesService.updateCertificate(id, body, fileUrl);
    }

    @Delete(':id')
    async deleteCertificate(@Param('id') id: number) {
        await this.certificatesService.deleteCertificate(id);
        return { success: true, message: 'Certificate deleted' };
    }

    @Get('expiring')
    async getExpiringCertificates(@Query('days') days?: number) {
        return this.certificatesService.getExpiringCertificates(days ? parseInt(String(days)) : 30);
    }

    // --- Training Requirements ---
    @Get('user/:userId/requirements')
    async getTrainingRequirements(@Param('userId') userId: string) {
        return this.certificatesService.getTrainingRequirements(parseInt(userId));
    }

    @Post('user/:userId/requirements')
    async createTrainingRequirement(
        @Param('userId') userId: string,
        @Body() body: any
    ) {
        // Parse date properly if provided as string
        const data = { ...body };
        if (data.required_date) data.required_date = new Date(data.required_date);
        
        return this.certificatesService.createTrainingRequirement(parseInt(userId), data);
    }

    @Put('requirements/:id')
    async updateTrainingRequirement(
        @Param('id') id: number,
        @Body() body: any
    ) {
        // Parse date properly if provided as string
        const data = { ...body };
        if (data.required_date) data.required_date = new Date(data.required_date);
        
        return this.certificatesService.updateTrainingRequirement(id, data);
    }

    @Delete('requirements/:id')
    async deleteTrainingRequirement(@Param('id') id: number) {
        await this.certificatesService.deleteTrainingRequirement(id);
        return { success: true, message: 'Requirement deleted' };
    }
}
