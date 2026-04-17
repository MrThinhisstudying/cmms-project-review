import { PartialType } from '@nestjs/mapped-types';
import { CreateRewardDisciplineDto } from './create-reward-discipline.dto';

export class UpdateRewardDisciplineDto extends PartialType(CreateRewardDisciplineDto) {}
