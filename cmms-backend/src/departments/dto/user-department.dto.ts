import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsIn, IsString, IsArray } from 'class-validator';

export class CreateUserDepartmentDto {
    @ApiProperty({ description: 'ID người dùng' })
    @IsNotEmpty()
    @IsNumber()
    user_id: number;

    @ApiProperty({ description: 'ID phòng ban/đội/tổ' })
    @IsNotEmpty()
    @IsNumber()
    dept_id: number;

    @ApiProperty({ enum: ['MEMBER', 'DEPUTY_LEAD', 'LEAD'], default: 'MEMBER' })
    @IsOptional()
    @IsString()
    @IsIn(['MEMBER', 'DEPUTY_LEAD', 'LEAD'])
    role_in_dept?: 'MEMBER' | 'DEPUTY_LEAD' | 'LEAD';

    @ApiProperty({ description: 'Đơn vị chính của nhân viên', default: false })
    @IsOptional()
    @IsBoolean()
    is_primary?: boolean;
}

export class UpdateUserDepartmentDto {
    @ApiProperty({ enum: ['MEMBER', 'DEPUTY_LEAD', 'LEAD'], required: false })
    @IsOptional()
    @IsString()
    @IsIn(['MEMBER', 'DEPUTY_LEAD', 'LEAD'])
    role_in_dept?: 'MEMBER' | 'DEPUTY_LEAD' | 'LEAD';

    @ApiProperty({ description: 'Đơn vị chính của nhân viên', required: false })
    @IsOptional()
    @IsBoolean()
    is_primary?: boolean;
}

/**
 * Đồng bộ tất cả đơn vị của 1 user (xóa cũ, thêm mới)
 * Sử dụng khi cập nhật từ UserModal
 */
export class SyncUserDepartmentsDto {
    @ApiProperty({ type: [CreateUserDepartmentDto] })
    @IsArray()
    departments: { dept_id: number; role_in_dept?: string; is_primary?: boolean }[];
}
