import {
  IRepair,
  RepairUpsertPayload,
  RepairInspectionPayload,
  RepairAcceptancePayload,
} from "../types/repairs.types";

const BASE_URL = `${process.env.REACT_APP_BASE_URL}/repairs`;

export const getAllRepairs = async (
  token: string | null,
  params?: {
    status_request?: string;
    status_inspection?: string;
    device_id?: number;
  }
): Promise<IRepair[]> => {
  const url = new URL(BASE_URL);
  if (params) {
    if (params.status_request)
      url.searchParams.append("status_request", params.status_request);
    if (params.status_inspection)
      url.searchParams.append("status_inspection", params.status_inspection);
    if (params.device_id)
      url.searchParams.append("device_id", params.device_id.toString());
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.message || "Lấy danh sách sửa chữa thất bại");
  return data.data;
};

export const getRepairsByDevice = async (
  deviceId: number,
  token: string | null
): Promise<IRepair[]> => {
  const res = await fetch(`${BASE_URL}/device/${deviceId}`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(
      data.message || "Lấy danh sách sửa chữa của thiết bị thất bại"
    );
  return data.data;
};

export const createRepair = async (
  token: string | null,
  payload: RepairUpsertPayload
) => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Tạo phiếu sửa chữa thất bại");
  return data;
};

export const updateRepair = async (
  id: number,
  token: string | null,
  payload: RepairUpsertPayload
) => {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Cập nhật phiếu thất bại");
  return data;
};

export const reviewRepair = async (
  id: number,
  token: string | null,
  payload: { action: "approve" | "reject"; reason?: string },
  phase: "request" | "inspection" | "acceptance"
) => {
  const endpoint =
    phase === "request"
      ? "review-request"
      : phase === "inspection"
      ? "review-inspection"
      : "review-acceptance";
  const res = await fetch(`${BASE_URL}/${id}/${endpoint}`, {
    method: "PATCH",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Duyệt phiếu thất bại");
  return data;
};

export const submitInspection = async (
  id: number,
  token: string | null,
  payload: RepairInspectionPayload
) => {
  const res = await fetch(`${BASE_URL}/${id}/inspection`, {
    method: "PATCH",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Cập nhật kiểm nghiệm thất bại");
  return data;
};

export const submitAcceptance = async (
  id: number,
  token: string | null,
  payload: RepairAcceptancePayload
) => {
  const res = await fetch(`${BASE_URL}/${id}/acceptance`, {
    method: "PATCH",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Cập nhật nghiệm thu thất bại");
  return data;
};

export const exportRepair = async (
  id: number,
  token: string | null,
  type: "request" | "inspection" | "acceptance" | "B03" | "B04" | "B05" = "request"
) => {
  const typeMap: Record<string, string> = {
    request: "B03",
    inspection: "B04",
    acceptance: "B05",
  };
  const code = typeMap[type] || type;
  // GET /repairs/:id/export?type=...
  const url = `${BASE_URL}/${id}/export?type=${code}`;
  
  const res = await fetch(url, {
    headers: { Authorization: token ? `Bearer ${token}` : "" },
  });
  
  if (!res.ok) throw new Error("Xuất file thất bại");
  
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  
  const fileNameMap: Record<string, string> = {
    request: "PHIẾU YÊU CẦU KIỂM TRA BẢO DƯỠNG - SỬA CHỮA",
    inspection: "BIÊN BẢN KIỂM NGHIỆM KỸ THUẬT",
    acceptance: "BIÊN BẢN NGHIỆM THU",
    B03: "PHIẾU YÊU CẦU KIỂM TRA BẢO DƯỠNG - SỬA CHỮA",
    B04: "BIÊN BẢN KIỂM NGHIỆM KỸ THUẬT",
    B05: "BIÊN BẢN NGHIỆM THU",
  };
  
  a.download = `${fileNameMap[type] || "Export"}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
};

export const deleteRepair = async (id: number, token: string | null) => {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    headers: { Authorization: token ? `Bearer ${token}` : "" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Xóa phiếu thất bại");
  return data;
};

export const requestLimitedUse = async (
  id: number,
  token: string | null,
  reason: string
) => {
  const res = await fetch(`${BASE_URL}/${id}/limited-use`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Gửi đề xuất SDHC thất bại");
  return data;
};

export const reviewLimitedUse = async (
  id: number,
  token: string | null,
  action: "approve" | "reject"
) => {
  const res = await fetch(`${BASE_URL}/${id}/review-limited-use`, {
    method: "PATCH",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Duyệt đề xuất SDHC thất bại");
  return data;
};
