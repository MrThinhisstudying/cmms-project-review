import React, { useEffect, useMemo, useState } from "react";
import { Box, Dialog, TextField, Divider, Grid, MenuItem } from "@mui/material";
import TopBar from "../../../../layout/MainLayout/TopBar";
import { CustomButton } from "../../../../components/Button";
import { useDevicesContext } from "../../../../context/DevicesContext/DevicesContext";
import { IRepair, RepairUpsertPayload } from "../../../../types/repairs.types";

const EMPTY: RepairUpsertPayload = {
  device_id: 0,
  location_issue: "",
  recommendation: "",
  note: "",
};

export default function RepairForm({
  open,
  initialData,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  initialData?: IRepair | null;
  onClose: () => void;
  onSubmit: (data: RepairUpsertPayload) => Promise<void> | void;
  loading?: boolean;
}) {
  const [form, setForm] = useState<RepairUpsertPayload>({ ...EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEdit = Boolean(initialData?.repair_id);
  const { devices } = useDevicesContext();

  const availableDevices = useMemo(
    () =>
      devices.filter(
        (d: any) =>
          (d.status || "").toLowerCase() === "moi" ||
          (d.status || "").toLowerCase() === "dang_su_dung"
      ),
    [devices]
  );

  useEffect(() => {
    if (!initialData) {
      setForm({ ...EMPTY });
      setErrors({});
      return;
    }
    setForm({
      device_id: initialData.device?.device_id || 0,
      location_issue: initialData.location_issue || "",
      recommendation: initialData.recommendation || "",
      note: initialData.note || "",
    });
    setErrors({});
  }, [initialData]);

  useEffect(() => {
    if (!open) return;
    if (!initialData) setForm({ ...EMPTY });
    setErrors({});
  }, [open, initialData]);

  const handleChange =
    (key: keyof RepairUpsertPayload) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm((prev) => ({
        ...prev,
        [key]: key === "device_id" ? Number(value) : value,
      }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
    };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.device_id) next.device_id = "Vui lòng chọn thiết bị";
    if (!form.location_issue?.trim())
      next.location_issue = "Vui lòng mô tả vị trí hoặc hiện tượng hư hỏng";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    await onSubmit(form);
  };

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { display: "flex", flexDirection: "column", height: "100dvh" },
      }}
    >
      <TopBar />
      <Box sx={{ flex: 1, overflowY: "auto", p: 3, mt: "70px", pt: "24px" }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              select
              label="Thiết bị *"
              value={form.device_id || ""}
              onChange={handleChange("device_id")}
              error={Boolean(errors.device_id)}
              helperText={errors.device_id}
              fullWidth
              disabled={loading || isEdit}
            >
              <MenuItem value="">-- Chọn thiết bị --</MenuItem>
              {availableDevices.map((d: any) => (
                <MenuItem key={d.device_id} value={d.device_id}>
                  {d.name} ({d.brand})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Vị trí / Hiện tượng hư hỏng *"
              value={form.location_issue}
              onChange={handleChange("location_issue")}
              error={Boolean(errors.location_issue)}
              helperText={errors.location_issue}
              fullWidth
              multiline
              minRows={2}
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Đề xuất khắc phục / hướng xử lý"
              value={form.recommendation}
              onChange={handleChange("recommendation")}
              fullWidth
              multiline
              minRows={2}
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Ghi chú thêm (nếu có)"
              value={form.note}
              onChange={handleChange("note")}
              fullWidth
              multiline
              minRows={2}
              disabled={loading}
            />
          </Grid>
        </Grid>
      </Box>

      <Divider />
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
          borderTop: "1px solid #ddd",
          backgroundColor: "#fafafa",
        }}
      >
        <CustomButton
          onClick={onClose}
          color="secondary"
          variant="outlined"
          padding="6px 14px"
          disabled={loading}
        >
          Hủy
        </CustomButton>
        <CustomButton
          color="primary"
          variant="contained"
          padding="6px 14px"
          onClick={handleSave}
          disabled={loading}
        >
          {isEdit ? "Lưu thay đổi" : "Tạo phiếu mới"}
        </CustomButton>
      </Box>
    </Dialog>
  );
}
