import { IUser } from './user.types';

export interface IShiftDebt {
  id: number;
  user_id: number;
  user?: IUser;
  department_id?: number;
  department?: { dept_id: number; name: string };
  year: number;
  month: number;
  opening_debt: number; // Nợ ca tồn tháng trước (số ngày)
  taken_days: number;   // Nghỉ bù ca/lễ phát sinh trong tháng (số ngày)
  accrued_days: number; // Nợ ca/lễ phát sinh trong tháng (số ngày)
  closing_debt: number; // Nợ ca/lễ tồn tính đến hết tháng báo cáo (số ngày)
  reason?: string;      // Ghi chú lý do nợ ca/lễ trong tháng
  created_at?: string;
  updated_at?: string;
}

export interface ICreateShiftDebtPayload {
  user_id: number;
  year: number;
  month: number;
  department_id?: number;
  opening_debt?: number;
  taken_days?: number;
  accrued_days?: number;
  closing_debt?: number;
  reason?: string;
}
