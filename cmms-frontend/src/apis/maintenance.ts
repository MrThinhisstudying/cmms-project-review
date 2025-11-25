import {
  IMaintenance,
  MaintenanceUpsertPayload,
} from "../types/maintenance.types";

const BASE = process.env.REACT_APP_BASE_URL as string;

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
