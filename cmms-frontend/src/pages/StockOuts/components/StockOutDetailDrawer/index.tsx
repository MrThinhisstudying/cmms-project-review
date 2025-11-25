import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  Divider,
  Chip,
  Button,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import InventoryIcon from "@mui/icons-material/Inventory";
import BuildIcon from "@mui/icons-material/Build";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { IStockOut } from "../../../../types/inventory.types";

export default function StockOutDetailDrawer({
  open,
  onClose,
  stockOutId,
  onActionSuccess,
}: {
  open: boolean;
  onClose: () => void;
  stockOutId?: number;
  onActionSuccess?: () => void;
}) {
  const { getStockOut, approveStockOut, cancelStockOut } =
    useInventoryContext();
  const [detail, setDetail] = useState<IStockOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && stockOutId) fetchDetail(stockOutId);
  }, [open, stockOutId]);

  const fetchDetail = async (id: number) => {
    setLoading(true);
    try {
      const so = await getStockOut(id);
      setDetail(so ?? null);
    } catch (err: any) {
      setError(err?.message ?? "Không thể tải chi tiết");
    } finally {
      setLoading(false);
    }
  };

  const renderStatusChip = (status?: string) => {
    const s = String(status ?? "").toLowerCase();
    if (s === "approved")
      return <Chip label="Đã duyệt" color="success" size="small" />;
    if (s === "pending")
      return <Chip label="Đang chờ duyệt" color="warning" size="small" />;
    if (s === "canceled")
      return <Chip label="Đã huỷ" color="error" size="small" />;
    return <Chip label="Không xác định" size="small" />;
  };

  const handleApprove = async () => {
    if (!stockOutId) return;
    setBusy(true);
    try {
      await approveStockOut(stockOutId);
      onActionSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Không thể duyệt yêu cầu");
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!stockOutId) return;
    setBusy(true);
    try {
      await cancelStockOut(stockOutId);
      onActionSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Không thể huỷ yêu cầu");
    } finally {
      setBusy(false);
    }
  };

  const isRepairRelated = !!detail?.repair;

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 650, p: 3 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h5" fontWeight={600}>
            Chi tiết yêu cầu xuất kho
          </Typography>
          {detail && renderStatusChip(detail.status)}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            py={8}
          >
            <CircularProgress />
          </Box>
        ) : detail ? (
          <>
            {isRepairRelated && (
              <Alert severity="info" icon={<BuildIcon />} sx={{ mb: 3 }}>
                Yêu cầu này thuộc phiếu sửa chữa{" "}
                <strong>#{detail.repair?.repair_id}</strong> và sẽ được tự động
                duyệt khi Admin phê duyệt kiểm nghiệm.
              </Alert>
            )}

            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography
                  variant="h6"
                  fontWeight={600}
                  mb={2}
                  color="primary"
                >
                  Thông tin chung
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" color="text.secondary">
                        Mã yêu cầu:
                      </Typography>
                      <Chip label={`#${detail.id}`} size="small" />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <PersonIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Người yêu cầu:
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={500} pl={4}>
                      {typeof detail.requested_by === "object"
                        ? detail.requested_by?.name ??
                          detail.requested_by?.email
                        : "Chưa xác định"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <PersonIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Người duyệt:
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={500} pl={4}>
                      {typeof detail.approved_by === "object"
                        ? detail.approved_by?.name ?? detail.approved_by?.email
                        : "Chưa duyệt"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <CalendarTodayIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Ngày tạo:
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={500} pl={4}>
                      {new Date(detail.created_at ?? Date.now()).toLocaleString(
                        "vi-VN"
                      )}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography
                  variant="h6"
                  fontWeight={600}
                  mb={2}
                  color="primary"
                >
                  <InventoryIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                  Thông tin vật tư
                </Typography>
                {detail.item ? (
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "grey.50",
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "grey.200",
                    }}
                  >
                    <Typography variant="body1" fontWeight={600} mb={1}>
                      {detail.item.name}
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Danh mục:
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {detail.item.category?.name ?? "Chưa phân loại"}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Số lượng xuất:
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={500}
                          color="primary"
                        >
                          {detail.quantity} {detail.item.quantity_unit ?? ""}
                        </Typography>
                      </Grid>
                      {detail.purpose && (
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            Mục đích:
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>
                            {detail.purpose}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                ) : (
                  <Typography color="text.secondary">
                    Không có vật tư trong phiếu
                  </Typography>
                )}
              </CardContent>
            </Card>

            {detail.note && (
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    mb={1}
                    color="primary"
                  >
                    Ghi chú
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      p: 2,
                      bgcolor: "grey.50",
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "grey.200",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {detail.note}
                  </Typography>
                </CardContent>
              </Card>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box display="flex" gap={2} justifyContent="flex-end" mt={4}>
              <Button variant="outlined" onClick={onClose} size="large">
                Đóng
              </Button>
              {detail.status === "PENDING" && !isRepairRelated && (
                <>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleCancel}
                    disabled={busy}
                    size="large"
                  >
                    Huỷ yêu cầu
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleApprove}
                    disabled={busy}
                    size="large"
                  >
                    Duyệt yêu cầu
                  </Button>
                </>
              )}
            </Box>
          </>
        ) : (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            py={8}
          >
            <Typography color="text.secondary">
              Không có dữ liệu hiển thị
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
