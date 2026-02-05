import { IUser } from "./user.types";
import { IDepartment } from "./user.types";
import { IDevice } from "./devicesManagement.types";

export type RequestStatus =
  | "WAITING_TECH"
  | "WAITING_MANAGER"
  | "WAITING_DIRECTOR"
  | "REJECTED_B03"
  | "REJECTED"
  | "COMPLETED";

export type InspectionStatus =
  | "inspection_pending"
  | "inspection_lead_approved"
  | "inspection_manager_approved"
  | "inspection_admin_approved"
  | "REJECTED_B04"
  | "inspection_rejected";

export type AcceptanceStatus =
  | "acceptance_pending"
  | "acceptance_lead_approved"
  | "acceptance_manager_approved"
  | "acceptance_admin_approved"
  | "REJECTED_B05"
  | "acceptance_rejected";

export interface IInspectionMaterial {
  item_id?: number;
  item_name?: string;
  quantity: number;
  unit?: string;
  specifications?: string;
  is_new: boolean;
  category_name?: string;
  item_code?: string;
  notes?: string;
}

export interface IInspectionItem {
  description: string;
  cause: string;
  solution: string;
  notes?: string;
}

export interface IMaterial {
  name: string;
  quantity: number;
  unit: string;
  damage_percentage: number;
}

export interface IRepair {
  repair_id: number;
  device: IDevice;
  created_by: IUser;
  created_department: IDepartment;

  location_issue?: string;
  recommendation?: string;
  note?: string;

  status_request: RequestStatus;
  approved_by_manager_request?: IUser;
  approved_by_admin_request?: IUser;

  inspection_materials?: IInspectionMaterial[];
  inspection_committee?: IUser[];
  status_inspection: InspectionStatus;
  approved_by_manager_inspection?: IUser;
  approved_by_admin_inspection?: IUser;
  approved_by_operator_lead_inspection?: IUser;

  inspection_created_by?: IUser;
  inspection_created_at?: string;
  inspection_approved_at?: string;
  inspection_duration_minutes?: number;
  inspection_items?: IInspectionItem[];
  inspection_other_opinions?: string;

  acceptance_note?: string;
  acceptance_committee?: IUser[];

  status_acceptance: AcceptanceStatus;
  approved_by_manager_acceptance?: IUser;
  approved_by_admin_acceptance?: IUser;
  approved_by_operator_lead_acceptance?: IUser;

  acceptance_created_by?: IUser;
  acceptance_created_at?: string;
  acceptance_approved_at?: string;
  acceptance_duration_minutes?: number;
  failure_cause?: string;
  failure_description?: string;
  recovered_materials?: IMaterial[];
  materials_to_scrap?: IMaterial[];
  acceptance_other_opinions?: string;
  location_coordinates?: string;

  canceled: boolean;
  canceled_at?: string;
  rejection_reason?: string;
  rejected_by?: IUser;
  
  limited_use_status?: 'PENDING' | 'APPROVED' | 'REJECTED';

  created_at: string;
  updated_at?: string;
  extra_config?: any; // For flexible configs like merge_cells
}

export interface RepairUpsertPayload {
  device_id: number;
  location_issue: string;
  recommendation?: string;
  note?: string;
}

export interface RepairInspectionPayload {
  inspection_materials: IInspectionMaterial[];
  inspection_committee_ids?: number[];
  action: "approve" | "reject";
  reason?: string;
  inspection_items?: IInspectionItem[];
  inspection_other_opinions?: string;
  merge_cells?: boolean;
}

export interface RepairAcceptancePayload {
  acceptance_note?: string;
  acceptance_committee_ids?: number[];
  action: "approve" | "reject";
  reason?: string;
  failure_cause?: string;
  failure_description?: string;
  recovered_materials?: IMaterial[];
  materials_to_scrap?: IMaterial[];
  acceptance_other_opinions?: string;
  location_coordinates?: string;
  inspection_materials?: IInspectionMaterial[];
}
