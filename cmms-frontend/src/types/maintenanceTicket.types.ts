import { IMaintenance } from "./maintenance.types";

export interface IMaintenanceTicket {
  ticket_id: number;
  maintenance: IMaintenance;
  device: { device_id: number; name: string; brand?: string | null };
  user?: { user_id: number; name: string } | null;
  department?: { dept_id: number; name: string } | null;
  status: TicketStatus;
  scheduled_at: string | null;
  due_at?: string | null;
  started_at: string | null;
  completed_at: string | null;
  review: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

export type TicketStatus = "open" | "in_progress" | "done" | "canceled";
