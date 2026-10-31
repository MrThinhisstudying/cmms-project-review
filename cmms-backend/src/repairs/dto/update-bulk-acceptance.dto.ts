import { IsArray, IsInt, ArrayMinSize } from 'class-validator';
import { UpdateAcceptanceDto } from './update-acceptance.dto';

export class UpdateBulkAcceptanceDto extends UpdateAcceptanceDto {
    @IsArray()
    @IsInt({ each: true })
    @ArrayMinSize(1)
    repair_ids: number[];
}
