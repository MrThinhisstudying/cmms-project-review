import React from "react";
import { Card, Tag, Button, Tooltip, Space } from "antd";
import { IMaintenanceTicket } from "../../../../types/maintenanceTicket.types";
import { fmt } from "../../../../utils/maintenanceDue";

type Props = {
  item: IMaintenanceTicket;
  onStart: () => void;
  onCancel: () => void;
  onReopen: () => void;
  onComplete: () => void;
};

const TAG_COLOR: Record<string, string> = {
  open: "warning",
  in_progress: "processing",
  done: "success",
  canceled: "default",
};

export default function TaskCard({
  item,
  onStart,
  onCancel,
  onReopen,
  onComplete,
}: Props) {
  const { status } = item;

  return (
    <Card size="small" style={{ borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.device?.name || item.maintenance?.device?.name || "—"}
        </span>
        <Tag color={TAG_COLOR[status] || "default"}>
          {status === "open" ? "Chờ xử lý" :
           status === "in_progress" ? "Đang thực hiện" :
           status === "done" ? "Hoàn thành" : "Đã hủy"}
        </Tag>
      </div>

      <div style={{ fontSize: 12, color: "#667085", marginBottom: 12 }}>
        Chu kỳ: {item.maintenance?.level ?? "—"} • Lịch: {fmt(item.scheduled_at || undefined)}
      </div>

      <Space size={8} wrap style={{ marginBottom: 8 }}>
        {status === "open" && (
          <>
            <Button size="small" type="primary" onClick={onStart}>
              Bắt đầu
            </Button>
            <Button size="small" onClick={onCancel}>
              Hủy
            </Button>
          </>
        )}

        {status === "in_progress" && (
          <>
            <Button size="small" type="primary" onClick={onComplete}>
              Hoàn tất
            </Button>
            <Button size="small" onClick={onCancel}>
              Hủy
            </Button>
          </>
        )}

        {status === "canceled" && (
          <Button size="small" onClick={onReopen}>
            Mở lại
          </Button>
        )}

        {status === "done" && (
          <Tooltip title={item.review || ""}>
            <Button size="small" onClick={onReopen}>
              Mở lại
            </Button>
          </Tooltip>
        )}
      </Space>

      <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#98A2B3" }}>
        <span>BĐ: {fmt(item.started_at || undefined)}</span>
        <span>KT: {fmt(item.completed_at || undefined)}</span>
      </div>
    </Card>
  );
}
