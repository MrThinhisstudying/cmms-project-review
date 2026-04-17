import { fetchClient } from '../utils/fetchClient';
import { getToken } from '../utils/auth';

export interface IProfileRequest {
    id: number;
    request_type: 'UPDATE_INFO' | 'NEW_CERTIFICATE';
    data_payload: Record<string, any>;
    file_url?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    notes?: string;
    created_at: string;
    updated_at: string;
    user: {
        user_id: number;
        name: string;
        avatar?: string;
        employee_code?: string;
        department?: { name: string };
    };
    reviewer?: {
        user_id: number;
        name: string;
    };
}

export const createProfileRequest = async (data: { request_type: string, data_payload: any }, file?: File): Promise<IProfileRequest> => {
    let body: any;
    let headers: any = { 'Authorization': `Bearer ${getToken()}` };

    if (file) {
        body = new FormData();
        body.append('request_type', data.request_type);
        body.append('data_payload', JSON.stringify(data.data_payload));
        body.append('file', file);
    } else {
        body = JSON.stringify(data);
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${process.env.REACT_APP_BASE_URL || 'http://localhost:3000'}/profile-requests`, {
        method: 'POST',
        headers,
        body
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
};

export const getMyRequests = async (): Promise<IProfileRequest[]> => {
    const res = await fetchClient('/profile-requests/me', { token: getToken() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
};

export const getPendingRequests = async (): Promise<IProfileRequest[]> => {
    const res = await fetchClient('/profile-requests/pending', { token: getToken() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
};

export const getAllRequests = async (): Promise<IProfileRequest[]> => {
    const res = await fetchClient('/profile-requests/all', { token: getToken() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
};

export const reviewProfileRequest = async (id: number, data: { status: 'APPROVED' | 'REJECTED', notes?: string }): Promise<IProfileRequest> => {
    const res = await fetchClient(`/profile-requests/${id}/review`, {
        method: 'PUT',
        token: getToken(),
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
};
