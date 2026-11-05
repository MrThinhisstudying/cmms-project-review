import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkTask } from './entities/work-task.entity';
import { TaskProject } from './entities/task-project.entity';
import { TaskComment } from './entities/task-comment.entity';
import { User } from '../user/user.entity';
import { Department } from '../departments/department.entity';
import { UserDepartment } from '../departments/entities/user-department.entity';
import { DeviceGroup } from '../device-groups/entities/device-group.entity';
import { UserDeviceGroup } from '../device-groups/entities/user-device-group.entity';
import { NotificationModule } from '../notification/notification.module';
import { RepairsModule } from '../repairs/repairs.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            WorkTask,
            TaskProject,
            TaskComment,
            User,
            Department,
            UserDepartment,
            DeviceGroup,
            UserDeviceGroup,
        ]),
        NotificationModule,
        RepairsModule,
    ],
    controllers: [TasksController],
    providers: [TasksService],
    exports: [TasksService],
})
export class TasksModule {}

