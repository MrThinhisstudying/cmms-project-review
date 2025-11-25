import {ApiProperty} from '@nestjs/swagger';
import {IsArray, IsIn, IsNotEmpty, IsOptional, IsString} from 'class-validator';
import {DEPARTMENT_PERMISSION_CODES} from '../constant/department-permissions.constant';

export class CreateDepartmentDto {
    @ApiProperty()
    @IsNotEmpty({message: 'Tên phòng ban là bắt buộc'})
    name: string;

    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        required: false,
        description: 'Danh sách quyền được cấp cho phòng ban',
        example: DEPARTMENT_PERMISSION_CODES,
    })
    @IsOptional()
    @IsArray()
    @IsIn(DEPARTMENT_PERMISSION_CODES, {
        each: true,
        message: 'Quyền không hợp lệ, vui lòng chọn đúng trong danh sách cho phép.',
    })
    permissions?: string[];
}
