import React, { createContext, useContext, useEffect, useState } from "react";
import { getToken } from "../../utils/auth";
import { useAuthContext } from "../AuthContext/AuthContext";
import {
  IMaintenanceTicket,
  TicketStatus,
} from "../../types/maintenanceTicket.types";
import {
  listMaintenanceTickets,
  updateMaintenanceTicketStatus,
  completeMaintenanceTicket,
} from "../../apis/maintenanceTickets";

interface MaintenanceTasksContextValue {
  tickets: IMaintenanceTicket[];
  loading: boolean;
  loadTickets: () => Promise<void>;
  moveStatus: (ticket: IMaintenanceTicket, to: TicketStatus) => Promise<void>;
  completeTicket: (ticket: IMaintenanceTicket, review: string) => Promise<void>;
}

const MaintenanceTasksContext = createContext<
  MaintenanceTasksContextValue | undefined
>(undefined);

export const MaintenanceTasksProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [tickets, setTickets] = useState<IMaintenanceTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthContext();

  const loadTickets = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) throw new Error("Unauthorized");
      let data: IMaintenanceTicket[] = [];
      if (user?.role === "admin" || user?.role === "manager") {
        data = await listMaintenanceTickets(token, {
          userId: user.id,
          deptId: user.department?.dept_id,
        });
      } else {
        data = await listMaintenanceTickets(token);
      }
      setTickets(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [user?.id, user?.department?.dept_id]);

  const moveStatus = async (ticket: IMaintenanceTicket, to: TicketStatus) => {
    const token = getToken();
    if (!token) throw new Error("Unauthorized");
    await updateMaintenanceTicketStatus(ticket.ticket_id, to, token);
    setTickets((prev) =>
      prev.map((t) =>
        t.ticket_id === ticket.ticket_id ? { ...t, status: to } : t
      )
    );
  };

  const completeTicket = async (ticket: IMaintenanceTicket, review: string) => {
    const token = getToken();
    if (!token) throw new Error("Unauthorized");
    await completeMaintenanceTicket(ticket.ticket_id, { review }, token);
    await loadTickets();
  };

  return (
    <MaintenanceTasksContext.Provider
      value={{ tickets, loading, loadTickets, moveStatus, completeTicket }}
    >
      {children}
    </MaintenanceTasksContext.Provider>
  );
};

export const useMaintenanceTasksContext = () => {
  const ctx = useContext(MaintenanceTasksContext);
  if (!ctx)
    throw new Error(
      "useMaintenanceTasksContext must be used within MaintenanceTasksProvider"
    );
  return ctx;
};
