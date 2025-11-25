import { DueBucket } from "../types/maintenance.types";

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
