import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Divider,
} from "@mui/material";
import { useDevicesContext } from "../../context/DevicesContext/DevicesContext";
import { useInventoryContext } from "../../context/InventoryContext/InventoryContext";
import { CustomButton } from "../../components/Button";

const emptyDeviceReport = {
  total: 0,
  moi: 0,
  dang_su_dung: 0,
  thanh_ly: 0,
  huy_bo: 0,
};

const emptyInventoryReport = {
  total_items: 0,
  total_categories: 0,
  total_stockouts: 0,
  approved_stockouts: 0,
  pending_stockouts: 0,
  canceled_stockouts: 0,
};

const DEVICE_STATUS_CARDS = [
  { key: "moi", label: "Mới", color: "#4caf50" },
  { key: "dang_su_dung", label: "Đang sử dụng", color: "#2196f3" },
  { key: "thanh_ly", label: "Thanh lý", color: "#9e9e9e" },
  { key: "huy_bo", label: "Hủy bỏ", color: "#ff9800" },
];

const INVENTORY_STATUS_CARDS = [
  { key: "total_items", label: "Tổng số vật tư", color: "#1976d2" },
  { key: "total_categories", label: "Số loại vật tư", color: "#9c27b0" },
  { key: "total_stockouts", label: "Tổng yêu cầu xuất kho", color: "#43a047" },
  { key: "approved_stockouts", label: "Đã duyệt", color: "#2e7d32" },
  { key: "pending_stockouts", label: "Đang chờ duyệt", color: "#fbc02d" },
  { key: "canceled_stockouts", label: "Đã huỷ", color: "#d32f2f" },
];

const Reports: React.FC = () => {
  const {
    report: deviceReport,
    fetchReport: fetchDeviceReport,
    loading: loadingDevice,
  } = useDevicesContext();
  const {
    report: inventoryReport,
    fetchReport: fetchInventoryReport,
    loading: loadingInventory,
  } = useInventoryContext();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchDeviceReport();
    fetchInventoryReport();
  }, [fetchDeviceReport, fetchInventoryReport]);

  const handleFetch = () => {
    fetchDeviceReport(startDate, endDate);
    fetchInventoryReport(startDate, endDate);
  };

  const safeDevice = deviceReport || emptyDeviceReport;
  const safeInventory = inventoryReport || emptyInventoryReport;
  const isLoading = loadingDevice || loadingInventory;

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Báo cáo / Thống kê tổng hợp
      </Typography>

      <Box
        display="flex"
        gap={2}
        mb={3}
        alignItems="center"
        flexWrap="wrap"
        sx={{
          backgroundColor: "#fafafa",
          p: 2,
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <TextField
          type="date"
          label="Từ ngày"
          InputLabelProps={{ shrink: true }}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          size="small"
        />
        <TextField
          type="date"
          label="Đến ngày"
          InputLabelProps={{ shrink: true }}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          size="small"
        />
        <CustomButton
          variant="contained"
          onClick={handleFetch}
          disabled={isLoading}
          sx={{ height: "40px" }}
        >
          {isLoading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            "Xem báo cáo"
          )}
        </CustomButton>
      </Box>

      <Typography variant="h6" fontWeight={600} mt={2} mb={2}>
        Báo cáo thiết bị
      </Typography>

      {loadingDevice ? (
        <Box display="flex" justifyContent="center" py={5}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ backgroundColor: "#f5f5f5" }}>
              <CardContent>
                <Typography variant="h6">Tổng số thiết bị</Typography>
                <Typography variant="h3" fontWeight="bold" color="primary">
                  {safeDevice.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {DEVICE_STATUS_CARDS.map((st) => (
            <Grid item xs={12} sm={6} md={4} lg={2.4} key={st.key}>
              <Card
                sx={{
                  backgroundColor: "#fff",
                  borderLeft: `6px solid ${st.color}`,
                  transition: "0.2s",
                  "&:hover": { boxShadow: "0 2px 8px rgba(0,0,0,0.15)" },
                }}
              >
                <CardContent>
                  <Typography variant="subtitle1" sx={{ color: st.color }}>
                    {st.label}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {safeDevice[st.key as keyof typeof safeDevice]}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Divider sx={{ my: 4 }} />

      <Typography variant="h6" fontWeight={600} mt={2} mb={2}>
        Báo cáo vật tư
      </Typography>

      {loadingInventory ? (
        <Box display="flex" justifyContent="center" py={5}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {INVENTORY_STATUS_CARDS.map((st) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={st.key}>
              <Card
                sx={{
                  backgroundColor: "#fff",
                  borderLeft: `6px solid ${st.color}`,
                  transition: "0.2s",
                  "&:hover": { boxShadow: "0 2px 8px rgba(0,0,0,0.15)" },
                }}
              >
                <CardContent>
                  <Typography variant="subtitle1" sx={{ color: st.color }}>
                    {st.label}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {safeInventory[st.key as keyof typeof safeInventory]}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Reports;
