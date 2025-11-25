import React, { useMemo, useState } from "react";
import {
  Box,
  IconButton,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Typography,
  Tooltip,
  Chip,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import CheckIcon from "@mui/icons-material/Check";
import CancelIcon from "@mui/icons-material/Cancel";
import ConfirmModal from "../../../../components/Modal";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { IStockOut } from "../../../../types/inventory.types";
import {
  CustomTable,
  TableCellHeader,
  TableRowContainer,
  TableRowBody,
} from "./style";

interface Props {
  data: IStockOut[];
  loading: boolean;
  rowsPerPage: number;
  page: number;
  onDetail: (so: IStockOut) => void;
  onError?: (msg: string) => void;
  onSuccess?: (msg: string) => void;
}

const statusChip = (status?: string) => {
  const s = String(status ?? "").toLowerCase();
  if (s === "approved")
    return <Chip label="Đã duyệt" color="success" size="small" />;
  if (s === "pending")
    return <Chip label="Đang chờ duyệt" color="warning" size="small" />;
  if (s === "canceled")
    return <Chip label="Đã huỷ" color="error" size="small" />;
  return <Chip label="Không xác định" size="small" />;
};

export default function StockOutsTable({
  data = [],
  loading,
  rowsPerPage,
  page,
  onDetail,
  onError,
  onSuccess,
}: Props) {
  const { approveStockOut, cancelStockOut } = useInventoryContext();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "approve" | "cancel" | null
  >(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const paginated = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return (data || []).slice(start, start + rowsPerPage);
  }, [data, page, rowsPerPage]);

  const openConfirm = (id: number, action: "approve" | "cancel") => {
    setSelectedId(id);
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const doConfirm = async () => {
    if (!selectedId || !confirmAction) return;
    setBusy(true);
    try {
      if (confirmAction === "approve") {
        await approveStockOut(selectedId);
        onSuccess?.("Duyệt yêu cầu thành công");
      } else {
        await cancelStockOut(selectedId);
        onSuccess?.("Huỷ yêu cầu thành công");
      }
    } catch (err: any) {
      onError?.(err?.message ?? "Thao tác thất bại");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
      setConfirmAction(null);
      setSelectedId(null);
    }
  };

  if (loading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );

  if (!data || data.length === 0)
    return (
      <Box
        p={6}
        textAlign="center"
        color="text.secondary"
        display="flex"
        flexDirection="column"
        alignItems="center"
      >
        <Typography variant="h6">Chưa có yêu cầu xuất kho</Typography>
        <Typography variant="body2" mt={1}>
          Nhấn “Làm mới” để tải lại danh sách hoặc tạo yêu cầu mới.
        </Typography>
      </Box>
    );

  return (
    <>
      <CustomTable stickyHeader>
        <TableHead>
          <TableRowContainer>
            <TableCellHeader>#</TableCellHeader>
            <TableCellHeader>Vật tư</TableCellHeader>
            <TableCellHeader>Danh mục</TableCellHeader>
            <TableCellHeader>Người yêu cầu</TableCellHeader>
            <TableCellHeader>Người duyệt</TableCellHeader>
            <TableCellHeader>Trạng thái</TableCellHeader>
            <TableCellHeader>Số lượng</TableCellHeader>
            <TableCellHeader>Ngày tạo</TableCellHeader>
            <TableCellHeader>Hành động</TableCellHeader>
          </TableRowContainer>
        </TableHead>
        <TableBody>
          {paginated.map((row, idx) => {
            const isPending = row.status === "PENDING";
            const isRepairRelated = !!row.repair;
            return (
              <TableRowBody key={row.id} index={idx}>
                <TableCell>{(page - 1) * rowsPerPage + idx + 1}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {row.item?.name ?? "-"}
                    {isRepairRelated && (
                      <Chip
                        label="Sửa chữa"
                        size="small"
                        color="info"
                        sx={{ fontSize: "0.7rem" }}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>{row.item?.category?.name ?? "-"}</TableCell>
                <TableCell>
                  {typeof row.requested_by === "object"
                    ? row.requested_by?.name ?? row.requested_by?.email
                    : "-"}
                </TableCell>
                <TableCell>
                  {typeof row.approved_by === "object"
                    ? row.approved_by?.name ?? row.approved_by?.email
                    : "-"}
                </TableCell>
                <TableCell>{statusChip(row.status)}</TableCell>
                <TableCell>
                  {row.quantity} {row.item?.quantity_unit ?? ""}
                </TableCell>
                <TableCell>
                  {new Date(row.created_at ?? Date.now()).toLocaleString(
                    "vi-VN"
                  )}
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1} alignItems="center">
                    <Tooltip title="Xem chi tiết">
                      <IconButton
                        size="small"
                        onClick={() => onDetail(row)}
                        disabled={busy}
                      >
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                    {isPending && !isRepairRelated && (
                      <>
                        <Tooltip title="Duyệt yêu cầu">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openConfirm(row.id, "approve")}
                            disabled={busy}
                          >
                            <CheckIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Huỷ yêu cầu">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => openConfirm(row.id, "cancel")}
                            disabled={busy}
                          >
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    {isPending && isRepairRelated && (
                      <Chip
                        label="Tự động duyệt"
                        size="small"
                        color="default"
                        sx={{ fontSize: "0.7rem" }}
                      />
                    )}
                  </Box>
                </TableCell>
              </TableRowBody>
            );
          })}
        </TableBody>
      </CustomTable>

      <ConfirmModal
        open={confirmOpen}
        title={
          confirmAction === "approve"
            ? "Xác nhận duyệt"
            : "Xác nhận huỷ yêu cầu"
        }
        content={
          confirmAction === "approve"
            ? "Bạn có chắc muốn duyệt yêu cầu này?"
            : "Bạn có chắc muốn huỷ yêu cầu này?"
        }
        onClose={() => {
          setConfirmOpen(false);
          setConfirmAction(null);
          setSelectedId(null);
        }}
        onConfirm={doConfirm}
      />
    </>
  );
}
