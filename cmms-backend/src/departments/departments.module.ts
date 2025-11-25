import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {Department} from './department.entity';
import {DepartmentService} from './departments.service';
import {DepartmentController} from './departments.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Department])],
    providers: [DepartmentService],
    controllers: [DepartmentController],
    exports: [DepartmentService],
})
export class DepartmentModule {}

