import React, { useRef, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  Switch,
} from "@mui/material";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import OutboxIcon from "@mui/icons-material/Outbox";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { useAuthContext } from "../../../../context/AuthContext/AuthContext";
import CreateStockOutModal from "../CreateStockOutModal";
import ItemDetailModal from "../ItemDetailModal";
import ConfirmModal from "../../../../components/Modal";
import Toast from "../../../../components/Toast";

export default function ItemCard({ item, toggleDrawer, refreshAll }: any) {
  const { user } = useAuthContext();
  const { deleteItem, updateItem } = useInventoryContext();
  const [openRemove, setOpenRemove] = useState(false);
  const [openCreateSO, setOpenCreateSO] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const toast = useRef<{ type: "error" | "success"; content: string }>({
    type: "success",
    content: "",
  });
  const [openToast, setOpenToast] = useState(false);

  const handleDelete = async () => {
    setRemoving(true);
    try {
      await deleteItem(item.item_id);
      await refreshAll();
    } catch (err: any) {
      const message =
        "Không thể xóa vật tư: vật tư này đang được sử dụng trong phiếu xuất kho hoặc lịch sử xuất nhập.";
      toast.current = { content: message, type: "error" };
      setOpenToast(true);
    } finally {
      setRemoving(false);
    }
  };

  const handleToggleEnabled = async () => {
    try {
      setToggling(true);
      await updateItem(item.item_id, { enabled: !item.enabled });
      await refreshAll();
    } finally {
      setToggling(false);
    }
  };

  return (
    <Box
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        border: "1px solid #E0E3EB",
        backgroundColor: "#fff",
        transition: "0.25s",
        display: "flex",
        flexDirection: "column",
        "&:hover": { borderColor: "#C7C9D1", background: "#F8F9FA" },
      }}
    >
      <Box
        sx={{
          height: 160,
          backgroundColor: "#F4F5F7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <Inventory2OutlinedIcon sx={{ fontSize: 60, color: "grey.400" }} />
        )}
      </Box>

      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "start",
          }}
        >
          <Box sx={{ flex: 1, pr: 1 }}>
            <Typography
              fontSize={16}
              fontWeight={600}
              sx={{
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                wordBreak: "break-word",
              }}
            >
              {item.name}
            </Typography>

            <Typography
              fontSize={13}
              color="text.secondary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "break-word",
                mt: 0.5,
              }}
            >
              {item.info || "—"}
            </Typography>
          </Box>

          {(user?.role === "admin" || user?.role === "manager") && (
            <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
              <Tooltip title="Chỉnh sửa">
                <IconButton
                  size="small"
                  onClick={() => toggleDrawer(true, item)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Xoá vật tư">
                <IconButton
                  size="small"
                  disabled={removing}
                  onClick={() => setOpenRemove(true)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Typography variant="body2">
              SL: <strong>{item.quantity}</strong>
            </Typography>
            <Typography variant="body2">
              ĐVT: <strong>{item.quantity_unit ?? "-"}</strong>
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title="Xuất kho">
              <IconButton
                size="small"
                onClick={() => setOpenCreateSO(true)}
                sx={{ color: "text.secondary" }}
              >
                <OutboxIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {(user?.role === "admin" || user?.role === "manager") && (
              <>
                <Tooltip title="Chi tiết & lịch sử nhập hàng">
                  <IconButton
                    size="small"
                    onClick={() => setOpenDetail(true)}
                    sx={{ color: "text.secondary" }}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Bật / Tắt hoạt động">
                  <Switch
                    checked={!!item.enabled}
                    onChange={handleToggleEnabled}
                    size="small"
                    disabled={toggling}
                  />
                </Tooltip>
              </>
            )}
          </Box>
        </Box>
      </Box>

      {(user?.role === "admin" || user?.role === "manager") && (
        <ItemDetailModal
          open={openDetail}
          onClose={() => setOpenDetail(false)}
          item={item}
        />
      )}

      <CreateStockOutModal
        open={openCreateSO}
        onClose={() => setOpenCreateSO(false)}
        item={item}
        onSaved={refreshAll}
      />

      <ConfirmModal
        open={openRemove}
        title="Xóa vật tư"
        content="Bạn có chắc chắn muốn xóa vật tư này khỏi kho không? Hành động này không thể hoàn tác."
        onClose={() => setOpenRemove(false)}
        onConfirm={handleDelete}
      />

      <Toast
        content={toast.current.content}
        variant={toast.current.type}
        open={openToast}
        onClose={() => setOpenToast(false)}
      />
    </Box>
  );
}
