import {IsOptional, IsString, IsArray, IsInt, ArrayMinSize, ValidateNested, IsNumber, Min, Max} from 'class-validator';
import {Type} from 'class-transformer';

class MaterialDto {
    @IsString()
    name: string;

    @IsNumber()
    quantity: number;

    @IsString()
    unit: string;

    @IsNumber()
    @Min(0)
    @Max(100)
    damage_percentage: number;
}

export class UpdateAcceptanceDto {
    @IsOptional()
    @IsString()
    acceptance_note?: string;

    @IsOptional()
    @IsArray()
    @IsInt({each: true})
    @ArrayMinSize(1)
    acceptance_committee_ids?: number[];

    @IsOptional()
    @IsString()
    failure_cause?: string;

    @IsOptional()
    @IsString()
    failure_description?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({each: true})
    @Type(() => MaterialDto)
    recovered_materials?: MaterialDto[];

    @IsOptional()
    @IsArray()
    @ValidateNested({each: true})
    @Type(() => MaterialDto)
    materials_to_scrap?: MaterialDto[];

    @IsOptional()
    @IsString()
    acceptance_other_opinions?: string;

    @IsOptional()
    @IsArray()
    inspection_materials?: any[]; // Simplified type for brevity, or define full structure
}
