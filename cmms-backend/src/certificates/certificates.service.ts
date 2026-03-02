import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Raw } from 'typeorm';
import { TrainingProgram } from './entities/training-program.entity';
import { UserCertificate, CertificateType, CertificateStatus } from './entities/user-certificate.entity';
import { User } from '../user/user.entity';
import { UserTrainingRequirement } from './entities/user-training-requirement.entity';
import { CreateTrainingRequirementDto } from './dto/create-training-requirement.dto';

@Injectable()
export class CertificatesService {
    constructor(
        @InjectRepository(TrainingProgram)
        private trainingProgramRepository: Repository<TrainingProgram>,
        @InjectRepository(UserCertificate)
        private userCertificateRepository: Repository<UserCertificate>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(UserTrainingRequirement)
        private reqRepo: Repository<UserTrainingRequirement>,
    ) {}

    // --- Training Programs ---
    async getAllTrainingPrograms(): Promise<TrainingProgram[]> {
        return this.trainingProgramRepository.find();
    }

    async createTrainingProgram(data: Partial<TrainingProgram>): Promise<TrainingProgram> {
        const program = this.trainingProgramRepository.create(data);
        return await this.trainingProgramRepository.save(program);
    }

    // --- User Certificates ---
    async getCertificatesByUser(userId: number, type?: CertificateType): Promise<UserCertificate[]> {
        const where: any = { user: { user_id: userId } };
        if (type) {
            where.type = type;
        }
        return this.userCertificateRepository.find({
            where,
            relations: ['program', 'user'],
            order: { issue_date: 'DESC' }
        });
    }

    async createCertificate(userId: number, data: any, fileUrl?: string): Promise<UserCertificate> {
        const user = await this.userRepository.findOne({ where: { user_id: userId } });
        if (!user) throw new NotFoundException('User not found');

        let program = null;
        if (data.program_id) {
            program = await this.trainingProgramRepository.findOne({ where: { id: parseInt(data.program_id) } });
            if (!program) throw new NotFoundException('Training program not found');
        }

        const cert = new UserCertificate();
        Object.assign(cert, data);
        cert.user = user;
        cert.program = program;
        cert.file_url = fileUrl;
        cert.status = CertificateStatus.ACTIVE;

        // Auto compute next training date if not provided and program has validity
        if (!cert.next_training_date && program && program.validity_months && cert.issue_date) {
            const nextDate = new Date(cert.issue_date);
            nextDate.setMonth(nextDate.getMonth() + program.validity_months);
            cert.next_training_date = nextDate;
        }

        return await this.userCertificateRepository.save(cert);
    }

    async updateCertificate(id: number, data: any, fileUrl?: string): Promise<UserCertificate> {
        const cert = await this.userCertificateRepository.findOne({ where: { id }, relations: ['program'] });
        if (!cert) throw new NotFoundException('Certificate not found');

        let program = cert.program;
        if (data.program_id && (!program || program.id !== parseInt(data.program_id))) {
            program = await this.trainingProgramRepository.findOne({ where: { id: parseInt(data.program_id) } });
            if (!program) throw new NotFoundException('Training program not found');
            cert.program = program;
        }

        if (fileUrl) {
            cert.file_url = fileUrl;
        }

        // Update fields
        Object.assign(cert, data);

        // Recompute next_training_date
        if (program && program.validity_months && cert.issue_date && (!data.next_training_date)) {
            const nextDate = new Date(cert.issue_date);
            nextDate.setMonth(nextDate.getMonth() + program.validity_months);
            cert.next_training_date = nextDate;
        }

        return await this.userCertificateRepository.save(cert);
    }

    async deleteCertificate(id: number): Promise<void> {
        const result = await this.userCertificateRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException('Certificate not found');
        }
    }

    async getExpiringCertificates(days: number = 30): Promise<UserCertificate[]> {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);

        // Find certificates where next_training_date is between now and targetDate, or already expired
        return this.userCertificateRepository.find({
            where: {
                next_training_date: LessThanOrEqual(targetDate),
                status: CertificateStatus.ACTIVE
            },
            relations: ['user', 'program']
        });
    }

    // --- Validation Logic ---
    async validateUserHasValidCertificate(userId: number, type: CertificateType): Promise<boolean> {
        const certs = await this.userCertificateRepository.find({
            where: {
                user: { user_id: userId },
                type: type,
                status: CertificateStatus.ACTIVE
            }
        });

        // Check if any active cert is not expired (next_training_date > now)
        const now = new Date();
        const hasValid = certs.some(c => !c.next_training_date || new Date(c.next_training_date) > now);
        return hasValid;
    }

    // --- Training Requirements ---
    async getTrainingRequirements(userId: number): Promise<UserTrainingRequirement[]> {
        return this.reqRepo.find({
            where: { user: { user_id: userId } },
            relations: ['program', 'user'],
            order: { required_date: 'ASC' }
        });
    }

    async createTrainingRequirement(userId: number, dto: CreateTrainingRequirementDto): Promise<UserTrainingRequirement> {
        const user = await this.userRepository.findOne({ where: { user_id: userId } });
        if (!user) throw new NotFoundException('Người dùng không tồn tại');

        const program = await this.trainingProgramRepository.findOne({ where: { id: dto.program_id } });
        if (!program) throw new NotFoundException('Chương trình đào tạo không tồn tại');

        const req = this.reqRepo.create({
            user,
            program,
            required_date: dto.required_date,
            note: dto.note,
            status: dto.status as any,
        });

        return this.reqRepo.save(req);
    }

    async updateTrainingRequirement(id: number, dto: Partial<CreateTrainingRequirementDto>): Promise<UserTrainingRequirement> {
        const req = await this.reqRepo.findOne({ where: { id }, relations: ['program', 'user'] });
        if (!req) throw new NotFoundException('Yêu cầu đào tạo không tồn tại');

        if (dto.program_id) {
            const program = await this.trainingProgramRepository.findOne({ where: { id: dto.program_id } });
            if (!program) throw new NotFoundException('Chương trình đào tạo không hợp lệ');
            req.program = program;
        }

        if (dto.required_date !== undefined) req.required_date = dto.required_date;
        if (dto.note !== undefined) req.note = dto.note;
        if (dto.status !== undefined) req.status = dto.status as any;

        return this.reqRepo.save(req);
    }

    async deleteTrainingRequirement(id: number): Promise<void> {
        const result = await this.reqRepo.delete(id);
        if (result.affected === 0) throw new NotFoundException('Yêu cầu đào tạo không tồn tại');
    }
}
