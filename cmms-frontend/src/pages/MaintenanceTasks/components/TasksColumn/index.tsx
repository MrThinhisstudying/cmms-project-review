import React from "react";
import { IMaintenanceTicket } from "../../../../types/maintenanceTicket.types";
import TaskCard from "../TaskCard";

type Props = {
  columnId: string;
  title: string;
  items: IMaintenanceTicket[];
  onStart: (t: IMaintenanceTicket) => void;
  onCancel: (t: IMaintenanceTicket) => void;
  onReopen: (t: IMaintenanceTicket) => void;
  onComplete: (t: IMaintenanceTicket) => void;
};

export default function TasksColumn({
  title,
  items,
  onStart,
  onCancel,
  onReopen,
  onComplete,
}: Props) {
  return (
    <div style={{ minWidth: 280 }}>
      <h3 style={{ marginBottom: 8, fontWeight: 700, fontSize: 15 }}>
        {title} ({items.length})
      </h3>
      <div
        style={{
          minHeight: 240,
          padding: 8,
          borderRadius: 8,
          backgroundColor: "#fafafa",
          border: "1px solid #eee",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {items.map((item) => (
          <TaskCard
            key={item.ticket_id}
            item={item}
            onStart={() => onStart(item)}
            onCancel={() => onCancel(item)}
            onReopen={() => onReopen(item)}
            onComplete={() => onComplete(item)}
          />
        ))}
      </div>
    </div>
  );
}
