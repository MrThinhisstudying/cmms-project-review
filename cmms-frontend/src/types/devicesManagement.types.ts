import { IUser } from "./user.types";
import { ReportData } from "./index.types";

export interface IDevice {
  device_id?: number;
  device_code?: string;
  name?: string;
  reg_number?: string;
  brand?: string;
  status?: DeviceStatus;
  note?: string;
  usage_purpose?: string;
  operating_scope?: string;
  country_of_origin?: string;
  manufacture_year?: number;
  usage_start_year?: number;
  serial_number?: string;
  technical_code_address?: string;
  location_coordinates?: string;
  daily_operation_time?: string;
  relocation_origin?: string;
  relocation_year?: number;
  fixed_asset_code?: string;
  using_department?: string;
  weight?: string;
  width?: string;
  length?: string;
  height?: string;
  power_source?: string;
  power_consumption?: string;
  other_specifications?: string;
  components_inventory?: any; // JSON
  inspection_expiry?: string; // Date string from backend
  insurance_expiry?: string; // Date string from backend
  license_info?: any;
  assessment_info?: any;
  relocation_history?: any; // JSON
  created_at?: Date;
  updated_at?: Date;
  users?: IUser[];
  device_group?: { id: number; name: string };
}

export type DeviceStatus = 
  | "MOI" 
  | "DANG_SU_DUNG" 
  | "SU_DUNG_HAN_CHE" 
  | "DANG_SUA_CHUA" 
  | "THANH_LY"
  | "HUY_BO"; // Keep compatibility if needed, but prefer backend enum values

export interface DevicesContextValue {
  devices: IDevice[];
  setDevices: (devices: IDevice[]) => void;
  loading: boolean;
  fetchDevices: (filters?: { status?: string; name?: string; groupId?: number }) => Promise<void>;
  report: ReportData | null;
  fetchReport: (startDate?: string, endDate?: string) => Promise<void>;
}

export interface DeviceGroup {
    id: number;
    name: string;
    description?: string;
    created_at?: Date;
    updated_at?: Date;
}
