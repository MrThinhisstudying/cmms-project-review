import {ApiProperty} from '@nestjs/swagger';
import {IsOptional} from 'class-validator';

export class SignIn {
    @ApiProperty({required: false})
    @IsOptional()
    readonly email?: string = '';

    @ApiProperty({required: false})
    @IsOptional()
    readonly password?: string = '';
}
