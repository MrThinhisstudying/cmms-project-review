import {IsBoolean, IsEnum, IsOptional, IsString} from 'class-validator';
import {PolicyCategory} from '../entities/company-policy.entity';

export class CreateCompanyPolicyDto {
    @IsOptional()
    @IsString()
    code?: string;

    @IsString()
    title: string;

    @IsOptional()
    @IsEnum(PolicyCategory)
    category?: PolicyCategory;

    @IsOptional()
    @IsString()
    summary?: string;

    @IsOptional()
    @IsString()
    content?: string;

    @IsOptional()
    @IsString()
    file_url?: string;

    @IsOptional()
    @IsString()
    file_name?: string;

    @IsOptional()
    @IsString()
    effective_date?: string;

    @IsOptional()
    @IsBoolean()
    is_pinned?: boolean;

    @IsOptional()
    @IsString()
    pinned_until?: string | null;

    @IsOptional()
    @IsBoolean()
    is_mandatory_ack?: boolean;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @IsOptional()
    @IsBoolean()
    notify_all?: boolean;
}

export class UpdateCompanyPolicyDto {
    @IsOptional()
    @IsString()
    code?: string;

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsEnum(PolicyCategory)
    category?: PolicyCategory;

    @IsOptional()
    @IsString()
    summary?: string;

    @IsOptional()
    @IsString()
    content?: string;

    @IsOptional()
    @IsString()
    file_url?: string;

    @IsOptional()
    @IsString()
    file_name?: string;

    @IsOptional()
    @IsString()
    effective_date?: string;

    @IsOptional()
    @IsBoolean()
    is_pinned?: boolean;

    @IsOptional()
    @IsString()
    pinned_until?: string | null;

    @IsOptional()
    @IsBoolean()
    is_mandatory_ack?: boolean;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}

export class QueryCompanyPolicyDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(PolicyCategory)
    category?: PolicyCategory;

    @IsOptional()
    @IsString()
    unread_only?: string;

    @IsOptional()
    @IsString()
    include_inactive?: string;
}
