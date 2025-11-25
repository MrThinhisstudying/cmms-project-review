import React, { useEffect, useState } from "react";
import {
  Dialog,
  Box,
  Typography,
  Divider,
  Avatar,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
} from "@mui/material";
import { CustomButton } from "../../../../components/Button";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { useAuthContext } from "../../../../context/AuthContext/AuthContext";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import TimelineIcon from "@mui/icons-material/Timeline";
import OutboxIcon from "@mui/icons-material/Outbox";

export default function ItemDetailModal({ open, onClose, item }: any) {
  const { getItemTransactions, getStockOutsByItemId } = useInventoryContext();
  const { user } = useAuthContext();

  const [tab, setTab] = useState(0);
  const [txs, setTxs] = useState<any[]>([]);
  const [stockOuts, setStockOuts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && (user?.role === "admin" || user?.role === "manager")) {
      (async () => {
        setLoading(true);
        try {
          const [txData, soData] = await Promise.all([
            getItemTransactions(item.item_id),
            getStockOutsByItemId(item.item_id),
          ]);
          setTxs(txData.filter((tx: any) => tx.delta > 0));
          setStockOuts(soData || []);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [open, item, user, getItemTransactions, getStockOutsByItemId]);

  const statusChip = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "approved")
      return <Chip label="Đã duyệt" size="small" color="success" />;
    if (s === "pending")
      return (
        <Chip
          label="Đang chờ duyệt"
          size="small"
          sx={{ backgroundColor: "#ffeb3b", color: "#000" }}
        />
      );
    if (s === "canceled" || s === "cancelled")
      return <Chip label="Đã huỷ" size="small" color="error" />;
    return <Chip label="Không xác định" size="small" />;
  };

  const renderList = (data: any[], type: "in" | "out") => {
    if (loading)
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      );

    if (data.length === 0)
      return (
        <Typography color="text.secondary" sx={{ py: 1 }}>
          {type === "in"
            ? "Chưa có lịch sử nhập hàng."
            : "Chưa có lịch sử xuất kho."}
        </Typography>
      );

    return (
      <Box
        sx={{
          maxHeight: 360,
          overflowY: "auto",
          pr: 1,
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-thumb": {
            background: "#c1c1c1",
            borderRadius: 8,
          },
          "&::-webkit-scrollbar-thumb:hover": { background: "#999" },
        }}
      >
        {data.map((record, i) => (
          <Box
            key={i}
            sx={{
              border: "1px solid #E0E3EB",
              borderRadius: 2,
              p: 2,
              mb: 1.5,
              backgroundColor: "#fafbfc",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box sx={{ flex: 1 }}>
              {type === "in" ? (
                <>
                  <Typography fontWeight={600} color="green">
                    +{record.delta} {item?.quantity_unit ?? ""}
                  </Typography>
                  <Typography fontSize={13} color="text.secondary">
                    {record.purpose ?? "Nhập hàng"}
                  </Typography>
                  <Typography fontSize={13} sx={{ mt: 0.5 }}>
                    Người nhập:{" "}
                    <b>
                      {record.user?.name ??
                        record.user?.email ??
                        "Không rõ người nhập"}
                    </b>
                  </Typography>
                </>
              ) : (
                <>
                  <Typography fontWeight={600} color="red">
                    -{record.quantity ?? 0} {item?.quantity_unit ?? ""}
                  </Typography>
                  <Typography fontSize={13} color="text.secondary">
                    {record.note ?? record.purpose ?? "Yêu cầu xuất kho"}
                  </Typography>

                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    {statusChip(record.status)}
                  </Box>

                  <Typography fontSize={13} sx={{ mt: 0.5 }}>
                    Người yêu cầu:{" "}
                    <b>
                      {record.requested_by?.name ??
                        record.requested_by?.email ??
                        "Không rõ"}
                    </b>
                  </Typography>

                  {record.status?.toLowerCase() === "approved" && (
                    <Typography fontSize={13}>
                      Người duyệt:{" "}
                      <b>
                        {record.approved_by?.name ??
                          record.approved_by?.email ??
                          "Không rõ"}
                      </b>
                    </Typography>
                  )}

                  {record.status?.toLowerCase() === "canceled" && (
                    <Typography fontSize={13}>
                      Người huỷ:{" "}
                      <b>
                        {record.approved_by?.name ??
                          record.approved_by?.email ??
                          "Không rõ"}
                      </b>
                    </Typography>
                  )}
                </>
              )}
            </Box>

            <Box sx={{ textAlign: "right" }}>
              <Typography fontSize={13}>
                {new Date(
                  record.occurred_at ?? record.created_at ?? new Date()
                ).toLocaleString("vi-VN")}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Box sx={{ display: "flex", flexDirection: "column", height: "80vh" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            p: 3,
            borderBottom: "1px solid #E0E3EB",
            background: "#fafafa",
          }}
        >
          <Avatar
            variant="rounded"
            src={item?.image ?? ""}
            sx={{
              width: 64,
              height: 64,
              bgcolor: "#f0f0f0",
              mr: 2,
            }}
          >
            {!item?.image && (
              <Inventory2OutlinedIcon sx={{ color: "#999", fontSize: 32 }} />
            )}
          </Avatar>
          <Box>
            <Typography fontSize={20} fontWeight={600}>
              {item?.name ?? "—"}
            </Typography>
            <Typography color="text.secondary" fontSize={14}>
              Danh mục: {item?.category?.name ?? "—"}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, overflowY: "auto", p: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Thông tin chi tiết
          </Typography>
          <Box sx={{ ml: 1 }}>
            <Typography>
              <b>Mô tả:</b> {item?.info || "—"}
            </Typography>
            <Typography>
              <b>Số lượng tồn:</b> {item?.quantity ?? 0}{" "}
              {item?.quantity_unit ?? ""}
            </Typography>
            <Typography>
              <b>Trạng thái:</b> {item?.enabled ? "Hoạt động" : "Ngừng sử dụng"}
            </Typography>
            <Typography>
              <b>Ngày cập nhật:</b>{" "}
              {item?.updated_at
                ? new Date(item.updated_at).toLocaleString("vi-VN")
                : "—"}
            </Typography>
          </Box>

          {(user?.role === "admin" || user?.role === "manager") && (
            <>
              <Divider sx={{ my: 3 }} />
              <Tabs
                value={tab}
                onChange={(e, v) => setTab(v)}
                sx={{
                  borderBottom: "1px solid #E0E3EB",
                  "& .MuiTab-root": { textTransform: "none" },
                }}
              >
                <Tab
                  icon={<TimelineIcon sx={{ fontSize: 20, mr: 1 }} />}
                  iconPosition="start"
                  label="Lịch sử nhập kho"
                />
                <Tab
                  icon={<OutboxIcon sx={{ fontSize: 20, mr: 1 }} />}
                  iconPosition="start"
                  label="Lịch sử xuất kho"
                />
              </Tabs>

              <Box sx={{ mt: 2 }}>
                {tab === 0
                  ? renderList(txs, "in")
                  : renderList(stockOuts, "out")}
              </Box>
            </>
          )}
        </Box>

        <Box
          sx={{
            borderTop: "1px solid #E0E3EB",
            p: 2,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <CustomButton
            variant="contained"
            onClick={onClose}
            sx={{ height: "40px", px: 4 }}
          >
            Đóng
          </CustomButton>
        </Box>
      </Box>
    </Dialog>
  );
}
