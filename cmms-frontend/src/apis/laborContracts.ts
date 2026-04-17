import { fetchClient } from '../utils/fetchClient';
import { getToken } from '../utils/auth';

export interface ILaborContract {
    id: number;
    user: any;
    contract_number: string;
    contract_type: '1_MONTH' | 'PROBATION' | '12_MONTHS' | '24_MONTHS' | '36_MONTHS' | 'INDEFINITE';
    start_date: string;
    end_date?: string;
    status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
    job_title?: string;
    file_url?: string;
    created_at: string;
}

export const getLaborContracts = async (): Promise<ILaborContract[]> => {
    const response = await fetchClient('/labor-contracts', {
        headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error('Lỗi lấy danh sách hợp đồng');
    return response.json();
};

export const getLaborContractsByUser = async (userId: number): Promise<ILaborContract[]> => {
    const response = await fetchClient(`/labor-contracts/user/${userId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error('Lỗi lấy hợp đồng nhân viên');
    return response.json();
};

export const createLaborContract = async (data: Partial<ILaborContract>): Promise<ILaborContract> => {
    const response = await fetchClient('/labor-contracts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Lỗi tạo mới hợp đồng');
    }
    return response.json();
};

export const updateLaborContract = async (id: number, data: Partial<ILaborContract>): Promise<ILaborContract> => {
    const response = await fetchClient(`/labor-contracts/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Lỗi cập nhật hợp đồng');
    return response.json();
};

export const deleteLaborContract = async (id: number): Promise<void> => {
    const response = await fetchClient(`/labor-contracts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error('Lỗi xoá hợp đồng');
};
