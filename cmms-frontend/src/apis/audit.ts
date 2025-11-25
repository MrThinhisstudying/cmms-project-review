import { AuditLog } from "../types/audit.types";

const BASE_URL = process.env.REACT_APP_BASE_URL;

export const getAllAuditLogs = async (
  token: string | null,
  params?: { actor_user_id?: number; entity?: string; entity_id?: number; page?: number; limit?: number }
): Promise<{ items: AuditLog[]; total: number; page: number; limit: number }> => {
  const query = new URLSearchParams();
  if (params?.actor_user_id) query.append("actor_user_id", String(params.actor_user_id));
  if (params?.entity) query.append("entity", params.entity);
  if (params?.entity_id) query.append("entity_id", String(params.entity_id));
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));

  const res = await fetch(`${BASE_URL}/audit/all?${query.toString()}`, {
    headers: { Authorization: token ? `Bearer ${token}` : "" },
  });
  if (!res.ok) throw new Error("Lấy full log thất bại");
  return res.json();
};

export const rollbackTransaction = async (txId: number, reason: string | undefined, token: string | null) => {
  const res = await fetch(`${BASE_URL}/audit/rollback/transaction/${txId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Rollback thất bại");
  return data;
};
