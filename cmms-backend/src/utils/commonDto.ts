import {ApiProperty} from '@nestjs/swagger';
import {IsOptional} from 'class-validator';

export class Pageable {
    @ApiProperty({required: false})
    @IsOptional()
    page?: number;

    @ApiProperty({required: false})
    @IsOptional()
    size?: number;
}

export interface Paging<T> {
    result: T[];
    pageable: {
        page: number;
        size: number;
        total: number;
    };
}

export interface Limit<T> {
    result: T[];
}
