import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from '../entities/activity-log.entity';
import { ActivityLogService } from '../services/activity-log.service';
import { ActivityLogController } from '../controllers/activity-log.controller';

@Global()
@Module({
    imports: [TypeOrmModule.forFeature([ActivityLog])],
    providers: [ActivityLogService],
    controllers: [ActivityLogController],
    exports: [ActivityLogService],
})
export class ActivityLogModule {}
