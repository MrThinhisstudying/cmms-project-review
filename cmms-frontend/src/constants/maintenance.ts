import dayjs from "dayjs";
import {
  MaintenanceLevel,
  MaintenanceStatus,
  MaintenanceUpsertPayload,
} from "../types/maintenance.types";

export const EMPTY: Record<string, string> = {
  device_id: "",
  user_id: "",
  dept_id: "",
  scheduled_date: dayjs().format("YYYY-MM-DDTHH:mm:ss"),
  expired_date: "",
  status: "active",
  level: "3_month",
  description: "",
};

export const STATUS_OPTIONS: { value: MaintenanceStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "canceled", label: "Canceled" },
];

export const LEVEL_OPTIONS: { value: MaintenanceLevel; label: string }[] = [
  { value: "3_month", label: "3 tháng" },
  { value: "6_month", label: "6 tháng" },
  { value: "9_month", label: "9 tháng" },
  { value: "12_month", label: "12 tháng" },
];

export const toUpsertPayload = (
  form: Record<string, string>
): MaintenanceUpsertPayload => {
  const device_id = Number(form.device_id);
  return {
    device_id,
    user_id: form.user_id ? Number(form.user_id) : undefined,
    dept_id: form.dept_id ? Number(form.dept_id) : undefined,
    scheduled_date: form.scheduled_date,
    expired_date: form.expired_date || undefined,
    status: form.status as MaintenanceStatus,
    level: form.level as MaintenanceLevel,
    description: form.description?.trim() || undefined,
  };
};
