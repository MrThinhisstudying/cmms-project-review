import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnualLeavesService } from './annual-leaves.service';
import { AnnualLeavesController } from './annual-leaves.controller';
import { AnnualLeave } from './entities/annual-leave.entity';
import { LeaveHistory } from './entities/leave-history.entity';
import { User } from '../user/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AnnualLeave, LeaveHistory, User])],
  controllers: [AnnualLeavesController],
  providers: [AnnualLeavesService],
})
export class AnnualLeavesModule {}
