import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileUpdateRequest } from './profile-request.entity';
import { CreateProfileRequestDto } from './dto/create-profile-request.dto';
import { ReviewProfileRequestDto } from './dto/review-profile-request.dto';
import { UserService } from '../user/user.service';
import { CertificatesService } from '../certificates/certificates.service';
import { RequestStatus } from './enums/request-status.enum';
import { RequestType } from './enums/request-type.enum';

@Injectable()
export class ProfileRequestService {
    constructor(
        @InjectRepository(ProfileUpdateRequest)
        private readonly profileRequestRepo: Repository<ProfileUpdateRequest>,
        private readonly userService: UserService,
        private readonly certificatesService: CertificatesService
    ) {}

    async createRequest(userId: number, dto: CreateProfileRequestDto): Promise<ProfileUpdateRequest> {
        const user = await this.userService.findOne({ where: { user_id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const request = this.profileRequestRepo.create({
            user,
            request_type: dto.request_type,
            data_payload: dto.data_payload,
            file_url: dto.file_url,
            status: RequestStatus.PENDING
        });

        return await this.profileRequestRepo.save(request);
    }

    async getPendingRequests(): Promise<ProfileUpdateRequest[]> {
        return await this.profileRequestRepo.find({
            where: { status: RequestStatus.PENDING },
            relations: ['user', 'reviewer'],
            order: { created_at: 'DESC' }
        });
    }

    async getAllRequests(): Promise<ProfileUpdateRequest[]> {
        return await this.profileRequestRepo.find({
            relations: ['user', 'reviewer'],
            order: { created_at: 'DESC' }
        });
    }

    async getMyRequests(userId: number): Promise<ProfileUpdateRequest[]> {
        return await this.profileRequestRepo.find({
            where: { user: { user_id: userId } },
            order: { created_at: 'DESC' }
        });
    }

    async reviewRequest(requestId: number, reviewerId: number, dto: ReviewProfileRequestDto): Promise<ProfileUpdateRequest> {
        const request = await this.profileRequestRepo.findOne({
            where: { id: requestId },
            relations: ['user']
        });

        if (!request) {
            throw new NotFoundException('Request not found');
        }

        if (request.status !== RequestStatus.PENDING) {
            throw new BadRequestException('Request is already processed');
        }

        const reviewer = await this.userService.findOne({ where: { user_id: reviewerId } });
        if (!reviewer) {
            throw new NotFoundException('Reviewer not found');
        }

        // Processing Approval
        if (dto.status === RequestStatus.APPROVED) {
            if (request.request_type === RequestType.UPDATE_INFO) {
                const payload = request.data_payload;
                await this.userService.updateProfile(request.user.user_id, {
                    ...payload
                });
            } else if (request.request_type === RequestType.NEW_CERTIFICATE) {
                const payload = request.data_payload;
                await this.certificatesService.createCertificate(request.user.user_id, {
                    program_id: payload.program_id,
                    type: payload.type,
                    start_date: payload.start_date,
                    end_date: payload.end_date,
                    decision_number: payload.decision_number,
                    issue_date: payload.issue_date,
                    certificate_number: payload.certificate_number,
                    return_date: payload.return_date,
                    study_mode: payload.study_mode,
                    grading: payload.grading,
                    major: payload.major,
                    degree_type: payload.degree_type,
                    school_name: payload.school_name,
                    graduation_year: payload.graduation_year,
                    license_class: payload.license_class,
                    issuing_place: payload.issuing_place,
                    expiry_date: payload.expiry_date,
                    is_permanent: payload.is_permanent,
                    qualification_type: payload.qualification_type,
                }, request.file_url); 
            }
        }

        request.status = dto.status;
        request.reviewer = reviewer;
        request.notes = dto.notes;

        return await this.profileRequestRepo.save(request);
    }
}
