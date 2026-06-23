import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {Department} from './department.entity';
import {UserDepartment} from './entities/user-department.entity';
import {User} from '../user/user.entity';
import {DepartmentService} from './departments.service';
import {UserDepartmentService} from './user-department.service';
import {DepartmentController} from './departments.controller';
import {UserDepartmentController} from './user-department.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Department, UserDepartment, User])],
    providers: [DepartmentService, UserDepartmentService],
    controllers: [DepartmentController, UserDepartmentController],
    exports: [DepartmentService, UserDepartmentService, TypeOrmModule],
})
export class DepartmentModule {}


