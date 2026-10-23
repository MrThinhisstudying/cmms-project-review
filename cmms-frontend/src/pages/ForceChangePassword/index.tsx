import React, { useRef, useState } from "react";
import { useForm, Controller, Resolver } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { SaveOutlined } from "@ant-design/icons";
import { Input as AntdInput, Card } from "antd";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import { changePasswordFirstLogin } from "../../apis/users";
import { setToken, getToken } from "../../utils/auth";
import Toast from "../../components/Toast";
import { CustomButton } from "../../components/Button";

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
      const res = await changePasswordFirstLogin(data, token);
      if (res && res.accessToken) {
        showToast({
          content: "Đổi mật khẩu thành công",
          type: "success",
        });

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
    return (
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontWeight: 500, color: "#344054", marginBottom: 6 }}>
              {label} <span style={{ color: "#d32f2f" }}>*</span>
            </label>
            <AntdInput.Password
              size="large"
              placeholder={placeholder}
              value={field.value ?? ""}
              onChange={field.onChange}
              status={error ? "error" : ""}
              style={{ borderRadius: 8 }}
            />
            {error && (
              <span style={{ color: "#B42318", fontSize: 12, marginTop: 4, display: "block" }}>
                {error}
              </span>
            )}
          </div>
        )}
      />
    );
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        padding: "32px 16px",
      }}
    >
      <Card
        style={{
          width: 500,
          maxWidth: "100%",
          borderRadius: 12,
          boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
          padding: 24,
        }}
      >
        <h2 style={{ textAlign: "center", fontWeight: 700, color: "#115eaf", marginBottom: 16 }}>
          Đổi mật khẩu
        </h2>

        <p
          style={{
            textAlign: "center",
            color: "#d32f2f",
            fontWeight: 500,
            marginBottom: 24,
            lineHeight: 1.6,
            fontSize: 14,
          }}
        >
          Bạn cần thay đổi mật khẩu mặc định sau lần đăng nhập đầu tiên để đảm bảo an toàn cho tài khoản!
        </p>

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

          <CustomButton
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={<SaveOutlined />}
            fullWidth
            bgrColor="#115eaf"
            style={{ marginTop: 16, height: 44 }}
          >
            Lưu
          </CustomButton>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: 24,
            cursor: "pointer",
            color: "#667085",
            fontSize: 13,
          }}
          onClick={logoutUser}
        >
          Quay lại đăng nhập
        </p>
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

export default ForceChangePassword;
