export const STATUS_OPTIONS: Record<string, { label: string; color: string }> =
  {
    moi: { label: "Hàng mới", color: "#4caf50" },
    dang_su_dung: { label: "Đang sử dụng", color: "#2196f3" },
    thanh_ly: { label: "Thanh lý", color: "#9e9e9e" },
    huy_bo: { label: "Huỷ bỏ", color: "#f44336" },
  };

export const STATUS_LIST = Object.entries(STATUS_OPTIONS).map(
  ([value, { label }]) => ({ value, label })
);

export const mapStatus = (status?: string) =>
  STATUS_OPTIONS[status || ""] || { label: status || "-", color: "#000" };
