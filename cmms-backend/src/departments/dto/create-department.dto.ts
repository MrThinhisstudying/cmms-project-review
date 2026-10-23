import {ApiProperty} from '@nestjs/swagger';
import {IsArray, IsIn, IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean} from 'class-validator';
import {DEPARTMENT_PERMISSION_CODES} from '../constant/department-permissions.constant';

export class CreateDepartmentDto {
    @ApiProperty()
    @IsNotEmpty({message: 'Tên phòng ban là bắt buộc'})
    name: string;

    @ApiProperty({required: false})
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({required: false})
    @IsOptional()
    @IsNumber()
    manager_id?: number;

    @ApiProperty({required: false})
    @IsOptional()
    @IsNumber()
    deputy_id?: number;

    @ApiProperty({required: false})
    @IsOptional()
    @IsNumber()
    parent_id?: number;

    @ApiProperty({ enum: ['PERSONAL', 'GROUP', 'DEPARTMENT', 'ALL'], default: 'DEPARTMENT' })
    @IsOptional()
    @IsString()
    @IsIn(['PERSONAL', 'GROUP', 'DEPARTMENT', 'ALL'])
    scope?: 'PERSONAL' | 'GROUP' | 'DEPARTMENT' | 'ALL';

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

    @ApiProperty({ enum: ['PHONG_BAN', 'DOI', 'TO'], default: 'TO', required: false })
    @IsOptional()
    @IsString()
    @IsIn(['PHONG_BAN', 'DOI', 'TO'])
    level?: 'PHONG_BAN' | 'DOI' | 'TO';

    @ApiProperty({ description: 'Đánh dấu thuộc hệ thống kỹ thuật', default: false, required: false })
    @IsOptional()
    @IsBoolean()
    is_technical?: boolean;
}
