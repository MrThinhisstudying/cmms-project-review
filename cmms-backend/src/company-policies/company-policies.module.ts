import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {CompanyPolicy} from './entities/company-policy.entity';
import {CompanyPolicyAck} from './entities/company-policy-ack.entity';
import {User} from 'src/user/user.entity';
import {NotificationModule} from 'src/notification/notification.module';
import {RepairsModule} from 'src/repairs/repairs.module';
import {CompanyPoliciesService} from './company-policies.service';
import {CompanyPoliciesController} from './company-policies.controller';

@Module({
    imports: [TypeOrmModule.forFeature([CompanyPolicy, CompanyPolicyAck, User]), NotificationModule, RepairsModule],
    controllers: [CompanyPoliciesController],
    providers: [CompanyPoliciesService],
    exports: [CompanyPoliciesService],
})
export class CompanyPoliciesModule {}
