import { fetchClient } from '../utils/fetchClient';
import { getToken } from '../utils/auth';
import { IShiftDebt, ICreateShiftDebtPayload } from '../types/shiftDebt.types';

export const getShiftDebts = async (params: {
  year?: number;
  month?: number;
  department_id?: number;
}): Promise<IShiftDebt[]> => {
  const query = new URLSearchParams();
  if (params.year) query.append('year', String(params.year));
  if (params.month) query.append('month', String(params.month));
  if (params.department_id) query.append('department_id', String(params.department_id));

  const response = await fetchClient(`/shift-debts?${query.toString()}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) throw new Error('Lỗi lấy dữ liệu nợ ca');
  return response.json();
};

export const createShiftDebt = async (data: ICreateShiftDebtPayload): Promise<IShiftDebt> => {
  const response = await fetchClient('/shift-debts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Lỗi thêm mới bản ghi nợ ca');
  }
  return response.json();
};

export const updateShiftDebt = async (id: number, data: Partial<ICreateShiftDebtPayload>): Promise<IShiftDebt> => {
  const response = await fetchClient(`/shift-debts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Lỗi cập nhật bản ghi nợ ca');
  }
  return response.json();
};

export const deleteShiftDebt = async (id: number): Promise<{ success: boolean }> => {
  const response = await fetchClient(`/shift-debts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) throw new Error('Lỗi xóa bản ghi nợ ca');
  return response.json();
};

export const createBulkShiftDebts = async (
  data: any[]
): Promise<{ created: number; updated: number; failed: number; errors: string[] }> => {
  const response = await fetchClient('/shift-debts/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Lỗi import dữ liệu nợ ca');
  }
  return response.json();
};
