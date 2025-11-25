import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
} from "@mui/material";
import dayjs from "dayjs";
import { useAuditContext } from "../../../../context/AuditContext/AuditContext";
import { AuditLog } from "../../../../types/audit.types";
import Toast from "../../../../components/Toast";
import ConfirmModal from "../../../../components/Modal";

const ACTION_COLOR: Record<string, string> = {
  INSERT: "#4caf50",
  UPDATE: "#2196f3",
  DELETE: "#f44336",
  ROLLBACK: "#9e9e9e",
};

const ENTITY_LABELS: Record<string, string> = {
  User: "người dùng",
  Department: "phòng ban",
  Device: "thiết bị",
  Maintenance: "bảo dưỡng",
  Notification: "thông báo",
};

function getEntityDisplay(log: AuditLog): string {
  const entityLabel = ENTITY_LABELS[log.entity_name] || log.entity_name;
  const target =
    (log.after && (log.after.name || log.after.title)) ||
    (log.before && (log.before.name || log.before.title)) ||
    `#${log.entity_id}`;
  return `${entityLabel} ${target}`;
}

const AuditHistory: React.FC = () => {
  const { logs, fetchAll, rollbackTx, loading } = useAuditContext();
  const [rollingTxId, setRollingTxId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);

  const toast = useRef<{ type: "error" | "success"; content: string }>({
    type: "success",
    content: "",
  });
  const [openToast, setOpenToast] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleConfirmRollback = async () => {
    if (!selectedTxId) return;
    setRollingTxId(selectedTxId);
    const ok = await rollbackTx(selectedTxId, "admin rollback dữ liệu");
    if (ok) {
      toast.current = { type: "success", content: "Rollback thành công" };
      fetchAll();
    } else {
      toast.current = { type: "error", content: "Rollback thất bại" };
    }
    setOpenToast(true);
    setRollingTxId(null);
    setConfirmOpen(false);
    setSelectedTxId(null);
  };

  const renderDescription = (log: AuditLog) => {
    const entityDisplay = getEntityDisplay(log);
    switch (log.action) {
      case "INSERT":
        return `Đã thêm mới ${entityDisplay}`;
      case "UPDATE":
        return `Đã cập nhật ${entityDisplay}`;
      case "DELETE":
        return `Đã xóa ${entityDisplay}`;
      case "ROLLBACK":
        return `Đã rollback thay đổi cho ${entityDisplay}`;
      default:
        return "";
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Toàn bộ lịch sử thay đổi
      </Typography>

      {loading && (
        <Box display="flex" justifyContent="center" py={5}>
          <CircularProgress />
        </Box>
      )}
      {!loading && logs.length === 0 && (
        <Typography>Không có thay đổi nào</Typography>
      )}

      <Grid container spacing={2}>
        {logs.map((log: AuditLog) => (
          <Grid item xs={12} key={log.id}>
            <Card>
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Chip
                      label={log.action}
                      sx={{
                        backgroundColor: ACTION_COLOR[log.action],
                        color: "#fff",
                        fontWeight: "bold",
                        mr: 2,
                      }}
                    />
                    <Typography variant="body2" display="inline">
                      Người dùng: {log.actor_user_id || "N/A"} –{" "}
                      {dayjs(log.created_at).format("DD/MM/YYYY HH:mm:ss")}
                    </Typography>
                    {log.reason && (
                      <Typography variant="body2" color="text.secondary">
                        Lý do: {log.reason}
                      </Typography>
                    )}
                  </Box>

                  {log.action !== "ROLLBACK" &&
                    !log.rolled_back &&
                    log.transaction?.id && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        disabled={rollingTxId === log.transaction.id}
                        onClick={() => {
                          setConfirmOpen(true);
                          setSelectedTxId(log.transaction!.id);
                        }}
                      >
                        {rollingTxId === log.transaction.id
                          ? "Đang rollback..."
                          : "Rollback TX"}
                      </Button>
                    )}
                  {log.rolled_back && (
                    <Chip
                      label="ĐÃ ROLLBACK"
                      sx={{ backgroundColor: "#9e9e9e", color: "#fff" }}
                    />
                  )}
                </Box>

                <Box mt={2}>
                  <Typography variant="body2">
                    {renderDescription(log)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Toast
        content={toast.current.content}
        variant={toast.current.type}
        open={openToast}
        onClose={() => setOpenToast(false)}
      />

      <ConfirmModal
        open={confirmOpen}
        title="Xác nhận rollback"
        content="Bạn có chắc chắn muốn rollback thay đổi này?"
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmRollback}
      />
    </Box>
  );
};

export default AuditHistory;
