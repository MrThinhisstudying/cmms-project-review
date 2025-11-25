import { IMaintenanceTicket } from "../types/maintenanceTicket.types";

export function isAssignee(t: IMaintenanceTicket, userId?: number, deptId?: number) {
  if (!userId && !deptId) return true;
  const byUser = userId && t.user?.user_id === userId;
  const byDept = deptId && t.department?.dept_id === deptId;
  return Boolean(byUser || byDept);
}