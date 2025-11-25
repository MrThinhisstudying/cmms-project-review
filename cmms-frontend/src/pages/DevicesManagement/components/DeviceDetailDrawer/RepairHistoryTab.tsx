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
  Tooltip,
  Stack,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import CancelIcon from "@mui/icons-material/Cancel";
import { IRepair } from "../../../../types/repairs.types";
import { fmt } from "../../../../utils/maintenanceDue";

interface Props {
  loading: boolean;
  repairs: IRepair[];
}

const STATUS_MAP: Record<
  string,
  {
    label: string;
    color: "default" | "warning" | "info" | "success" | "error";
  }
> = {
  pending: { label: "Yêu cầu – Chờ duyệt", color: "warning" },
  manager_approved: { label: "Yêu cầu – Trưởng phòng duyệt", color: "info" },
  admin_approved: { label: "Yêu cầu – Ban Giám đốc duyệt", color: "success" },
  rejected: { label: "Yêu cầu – Bị từ chối", color: "error" },

  inspection_pending: {
    label: "Kiểm nghiệm – Đang thực hiện",
    color: "warning",
  },
  inspection_manager_approved: {
    label: "Kiểm nghiệm – Trưởng phòng duyệt",
    color: "info",
  },
  inspection_admin_approved: {
    label: "Kiểm nghiệm – Ban Giám đốc duyệt",
    color: "success",
  },
  inspection_rejected: { label: "Kiểm nghiệm – Bị từ chối", color: "error" },

  acceptance_pending: {
    label: "Nghiệm thu – Đang thực hiện",
    color: "warning",
  },
  acceptance_manager_approved: {
    label: "Nghiệm thu – Trưởng phòng duyệt",
    color: "info",
  },
  acceptance_admin_approved: {
    label: "Nghiệm thu – Ban Giám đốc duyệt",
    color: "success",
  },
  acceptance_rejected: { label: "Nghiệm thu – Bị từ chối", color: "error" },
};

const getOverallStatus = (r: IRepair) => {
  if (r.status_acceptance && r.status_acceptance !== "acceptance_pending")
    return r.status_acceptance;
  if (r.status_inspection && r.status_inspection !== "inspection_pending")
    return r.status_inspection;
  return r.status_request;
};

const getPhaseIcon = (status: string) => {
  if (status?.includes("approved"))
    return <CheckCircleIcon fontSize="small" color="success" />;
  if (status?.includes("rejected"))
    return <CancelIcon fontSize="small" color="error" />;
  return <PendingIcon fontSize="small" color="warning" />;
};

export default function RepairHistoryTab({ loading, repairs }: Props) {
  const renderRepairRow = (r: IRepair, index: number) => {
    const currentStatus = getOverallStatus(r);
    const status = STATUS_MAP[currentStatus] || {
      label: "Không xác định",
      color: "default" as const,
    };

    const isRejected =
      r.status_request === "rejected" ||
      r.status_inspection === "inspection_rejected" ||
      r.status_acceptance === "acceptance_rejected";

    return (
      <TableRow key={r.repair_id || index} hover>
        <TableCell>{index + 1}</TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={500}>
            {fmt(r.created_at)}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{r.created_by?.name || "—"}</Typography>
          <Typography variant="caption" color="text.secondary">
            {r.created_department?.name || ""}
          </Typography>
        </TableCell>

        <TableCell>
          <Chip
            size="small"
            label={status.label}
            color={status.color}
            sx={{ fontWeight: "bold" }}
          />
          {isRejected && (
            <Typography
              variant="caption"
              sx={{ display: "block", mt: 0.5, color: "error.main" }}
            >
              Đã bị từ chối
            </Typography>
          )}
        </TableCell>

        <TableCell>
          <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
            {getPhaseIcon(r.status_request)}
            <Typography variant="caption" fontWeight={500}>
              {STATUS_MAP[r.status_request]?.label || r.status_request}
            </Typography>
          </Stack>
          <Box sx={{ pl: 2.5 }}>
            {r.approved_by_manager_request && (
              <Typography variant="caption" color="text.secondary">
                Mgr: {r.approved_by_manager_request.name}
              </Typography>
            )}
            {r.approved_by_admin_request && (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Admin: {r.approved_by_admin_request.name}
              </Typography>
            )}
          </Box>
        </TableCell>

        <TableCell>
          <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
            {getPhaseIcon(r.status_inspection)}
            <Typography variant="caption" fontWeight={500}>
              {STATUS_MAP[r.status_inspection]?.label || r.status_inspection}
            </Typography>
          </Stack>
          <Box sx={{ pl: 2.5 }}>
            {r.approved_by_manager_inspection && (
              <Typography variant="caption" color="text.secondary">
                Mgr: {r.approved_by_manager_inspection.name}
              </Typography>
            )}
            {r.approved_by_admin_inspection && (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Admin: {r.approved_by_admin_inspection.name}
              </Typography>
            )}
            {r.inspection_committee && r.inspection_committee.length > 0 && (
              <Tooltip
                title={r.inspection_committee.map((u) => u.name).join(", ")}
              >
                <Chip
                  label={`Ban KN: ${r.inspection_committee.length} người`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: "0.65rem", mt: 0.5 }}
                />
              </Tooltip>
            )}
            {r.inspection_duration_minutes !== undefined && r.inspection_duration_minutes !== null && (
              <Typography variant="caption" color="primary" display="block" sx={{ mt: 0.5, fontWeight: 600 }}>
                Thời gian: {Math.floor(r.inspection_duration_minutes / 60)}h {r.inspection_duration_minutes % 60}m
              </Typography>
            )}
          </Box>
        </TableCell>

        <TableCell>
          <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
            {getPhaseIcon(r.status_acceptance)}
            <Typography variant="caption" fontWeight={500}>
              {STATUS_MAP[r.status_acceptance]?.label || r.status_acceptance}
            </Typography>
          </Stack>
          <Box sx={{ pl: 2.5 }}>
            {r.approved_by_manager_acceptance && (
              <Typography variant="caption" color="text.secondary">
                Mgr: {r.approved_by_manager_acceptance.name}
              </Typography>
            )}
            {r.approved_by_admin_acceptance && (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Admin: {r.approved_by_admin_acceptance.name}
              </Typography>
            )}
            {r.acceptance_committee && r.acceptance_committee.length > 0 && (
              <Tooltip
                title={r.acceptance_committee.map((u) => u.name).join(", ")}
              >
                <Chip
                  label={`Ban NT: ${r.acceptance_committee.length} người`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: "0.65rem", mt: 0.5 }}
                />
              </Tooltip>
            )}
            {r.acceptance_duration_minutes !== undefined && r.acceptance_duration_minutes !== null && (
              <Typography variant="caption" color="success.main" display="block" sx={{ mt: 0.5, fontWeight: 600 }}>
                Thời gian: {Math.floor(r.acceptance_duration_minutes / 60)}h {r.acceptance_duration_minutes % 60}m
              </Typography>
            )}
          </Box>
        </TableCell>

        <TableCell>
          {r.inspection_materials && r.inspection_materials.length > 0 && (
            <Chip
              label={`${r.inspection_materials.length} vật tư`}
              size="small"
              color="info"
              sx={{ fontSize: "0.7rem", mb: 0.5 }}
            />
          )}
          <Typography variant="caption" color="text.secondary" display="block">
            {fmt(r.updated_at)}
          </Typography>
        </TableCell>
      </TableRow>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={2} sx={{ overflowX: "auto" }}>
      {repairs.length > 0 && (
        <Typography variant="body2" color="text.secondary" mb={2}>
          Tổng số: <strong>{repairs.length}</strong> phiếu sửa chữa
        </Typography>
      )}
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>
              Ngày lập
            </TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>
              Người lập
            </TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 140 }}>
              Trạng thái
            </TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 180 }}>
              Yêu cầu
            </TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 180 }}>
              Kiểm nghiệm
            </TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 180 }}>
              Nghiệm thu
            </TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>
              Vật tư & Cập nhật
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {repairs.length > 0 ? (
            repairs.map(renderRepairRow)
          ) : (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">
                  Không có lịch sử sửa chữa
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  );
}
