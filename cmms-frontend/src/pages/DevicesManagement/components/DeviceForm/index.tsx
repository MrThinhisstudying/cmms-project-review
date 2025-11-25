import React, { useEffect, useState } from "react";
import { Box, Dialog, TextField, Divider, Grid, MenuItem } from "@mui/material";
import { CustomButton } from "../../../../components/Button";
import {
  DeviceStatus,
  IDevice,
} from "../../../../types/devicesManagement.types";
import TopBar from "../../../../layout/MainLayout/TopBar";

type DeviceFormProps = {
  open: boolean;
  initialData?: IDevice | null;
  onClose: () => void;
  onSubmit: (data: Partial<IDevice>) => Promise<void> | void;
  loading?: boolean;
};

const REQUIRED_FIELDS: (keyof IDevice)[] = [
  "name",
  "serial_number",
  "country_of_origin",
  "manufacture_year",
  "status",
];
const YEAR_REQUIRED_KEYS = ["manufacture_year", "usage_start_year"] as const;

const EMPTY: Record<string, string> = {
  name: "",
  brand: "",
  serial_number: "",
  country_of_origin: "",
  manufacture_year: "",
  status: "",
  note: "",
  usage_purpose: "",
  operating_scope: "",
  usage_start_year: "",
  technical_code_address: "",
  location_coordinates: "",
  daily_operation_time: "",
  relocation_origin: "",
  relocation_year: "",
  fixed_asset_code: "",
  using_department: "",
  width: "",
  height: "",
  weight: "",
  power_source: "",
  power_consumption: "",
  other_specifications: "",
};

const DeviceForm: React.FC<DeviceFormProps> = ({
  open,
  initialData,
  onClose,
  onSubmit,
  loading,
}) => {
  const [form, setForm] = useState<Record<string, string>>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEdit = Boolean(initialData?.device_id);

  useEffect(() => {
    if (!initialData) {
      setForm({ ...EMPTY });
      setErrors({});
      return;
    }
    const mapped: Record<string, string> = { ...EMPTY };
    Object.entries(initialData).forEach(([k, v]) => {
      if (v == null) return;
      mapped[k] = v instanceof Date ? v.toISOString() : String(v);
    });
    setForm(mapped);
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
      setForm((prev) => ({ ...prev, [key]: value }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
    };

  const validate = () => {
    const next: Record<string, string> = {};
    REQUIRED_FIELDS.forEach((f) => {
      if (!(form[f] ?? "").trim()) next[f] = "Trường này là bắt buộc";
    });
    YEAR_REQUIRED_KEYS.forEach((k) => {
      const val = (form[k] ?? "").trim();
      if (val && !/^\d{4}$/.test(val))
        next[k] = "Vui lòng nhập năm 4 chữ số (vd: 2025)";
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const toNumber = (v?: string) =>
    v && v.trim() !== "" && !isNaN(Number(v)) ? Number(v) : undefined;

  const makePayload = (): Partial<IDevice> => ({
    name: form.name?.trim(),
    brand: form.brand?.trim(),
    serial_number: form.serial_number?.trim(),
    country_of_origin: form.country_of_origin?.trim(),
    manufacture_year: toNumber(form.manufacture_year),
    status: form.status as DeviceStatus,
    note: form.note?.trim(),
    usage_purpose: form.usage_purpose?.trim(),
    operating_scope: form.operating_scope?.trim(),
    usage_start_year: toNumber(form.usage_start_year),
    technical_code_address: form.technical_code_address?.trim(),
    location_coordinates: form.location_coordinates?.trim(),
    daily_operation_time: form.daily_operation_time?.trim(),
    relocation_origin: form.relocation_origin?.trim(),
    relocation_year: toNumber(form.relocation_year),
    fixed_asset_code: form.fixed_asset_code?.trim(),
    using_department: form.using_department?.trim(),
    width: form.width?.trim(),
    height: form.height?.trim(),
    weight: form.weight?.trim(),
    power_source: form.power_source?.trim(),
    power_consumption: form.power_consumption?.trim(),
    other_specifications: form.other_specifications?.trim(),
  });

  const handleSave = async () => {
    if (!validate()) return;
    await onSubmit(makePayload());
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
      <Box sx={{ flex: 1, overflowY: "auto", p: 2, mt: "70px" }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Tên phương tiện *"
              value={form.name}
              onChange={handleChange("name")}
              error={Boolean(errors.name)}
              helperText={errors.name}
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Nhãn hiệu thiết bị *"
              value={form.brand}
              onChange={handleChange("brand")}
              error={Boolean(errors.brand)}
              helperText={errors.brand}
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Số máy (Serial Number) *"
              value={form.serial_number}
              onChange={handleChange("serial_number")}
              error={Boolean(errors.serial_number)}
              helperText={errors.serial_number}
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              label="Tình trạng *"
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, status: e.target.value }))
              }
              error={Boolean(errors.status)}
              helperText={errors.status}
              fullWidth
              disabled={loading}
            >
              <MenuItem value="moi">Mới</MenuItem>
              <MenuItem value="dang_su_dung">Đang sử dụng</MenuItem>
              <MenuItem value="thanh_ly">Thanh lý</MenuItem>
              <MenuItem value="huy_bo">Huỷ bỏ</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Nước sản xuất *"
              value={form.country_of_origin}
              onChange={handleChange("country_of_origin")}
              error={Boolean(errors.country_of_origin)}
              helperText={errors.country_of_origin}
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Mục đích sử dụng thiết bị *"
              value={form.usage_purpose}
              onChange={handleChange("usage_purpose")}
              error={Boolean(errors.usage_purpose)}
              helperText={errors.usage_purpose}
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Năm sản xuất *"
              value={form.manufacture_year}
              onChange={handleChange("manufacture_year")}
              error={Boolean(errors.manufacture_year)}
              helperText={errors.manufacture_year}
              fullWidth
              inputProps={{ inputMode: "numeric", pattern: "\\d{4}" }}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Năm bắt đầu sử dụng"
              value={form.usage_start_year}
              onChange={handleChange("usage_start_year")}
              fullWidth
              inputProps={{ inputMode: "numeric", pattern: "\\d{4}" }}
              disabled={loading}
              error={Boolean(errors.usage_start_year)}
              helperText={errors.usage_start_year}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Mã số, địa chỉ kỹ thuật *"
              value={form.technical_code_address}
              onChange={handleChange("technical_code_address")}
              error={Boolean(errors.technical_code_address)}
              helperText={errors.technical_code_address}
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Mã số tài sản cố định (TSCĐ)"
              value={form.fixed_asset_code}
              onChange={handleChange("fixed_asset_code")}
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Đơn vị sử dụng thiết bị"
              value={form.using_department}
              onChange={handleChange("using_department")}
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Phạm vi hoạt động"
              value={form.operating_scope}
              onChange={handleChange("operating_scope")}
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Địa điểm, tọa độ thiết bị"
              value={form.location_coordinates}
              onChange={handleChange("location_coordinates")}
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Thời gian hoạt động hàng ngày"
              value={form.daily_operation_time}
              onChange={handleChange("daily_operation_time")}
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Xuất xứ khi di dời thiết bị"
              value={form.relocation_origin}
              onChange={handleChange("relocation_origin")}
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Năm di dời thiết bị"
              value={form.relocation_year}
              onChange={handleChange("relocation_year")}
              fullWidth
              inputProps={{ inputMode: "numeric", pattern: "\\d{4}" }}
              disabled={loading}
              error={Boolean(errors.relocation_year)}
              helperText={errors.relocation_year}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Kích thước - Rộng"
              value={form.width}
              onChange={handleChange("width")}
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Kích thước - Cao"
              value={form.height}
              onChange={handleChange("height")}
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Khối lượng thiết bị"
              value={form.weight}
              onChange={handleChange("weight")}
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Nguồn điện cung cấp"
              value={form.power_source}
              onChange={handleChange("power_source")}
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Công suất tiêu thụ"
              value={form.power_consumption}
              onChange={handleChange("power_consumption")}
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Ghi chú"
              value={form.note}
              onChange={handleChange("note")}
              fullWidth
              multiline
              minRows={3}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Các đặc điểm kỹ thuật khác"
              value={form.other_specifications}
              onChange={handleChange("other_specifications")}
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
};

export default DeviceForm;
