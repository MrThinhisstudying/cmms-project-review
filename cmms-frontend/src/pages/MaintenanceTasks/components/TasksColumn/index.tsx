import React from "react";
import { Box, Stack, Typography } from "@mui/material";
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
    <Box sx={{ minWidth: 280 }}>
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
        {title}
      </Typography>
      <Stack
        sx={{
          minHeight: 240,
          p: 1,
          borderRadius: 1,
          bgcolor: "#fafafa",
          border: "1px solid #eee",
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
      </Stack>
    </Box>
  );
}
