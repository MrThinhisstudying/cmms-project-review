import { fetchClient } from '../utils/fetchClient';
import { getToken } from '../utils/auth';

export interface IAnnualLeave {
    id: number;
    user: any;
    year: number;
    leave_balance_n2: number;
    leave_balance_n1: number;
    current_year_leave: number;
    m1_taken: number;
    m2_taken: number;
    m3_taken: number;
    m4_taken: number;
    m5_taken: number;
    m6_taken: number;
    m7_taken: number;
    m8_taken: number;
    m9_taken: number;
    m10_taken: number;
    m11_taken: number;
    m12_taken: number;
}

export interface IRecordLeavePayload {
    user_id: number;
    from_date: string;
    to_date: string;
    days_taken: number;
    applied_month: number;
    year: number;
    reason?: string;
    location?: string;
    attachments?: string[];
}

export interface ILeaveHistory {
    id: number;
    user_id: number;
    annual_leave_id: number;
    from_date: string;
    to_date: string;
    days_taken: number;
    applied_month: number;
    year: number;
    reason?: string;
    location?: string;
    attachments?: string[];
    created_at: string;
}

export const getAnnualLeaves = async (year: number): Promise<IAnnualLeave[]> => {
    const response = await fetchClient(`/annual-leaves?year=${year}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error('Lỗi lấy danh sách phép năm');
    return response.json();
};

export const getAnnualLeavesByUser = async (userId: number, year?: number): Promise<IAnnualLeave[]> => {
    const url = year ? `/annual-leaves/user/${userId}?year=${year}` : `/annual-leaves/user/${userId}`;
    const response = await fetchClient(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error('Lỗi lấy thông tin phép nhân viên');
    return response.json();
};

export const getLeaveHistoriesByUser = async (userId: number, year?: number): Promise<ILeaveHistory[]> => {
    const url = year ? `/annual-leaves/user/${userId}/histories?year=${year}` : `/annual-leaves/user/${userId}/histories`;
    const response = await fetchClient(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error('Lỗi lấy lịch sử phép nhân viên');
    return response.json();
};

export const createAnnualLeave = async (data: Partial<IAnnualLeave>): Promise<IAnnualLeave> => {
    const response = await fetchClient('/annual-leaves', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Lỗi thêm mới dữ liệu phép');
    }
    return response.json();
};

export const updateAnnualLeave = async (id: number, data: Partial<IAnnualLeave>): Promise<IAnnualLeave> => {
    const response = await fetchClient(`/annual-leaves/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Lỗi cập nhật dữ liệu phép');
    return response.json();
};

export const importAnnualLeaves = async (data: any[]): Promise<{success: number, errors: string[]}> => {
    const response = await fetchClient('/annual-leaves/import', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error('Lỗi import dữ liệu phép');
    }
    return response.json();
};

export const recordLeave = async (data: IRecordLeavePayload): Promise<any> => {
    const response = await fetchClient('/annual-leaves/record', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Lỗi ghi nhận nghỉ phép');
    }
    return response.json();
};

export const uploadLeaveAttachments = async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    const response = await fetch(`${process.env.REACT_APP_BASE_URL}/annual-leaves/upload-attachments`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
    });
    const res = await response.json();
    if (!response.ok) {
        throw new Error(res.message || 'Lỗi tải lên file đính kèm');
    }
    return res.data;
};
