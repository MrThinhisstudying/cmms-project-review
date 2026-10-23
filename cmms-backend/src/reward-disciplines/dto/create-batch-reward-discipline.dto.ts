import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRewardDisciplineDto } from './create-reward-discipline.dto';

export class CreateBatchRewardDisciplineDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateRewardDisciplineDto)
    records: CreateRewardDisciplineDto[];
}
