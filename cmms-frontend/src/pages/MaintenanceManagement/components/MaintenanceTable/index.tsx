import React, { useMemo, useState } from "react";
import {
  Chip,
  IconButton,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  Stack,
  Tooltip,
} from "@mui/material";
import {
  CustomTable,
  TableCellHeader,
  TableRowBody,
  TableRowContainer,
} from "./style";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { IMaintenance } from "../../../../types/maintenance.types";
import ConfirmModal from "../../../../components/Modal";

type Props = {
  rows: IMaintenance[];
  rowsPerPage: number;
  page: number;
  onEdit: (row: IMaintenance) => void;
  onDelete: (id: number) => void;
};

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  active: { color: "orange", label: "Hoạt động" },
  inactive: { color: "grey", label: "Lịch sử" },
  canceled: { color: "red", label: "Đã hủy" },
};

const LEVEL_MAP: Record<string, string> = {
  "3_month": "3 tháng",
  "6_month": "6 tháng",
  "9_month": "9 tháng",
};

function formatDateTimeLocal(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

type ChipColor = "default" | "error" | "warning" | "success";

function buildDueMeta(item: IMaintenance): { label: string; color: ChipColor } {
  const statusLabel = STATUS_MAP[item.status]?.label || "Không xác định";
  if (item.status === "inactive") return { label: "Lịch sử", color: "default" };
  if (item.status === "canceled") return { label: "Đã hủy", color: "default" };

  const iso = item.scheduled_date;
  if (!iso) return { label: "—", color: "default" };
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return { label: "—", color: "default" };

  if (item.status === "active")
    return { label: "Hoạt động", color: "success" };

  const now = Date.now();
  const diffMs = t - now;

  if (diffMs > 0) {
    const hours = diffMs / 3_600_000;
    if (hours <= 72)
      return { label: `Sắp đến — ${statusLabel}`, color: "success" };
    return { label: "—", color: "default" };
  }

  const daysLate = Math.floor(Math.abs(diffMs) / 86_400_000);
  if (daysLate > 5)
    return {
      label: `Quá hạn ${daysLate} ngày — ${statusLabel}`,
      color: "error",
    };
  if (daysLate >= 1)
    return { label: `Trễ ${daysLate} ngày — ${statusLabel}`, color: "warning" };
  return { label: `Hôm nay — ${statusLabel}`, color: "success" };
}

export default function MaintenanceTable({
  rows,
  rowsPerPage,
  page,
  onEdit,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | undefined>();

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return rows.slice(start, end);
  }, [rows, page, rowsPerPage]);

  const handleDeleteClick = (id?: number) => {
    if (!id) return;
    setSelectedId(id);
    setOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedId) onDelete(selectedId);
    setOpen(false);
    setSelectedId(undefined);
  };

  return (
    <>
      <CustomTable stickyHeader>
        <TableHead>
          <TableRowContainer>
            <TableCellHeader>#</TableCellHeader>
            <TableCellHeader>Thiết bị</TableCellHeader>
            <TableCellHeader>Ngày dự kiến</TableCellHeader>
            <TableCellHeader>Đến hạn</TableCellHeader>
            <TableCellHeader>Cấp bảo dưỡng</TableCellHeader>
            <TableCellHeader>Người/Phòng ban</TableCellHeader>
            <TableCellHeader>Trạng thái</TableCellHeader>
            <TableCellHeader>Mô tả</TableCellHeader>
            <TableCellHeader>Hành động</TableCellHeader>
            <TableCellHeader>Xoá</TableCellHeader>
          </TableRowContainer>
        </TableHead>
        <TableBody>
          {paginatedRows.map((item, index) => {
            const due = buildDueMeta(item);
            return (
              <TableRowBody key={item.maintenance_id || index} index={index}>
                <TableCell>{(page - 1) * rowsPerPage + index + 1}</TableCell>
                <TableCell>
                  {item.device?.name || `#${item.device?.device_id}`}
                </TableCell>
                <TableCell>
                  <Tooltip
                    title={formatDateTimeLocal(item.scheduled_date as any)}
                  >
                    <span>
                      {formatDateTimeLocal(item.scheduled_date as any)}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {due.label === "—" ? (
                    "—"
                  ) : (
                    <Chip size="small" color={due.color} label={due.label} />
                  )}
                </TableCell>
                <TableCell>{LEVEL_MAP[item.level] || item.level}</TableCell>
                <TableCell>
                  {item.user?.name || item.department?.name || "—"}
                </TableCell>
                <TableCell>
                  <Typography
                    width="10px"
                    height="10px"
                    borderRadius="50%"
                    display="inline-block"
                    marginRight="8px"
                    bgcolor={STATUS_MAP[item.status]?.color || "grey"}
                  />
                  {STATUS_MAP[item.status]?.label || "Không xác định"}
                </TableCell>
                <TableCell
                  sx={{
                    maxWidth: 250,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.description || "—"}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      color="primary"
                      onClick={() => onEdit(item)}
                      aria-label="edit"
                    >
                      <EditIcon />
                    </IconButton>
                  </Stack>
                </TableCell>
                <TableCell>
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteClick(item.maintenance_id)}
                    aria-label="delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRowBody>
            );
          })}
        </TableBody>
      </CustomTable>

      <ConfirmModal
        open={open}
        title="Xác nhận xóa"
        content="Bạn có chắc chắn muốn xóa kế hoạch bảo dưỡng này?"
        onClose={() => {
          setOpen(false);
          setSelectedId(undefined);
        }}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
