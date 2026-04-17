import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LaborContractsService } from './labor-contracts.service';
import { LaborContractsController } from './labor-contracts.controller';
import { LaborContract } from './entities/labor-contract.entity';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LaborContract]),
    UserModule,
    AuthModule
  ],
  controllers: [LaborContractsController],
  providers: [LaborContractsService],
})
export class LaborContractsModule {}
