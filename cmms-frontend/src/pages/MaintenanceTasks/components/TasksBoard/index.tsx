import React, { useMemo, useState } from "react";
import { Spin, notification } from "antd";
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

  const [api, contextHolder] = notification.useNotification();
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

  const showNotification = (type: "success" | "error", msg: string) => {
    const titleText = type === "success" ? "Thành công" : "Lỗi";
    api[type]({
      title: titleText,
      message: titleText,
      description: msg,
      duration: 2.5,
    });
  };

  const _moveStatus = async (ticket: IMaintenanceTicket, to: TicketStatus) => {
    try {
      await moveStatus(ticket, to);
      showNotification("success", "Cập nhật trạng thái thành công");
    } catch (e: any) {
      showNotification("error", e?.message || "Thao tác thất bại");
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
      showNotification("success", "Đã hoàn tất phiếu");
    } catch (e: any) {
      showNotification("error", e?.message || "Hoàn tất thất bại");
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      {contextHolder}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
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
      </div>

      <CompleteDialog
        open={completeOpen}
        onClose={() => {
          setCompleteOpen(false);
          setActiveTicket(null);
        }}
        onSubmit={_handleComplete}
      />
    </>
  );
}
