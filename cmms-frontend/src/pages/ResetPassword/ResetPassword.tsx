import React, { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { resetPassword } from "../../apis/users";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
} from "@mui/material";
import Toast from "../../components/Toast";

export type ToastContent = {
  type: "error" | "success" | "info";
  content: string;
  duration?: number;
};

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const { register, handleSubmit } = useForm<{ newPassword: string }>();

  const [openToast, setOpenToast] = useState(false);
  const toast = useRef<ToastContent>({
    type: "success",
    content: "",
  });

  const showToast = (content: ToastContent) => {
    toast.current = content;
    setOpenToast(true);
  };

  const onSubmit = async ({ newPassword }: { newPassword: string }) => {
    try {
      const res = await resetPassword(token!, newPassword);
      showToast({
        type: "success",
        content: res?.message || "Đổi mật khẩu thành công",
      });
      setTimeout(() => {
        navigate("/dang_nhap");
      }, 1000);
    } catch (error: any) {
      showToast({
        type: "error",
        content: error.response?.data?.message || "Có lỗi xảy ra",
      });
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={4} sx={{ p: 4, mt: 8, borderRadius: 3 }}>
        <Typography
          variant="h5"
          align="center"
          gutterBottom
          sx={{ fontWeight: "bold", mb: 3 }}
        >
          Đặt lại mật khẩu
        </Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <TextField
            type="password"
            label="Mật khẩu mới"
            fullWidth
            margin="normal"
            {...register("newPassword", { required: true })}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 3,
              py: 1.5,
              fontSize: "1rem",
              fontWeight: "bold",
              backgroundColor: "#6512c2",
              "&:hover": { backgroundColor: "#4b0d91" },
            }}
          >
            Đặt lại
          </Button>
        </Box>
      </Paper>

      <Toast
        content={toast.current.content}
        variant={toast.current.type}
        open={openToast}
        onClose={() => setOpenToast(false)}
      />
    </Container>
  );
};

export default ResetPasswordPage;
