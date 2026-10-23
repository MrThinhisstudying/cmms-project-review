import React from "react";
import TasksBoard from "./components/TasksBoard";

export default function MaintenanceTasksPage() {
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>
        Nhiệm vụ bảo dưỡng
      </h2>
      <TasksBoard />
    </div>
  );
}
