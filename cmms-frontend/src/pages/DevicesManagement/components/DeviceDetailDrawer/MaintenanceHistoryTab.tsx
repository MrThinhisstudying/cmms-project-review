import React from "react";
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  CircularProgress,
  Typography,
} from "@mui/material";
import { IMaintenance } from "../../../../types/maintenance.types";
import { fmt } from "../../../../utils/maintenanceDue";

interface Props {
  loading: boolean;
  maintenances: IMaintenance[];
}

export default function MaintenanceHistoryTab({
  loading,
  maintenances,
}: Props) {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={2}>
      {maintenances.length > 0 && (
        <Typography variant="body2" color="text.secondary" mb={2}>
          Tổng số: <strong>{maintenances.length}</strong> lịch bảo trì
        </Typography>
      )}
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Ngày dự kiến</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Chu kỳ</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Người/Phòng ban</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {maintenances.length > 0 ? (
            maintenances.map((m, i) => (
              <TableRow key={m.maintenance_id || i} hover>
                <TableCell>{i + 1}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {fmt(m.scheduled_date as any)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={m.status} color="primary" />
                </TableCell>
                <TableCell>{m.level || "—"}</TableCell>
                <TableCell>
                  {m.user?.name || m.department?.name || "—"}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">
                  Không có lịch sử bảo trì
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  );
}
