import React, { useState } from "react";
import { Form, Input, Button, Checkbox, message, Tooltip } from "antd";
import { UserOutlined, LockOutlined, LoginOutlined, WarningOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import ACV_LOGO from "../../assets/images/acv-logo.png";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import { signIn } from "../../apis/signIn";
import { setToken } from "../../utils/auth";
import ForgotPasswordDialog from "./components/ForgotPasswordDialog";
import { LoginContainer, LoginCard, BrandHeader, LoginFooter } from "./styles";

interface ILoginFormValues {
  email: string;
  password: string;
  remember?: boolean;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuthContext();
  const [form] = Form.useForm<ILoginFormValues>();

  const [loading, setLoading] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [openForgotPasswordDialog, setOpenForgotPasswordDialog] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState && e.getModifierState("CapsLock")) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  const handleLogin = async (values: ILoginFormValues) => {
    setLoading(true);
    try {
      const emailOrUser = values.email?.trim();
      const password = values.password;

      const token = await signIn(emailOrUser, password);

      if (token) {
        message.success("Đăng nhập thành công!");
        setToken(token, values.remember || false);
        updateUser(token);
        navigate("/trang_chu");
      } else {
        message.error("Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản và mật khẩu!");
      }
    } catch (error: any) {
      message.error(error?.message || "Đăng nhập không thành công. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const handlePrefillCredentials = (username: string, defaultPass: string) => {
    form.setFieldsValue({
      email: username,
      password: defaultPass,
    });
    message.info("Đã điền tài khoản và mật khẩu mặc định (12345678). Hãy bấm Đăng nhập!");
  };

  return (
    <LoginContainer>
      {/* Spacer to push content gracefully */}
      <div style={{ height: 16 }} />

      <LoginCard>
        <BrandHeader>
          <img src={ACV_LOGO} className="logo" alt="ACV Logo" />
          <h1 className="system-title">Hệ Thống Quản Lý Kỹ Thuật (CMMS)</h1>
          <p className="airport-subtitle">Cảng Hàng Không Côn Đảo</p>
          <div className="divider" />
        </BrandHeader>

        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{ remember: true }}
          onFinish={handleLogin}
        >
          <Form.Item
            name="email"
            label={<span style={{ fontWeight: 600, color: "#334155" }}>Tài khoản / Email</span>}
            rules={[
              { required: true, message: "Vui lòng nhập tài khoản hoặc email đăng nhập" },
            ]}
            style={{ marginBottom: 18 }}
          >
            <Input
              size="large"
              prefix={<UserOutlined style={{ color: "#2563eb", marginRight: 4 }} />}
              placeholder="Nhập email hoặc tên tài khoản"
              allowClear
              style={{
                borderRadius: 8,
                fontSize: 14,
                padding: "8px 12px",
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <span style={{ fontWeight: 600, color: "#334155" }}>Mật khẩu</span>
                {capsLockActive && (
                  <Tooltip title="Phím Caps Lock đang bật">
                    <span style={{ fontSize: 12, color: "#ea580c", display: "inline-flex", alignItems: "center", gap: 3, fontWeight: 500 }}>
                      <WarningOutlined /> Caps Lock BẬT
                    </span>
                  </Tooltip>
                )}
              </div>
            }
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
            style={{ marginBottom: 14 }}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined style={{ color: "#2563eb", marginRight: 4 }} />}
              placeholder="Nhập mật khẩu của bạn"
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyDown}
              style={{
                borderRadius: 8,
                fontSize: 14,
                padding: "8px 12px",
              }}
            />
          </Form.Item>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 22,
            }}
          >
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox style={{ color: "#475467", fontSize: 13, fontWeight: 500 }}>
                Ghi nhớ đăng nhập
              </Checkbox>
            </Form.Item>

            <Button
              type="link"
              onClick={() => setOpenForgotPasswordDialog(true)}
              style={{
                padding: 0,
                fontSize: 13,
                fontWeight: 600,
                color: "#2563eb",
                height: "auto",
              }}
            >
              Quên mật khẩu?
            </Button>
          </div>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              icon={<LoginOutlined />}
              style={{
                height: 46,
                borderRadius: 8,
                background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
                border: "none",
                fontWeight: 600,
                fontSize: 15,
                boxShadow: "0 6px 18px rgba(37, 99, 235, 0.35)",
              }}
            >
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </LoginCard>

      <LoginFooter>
        <p>Tổng công ty Cảng hàng không Việt Nam - CTCP (ACV)</p>
        <p className="brand-note">
          Cảng hàng không Côn Đảo • Bản quyền © 2026 ACV. Bảo lưu mọi quyền.
        </p>
      </LoginFooter>

      <ForgotPasswordDialog
        open={openForgotPasswordDialog}
        onClose={() => setOpenForgotPasswordDialog(false)}
        onSuccessPrefill={handlePrefillCredentials}
      />
    </LoginContainer>
  );
};

export default Login;
