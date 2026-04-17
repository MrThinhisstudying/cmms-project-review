import { PartialType } from '@nestjs/mapped-types';
import { CreateAnnualLeaveDto } from './create-annual-leave.dto';

export class UpdateAnnualLeaveDto extends PartialType(CreateAnnualLeaveDto) {}
