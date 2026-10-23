import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftDebt } from './entities/shift-debt.entity';
import { ShiftDebtsService } from './shift-debts.service';
import { ShiftDebtsController } from './shift-debts.controller';
import { User } from '../user/user.entity';
import { Department } from '../departments/department.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShiftDebt, User, Department])],
  controllers: [ShiftDebtsController],
  providers: [ShiftDebtsService],
  exports: [ShiftDebtsService],
})
export class ShiftDebtsModule {}
