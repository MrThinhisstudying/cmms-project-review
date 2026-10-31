import dayjs from "dayjs";

export interface DeviceExpiriesResult {
  inspection_expiry: string | null;
  insurance_expiry: string | null;
}

export interface LicenseItem {
  id?: string;
  type: string;
  number?: string;
  issuer?: string;
  expiry: string | null;
  note?: string;
  is_renewed?: boolean;
  renewed_to_id?: string;
  renewed_from_id?: string;
  previous_expiry?: string;
  _key?: string;
  _index?: number;
}

export interface LicenseStats {
  data: LicenseItem[];
  totalCount: number;
  validCount: number;
  expiringCount: number;
  expiredCount: number;
  renewedCount: number;
  latestExpiryDate: string | null;
}

/**
 * Tự động quét danh sách giấy tờ/kiểm định để tính toán ngày hết hạn mới nhất
 * cho 2 cột hạn đăng kiểm (inspection_expiry) và hạn bảo hiểm (insurance_expiry)
 */
export const calculateDeviceExpiries = (licenses: any[]): DeviceExpiriesResult => {
  if (!Array.isArray(licenses) || licenses.length === 0) {
    return { inspection_expiry: null, insurance_expiry: null };
  }

  let latestInspection: string | null = null;
  let latestInsurance: string | null = null;

  for (const lic of licenses) {
    if (!lic || !lic.expiry) continue;
    const typeStr = String(lic.type || "").toLowerCase();
    const expiryDate = dayjs(lic.expiry);
    if (!expiryDate.isValid()) continue;

    const formatted = expiryDate.format("YYYY-MM-DD");

    // Đăng kiểm / Kiểm định kỹ thuật / Tem an toàn / Khí thải
    if (
      typeStr.includes("đăng kiểm") ||
      typeStr.includes("kiểm định") ||
      typeStr.includes("khí thải") ||
      typeStr.includes("an toàn") ||
      typeStr.includes("lưu hành")
    ) {
      if (!latestInspection || expiryDate.isAfter(dayjs(latestInspection))) {
        latestInspection = formatted;
      }
    }

    // Bảo hiểm phương tiện
    if (typeStr.includes("bảo hiểm")) {
      if (!latestInsurance || expiryDate.isAfter(dayjs(latestInsurance))) {
        latestInsurance = formatted;
      }
    }
  }

  return {
    inspection_expiry: latestInspection,
    insurance_expiry: latestInsurance,
  };
};

/**
 * Chuẩn hóa loại giấy tờ để gom nhóm chu kỳ kiểm định
 */
export const normalizeLicenseType = (type: string): string => {
  const t = String(type || "").trim().toLowerCase();
  if (t.includes("đăng kiểm") || t.includes("kiểm định")) return "dang_kiem";
  if (t.includes("bảo hiểm")) return "bao_hiem";
  if (t.includes("khí thải")) return "khi_thai";
  if (t.includes("an toàn")) return "an_toan";
  if (t.includes("sân đỗ") || t.includes("lưu hành")) return "luu_hanh";
  return t;
};

/**
 * Kiểm tra xem một bản ghi giấy phép/kiểm định đã được gia hạn (có chu kỳ mới kế thừa) hay chưa
 */
export const isRenewedRecord = (item: any, allItems: any[]): boolean => {
  if (!item || !item.expiry) return false;
  if (item.is_renewed || item.renewed_to_id) return true;
  const itemDate = dayjs(item.expiry).startOf("day");
  const normType = normalizeLicenseType(item.type);

  return allItems.some((other) => {
    if (other === item || !other.expiry) return false;
    // Liên kết trực tiếp qua ID hoặc ngày hết hạn cũ
    if (other.renewed_from_id && other.renewed_from_id === item.id) return true;
    if (other.previous_expiry && dayjs(other.previous_expiry).startOf("day").isSame(itemDate)) {
      return true;
    }
    // Cùng loại giấy phép và có một kỳ mới với thời hạn xa hơn
    if (normalizeLicenseType(other.type) === normType && dayjs(other.expiry).startOf("day").isAfter(itemDate)) {
      return true;
    }
    return false;
  });
};

/**
 * Tìm bản ghi chu kỳ mới đã gia hạn từ bản ghi hiện tại
 */
export const getRenewedByRecord = (item: any, allItems: any[]): any | null => {
  if (!item || !item.expiry) return null;
  const itemDate = dayjs(item.expiry).startOf("day");
  const normType = normalizeLicenseType(item.type);

  return (
    allItems.find((other) => {
      if (other === item || !other.expiry) return false;
      if (other.renewed_from_id && other.renewed_from_id === item.id) return true;
      if (other.previous_expiry && dayjs(other.previous_expiry).startOf("day").isSame(itemDate)) {
        return true;
      }
      if (normalizeLicenseType(other.type) === normType && dayjs(other.expiry).startOf("day").isAfter(itemDate)) {
        return true;
      }
      return false;
    }) || null
  );
};

/**
 * Chuẩn bị dữ liệu danh sách giấy phép từ đối tượng thiết bị
 */
export const getPreparedLicenseData = (device: any): LicenseItem[] => {
  if (!device) return [];
  const licenseData = Array.isArray(device.license_info) ? device.license_info : [];
  const rawData =
    licenseData.length > 0
      ? licenseData
      : [
          { type: "Đăng kiểm", expiry: device.inspection_expiry, issuer: "-", number: "" },
          { type: "Bảo hiểm", expiry: device.insurance_expiry, issuer: "-", number: "" },
        ].filter((i: any) => i.expiry);

  return rawData.map((item: any, idx: number) => ({
    ...item,
    _key: item.id || `lic_${idx}`,
    _index: idx,
  }));
};

/**
 * Thống kê chi tiết các trạng thái giấy phép & kiểm định
 */
export const calculateLicenseStats = (licenses: any[]): LicenseStats => {
  const today = dayjs().startOf("day");
  let expiredCount = 0;
  let expiringCount = 0;
  let validCount = 0;
  let renewedCount = 0;
  let latestExpiryDate: string | null = null;

  licenses.forEach((item: any) => {
    if (!item.expiry) return;
    const isRenewed = isRenewedRecord(item, licenses);
    if (isRenewed) {
      renewedCount++;
      return;
    }

    const d = dayjs(item.expiry).startOf("day");
    if (!latestExpiryDate || d.isAfter(dayjs(latestExpiryDate))) {
      latestExpiryDate = item.expiry;
    }

    const diff = d.diff(today, "day");
    if (diff < 0) {
      expiredCount++;
    } else if (diff <= 30) {
      expiringCount++;
    } else {
      validCount++;
    }
  });

  return {
    data: licenses,
    totalCount: licenses.length,
    validCount,
    expiringCount,
    expiredCount,
    renewedCount,
    latestExpiryDate,
  };
};
