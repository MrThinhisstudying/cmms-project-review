import axios from 'axios';
import { getToken } from '../utils/auth';

const BASE_URL = process.env.REACT_APP_BASE_URL || '/api';

export enum IncidentReportStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    RESOLVED_QUICK = 'RESOLVED_QUICK',
    REQUESTED_REPAIR = 'REQUESTED_REPAIR',
    CONVERTED_REPAIR = 'CONVERTED_REPAIR',
}

export interface IVehicleIncidentReport {
    id: number;
    device_id: number;
    device?: {
        device_id: number;
        name: string;
        reg_number?: string;
        device_code?: string;
    };
    reporter_user?: {
        user_id: number;
        name: string;
        employee_code?: string;
        avatar?: string;
        department?: {
            name: string;
        };
    };
    reporter_user_id?: number;
    reporter_name: string;
    reporter_code?: string;
    reporter_department?: string;
    reporter_phone?: string;
    is_external_reporter: boolean;
    location_issue?: string;
    description: string;
    images?: string[];
    status: IncidentReportStatus;
    technician?: {
        user_id: number;
        name: string;
        role?: string;
    };
    technician_accepted_at?: string;
    quick_solution?: string;
    operator_confirmed_by?: {
        user_id: number;
        name: string;
    };
    operator_confirmed_name?: string;
    operator_confirmed_at?: string;
    operator_notes?: string;

    // Yêu cầu làm hồ sơ sửa chữa
    assigned_dossier_user_id?: number;
    assigned_dossier_user_name?: string;
    assigned_dossier_user?: {
        user_id: number;
        name: string;
        employee_code?: string;
    };
    dossier_request_note?: string;
    dossier_requested_at?: string;
    is_reporter_in_vehicle_group?: boolean;

    converted_repair_id?: number;
    created_at: string;
    updated_at: string;
}

export interface ICreateIncidentReportPayload {
    device_id: number;
    reporter_user_id?: number;
    reporter_name: string;
    reporter_code?: string;
    reporter_department?: string;
    reporter_phone?: string;
    is_external_reporter?: boolean;
    location_issue?: string;
    description: string;
    images?: string[];
}

export interface IResolveQuickPayload {
    quick_solution: string;
    operator_confirmed_by_id?: number;
    operator_confirmed_name: string;
    operator_notes?: string;
}

export interface IRequestRepairDossierPayload {
    assigned_user_id?: number;
    assigned_user_name?: string;
    request_note: string;
}

export interface ICheckVehicleGroupResult {
    report_id: number;
    device_id: number;
    device_name?: string;
    reg_number?: string;
    device_group_name?: string | null;
    reporter_user?: {
        user_id: number;
        name: string;
        employee_code?: string;
        department?: string;
    } | null;
    reporter_name: string;
    reporter_code?: string;
    is_external_reporter: boolean;
    is_in_group: boolean;
    group_members: Array<{
        user_id: number;
        name: string;
        employee_code?: string;
        is_group_lead?: boolean;
        phone?: string;
        department?: string;
    }>;
    assigned_users: Array<{
        user_id: number;
        name: string;
        employee_code?: string;
    }>;
    message: string;
}

export interface IQueryIncidentReportsParams {
    status?: IncidentReportStatus;
    device_id?: number;
    search?: string;
    from_date?: string;
    to_date?: string;
}

// 1. PUBLIC: Gửi báo cáo tình trạng xe từ quét mã QR
export const createPublicIncidentReport = async (payload: ICreateIncidentReportPayload): Promise<IVehicleIncidentReport> => {
    const res = await axios.post(`${BASE_URL}/vehicle-incident-reports/public`, payload);
    return res.data;
};

// 2. PUBLIC: Tìm kiếm nhân viên nhanh phục vụ AutoComplete
export const searchReporters = async (query: string): Promise<Array<{ user_id: number; name: string; employee_code?: string; department?: string; phone?: string }>> => {
    const res = await axios.get(`${BASE_URL}/vehicle-incident-reports/reporters/search`, {
        params: { q: query },
    });
    return res.data;
};

// 3. PUBLIC: Tải lên hình ảnh hiện trường (đã nén)
export const uploadIncidentImages = async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const res = await axios.post(`${BASE_URL}/vehicle-incident-reports/upload-images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
};

// 4. PROTECTED: Lấy các báo cáo chờ xử lý (cho popup khi KTV đăng nhập)
export const getPendingIncidentReports = async (): Promise<IVehicleIncidentReport[]> => {
    const token = getToken();
    const res = await axios.get(`${BASE_URL}/vehicle-incident-reports/pending`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

// 5. PROTECTED: Danh sách tổng hợp báo cáo tình trạng xe
export const getVehicleIncidentReports = async (params?: IQueryIncidentReportsParams): Promise<IVehicleIncidentReport[]> => {
    const token = getToken();
    const res = await axios.get(`${BASE_URL}/vehicle-incident-reports`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

// 6. PROTECTED: KTV tiếp nhận
export const acceptIncidentReport = async (id: number): Promise<IVehicleIncidentReport> => {
    const token = getToken();
    const res = await axios.patch(`${BASE_URL}/vehicle-incident-reports/${id}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

// 7. PROTECTED: Xác nhận đã khắc phục nhanh (kèm người vận hành nghiệm thu)
export const resolveQuickIncidentReport = async (id: number, payload: IResolveQuickPayload): Promise<IVehicleIncidentReport> => {
    const token = getToken();
    const res = await axios.patch(`${BASE_URL}/vehicle-incident-reports/${id}/resolve-quick`, payload, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

// 8. PROTECTED: Kiểm tra chéo người báo cáo có thuộc nhóm quản lý xe không
export const checkVehicleGroupMembership = async (id: number): Promise<ICheckVehicleGroupResult> => {
    const token = getToken();
    const res = await axios.get(`${BASE_URL}/vehicle-incident-reports/${id}/check-vehicle-group`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

// 9. PROTECTED: Gửi yêu cầu làm hồ sơ sửa chữa
export const requestRepairDossier = async (id: number, payload: IRequestRepairDossierPayload): Promise<IVehicleIncidentReport> => {
    const token = getToken();
    const res = await axios.post(`${BASE_URL}/vehicle-incident-reports/${id}/request-repair-dossier`, payload, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

// 10. PROTECTED: Gắn mã phiếu sửa chữa đã tạo
export const linkRepairDossier = async (id: number, repairId: number): Promise<IVehicleIncidentReport> => {
    const token = getToken();
    const res = await axios.post(`${BASE_URL}/vehicle-incident-reports/${id}/link-repair-dossier`, { repair_id: repairId }, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

// 11. PROTECTED: Chuyển trực tiếp thành hồ sơ sửa chữa B03
export const convertIncidentReportToRepair = async (id: number): Promise<{ report: IVehicleIncidentReport; repair: any }> => {
    const token = getToken();
    const res = await axios.post(`${BASE_URL}/vehicle-incident-reports/${id}/convert-to-repair`, {}, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

/**
 * Kiểm tra đơn vị / chức danh có thuộc Tổ VHTTBMĐ (Vận hành trang thiết bị mặt đất) hay không
 */
const isVhttbmdText = (text?: string | null): boolean => {
    if (!text) return false;
    const lower = text.trim().toLowerCase();
    return lower.includes('vhttbmđ') || lower.includes('vhttbmd') || lower.includes('vận hành');
};

/**
 * Kiểm tra người dùng thuộc nhóm Lãnh đạo / Chỉ huy chỉ có quyền XEM trang Báo cáo tình trạng xe
 * (Không hiện Popup sân đỗ, không hiện các nút chức năng xử lý):
 * - Ban Giám đốc (DIRECTOR)
 * - Đội trưởng / Đội phó (UNIT_HEAD hoặc LEAD/DEPUTY_LEAD cấp Đội)
 * - Tổ trưởng / Tổ phó VHTTBMĐ (hoặc TEAM_LEAD không thuộc Tổ kỹ thuật)
 */
export const isIncidentReportViewOnly = (user: any): boolean => {
    if (!user) return true;
    const role = (user.role || '').toUpperCase();

    if (role === 'ADMIN') return false;

    // 1. Ban Giám đốc & Đội trưởng / Cán bộ đội
    if (role === 'DIRECTOR' || role === 'UNIT_HEAD') return true;

    const userDepts: any[] = Array.isArray(user.user_departments) ? user.user_departments : [];
    const isUnitLeadInDept = userDepts.some(
        (ud) => ['LEAD', 'DEPUTY_LEAD'].includes(ud?.role_in_dept) && ud?.department?.level === 'DOI'
    );
    if (isUnitLeadInDept) return true;

    // 2. Tổ trưởng / Tổ phó VHTTBMĐ (theo role_in_dept hoặc role TEAM_LEAD hoặc chức danh position)
    const posLower = (user.position || '').trim().toLowerCase();
    const isPosTeamLeaderOrDeputy =
        posLower.includes('tổ trưởng') || posLower.includes('tổ phó') || posLower.includes('đội trưởng') || posLower.includes('đội phó');

    const belongsToVhttbmd =
        isVhttbmdText(user.department?.name) ||
        isVhttbmdText(user.position) ||
        userDepts.some((ud) => isVhttbmdText(ud?.department?.name));

    const isTeamLeadOrDeputyInDept = userDepts.some(
        (ud) => ['LEAD', 'DEPUTY_LEAD'].includes(ud?.role_in_dept) && ud?.department?.level === 'TO'
    );

    if ((role === 'TEAM_LEAD' || isTeamLeadOrDeputyInDept || isPosTeamLeaderOrDeputy) && belongsToVhttbmd) {
        return true;
    }

    // 3. Nếu là TEAM_LEAD nhưng không thuộc bất kỳ Tổ kỹ thuật nào (is_technical = false)
    if (role === 'TEAM_LEAD') {
        const hasTechDept =
            Boolean(user.department?.is_technical && !isVhttbmdText(user.department?.name)) ||
            userDepts.some((ud) => ud?.department?.is_technical && !isVhttbmdText(ud?.department?.name));
        if (!hasTechDept) return true;
    }

    return false;
};

/**
 * Kiểm tra người dùng có quyền Kỹ thuật xử lý sự cố sân đỗ hay không
 * (Hiện Popup sự cố chờ xử lý & 3 nút: Kỹ thuật tiếp nhận, Xác nhận đã khắc phục, Yêu cầu làm hồ sơ B03):
 * - ADMIN
 * - TECHNICIAN
 * - TEAM_LEAD thuộc Tổ kỹ thuật (is_technical = true và KHÔNG phải Tổ VHTTBMĐ)
 */
export const canProcessIncidentAsTech = (user: any): boolean => {
    if (!user) return false;
    const role = (user.role || '').toUpperCase();

    if (role === 'ADMIN') return true;
    if (isIncidentReportViewOnly(user)) return false;

    if (role === 'TECHNICIAN') return true;

    if (role === 'TEAM_LEAD') {
        const userDepts: any[] = Array.isArray(user.user_departments) ? user.user_departments : [];
        const hasTechDept =
            Boolean(user.department?.is_technical && !isVhttbmdText(user.department?.name)) ||
            userDepts.some((ud) => ud?.department?.is_technical && !isVhttbmdText(ud?.department?.name));
        return hasTechDept;
    }

    return false;
};

