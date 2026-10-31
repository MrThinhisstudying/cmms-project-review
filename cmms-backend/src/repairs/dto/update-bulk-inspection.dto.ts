import { IsArray, IsInt, ArrayMinSize } from 'class-validator';
import { UpdateInspectionDto } from './update-inspection.dto';

export class UpdateBulkInspectionDto extends UpdateInspectionDto {
    @IsArray()
    @IsInt({ each: true })
    @ArrayMinSize(1)
    repair_ids: number[];
}
