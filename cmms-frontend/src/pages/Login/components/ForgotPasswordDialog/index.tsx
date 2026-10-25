import React, { useState } from "react";
import { Modal, Form, Input, Button, Alert, Typography, Result, message } from "antd";
import { KeyOutlined, UserOutlined, SendOutlined, CheckCircleOutlined, CopyOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { forgotPassword } from "../../../../apis/users";

const { Text, Paragraph } = Typography;

interface DialogProps {
  open: boolean;
  onClose: () => void;
  onSuccessPrefill?: (username: string, defaultPass: string) => void;
}

const ForgotPasswordDialog: React.FC<DialogProps> = ({
  open,
  onClose,
  onSuccessPrefill,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    username: string;
    message: string;
  } | null>(null);

  const handleClose = () => {
    form.resetFields();
    setSuccessInfo(null);
    onClose();
  };

  const handleSubmit = async (values: { identifier: string }) => {
    const input = values.identifier?.trim();
    if (!input) {
      message.warning("Vui lòng nhập tên đăng nhập hoặc email");
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(input);
      message.success("Đặt lại mật khẩu thành công!");
      setSuccessInfo({
        username: input,
        message: res.message || 'Mật khẩu đã được đặt lại về "12345678"',
      });
    } catch (error: any) {
      message.error(error.message || "Không thể khôi phục mật khẩu. Vui lòng kiểm tra lại thông tin");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginNow = () => {
    if (successInfo && onSuccessPrefill) {
      onSuccessPrefill(successInfo.username, "12345678");
    }
    handleClose();
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText("12345678");
    message.success("Đã sao chép mật khẩu mặc định (12345678)!");
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
      centered
      width={460}
      styles={{
        body: {
          padding: "8px 4px",
        },
      }}
    >
      {!successInfo ? (
        <div>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563eb",
                fontSize: 26,
                marginBottom: 12,
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.15)",
              }}
            >
              <KeyOutlined />
            </div>
            <Typography.Title level={4} style={{ margin: "0 0 6px 0", color: "#1e293b", fontWeight: 700 }}>
              Khôi phục mật khẩu
            </Typography.Title>
            <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.5, display: "block" }}>
              Nhập tên đăng nhập hoặc email của bạn. Hệ thống sẽ đặt lại mật khẩu về mặc định và thông báo cho Quản trị viên (Admin).
            </Text>
          </div>

          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              name="identifier"
              label={<span style={{ fontWeight: 600, color: "#334155" }}>Tên đăng nhập hoặc Email</span>}
              rules={[
                { required: true, message: "Vui lòng nhập tên đăng nhập hoặc email" },
                { min: 3, message: "Tên đăng nhập hoặc email tối thiểu 3 ký tự" },
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input
                size="large"
                prefix={<UserOutlined style={{ color: "#2563eb" }} />}
                placeholder="Ví dụ: hongov@gmail.com hoặc hongov"
                allowClear
                autoFocus
              />
            </Form.Item>

            <Alert
              type="info"
              showIcon
              message={
                <span style={{ fontSize: 12, color: "#1e3a8a" }}>
                  Mật khẩu sau khi khôi phục sẽ là: <strong>12345678</strong>. Sau khi đăng nhập, hệ thống sẽ yêu cầu bạn đổi lại mật khẩu cá nhân mới.
                </span>
              }
              style={{
                marginBottom: 20,
                borderRadius: 8,
                backgroundColor: "#eff6ff",
                borderColor: "#bfdbfe",
              }}
            />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button onClick={handleClose} size="large" style={{ borderRadius: 8, minWidth: 90 }}>
                Hủy bỏ
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                icon={<SendOutlined />}
                style={{
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
                  border: "none",
                  fontWeight: 600,
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                }}
              >
                Khôi phục mật khẩu
              </Button>
            </div>
          </Form>
        </div>
      ) : (
        <div>
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: "#10b981", fontSize: 48 }} />}
            title={<span style={{ fontSize: 18, fontWeight: 700, color: "#065f46" }}>Khôi phục mật khẩu thành công!</span>}
            subTitle={
              <div style={{ textAlign: "left", marginTop: 8 }}>
                <Paragraph style={{ fontSize: 13, color: "#475467", marginBottom: 14 }}>
                  Tài khoản <strong>{successInfo.username}</strong> đã được đặt lại mật khẩu về mặc định. Thông báo đã được gửi trực tiếp tới Ban Quản trị.
                </Paragraph>

                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px dashed #86efac",
                    borderRadius: 10,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <span style={{ fontSize: 12, color: "#166534", display: "block", fontWeight: 500 }}>
                      Mật khẩu mặc định mới:
                    </span>
                    <strong style={{ fontSize: 18, color: "#15803d", letterSpacing: 1.5 }}>
                      12345678
                    </strong>
                  </div>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={handleCopyPassword}
                    style={{ borderRadius: 6, borderColor: "#86efac", color: "#15803d" }}
                  >
                    Sao chép
                  </Button>
                </div>

                <Alert
                  type="warning"
                  showIcon
                  message={
                    <span style={{ fontSize: 12, color: "#92400e" }}>
                      <strong>Lưu ý bảo mật:</strong> Hãy đăng nhập ngay bằng mật khẩu <strong>12345678</strong> và đổi lại mật khẩu riêng của bạn khi được hệ thống yêu cầu.
                    </span>
                  }
                  style={{ borderRadius: 8, backgroundColor: "#fffbeb", borderColor: "#fde68a" }}
                />
              </div>
            }
            extra={[
              <Button
                key="loginNow"
                type="primary"
                size="large"
                block
                icon={<ArrowLeftOutlined />}
                onClick={handleLoginNow}
                style={{
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
                  border: "none",
                  fontWeight: 600,
                  height: 42,
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                }}
              >
                Đăng nhập ngay
              </Button>,
            ]}
            style={{ padding: "8px 0" }}
          />
        </div>
      )}
    </Modal>
  );
};

export default ForgotPasswordDialog;
