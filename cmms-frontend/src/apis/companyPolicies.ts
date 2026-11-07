import axios from 'axios';
import { getToken } from '../utils/auth';

const BASE_URL = process.env.REACT_APP_BASE_URL || '/api';

export enum PolicyCategory {
    LABOR_RULES = 'LABOR_RULES',
    SAFETY_SECURITY = 'SAFETY_SECURITY',
    BENEFITS_LEAVE = 'BENEFITS_LEAVE',
    WORKFLOW_PROCESS = 'WORKFLOW_PROCESS',
    GENERAL_NOTICE = 'GENERAL_NOTICE',
}

export const POLICY_CATEGORY_META: Record<
    PolicyCategory,
    { label: string; color: string; bg: string; borderColor: string; iconText: string }
> = {
    [PolicyCategory.LABOR_RULES]: {
        label: 'Nội quy lao động & Kỷ luật',
        color: '#1d4ed8',
        bg: '#eff6ff',
        borderColor: '#bfdbfe',
        iconText: '📋',
    },
    [PolicyCategory.SAFETY_SECURITY]: {
        label: 'An toàn & An ninh hàng không',
        color: '#dc2626',
        bg: '#fef2f2',
        borderColor: '#fecaca',
        iconText: '🛡️',
    },
    [PolicyCategory.BENEFITS_LEAVE]: {
        label: 'Chế độ phúc lợi & Phép năm',
        color: '#059669',
        bg: '#ecfdf5',
        borderColor: '#a7f3d0',
        iconText: '🎁',
    },
    [PolicyCategory.WORKFLOW_PROCESS]: {
        label: 'Quy trình phối hợp nội bộ',
        color: '#7c3aed',
        bg: '#f5f3ff',
        borderColor: '#ddd6fe',
        iconText: '🔄',
    },
    [PolicyCategory.GENERAL_NOTICE]: {
        label: 'Thông báo & Quyết định chung',
        color: '#d97706',
        bg: '#fffbeb',
        borderColor: '#fde68a',
        iconText: '📢',
    },
};

export interface ICompanyPolicy {
    id: number;
    code?: string;
    title: string;
    category: PolicyCategory;
    summary?: string;
    content?: string;
    file_url?: string;
    file_name?: string;
    effective_date?: string;
    is_pinned: boolean;
    pinned_until?: string | null;
    is_mandatory_ack: boolean;
    is_active: boolean;
    created_by_id?: number;
    created_by?: {
        user_id: number;
        name: string;
        position?: string;
        avatar?: string;
    } | null;
    created_at: string;
    updated_at: string;
    is_acknowledged: boolean;
    acknowledged_at?: string | null;
    ack_count: number;
    total_active_users: number;
}

export interface IPolicyUserAckItem {
    user_id: number;
    name: string;
    employee_code?: string;
    position?: string;
    department_name?: string;
    avatar?: string;
    acknowledged_at?: string;
}

export interface ICompanyPolicyDetail extends ICompanyPolicy {
    acknowledged_users: IPolicyUserAckItem[];
    unacknowledged_users: IPolicyUserAckItem[];
}

export interface ICompanyPolicyListResponse {
    items: ICompanyPolicy[];
    stats: {
        total: number;
        unreadCount: number;
        acknowledgedCount: number;
        pinnedCount: number;
        totalActiveUsers: number;
    };
}

export interface ICreateCompanyPolicyPayload {
    code?: string;
    title: string;
    category?: PolicyCategory;
    summary?: string;
    content?: string;
    file_url?: string;
    file_name?: string;
    effective_date?: string;
    is_pinned?: boolean;
    pinned_until?: string | null;
    is_mandatory_ack?: boolean;
    is_active?: boolean;
    notify_all?: boolean;
}

export interface IQueryCompanyPolicyParams {
    search?: string;
    category?: PolicyCategory;
    unread_only?: boolean;
    include_inactive?: boolean;
}

export const canManageCompanyPolicies = (user: any): boolean => {
    if (!user) return false;
    const role = (user.role || '').toUpperCase();
    return ['ADMIN', 'HR_MANAGER', 'DIRECTOR'].includes(role);
};

export const canViewPolicyReadStats = (user: any): boolean => {
    if (!user) return false;
    const role = (user.role || '').toUpperCase();
    return ['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'UNIT_HEAD', 'TEAM_LEAD'].includes(role);
};

export const getCompanyPolicies = async (
    params?: IQueryCompanyPolicyParams,
): Promise<ICompanyPolicyListResponse> => {
    const token = getToken();
    const queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.category) queryParams.category = params.category;
    if (params?.unread_only) queryParams.unread_only = 'true';
    if (params?.include_inactive) queryParams.include_inactive = 'true';

    const res = await axios.get(`${BASE_URL}/company-policies`, {
        params: queryParams,
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

export const getCompanyPolicyDetail = async (id: number): Promise<ICompanyPolicyDetail> => {
    const token = getToken();
    const res = await axios.get(`${BASE_URL}/company-policies/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

export const createCompanyPolicy = async (
    payload: ICreateCompanyPolicyPayload,
): Promise<ICompanyPolicyDetail> => {
    const token = getToken();
    const res = await axios.post(`${BASE_URL}/company-policies`, payload, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

export const updateCompanyPolicy = async (
    id: number,
    payload: Partial<ICreateCompanyPolicyPayload>,
): Promise<ICompanyPolicyDetail> => {
    const token = getToken();
    const res = await axios.patch(`${BASE_URL}/company-policies/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

export const deleteCompanyPolicy = async (id: number): Promise<{ deleted: boolean; id: number }> => {
    const token = getToken();
    const res = await axios.delete(`${BASE_URL}/company-policies/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

export const acknowledgeCompanyPolicy = async (id: number): Promise<ICompanyPolicyDetail> => {
    const token = getToken();
    const res = await axios.post(
        `${BASE_URL}/company-policies/${id}/acknowledge`,
        {},
        {
            headers: { Authorization: `Bearer ${token}` },
        },
    );
    return res.data;
};

export const uploadCompanyPolicyFile = async (
    file: File,
): Promise<{ file_url: string; file_name: string }> => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${BASE_URL}/company-policies/upload-file`, formData, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
        },
    });
    return res.data;
};

