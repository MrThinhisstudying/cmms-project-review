import React, { useEffect, useState } from "react";
import { useForm, Resolver, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import {
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { IUpdatePassword, IUpdatePasswordForm } from "../../../../types/user.types";
import { CustomButton } from "../../../../components/Button";

const schema = Yup.object().shape({
  password: Yup.string()
    .required("Mật khẩu là bắt buộc")
    .min(6, "Ít nhất 6 ký tự"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Mật khẩu xác nhận không khớp")
    .required("Vui lòng xác nhận mật khẩu"),
});

const EditPasswordForm: React.FC<{
  open: boolean;
  onClose: () => void;
  onSave: (data: IUpdatePassword) => void;
}> = ({ open, onClose, onSave }) => {
  const resolver = yupResolver(
    schema
  ) as unknown as Resolver<IUpdatePasswordForm>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<IUpdatePasswordForm>({
    resolver,
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const toggleShowPassword = () => setShowPassword((prev) => !prev);
  const toggleShowConfirm = () => setShowConfirm((prev) => !prev);

  const handleFormSubmit: SubmitHandler<IUpdatePasswordForm> = (data) => {
    const { password } = data;
    onSave({ password });
    reset();
    onClose();
  };

  useEffect(() => {
    if (open) {
      reset({
        password: "",
        confirmPassword: "",
      });
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Đặt lại mật khẩu</DialogTitle>
      <DialogContent>
        <TextField
          {...register("password")}
          label="Mật khẩu mới"
          type={showPassword ? "text" : "password"}
          fullWidth
          margin="normal"
          error={!!errors.password}
          helperText={errors.password?.message}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={toggleShowPassword} edge="end">
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          {...register("confirmPassword")}
          label="Xác nhận mật khẩu"
          type={showConfirm ? "text" : "password"}
          fullWidth
          margin="normal"
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={toggleShowConfirm} edge="end">
                  {showConfirm ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </DialogContent>
      <DialogActions>
        <CustomButton
          onClick={onClose}
          variant="outlined"
          color="secondary"
          padding="4px 12px"
        >
          Hủy
        </CustomButton>
        <CustomButton
          onClick={handleSubmit(handleFormSubmit)}
          variant="contained"
          color="primary"
          padding="4px 12px"
        >
          Cập nhật
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
};

export default EditPasswordForm;
