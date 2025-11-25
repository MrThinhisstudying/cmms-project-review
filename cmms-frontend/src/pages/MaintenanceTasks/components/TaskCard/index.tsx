import React from "react";
import { Card, CardContent, Typography, Stack, Button, Chip, Tooltip } from "@mui/material";
import { IMaintenanceTicket } from "../../../../types/maintenanceTicket.types";
import { fmt } from "../../../../utils/maintenanceDue";

type Props = {
  item: IMaintenanceTicket;
  onStart: () => void;
  onCancel: () => void;
  onReopen: () => void;
  onComplete: () => void;
};

const STATUS_COLOR: Record<string, "default" | "warning" | "info" | "success" | "error"> = {
  open: "warning",
  in_progress: "info",
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
    <Card sx={{ mb: 1, userSelect: "none" }}>
      <CardContent sx={{ p: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography variant="subtitle2" noWrap>
            {item.device?.name || item.maintenance?.device?.name || "—"}
          </Typography>
          <Chip size="small" color={STATUS_COLOR[status] || "default"} label={
            status === "open" ? "Chờ xử lý" :
            status === "in_progress" ? "Đang thực hiện" :
            status === "done" ? "Hoàn thành" : "Đã hủy"
          } />
        </Stack>

        <Typography variant="caption" color="text.secondary" noWrap>
          Chu kỳ: {item.maintenance?.level ?? "—"} • Lịch: {fmt(item.scheduled_at || undefined)}
        </Typography>

        <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
          {status === "open" && (
            <>
              <Button size="small" variant="contained" onClick={onStart}>
                Bắt đầu
              </Button>
              <Button size="small" color="inherit" variant="outlined" onClick={onCancel}>
                Hủy
              </Button>
            </>
          )}

          {status === "in_progress" && (
            <>
              <Button size="small" variant="contained" onClick={onComplete}>
                Hoàn tất
              </Button>
              <Button size="small" color="inherit" variant="outlined" onClick={onCancel}>
                Hủy
              </Button>
            </>
          )}

          {status === "canceled" && (
            <Button size="small" color="primary" variant="outlined" onClick={onReopen}>
              Mở lại
            </Button>
          )}

          {status === "done" && (
            <Tooltip title={item.review || ""}>
              <Button size="small" color="primary" variant="outlined" onClick={onReopen}>
                Mở lại
              </Button>
            </Tooltip>
          )}
        </Stack>

        <Stack direction="row" spacing={2} mt={1}>
          <Typography variant="caption" color="text.secondary">
            BĐ: {fmt(item.started_at || undefined)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            KT: {fmt(item.completed_at || undefined)}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
