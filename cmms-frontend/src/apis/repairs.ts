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
  token: string | null,
  params?: { page?: number; limit?: number }
): Promise<{ repairs: IRepair[]; total: number }> => {
  const url = new URL(`${BASE_URL}/device/${deviceId}`);
  if (params?.page) url.searchParams.append("page", params.page.toString());
  if (params?.limit) url.searchParams.append("limit", params.limit.toString());

  const res = await fetch(url.toString(), {
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
  return { repairs: data.data, total: data.total || 0 };
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
  type: "request" | "inspection" | "acceptance" | "B03" | "B04" | "B05" | "COMBINED" = "request",
  options?: { hideNames?: boolean }
) => {
  const typeMap: Record<string, string> = {
    request: "B03",
    inspection: "B04",
    acceptance: "B05",
    COMBINED: "COMBINED"
  };
  const code = typeMap[type] || type;
  // GET /repairs/:id/export?type=...
  let url = `${BASE_URL}/${id}/export?type=${code}`;
  if (options?.hideNames) {
     url += `&hideNames=true`;
  }
  
  const res = await fetch(url, {
    headers: { Authorization: token ? `Bearer ${token}` : "" },
  });
  
  if (!res.ok) throw new Error("Xuất file thất bại");
  
  const blob = await res.blob();
  const pdfBlob = new Blob([blob], { type: "application/pdf" });
  const downloadUrl = window.URL.createObjectURL(pdfBlob);
  
  // Open new window
  const win = window.open('', '_blank');
  
  if (win) {
       const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Xem trước phiếu</title>
            <style>
              body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #525659; }
              embed { width: 100%; height: 100%; }
            </style>
          </head>
          <body>
            <embed src="${downloadUrl}" type="application/pdf" width="100%" height="100%" />
          </body>
        </html>
      `;
      win.document.write(html);
      win.document.close();
      win.focus();
  } else {
      console.error("Popup blocked");
  }

  // Delay revocation to ensure the new tab loads the blob
  setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
  }, 120000); // 2 minutes
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
