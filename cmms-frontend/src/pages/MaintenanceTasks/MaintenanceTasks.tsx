import React from "react";
import { Box, Typography } from "@mui/material";
import TasksBoard from "./components/TasksBoard";

export default function MaintenanceTasksPage() {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Nhiệm vụ bảo dưỡng
      </Typography>
      <TasksBoard />
    </Box>
  );
}
