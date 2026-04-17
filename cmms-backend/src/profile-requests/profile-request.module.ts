import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileUpdateRequest } from './profile-request.entity';
import { ProfileRequestService } from './profile-request.service';
import { ProfileRequestController } from './profile-request.controller';
import { UserModule } from '../user/user.module';
import { CertificatesModule } from '../certificates/certificates.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([ProfileUpdateRequest]),
        UserModule,
        CertificatesModule
    ],
    providers: [ProfileRequestService],
    controllers: [ProfileRequestController],
    exports: [ProfileRequestService]
})
export class ProfileRequestModule {}
