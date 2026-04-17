import { PartialType } from '@nestjs/mapped-types';
import { CreateLaborContractDto } from './create-labor-contract.dto';

export class UpdateLaborContractDto extends PartialType(CreateLaborContractDto) {}
