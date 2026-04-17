import { fetchClient } from '../utils/fetchClient';
import { getToken } from '../utils/auth';

export interface IRewardDiscipline {
    id: number;
    user: any;
    record_type: 'REWARD' | 'DISCIPLINE';
    decision_number: string;
    content: string;
    effective_date: string;
    file_url?: string;
    created_at: string;
}

export const getRewardDisciplines = async (): Promise<IRewardDiscipline[]> => {
    const response = await fetchClient('/reward-disciplines', {
        headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error('Lỗi lấy danh sách khen thưởng/kỷ luật');
    return response.json();
};

export const getRewardDisciplinesByUser = async (userId: number): Promise<IRewardDiscipline[]> => {
    const response = await fetchClient(`/reward-disciplines/user/${userId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error('Lỗi lấy lịch sử khen thưởng/kỷ luật');
    return response.json();
};

export const createRewardDiscipline = async (data: Partial<IRewardDiscipline>): Promise<IRewardDiscipline> => {
    const response = await fetchClient('/reward-disciplines', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Lỗi thêm mới quyết định');
    }
    return response.json();
};

export const updateRewardDiscipline = async (id: number, data: Partial<IRewardDiscipline>): Promise<IRewardDiscipline> => {
    const response = await fetchClient(`/reward-disciplines/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Lỗi cập nhật quyết định');
    return response.json();
};

export const deleteRewardDiscipline = async (id: number): Promise<void> => {
    const response = await fetchClient(`/reward-disciplines/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error('Lỗi xoá quyết định');
};
