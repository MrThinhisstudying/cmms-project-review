export type MaintenanceStatus = "active" | "inactive" | "canceled";
export type MaintenanceLevel = "3_month" | "6_month" | "9_month" | "12_month";
export type DueBucket = "unscheduled" | "grace" | "overdue" | "due_soon" | "scheduled";

export interface IUserRef {
  user_id: number;
  name: string;
}

export interface IDepartmentRef {
  dept_id: number;
  name: string;
}

export interface IDeviceRef {
  device_id: number;
  name: string;
  brand?: string | null;
}

export interface IMaintenance {
  maintenance_id?: number;
  device?: IDeviceRef | null;
  user?: IUserRef | null;
  department?: IDepartmentRef | null;
  scheduled_date?: string | null;
  expired_date?: string | null;
  status: MaintenanceStatus;
  level: MaintenanceLevel;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MaintenanceUpsertPayload {
  device_id: number;
  user_id?: number;
  dept_id?: number;
  scheduled_date: string;
  expired_date?: string;
  status: MaintenanceStatus;
  level: MaintenanceLevel;
  description?: string;
}

export interface MaintenanceContextValue {
  maintenances: IMaintenance[];
  setMaintenances: (v: IMaintenance[]) => void;
  loading: boolean;
  fetchMaintenances: () => Promise<void>;
}
