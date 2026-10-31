import dayjs from "dayjs";

export interface DeviceExpiriesResult {
  inspection_expiry: string | null;
  insurance_expiry: string | null;
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
