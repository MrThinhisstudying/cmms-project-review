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
