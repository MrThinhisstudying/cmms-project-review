import React from "react";
import dayjs from "dayjs";
import { Tag } from "antd";
import { ClockCircleOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { DueBucket } from "../types/maintenance.types";

/**
 * Chuẩn hóa cấp độ bảo dưỡng về dạng chuẩn:
 * 'Tuần' | '1M' | '3M' | '6M' | '9M' | '1Y' | '2Y'
 */
export function normalizeMaintenanceLevel(lvl?: string): string {
  if (!lvl) return "Tuần";
  const clean = lvl.trim().toLowerCase();

  if (
    clean.includes("tuần") ||
    clean.includes("tuan") ||
    clean === "1w" ||
    clean === "w" ||
    clean.includes("week")
  ) {
    return "Tuần";
  }

  if (
    clean.includes("2 năm") ||
    clean.includes("02 năm") ||
    clean.includes("2 nam") ||
    clean.includes("02 nam") ||
    clean.includes("24 tháng") ||
    clean.includes("24 thang") ||
    clean === "2y" ||
    clean === "24_month"
  ) {
    return "2Y";
  }

  if (
    clean.includes("1 năm") ||
    clean.includes("01 năm") ||
    clean.includes("1 nam") ||
    clean.includes("01 nam") ||
    clean.includes("12 tháng") ||
    clean.includes("12 thang") ||
    clean === "1y" ||
    clean === "12_month"
  ) {
    return "1Y";
  }

  if (
    clean.includes("9 tháng") ||
    clean.includes("09 tháng") ||
    clean.includes("9 thang") ||
    clean.includes("09 thang") ||
    clean === "9m" ||
    clean === "9_month"
  ) {
    return "9M";
  }

  if (
    clean.includes("6 tháng") ||
    clean.includes("06 tháng") ||
    clean.includes("6 thang") ||
    clean.includes("06 thang") ||
    clean === "6m" ||
    clean === "6_month"
  ) {
    return "6M";
  }

  if (
    clean.includes("3 tháng") ||
    clean.includes("03 tháng") ||
    clean.includes("3 thang") ||
    clean.includes("03 thang") ||
    clean === "3m" ||
    clean === "3_month"
  ) {
    return "3M";
  }

  if (
    clean.includes("1 tháng") ||
    clean.includes("01 tháng") ||
    clean.includes("1 thang") ||
    clean.includes("01 thang") ||
    clean === "1m" ||
    clean === "1_month" ||
    clean === "tháng" ||
    clean === "thang"
  ) {
    return "1M";
  }

  return lvl.trim();
}

/**
 * Tính ngày hạn chót của chu kỳ bảo dưỡng:
 * - Cấp Tuần: từ ngày 1 đến ngày 7 là 1 tuần -> hạn chót là start + 6 ngày. Sau ngày này mới quá hạn.
 * - Cấp 1 Tháng: trọn vẹn 1 tháng -> hạn chót là start + 1 tháng - 1 ngày.
 * - Cấp 3 Tháng: start + 3 tháng - 1 ngày.
 * - Cấp 6 Tháng: start + 6 tháng - 1 ngày.
 * - Cấp 9 Tháng: start + 9 tháng - 1 ngày.
 * - Cấp 12 Tháng / 1 Năm: start + 1 năm - 1 ngày.
 * - Cấp 24 Tháng / 2 Năm: start + 2 năm - 1 ngày.
 */
export function getMaintenanceCycleDeadline(
  startDate: string | Date | dayjs.Dayjs,
  level?: string
): dayjs.Dayjs {
  const start = dayjs(startDate).startOf("day");
  const norm = normalizeMaintenanceLevel(level);

  if (norm === "Tuần") {
    return start.add(6, "day").endOf("day");
  }
  if (norm === "1M") {
    return start.add(1, "month").subtract(1, "day").endOf("day");
  }
  if (norm === "3M") {
    return start.add(3, "month").subtract(1, "day").endOf("day");
  }
  if (norm === "6M") {
    return start.add(6, "month").subtract(1, "day").endOf("day");
  }
  if (norm === "9M") {
    return start.add(9, "month").subtract(1, "day").endOf("day");
  }
  if (norm === "1Y") {
    return start.add(1, "year").subtract(1, "day").endOf("day");
  }
  if (norm === "2Y") {
    return start.add(2, "year").subtract(1, "day").endOf("day");
  }

  return start.add(6, "day").endOf("day");
}

export interface MaintenanceStatusInfo {
  type:
    | "completed"
    | "not_reached"
    | "near_due"
    | "in_cycle"
    | "in_cycle_last_day"
    | "overdue";
  label: string;
  color: string;
  isOverdue: boolean;
  isCompleted: boolean;
  isActive: boolean;
  daysLeft?: number;
  overdueDays?: number;
  daysUntilStart?: number;
}

/**
 * Phân tích và trả về thông tin trạng thái chi tiết của một bản ghi bảo dưỡng
 */
export function getMaintenanceStatusInfo(
  record: {
    status?: string;
    next_maintenance_date?: string | Date | null;
    last_maintenance_date?: string | Date | null;
    level?: string;
  },
  currentDate: string | Date | dayjs.Dayjs = new Date()
): MaintenanceStatusInfo {
  const isCompleted =
    record.status === "inactive" && !!record.last_maintenance_date;
  if (isCompleted) {
    return {
      type: "completed",
      label: "Hoàn thành",
      color: "green",
      isOverdue: false,
      isCompleted: true,
      isActive: false,
    };
  }

  if (record.status !== "active") {
    return {
      type: "not_reached",
      label: "Chưa tới ngày bảo dưỡng",
      color: "default",
      isOverdue: false,
      isCompleted: false,
      isActive: false,
    };
  }

  if (!record.next_maintenance_date) {
    return {
      type: "not_reached",
      label: "Chưa có lịch",
      color: "default",
      isOverdue: false,
      isCompleted: false,
      isActive: true,
    };
  }

  const today = dayjs(currentDate).startOf("day");
  const startDate = dayjs(record.next_maintenance_date).startOf("day");
  const deadline = getMaintenanceCycleDeadline(startDate, record.level).startOf("day");

  // 1. Chưa đến ngày bắt đầu chu kỳ
  if (today.isBefore(startDate)) {
    const daysUntilStart = startDate.diff(today, "day");
    if (daysUntilStart <= 5) {
      return {
        type: "near_due",
        label: `Sắp đến kỳ (${daysUntilStart} ngày)`,
        color: "orange",
        isOverdue: false,
        isCompleted: false,
        isActive: true,
        daysUntilStart,
      };
    }
    return {
      type: "not_reached",
      label: "Chưa tới ngày bảo dưỡng",
      color: "default",
      isOverdue: false,
      isCompleted: false,
      isActive: true,
      daysUntilStart,
    };
  }

  // 2. Sau hạn chót chu kỳ -> QUÁ HẠN
  if (today.isAfter(deadline)) {
    const overdueDays = today.diff(deadline, "day");
    return {
      type: "overdue",
      label: `Đã quá hạn ${overdueDays} ngày`,
      color: "red",
      isOverdue: true,
      isCompleted: false,
      isActive: true,
      overdueDays,
    };
  }

  // 3. Đang trong chu kỳ bảo dưỡng (startDate <= today <= deadline)
  const daysLeft = deadline.diff(today, "day");
  if (daysLeft === 0) {
    return {
      type: "in_cycle_last_day",
      label: "Hạn chót hôm nay",
      color: "warning",
      isOverdue: false,
      isCompleted: false,
      isActive: true,
      daysLeft: 0,
    };
  }

  return {
    type: "in_cycle",
    label: `Đang trong kỳ (còn ${daysLeft} ngày)`,
    color: "processing",
    isOverdue: false,
    isCompleted: false,
    isActive: true,
    daysLeft,
  };
}

/**
 * Kiểm tra xem bản ghi bảo dưỡng có bị quá hạn hay không
 */
export function isMaintenanceOverdue(
  record: {
    status?: string;
    next_maintenance_date?: string | Date | null;
    last_maintenance_date?: string | Date | null;
    level?: string;
  },
  currentDate: string | Date | dayjs.Dayjs = new Date()
): boolean {
  return getMaintenanceStatusInfo(record, currentDate).isOverdue;
}

/**
 * Render Ant Design Tag hiển thị trạng thái bảo dưỡng chuẩn hóa
 */
export function renderMaintenanceStatusTag(
  record: {
    status?: string;
    next_maintenance_date?: string | Date | null;
    last_maintenance_date?: string | Date | null;
    level?: string;
  },
  currentDate: string | Date | dayjs.Dayjs = new Date()
): React.ReactElement {
  const info = getMaintenanceStatusInfo(record, currentDate);

  if (info.type === "completed") {
    return React.createElement(
      Tag,
      { color: "green", icon: React.createElement(CheckCircleOutlined) },
      info.label
    );
  }

  if (info.type === "overdue") {
    return React.createElement(
      Tag,
      { color: "red", icon: React.createElement(ClockCircleOutlined) },
      info.label
    );
  }

  if (info.type === "in_cycle_last_day") {
    return React.createElement(
      Tag,
      { color: "warning", icon: React.createElement(ClockCircleOutlined) },
      info.label
    );
  }

  if (info.type === "in_cycle") {
    return React.createElement(
      Tag,
      { color: "processing", icon: React.createElement(ClockCircleOutlined) },
      info.label
    );
  }

  if (info.type === "near_due") {
    return React.createElement(
      Tag,
      { color: "orange", icon: React.createElement(ClockCircleOutlined) },
      info.label
    );
  }

  return React.createElement(Tag, { color: "default" }, info.label);
}

// --- Giữ nguyên các hàm cũ để tương thích ngược ---
export function computeBucket(scheduledIso?: string | null): DueBucket {
  if (!scheduledIso) return "unscheduled";
  const d = new Date(scheduledIso);
  if (Number.isNaN(d.getTime())) return "unscheduled";
  const now = Date.now();
  const ms = d.getTime() - now;
  if (ms >= 0) {
    const hours = ms / 3_600_000;
    return hours <= 72 ? "due_soon" : "scheduled";
  }
  const daysLate = Math.abs(ms) / 86_400_000;
  return daysLate > 5 ? "overdue" : "grace";
}

export function bucketText(
  bucket: DueBucket,
  scheduledIso?: string | null
): string {
  if (bucket === "unscheduled") return "Chưa lên lịch";
  if (!scheduledIso) return "—";
  const d = new Date(scheduledIso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = Date.now();
  const ms = d.getTime() - now;
  if (ms >= 0) {
    const days = Math.ceil(ms / 86_400_000);
    if (days <= 0) return "Hôm nay";
    return days <= 3 ? "Sắp đến hạn" : `Còn ${days} ngày`;
  }
  const daysLate = Math.floor(Math.abs(ms) / 86_400_000);
  return daysLate > 5
    ? `Quá hạn ${daysLate} ngày`
    : `Trễ ${daysLate} ngày (≤5)`;
}

export function fmt(dt?: string) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}
