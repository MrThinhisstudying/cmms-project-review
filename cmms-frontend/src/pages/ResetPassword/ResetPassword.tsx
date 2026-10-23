import React, { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { resetPassword } from "../../apis/users";
import { Card, Input as AntdInput } from "antd";
import { CustomButton } from "../../components/Button";
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
        navigate("/login");
      }, 1000);
    } catch (error: any) {
      showToast({
        type: "error",
        content: error.response?.data?.message || "Có lỗi xảy ra",
      });
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "64px auto", padding: "0 16px" }}>
      <Card style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: 24 }}>
        <h2 style={{ textAlign: "center", fontWeight: "bold", marginBottom: 24 }}>
          Đặt lại mật khẩu
        </h2>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Mật khẩu mới</label>
            <AntdInput.Password
              size="large"
              placeholder="Nhập mật khẩu mới"
              {...register("newPassword", { required: true })}
            />
          </div>

          <CustomButton
            type="submit"
            fullWidth
            variant="contained"
            bgrColor="#6512c2"
            style={{ height: 48, fontSize: 16, marginTop: 16 }}
          >
            Đặt lại
          </CustomButton>
        </form>
      </Card>

      <Toast
        content={toast.current.content}
        variant={toast.current.type}
        open={openToast}
        onClose={() => setOpenToast(false)}
      />
    </div>
  );
};

export default ResetPasswordPage;
