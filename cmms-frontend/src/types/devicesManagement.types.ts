import { IUser } from "./user.types";
import { ReportData } from "./index.types";

export interface IDevice {
  device_id?: number;
  name?: string;
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
  height?: string;
  power_source?: string;
  power_consumption?: string;
  other_specifications?: string;
  created_at?: Date;
  updated_at?: Date;
  users?: IUser[];
  device_group?: { id: number; name: string };
}

export interface DevicesContextValue {
  devices: IDevice[];
  setDevices: React.Dispatch<React.SetStateAction<IDevice[]>>;
  loading: boolean;
  fetchDevices: () => void;
  report: ReportData | null;
  fetchReport: (startDate?: string, endDate?: string) => Promise<void>;
}

export type DeviceStatus = "moi" | "dang_su_dung" | "thanh_ly" | "huy_bo";
