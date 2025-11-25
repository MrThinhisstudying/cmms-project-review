import {
  IMaintenanceTicket,
  TicketStatus,
} from "../../../types/maintenanceTicket.types";

const DUE_SOON_HOURS = 72;

export function canMoveTicket(
  ticket: IMaintenanceTicket,
  from: TicketStatus,
  to: TicketStatus
) {
  if (from === to) return false;
  if (ticket.status === "done") return false;

  const t = ticket.scheduled_at ? new Date(ticket.scheduled_at).getTime() : NaN;
  const now = Date.now();
  const diff = t - now;

  if (to === "in_progress") {
    if (Number.isNaN(t)) return false;
    const hours = diff / 3600000;
    return hours <= DUE_SOON_HOURS;
  }
  if (to === "done") {
    if (Number.isNaN(t)) return false;
    return now >= t;
  }
  if (to === "open") {
    return from === "in_progress";
  }
  if (to === "canceled") {
    return from === "open";
  }
  return false;
}
