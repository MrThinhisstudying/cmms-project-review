import {
  IMaintenance,
  MaintenanceUpsertPayload,
} from "../types/maintenance.types";
// Import thêm các type mới cho phần Checklist (bạn nhớ cập nhật file types nhé)
import {
  CreateTicketPayload,
  TemplateSelectOption,
  TemplateGroup,
} from "../types/maintenance.types";

const BASE = process.env.REACT_APP_BASE_URL as string;

// --- PHẦN CŨ (GIỮ NGUYÊN) ---

export const getAllMaintenances = async (): Promise<IMaintenance[]> => {
  const res = await fetch(`${BASE}/maintenance`);
  if (!res.ok) throw new Error("Lấy danh sách bảo dưỡng thất bại");
  const j = await res.json().catch(() => null);
  return (j?.data ?? j) as IMaintenance[];
};

export const getMaintenancesByDevice = async (
  deviceId: number,
  token?: string | null
): Promise<IMaintenance[]> => {
  const res = await fetch(`${BASE}/devices/${deviceId}/maintenance`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error("Không lấy được lịch sử bảo trì");
  const j = await res.json().catch(() => null);
  return (j?.data ?? j) as IMaintenance[];
};

export const getMaintenanceDetail = async (
  maintenanceId: number,
  token?: string | null
): Promise<IMaintenance> => {
  const res = await fetch(`${BASE}/maintenance/${maintenanceId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error("Không lấy được chi tiết bảo trì");
  const j = await res.json().catch(() => null);
  return (j?.data ?? j) as IMaintenance;
};

export const createMaintenance = async (
  token: string | null,
  payload: MaintenanceUpsertPayload
) => {
  const res = await fetch(`${BASE}/maintenance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Tạo bảo dưỡng thất bại");
  return data;
};

export const updateMaintenance = async (
  id: number,
  token: string | null,
  payload: Partial<MaintenanceUpsertPayload>
) => {
  const res = await fetch(`${BASE}/maintenance/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Cập nhật bảo dưỡng thất bại");
  return data;
};

export const deleteMaintenance = async (id: number, token: string | null) => {
  const res = await fetch(`${BASE}/maintenance/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Xóa bảo dưỡng thất bại");
  return data;
};

// --- PHẦN MỚI THÊM (CHỨC NĂNG CHECKLIST & TICKET) ---

// 1. Import File Excel Quy trình
export const importTemplate = async (
  file: File,
  name: string,
  deviceType: string,
  token: string | null
) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", name);

  const res = await fetch(`${BASE}/maintenance/templates/import`, {
    method: "POST",
    headers: {
      // Lưu ý: Khi gửi FormData, KHÔNG được set Content-Type là application/json
      // Browser sẽ tự set Content-Type là multipart/form-data
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Import thất bại");
  return data;
};

// 2. Lấy danh sách tất cả mẫu phiếu (cho Dropdown)
export const getAllTemplates = async (
  token: string | null
): Promise<TemplateSelectOption[]> => {
  const res = await fetch(`${BASE}/maintenance/templates/all`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error("Lấy danh sách quy trình thất bại");
  const j = await res.json();
  // Tùy cấu trúc trả về của backend, bạn có thể cần sửa lại (j.data hoặc j)
  return (Array.isArray(j) ? j : j.data) as TemplateSelectOption[];
};

// 3. Lấy chi tiết 1 mẫu phiếu (để vẽ Checklist)
export const getTemplateById = async (
  id: number,
  token: string | null
): Promise<{ checklist_structure: TemplateGroup[] }> => {
  const res = await fetch(`${BASE}/maintenance/templates/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error("Lấy chi tiết quy trình thất bại");
  return await res.json();
};

// 4. Lưu Phiếu Bảo Dưỡng (Ticket)
export const createMaintenanceTicket = async (
  token: string | null,
  payload: CreateTicketPayload
) => {
  const res = await fetch(`${BASE}/maintenance-tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Lưu phiếu thất bại");
  return data;
};

// Import Kế hoạch (Plan) - Khác với Import Quy trình (Template)
export const importMaintenancePlan = async (
  file: File,
  token: string | null
) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE}/maintenance/plans/import`, {
    method: "POST",
    headers: { Authorization: token ? `Bearer ${token}` : "" },
    body: formData,
  });

  // --- SỬA ĐOẠN NÀY ĐỂ BẮT LỖI TỐT HƠN ---
  const text = await res.text(); // Đọc dạng text trước

  try {
    const data = text ? JSON.parse(text) : {}; // Thử parse JSON
    if (!res.ok) {
      throw new Error(data.message || `Lỗi server (${res.status})`);
    }
    return data;
  } catch (err) {
    // Nếu không phải JSON (VD: Server trả về lỗi HTML 500 hoặc rỗng)
    console.error("Raw Server Response:", text);
    throw new Error(`Import thất bại: Server trả về lỗi ${res.status}`);
  }
};

// Xóa quy trình
export const deleteTemplate = async (id: number, token: string | null) => {
  const res = await fetch(`${BASE}/maintenance/templates/${id}`, {
    method: "DELETE",
    headers: { Authorization: token ? `Bearer ${token}` : "" },
  });
  if (!res.ok) throw new Error("Xóa thất bại");
  return await res.json();
};

// Cập nhật quy trình (Tên, Loại)
export const updateTemplate = async (
  id: number,
  data: any,
  token: string | null
) => {
  const res = await fetch(`${BASE}/maintenance/templates/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Cập nhật thất bại");
  return await res.json();
};

/// Lấy lịch sử phiếu bảo dưỡng
export const getMaintenanceHistory = async (token: string | null) => {
  const res = await fetch(`${BASE}/maintenance-tickets/history/all`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) throw new Error("Lấy lịch sử thất bại");

  const j = await res.json();
  // Trả về j.data nếu cấu trúc backend là { message: "...", data: [...] }
  // Hoặc trả về j nếu backend trả mảng trực tiếp
  return j.data || j;
};
