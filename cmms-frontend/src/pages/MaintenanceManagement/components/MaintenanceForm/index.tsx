import React, { useEffect, useState } from "react";
import { Box, Dialog, TextField, Divider, Grid, MenuItem } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import {
  IMaintenance,
  MaintenanceUpsertPayload,
} from "../../../../types/maintenance.types";
import { useUsersContext } from "../../../../context/UsersContext/UsersContext";
import {
  EMPTY,
  LEVEL_OPTIONS,
  STATUS_OPTIONS,
  toUpsertPayload,
} from "../../../../constants/maintenance";
import { useDepartmentsContext } from "../../../../context/DepartmentsContext/DepartmentsContext";
import { useDevicesContext } from "../../../../context/DevicesContext/DevicesContext";
import TopBar from "../../../../layout/MainLayout/TopBar";
import { CustomButton } from "../../../../components/Button";

type Props = {
  open: boolean;
  initialData?: IMaintenance | null;
  onClose: () => void;
  onSubmit: (data: MaintenanceUpsertPayload) => Promise<void> | void;
  loading?: boolean;
};

const REQUIRED_FIELDS: (keyof IMaintenance)[] = [
  "device",
  "scheduled_date",
  "status",
  "level",
];

export default function MaintenanceForm({
  open,
  initialData,
  onClose,
  onSubmit,
  loading,
}: Props) {
  const [form, setForm] = useState<Record<string, string>>({ ...EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEdit = Boolean(initialData?.maintenance_id);
  const { users } = useUsersContext();
  const { departments } = useDepartmentsContext();
  const { devices } = useDevicesContext();

  useEffect(() => {
    if (!initialData) {
      setForm({ ...EMPTY });
      setErrors({});
      return;
    }
    setForm({
      device_id: initialData.device?.device_id
        ? String(initialData.device.device_id)
        : "",
      user_id: initialData.user?.user_id
        ? String(initialData.user.user_id)
        : "",
      dept_id: initialData.department?.dept_id
        ? String(initialData.department.dept_id)
        : "",
      scheduled_date: initialData.scheduled_date || "",
      expired_date: initialData.expired_date || "",
  status: initialData.status || "active",
      level: initialData.level || "3_month",
      description: initialData.description ?? "",
    });
    setErrors({});
  }, [initialData]);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (!initialData) setForm({ ...EMPTY });
  }, [open, initialData]);

  const handleChange =
    (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [key]: String(value) }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
    };

  const validate = () => {
    const next: Record<string, string> = {};
    REQUIRED_FIELDS.forEach((f) => {
      const key = f === "device" ? "device_id" : String(f);
      if (!(form[key] ?? "").trim()) next[key] = "Trường này là bắt buộc";
    });
    if (!form.user_id && !form.dept_id) {
      next["user_id"] = "Chọn Người thực hiện hoặc Phòng ban";
      next["dept_id"] = "Chọn Người thực hiện hoặc Phòng ban";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const payload = toUpsertPayload(form);
    await onSubmit(payload);
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
      <Box sx={{ flex: 1, overflowY: "auto", p: 2, mt: "70px", pt: "24px" }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              select
              label="Thiết bị *"
              value={form.device_id}
              onChange={handleChange("device_id")}
              error={Boolean(errors.device_id)}
              helperText={errors.device_id}
              fullWidth
              disabled={loading}
            >
              <MenuItem value="">-- Chọn thiết bị --</MenuItem>
              {devices.map((d) => (
                <MenuItem key={d.device_id} value={String(d.device_id)}>
                  {d.name} ({d.brand})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label="Ngày giờ dự kiến *"
                value={form.scheduled_date ? dayjs(form.scheduled_date) : null}
                onChange={(val: Dayjs | null) =>
                  setForm((prev) => ({
                    ...prev,
                    scheduled_date: val
                      ? val.format("YYYY-MM-DDTHH:mm:ss")
                      : "",
                  }))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    error={Boolean(errors.scheduled_date)}
                    helperText={errors.scheduled_date}
                    disabled={loading}
                  />
                )}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label="Ngày giờ hết hạn"
                value={form.expired_date ? dayjs(form.expired_date) : null}
                onChange={(val: Dayjs | null) =>
                  setForm((prev) => ({
                    ...prev,
                    expired_date: val ? val.format("YYYY-MM-DDTHH:mm:ss") : "",
                  }))
                }
                renderInput={(params) => (
                  <TextField {...params} fullWidth disabled={loading} />
                )}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              label="Người thực hiện (User)"
              value={form.user_id}
              onChange={handleChange("user_id")}
              error={Boolean(errors.user_id)}
              helperText={errors.user_id}
              fullWidth
              disabled={loading}
            >
              <MenuItem value="">-- Chọn người dùng --</MenuItem>
              {users.map((u) => (
                <MenuItem key={u.user_id} value={u.user_id}>
                  {u.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              label="Phòng ban"
              value={form.dept_id}
              onChange={handleChange("dept_id")}
              error={Boolean(errors.dept_id)}
              helperText={errors.dept_id}
              fullWidth
              disabled={loading}
            >
              <MenuItem value="">-- Chọn phòng ban --</MenuItem>
              {departments.map((d) => (
                <MenuItem key={d.dept_id} value={d.dept_id}>
                  {d.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              label="Cấp bảo dưỡng *"
              value={form.level}
              onChange={handleChange("level")}
              error={Boolean(errors.level)}
              helperText={errors.level}
              fullWidth
              disabled={loading}
            >
              {LEVEL_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              label="Trạng thái *"
              value={form.status}
              onChange={handleChange("status")}
              error={Boolean(errors.status)}
              helperText={errors.status}
              fullWidth
              disabled={loading}
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Mô tả"
              value={form.description}
              onChange={handleChange("description")}
              fullWidth
              multiline
              minRows={3}
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
          backgroundColor: "#fff",
        }}
      >
        <CustomButton
          onClick={onClose}
          color="secondary"
          variant="outlined"
          padding="4px 12px"
          disabled={loading}
        >
          Hủy
        </CustomButton>
        <CustomButton
          color="primary"
          variant="contained"
          padding="4px 12px"
          onClick={handleSave}
          disabled={loading}
        >
          {isEdit ? "Lưu thay đổi" : "Tạo mới"}
        </CustomButton>
      </Box>
    </Dialog>
  );
}
