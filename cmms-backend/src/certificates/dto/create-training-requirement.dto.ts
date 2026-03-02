export class CreateTrainingRequirementDto {
    program_id: number;
    required_date?: Date;
    note?: string;
    status?: 'PENDING' | 'FULFILLED';
}
