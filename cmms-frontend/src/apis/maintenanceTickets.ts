import { IMaintenanceTicket, TicketStatus } from "../types/maintenanceTicket.types";
import { getToken } from "../utils/auth";

const BASE = process.env.REACT_APP_BASE_URL as string;

export const listMaintenanceTickets = async (
  token?: string,
  params?: { userId?: number; deptId?: number }
) => {
  const q: string[] = [];
  if (params?.userId) q.push(`userId=${params.userId}`);
  if (params?.deptId) q.push(`deptId=${params.deptId}`);
  const url = `${BASE}/maintenance-tickets${q.length ? `?${q.join("&")}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token || getToken()}` },
  });
  if (!res.ok) throw new Error("Không lấy được danh sách phiếu");
  const j = await res.json().catch(() => null);
  // backend may return { message, data }
  if (!j) return [] as IMaintenanceTicket[];
  return (j.data ?? j) as IMaintenanceTicket[];
};

export const updateMaintenanceTicketStatus = async (
  ticketId: number,
  status: TicketStatus,
  token?: string
) => {
  const res = await fetch(`${BASE}/maintenance-tickets/${ticketId}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || getToken()}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Cập nhật trạng thái phiếu thất bại");
  const j = await res.json().catch(() => null);
  return (j?.data ?? j) as Promise<IMaintenanceTicket>;
};

export const completeMaintenanceTicket = async (
  ticketId: number,
  data?: { review?: string; rating?: number },
  token?: string
) => {
  const res = await fetch(`${BASE}/maintenance-tickets/${ticketId}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || getToken()}`,
    },
    body: JSON.stringify(data || {}),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.message || "Hoàn tất phiếu thất bại");
  }
  const j = await res.json().catch(() => null);
  return (j?.data ?? j) as Promise<{
    ticket: IMaintenanceTicket;
    next?: IMaintenanceTicket | null;
  }>;
};

export const createTicketForMaintenance = async (
  maintenanceId: number,
  token?: string
) => {
  const res = await fetch(
    `${BASE}/maintenance-tickets/maintenance/${maintenanceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token || getToken()}`,
      },
    }
  );
  if (!res.ok) throw new Error("Tạo phiếu thất bại");
  const j = await res.json().catch(() => null);
  return (j?.data ?? j) as Promise<IMaintenanceTicket>;
};
