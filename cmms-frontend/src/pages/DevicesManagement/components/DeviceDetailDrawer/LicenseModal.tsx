import React, { useEffect, useState } from "react";
import { Modal, Form, Input, DatePicker, Select, Alert, Space, Button, Typography, Tag } from "antd";
import {
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SwapOutlined,
  PlusOutlined,
  EditOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";

const { Text } = Typography;

export type LicenseModalMode = "create" | "edit" | "renew";

export interface LicenseRecord {
  id?: string;
  type: string;
  number: string;
  issuer?: string;
  expiry: string | null;
  note?: string;
  created_at?: string;
  updated_at?: string;
  previous_expiry?: string;
}

type LicenseModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: LicenseRecord, mode: LicenseModalMode) => Promise<void> | void;
  initialData?: LicenseRecord | null;
  mode?: LicenseModalMode;
  loading?: boolean;
  isHistorical?: boolean;
};

const COMMON_TYPES = [
  { value: "Đăng kiểm", label: "Đăng kiểm" },
  { value: "Bảo hiểm", label: "Bảo hiểm phương tiện" },
  { value: "Kiểm định an toàn", label: "Kiểm định an toàn kỹ thuật" },
  { value: "Giấy phép lưu hành sân đỗ", label: "Giấy phép lưu hành sân đỗ" },
  { value: "Chứng nhận khí thải", label: "Chứng nhận tiêu chuẩn khí thải" },
];

export default function LicenseModal({
  open,
  onClose,
  onSubmit,
  initialData,
  mode = "create",
  loading = false,
  isHistorical = false,
}: LicenseModalProps) {
  const [form] = Form.useForm();
  const [selectedExpiry, setSelectedExpiry] = useState<Dayjs | null>(null);

  useEffect(() => {
    if (open) {
      if (initialData && (mode === "edit" || mode === "renew")) {
        let typeVal = initialData.type;
        const expiryVal =
          mode === "renew"
            ? null // Khi gia hạn, để trống ngày để người dùng chọn hạn mới
            : initialData.expiry
            ? dayjs(initialData.expiry)
            : null;

        form.setFieldsValue({
          type: typeVal,
          number: mode === "renew" ? "" : initialData.number, // Khi gia hạn, gợi ý nhập số tem/giấy phép mới
          issuer: initialData.issuer,
          expiry: expiryVal,
          note: mode === "renew" ? `Gia hạn từ chu kỳ cũ (Hạn cũ: ${initialData.expiry ? dayjs(initialData.expiry).format("DD/MM/YYYY") : "—"})` : initialData.note,
        });

        setSelectedExpiry(expiryVal);
      } else {
        form.resetFields();
        setSelectedExpiry(null);
      }
    }
  }, [open, initialData, mode, form]);

  const handleQuickAdd = (months: number) => {
    // Nếu là gia hạn và hạn cũ còn trong tương lai thì cộng dồn từ hạn cũ, ngược lại cộng từ hôm nay
    const baseDate =
      mode === "renew" && initialData?.expiry && dayjs(initialData.expiry).isAfter(dayjs())
        ? dayjs(initialData.expiry)
        : dayjs();
    const nextDate = baseDate.add(months, "month");
    form.setFieldsValue({ expiry: nextDate });
    setSelectedExpiry(nextDate);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      let typeStr = values.type;
      if (Array.isArray(values.type)) {
        typeStr = values.type.join(", ");
      }

      await onSubmit(
        {
          id: initialData?.id,
          type: typeStr,
          number: values.number,
          issuer: values.issuer,
          expiry: values.expiry ? values.expiry.format("YYYY-MM-DD") : null,
          note: values.note,
          previous_expiry: mode === "renew" ? initialData?.expiry || undefined : undefined,
        },
        mode
      );
    } catch (error) {
      console.error("Validate Failed:", error);
    }
  };

  const renderExpiryWarning = () => {
    if (isHistorical) return null;
    if (!selectedExpiry || !selectedExpiry.isValid()) return null;

    const today = dayjs().startOf("day");
    const target = selectedExpiry.startOf("day");
    const diffDays = target.diff(today, "day");

    if (diffDays < 0) {
      return (
        <Alert
          type="error"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginTop: 8, borderRadius: 6 }}
          message={
            <div>
              <div style={{ fontWeight: 600 }}>CẢNH BÁO: Thời hạn đã hết trong quá khứ!</div>
              <div style={{ fontSize: 12, marginTop: 2 }}>
                Ngày bạn chọn (<b>{target.format("DD/MM/YYYY")}</b>) đã quá hạn <b>{Math.abs(diffDays)} ngày</b>.
                Hệ thống sẽ lưu và đánh dấu giấy phép này ở trạng thái <b>Đã hết hạn</b> kèm cảnh báo đỏ.
              </div>
            </div>
          }
        />
      );
    }

    if (diffDays <= 30) {
      return (
        <Alert
          type="warning"
          showIcon
          icon={<ClockCircleOutlined />}
          style={{ marginTop: 8, borderRadius: 6 }}
          message={
            <div>
              <div style={{ fontWeight: 600 }}>LƯU Ý: Thời hạn sắp hết!</div>
              <div style={{ fontSize: 12, marginTop: 2 }}>
                Giấy phép này chỉ còn hiệu lực <b>{diffDays} ngày</b> nữa (đến ngày {target.format("DD/MM/YYYY")}).
              </div>
            </div>
          }
        />
      );
    }

    return (
      <Alert
        type="success"
        showIcon
        icon={<CheckCircleOutlined />}
        style={{ marginTop: 8, borderRadius: 6 }}
        message={
          <div style={{ fontSize: 12 }}>
            Thời hạn hợp lệ: Còn hiệu lực <b>{diffDays} ngày</b> (đến ngày <b>{target.format("DD/MM/YYYY")}</b>).
          </div>
        }
      />
    );
  };

  const modalTitle =
    mode === "renew" ? (
      <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#6b21a8" }}>
        <SwapOutlined />
        <span>Gia hạn / Cấp mới Giấy phép & Kiểm định</span>
      </span>
    ) : mode === "edit" ? (
      <span style={{ display: "flex", alignItems: "center", gap: 8, color: isHistorical ? "#475569" : undefined }}>
        <EditOutlined />
        <span>{isHistorical ? "Chỉnh sửa Chu kỳ cũ (Đã gia hạn)" : "Chỉnh sửa Giấy phép & Kiểm định"}</span>
      </span>
    ) : (
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <PlusOutlined />
        <span>Thêm mới Giấy phép / Kiểm định</span>
      </span>
    );

  const okBtnText =
    mode === "renew" ? "Xác nhận gia hạn" : mode === "edit" ? "Lưu thay đổi" : "Thêm mới";

  return (
    <Modal
      title={modalTitle}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={okBtnText}
      cancelText="Hủy"
      confirmLoading={loading}
      destroyOnClose
      width={520}
      okButtonProps={{
        style:
          mode === "renew"
            ? {
                background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
                border: "none",
                fontWeight: 600,
              }
            : undefined,
      }}
    >
      {/* Cảnh báo khi chỉnh sửa chu kỳ lịch sử đã gia hạn */}
      {isHistorical && (
        <Alert
          type="info"
          showIcon
          message="🔒 Chu kỳ kiểm định đã đóng (Đã gia hạn)"
          description="Chu kỳ này đã được gia hạn sang chu kỳ mới kế thừa. Thời hạn hiệu lực và loại kiểm định được khóa để bảo đảm tính toàn vẹn của lịch sử kiểm định. Bạn chỉ có thể cập nhật Số hiệu, Đơn vị cấp hoặc Ghi chú."
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {/* Khối tóm tắt khi ở chế độ gia hạn */}
      {mode === "renew" && initialData && (
        <div
          style={{
            background: "#f5f3ff",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #ddd6fe",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, color: "#581c87" }}>
              Chu kỳ trước: {initialData.type}
            </span>
            <Tag color="purple">Số cũ: {initialData.number || "—"}</Tag>
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Hạn cũ: <b>{initialData.expiry ? dayjs(initialData.expiry).format("DD/MM/YYYY") : "—"}</b>
            {initialData.issuer && ` • Đơn vị cấp: ${initialData.issuer}`}
          </div>
        </div>
      )}

      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item
          name="type"
          label={<span style={{ fontWeight: 600 }}>Loại giấy phép / Tem kiểm định</span>}
          rules={[{ required: true, message: "Vui lòng chọn hoặc nhập loại giấy phép" }]}
        >
          <Select
            showSearch
            options={COMMON_TYPES}
            placeholder="Chọn hoặc nhập loại mới"
            disabled={mode === "renew" || isHistorical}
          />
        </Form.Item>

        <Form.Item
          name="number"
          label={
            <span style={{ fontWeight: 600 }}>
              {mode === "renew" ? "Số Giấy phép / Tem MỚI" : "Số Giấy phép / Tem kiểm định"}
            </span>
          }
          rules={[{ required: true, message: "Vui lòng nhập số giấy phép/tem" }]}
          extra={mode === "renew" ? "Nhập số hiệu hoặc mã tem của chu kỳ kiểm định mới" : undefined}
        >
          <Input placeholder="VD: 163/QA-TCTHKVN, 29-01D-12345..." />
        </Form.Item>

        <Form.Item name="issuer" label={<span style={{ fontWeight: 600 }}>Đơn vị cấp</span>}>
          <Input placeholder="VD: Cục đăng kiểm, ACV, Bảo hiểm Bảo Việt..." />
        </Form.Item>

        <Form.Item
          name="expiry"
          label={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <span style={{ fontWeight: 600 }}>
                {mode === "renew" ? "Thời hạn chu kỳ MỚI" : "Thời hạn hiệu lực"}
              </span>
              {!isHistorical && (
                <Space size={4}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>Chọn nhanh:</span>
                  <Button size="small" type="dashed" onClick={() => handleQuickAdd(6)}>
                    +6 tháng
                  </Button>
                  <Button size="small" type="dashed" onClick={() => handleQuickAdd(12)}>
                    +1 năm
                  </Button>
                  <Button size="small" type="dashed" onClick={() => handleQuickAdd(24)}>
                    +2 năm
                  </Button>
                </Space>
              )}
            </div>
          }
          rules={[{ required: true, message: "Vui lòng chọn thời hạn" }]}
          extra={isHistorical ? "🔒 Không thể thay đổi thời hạn của chu kỳ đã đóng" : undefined}
        >
          <DatePicker
            style={{ width: "100%" }}
            format="DD/MM/YYYY"
            placeholder="Chọn ngày hết hạn"
            disabled={isHistorical}
            onChange={(date) => setSelectedExpiry(date)}
          />
        </Form.Item>

        {/* Cảnh báo tính toán thời hạn theo thời gian thực */}
        {renderExpiryWarning()}

        <Form.Item name="note" label={<span style={{ fontWeight: 600, marginTop: 12 }}>Ghi chú</span>}>
          <Input.TextArea rows={2} placeholder="Ghi chú thêm về điều kiện sử dụng, tem phụ..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
