// --- PHẦN CŨ (GIỮ NGUYÊN) ---
export type MaintenanceStatus = "active" | "inactive" | "canceled";
export type MaintenanceLevel =
  | "3_month"
  | "6_month"
  | "9_month"
  | "12_month"
  | "24_month";
export type DueBucket =
  | "unscheduled"
  | "grace"
  | "overdue"
  | "due_soon"
  | "scheduled";

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

// ============================================================
// --- NEW: CHECKLIST & TICKET TYPES (PHẦN MỚI THÊM) ---
// ============================================================

// 1. Cấu trúc 1 dòng kiểm tra trong Template (từ Excel)
export interface ChecklistItem {
  code: string;
  task: string;
  type: "input_number" | "checkbox";
  requirements: Record<string, string>; // Vd: { "1M": "I", "6M": "R" }
}

// 2. Cấu trúc 1 nhóm (Category) trong Template
export interface TemplateGroup {
  category: string;
  items: ChecklistItem[];
}

// 3. Dữ liệu trả về khi lấy danh sách Template (Dropdown)
export interface TemplateSelectOption {
  id: number;
  name: string;
  device_type?: string;
  checklist_structure?: TemplateGroup[]; // Optional vì list có thể không trả về structure
}

// 4. Cấu trúc 1 kết quả kiểm tra (thợ gửi lên)
export interface ChecklistResultEntry {
  code: string;
  status: "pass" | "fail" | "na";
  value?: string; // Nếu là 'input_number'
  note?: string; // Ghi chú nếu hỏng
}

// 5. Payload gửi lên API để tạo phiếu (Create Ticket)
export interface CreateTicketPayload {
  device_id: number;
  template_id: number;
  maintenance_level: string; // "1M", "3M", "6M"...
  checklist_result: ChecklistResultEntry[];
  arising_issues?: string;
  // --- THÊM MỚI ---
  working_hours?: number;
  execution_team?: any[];
  acceptance_result?: any[];
  final_conclusion?: boolean;
  execution_date?: string;
}
