import { fetchClient } from "../utils/fetchClient";

export interface QuarterlyReportParams {
  quarter: number;
  year: number;
}

export interface ReportData {
  tt: number;
  deviceId: number;
  deviceName: string;
  currentStatus: string;
  managementUnit: string;
  maintenanceCount: number;
  repairCount: number;
  isPending: string;
  isFixed: string;
  repairUnit: string;
  replacementParts: string;
  notes: string;
}

export interface QuarterlyReportResponse {
  quarter: number;
  year: number;
  period: string;
  data: ReportData[];
}

export const getQuarterlyReport = async (token: string | null, params: QuarterlyReportParams) => {
  const query = new URLSearchParams();
  query.append("quarter", params.quarter.toString());
  query.append("year", params.year.toString());

  const response = await fetchClient(`/reports/quarterly?${query.toString()}`, {
    method: "GET",
    token, // Pass token here
  });

  if (!response.ok) {
     throw new Error("Lấy báo cáo thất bại");
  }

  /* ... existing code ... */
  const data = await response.json();
  return data as QuarterlyReportResponse;
};

export const exportReportPdf = async (token: string | null, htmlContent: string) => {
  const response = await fetchClient("/reports/export-pdf", {
    method: "POST",
    token,
    body: JSON.stringify({ htmlContent }),
  });

  if (!response.ok) {
    throw new Error("Xuất PDF thất bại");
  }

  return await response.blob();
};
