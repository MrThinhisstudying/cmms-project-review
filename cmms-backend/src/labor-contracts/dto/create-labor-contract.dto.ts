import { IsNotEmpty, IsEnum, IsDateString, IsOptional, IsString, IsNumber } from 'class-validator';
import { ContractType, ContractStatus } from '../entities/labor-contract.entity';

export class CreateLaborContractDto {
    @IsNotEmpty()
    @IsNumber()
    user_id: number;

    @IsNotEmpty()
    @IsString()
    contract_number: string;

    @IsNotEmpty()
    @IsEnum(ContractType)
    contract_type: ContractType;

    @IsNotEmpty()
    @IsDateString()
    start_date: string;

    @IsOptional()
    @IsDateString()
    end_date?: string;

    @IsOptional()
    @IsEnum(ContractStatus)
    status?: ContractStatus;

    @IsOptional()
    @IsString()
    job_title?: string;

    @IsOptional()
    @IsString()
    file_url?: string;
}
