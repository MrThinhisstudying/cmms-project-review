import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RewardDisciplinesService } from './reward-disciplines.service';
import { RewardDisciplinesController } from './reward-disciplines.controller';
import { RewardDiscipline } from './entities/reward-discipline.entity';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RewardDiscipline]),
    UserModule,
    AuthModule
  ],
  controllers: [RewardDisciplinesController],
  providers: [RewardDisciplinesService],
})
export class RewardDisciplinesModule {}
