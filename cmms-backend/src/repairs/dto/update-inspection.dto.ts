import {IsArray, IsOptional, IsString, ValidateNested, IsInt, IsNumber, Min, ValidateIf, IsBoolean, ArrayMinSize} from 'class-validator';
import {Type} from 'class-transformer';

class InspectionItemDto {
    @IsString()
    description: string;

    @IsString()
    cause: string;

    @IsString()
    solution: string;

    @IsOptional()
    @IsString()
    notes?: string;
}

class InspectionMaterialDto {
    @ValidateIf((o) => o.is_new === false)
    @IsInt()
    item_id?: number;

    @ValidateIf((o) => o.is_new === true)
    @IsString()
    item_name?: string;

    @IsNumber()
    @Min(1)
    quantity: number;

    @IsOptional()
    @IsString()
    unit?: string;

    @IsBoolean()
    is_new: boolean;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    specifications?: string;

    @IsOptional()
    @IsString()
    item_code?: string;
}

export class UpdateInspectionDto {
    @IsOptional()
    @IsArray()
    @ValidateNested({each: true})
    @Type(() => InspectionMaterialDto)
    inspection_materials?: InspectionMaterialDto[];

    @IsOptional()
    @IsArray()
    @IsInt({each: true})
    @ArrayMinSize(1)
    inspection_committee_ids?: number[];

    @IsOptional()
    @IsArray()
    @ValidateNested({each: true})
    @Type(() => InspectionItemDto)
    inspection_items?: InspectionItemDto[];

    @IsOptional()
    @IsString()
    inspection_other_opinions?: string;
}
