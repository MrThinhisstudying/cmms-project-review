import React, { useMemo, useState } from "react";
import { Box, CircularProgress, Snackbar, Alert } from "@mui/material";
import {
  IMaintenanceTicket,
  TicketStatus,
} from "../../../../types/maintenanceTicket.types";
import { useMaintenanceTasksContext } from "../../../../context/MaintenanceTasksContext/MaintenanceTasksContext";
import TasksColumn from "../TasksColumn";
import CompleteDialog from "../CompleteDialog";

const COLS: { key: TicketStatus; title: string }[] = [
  { key: "open", title: "Chờ xử lý" },
  { key: "in_progress", title: "Đang thực hiện" },
  { key: "done", title: "Hoàn thành" },
  { key: "canceled", title: "Đã hủy" },
];

export default function TasksBoard() {
  const { tickets, loading, moveStatus, completeTicket } =
    useMaintenanceTasksContext();
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const [completeOpen, setCompleteOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<IMaintenanceTicket | null>(
    null
  );

  const lanes = useMemo(() => {
    const next: Record<TicketStatus, IMaintenanceTicket[]> = {
      open: [],
      in_progress: [],
      done: [],
      canceled: [],
    };
    tickets.forEach((t) => next[t.status].push(t));
    return next;
  }, [tickets]);

  const _moveStatus = async (ticket: IMaintenanceTicket, to: TicketStatus) => {
    try {
      await moveStatus(ticket, to);
      setToast({ type: "success", msg: "Cập nhật trạng thái thành công" });
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || "Thao tác thất bại" });
    }
  };

  const openComplete = (ticket: IMaintenanceTicket) => {
    setActiveTicket(ticket);
    setCompleteOpen(true);
  };

  const _handleComplete = async (review: string) => {
    if (!activeTicket) return;
    try {
      await completeTicket(activeTicket, review);
      setCompleteOpen(false);
      setActiveTicket(null);
      setToast({ type: "success", msg: "Đã hoàn tất phiếu" });
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || "Hoàn tất thất bại" });
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 2,
          alignItems: "start",
        }}
      >
        {COLS.map((c) => (
          <TasksColumn
            key={c.key}
            columnId={c.key}
            title={c.title}
            items={lanes[c.key]}
            onStart={(t) => _moveStatus(t, "in_progress")}
            onCancel={(t) => _moveStatus(t, "canceled")}
            onReopen={(t) => _moveStatus(t, "open")}
            onComplete={(t) => openComplete(t)}
          />
        ))}
      </Box>

      <CompleteDialog
        open={completeOpen}
        onClose={() => {
          setCompleteOpen(false);
          setActiveTicket(null);
        }}
        onSubmit={_handleComplete}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
      >
        <Alert severity={toast?.type || "success"}>{toast?.msg}</Alert>
      </Snackbar>
    </>
  );
}
