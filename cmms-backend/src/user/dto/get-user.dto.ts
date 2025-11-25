import {ApiProperty} from '@nestjs/swagger';
import {IsOptional} from 'class-validator';
import { Pageable } from 'src/utils/commonDto';

export class GetUserDto extends Pageable {
    @ApiProperty({required: false})
    @IsOptional()
    readonly name?: string = '';
}

