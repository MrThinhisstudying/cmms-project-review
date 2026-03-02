import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { TrainingProgram } from './entities/training-program.entity';
import { UserCertificate } from './entities/user-certificate.entity';
import { User } from '../user/user.entity';
import { UserTrainingRequirement } from './entities/user-training-requirement.entity';

@Module({
    imports: [TypeOrmModule.forFeature([TrainingProgram, UserCertificate, User, UserTrainingRequirement])],
    controllers: [CertificatesController],
    providers: [CertificatesService],
    exports: [CertificatesService],
})
export class CertificatesModule {}
