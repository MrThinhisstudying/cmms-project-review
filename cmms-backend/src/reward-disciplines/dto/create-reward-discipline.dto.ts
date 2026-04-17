import { IsNotEmpty, IsEnum, IsDateString, IsOptional, IsString, IsNumber } from 'class-validator';
import { RewardDisciplineType } from '../entities/reward-discipline.entity';

export class CreateRewardDisciplineDto {
    @IsNotEmpty()
    @IsNumber()
    user_id: number;

    @IsNotEmpty()
    @IsEnum(RewardDisciplineType)
    record_type: RewardDisciplineType;

    @IsNotEmpty()
    @IsString()
    decision_number: string;

    @IsNotEmpty()
    @IsString()
    content: string;

    @IsNotEmpty()
    @IsDateString()
    effective_date: string;

    @IsOptional()
    @IsString()
    file_url?: string;
}
