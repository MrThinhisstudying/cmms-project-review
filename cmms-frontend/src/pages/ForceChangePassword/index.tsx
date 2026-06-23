import React, { useRef, useState } from "react";
import { useForm, Controller, Resolver } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Button,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Save as SaveIcon,
} from "@mui/icons-material";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import { changePasswordFirstLogin } from "../../apis/users";
import { setToken, getToken } from "../../utils/auth";
import Toast from "../../components/Toast";

interface IChangePasswordForm {
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}

export type ToastContent = {
  type: "error" | "success" | "info";
  content: string;
  duration?: number;
};

const ForceChangePassword = () => {
  const { updateUser, logoutUser } = useAuthContext();
  const token = getToken();
  const [openToast, setOpenToast] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const toast = useRef<ToastContent>({
    type: "success",
    content: "",
  });

  const showToast = (content: ToastContent) => {
    toast.current = content;
    setOpenToast(true);
  };

  const schema = yup.object().shape({
    currentPassword: yup
      .string()
      .required("Xin vui lòng nhập mật khẩu hiện tại"),
    newPassword: yup
      .string()
      .required("Xin vui lòng nhập mật khẩu mới")
      .min(6, "Mật khẩu mới phải có ít nhất 6 ký tự")
      .notOneOf(
        [yup.ref("currentPassword"), "Vcs@123456", "12345678"],
        "Mật khẩu mới không được trùng với mật khẩu hiện tại hoặc mật khẩu mặc định"
      ),
    confirmNewPassword: yup
      .string()
      .required("Xin vui lòng nhập lại mật khẩu mới")
      .oneOf([yup.ref("newPassword")], "Mật khẩu nhập lại không trùng khớp"),
  });

  const resolver = yupResolver(schema) as unknown as Resolver<IChangePasswordForm>;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<IChangePasswordForm>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
    resolver,
  });

  const onSubmit = async (data: IChangePasswordForm) => {
    setLoading(true);
    try {
      // API call to change password
      const res = await changePasswordFirstLogin(data, token);
      if (res && res.accessToken) {
        showToast({
          content: "Đổi mật khẩu thành công",
          type: "success",
        });
        
        // Save new token and update user session
        setToken(res.accessToken, false);
        updateUser(res.accessToken);
      } else {
        showToast({
          content: "Đổi mật khẩu không thành công. Vui lòng thử lại.",
          type: "error",
        });
      }
    } catch (error: any) {
      showToast({
        content: error.message || "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại thông tin.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const PasswordField = ({
    name,
    label,
    placeholder,
    error,
  }: {
    name: keyof IChangePasswordForm;
    label: string;
    placeholder: string;
    error?: string;
  }) => {
    const [showPassword, setShowPassword] = useState(false);
    return (
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, color: "#344054", mb: "6px" }}
            >
              {label} <span style={{ color: "#d32f2f" }}>*</span>
            </Typography>
            <TextField
              fullWidth
              type={showPassword ? "text" : "password"}
              placeholder={placeholder}
              value={field.value ?? ""}
              onChange={field.onChange}
              error={!!error}
              helperText={error}
              margin="none"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: "8px",
                  bgcolor: "#fff",
                  "& input": {
                    padding: "10px 14px",
                  },
                },
              }}
            />
          </Box>
        )}
      />
    );
  };

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: "#f8f9fa",
        px: 2,
        py: 4,
      }}
    >
      <Box
        sx={{
          bgcolor: "#fff",
          p: 4,
          borderRadius: 2,
          boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
          width: 500,
          maxWidth: "100%",
        }}
      >
        <Typography
          variant="h5"
          align="center"
          sx={{
            fontWeight: 700,
            color: "#115eaf",
            mb: 2,
          }}
        >
          Đổi mật khẩu
        </Typography>

        <Typography
          variant="body2"
          align="center"
          sx={{
            color: "#d32f2f",
            fontWeight: 500,
            mb: 4,
            px: 1,
            lineHeight: 1.6,
          }}
        >
          Bạn cần thay đổi mật khẩu mặc định sau lần đăng nhập đầu tiên để đảm bảo an toàn cho tài khoản!
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)}>
          <PasswordField
            name="currentPassword"
            label="Mật khẩu hiện tại"
            placeholder="........"
            error={errors.currentPassword?.message}
          />
          <PasswordField
            name="newPassword"
            label="Mật khẩu mới"
            placeholder="Acv@2022$"
            error={errors.newPassword?.message}
          />
          <PasswordField
            name="confirmNewPassword"
            label="Nhập lại mật khẩu mới"
            placeholder="Acv@2022$"
            error={errors.confirmNewPassword?.message}
          />

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={<SaveIcon />}
            sx={{
              mt: 1,
              py: "10px",
              borderRadius: "8px",
              fontWeight: 600,
              backgroundColor: "#115eaf",
              textTransform: "none",
              fontSize: "15px",
              width: "100%",
              boxShadow: "none",
              "&:hover": {
                backgroundColor: "#0d4b8c",
                boxShadow: "none",
              },
            }}
          >
            Lưu
          </Button>
        </form>

        <Typography
          variant="body2"
          align="center"
          sx={{
            mt: 3,
            cursor: "pointer",
            color: "#667085",
            fontSize: "13px",
            "&:hover": { color: "#115eaf", textDecoration: "underline" },
          }}
          onClick={logoutUser}
        >
          Quay lại đăng nhập
        </Typography>
      </Box>

      <Toast
        content={toast.current.content}
        variant={toast.current.type}
        open={openToast}
        onClose={() => setOpenToast(false)}
      />
    </Box>
  );
};

export default ForceChangePassword;
