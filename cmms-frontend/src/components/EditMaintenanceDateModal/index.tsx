import React, { useEffect, useState } from "react";
import { Modal, Form, DatePicker, Button, Input, Tag, Space, Typography, message, Alert } from "antd";
import { CalendarOutlined, ToolOutlined, CheckCircleOutlined, InfoCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { updateMaintenance } from "../../apis/maintenance";
import { getToken } from "../../utils/auth";
const LEVEL_DISPLAY_MAP: Record<string, { label: string; color: string }> = {
  Tuần: { label: "Tuần", color: "blue" },
  Week: { label: "Tuần", color: "blue" },
  "1M": { label: "01 Tháng", color: "cyan" },
  "3M": { label: "03 Tháng", color: "geekblue" },
  "6M": { label: "06 Tháng", color: "purple" },
  "9M": { label: "09 Tháng", color: "magenta" },
  "1Y": { label: "01 Năm", color: "magenta" },
  "2Y": { label: "02 Năm", color: "volcano" },
  "3_month": { label: "03 Tháng", color: "geekblue" },
  "6_month": { label: "06 Tháng", color: "purple" },
  "9_month": { label: "09 Tháng", color: "magenta" },
  "12_month": { label: "01 Năm", color: "magenta" },
  "24_month": { label: "02 Năm", color: "volcano" },
};

const { Text } = Typography;
const { TextArea } = Input;

interface Props {
  open: boolean;
  record: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EditMaintenanceDateModal: React.FC<Props> = ({
  open,
  record,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const token = getToken();

  useEffect(() => {
    if (open && record) {
      const nextDate = record.next_maintenance_date || record.scheduled_date;
      const lastDate = record.last_maintenance_date;

      form.setFieldsValue({
        scheduled_date: nextDate ? dayjs(nextDate) : null,
        last_maintenance_date: lastDate ? dayjs(lastDate) : null,
        description: record.description || "",
      });
    } else {
      form.resetFields();
    }
  }, [open, record, form]);

  const handleSubmit = async (values: any) => {
    if (!record?.maintenance_id) {
      message.error("Không tìm thấy ID kế hoạch bảo dưỡng!");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {};

      if (values.scheduled_date) {
        // Neo 12:00 trưa để chống lệch múi giờ UTC
        const isoScheduled = values.scheduled_date
          .hour(12)
          .minute(0)
          .second(0)
          .millisecond(0)
          .toISOString();
        payload.scheduled_date = isoScheduled;
        payload.next_maintenance_date = isoScheduled;
      }

      if (values.last_maintenance_date) {
        payload.last_maintenance_date = values.last_maintenance_date
          .hour(12)
          .minute(0)
          .second(0)
          .millisecond(0)
          .toISOString();
      } else if (values.last_maintenance_date === null) {
        payload.last_maintenance_date = null;
      }

      if (values.description !== undefined) {
        payload.description = values.description.trim();
      }

      await updateMaintenance(record.maintenance_id, token, payload);
      message.success("Cập nhật ngày bảo dưỡng thành công!");
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error("Lỗi cập nhật: " + (err.message || "Không thể lưu thay đổi"));
    } finally {
      setLoading(false);
    }
  };

  const deviceName =
    record?.device?.name || record?.device_name || record?.name || "Thiết bị";
  const deviceReg =
    record?.device?.reg_number ||
    record?.reg_number ||
    record?.device?.serial_number ||
    "";
  const levelStr = record?.level || "Tuần";
  const levelConf = LEVEL_DISPLAY_MAP?.[levelStr] || { label: levelStr, color: "blue" };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 18,
              boxShadow: "0 2px 8px rgba(22, 119, 255, 0.3)",
            }}
          >
            <CalendarOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>
              Điều Chỉnh Ngày Bảo Dưỡng
            </div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>
              Cập nhật ngày dự kiến hoặc ngày hoàn thành thực tế cho kỳ bảo dưỡng này
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={520}
      centered
      maskClosable={false}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #f0f7ff 0%, #e6f4ff 100%)",
          border: "1px solid #bae0ff",
          borderRadius: 10,
          padding: "12px 16px",
          marginTop: 14,
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Text strong style={{ fontSize: 14, color: "#002766" }}>
              <ToolOutlined style={{ marginRight: 6, color: "#1677ff" }} />
              {deviceName}
            </Text>
            {deviceReg && (
              <div style={{ fontSize: 12, color: "#595959", marginTop: 2 }}>
                Biển số / Mã serial:{" "}
                <Tag color="cyan" style={{ fontWeight: 600, margin: 0 }}>
                  {deviceReg}
                </Tag>
              </div>
            )}
          </div>
          <div>
            <Tag color={levelConf.color} style={{ fontWeight: 600, fontSize: 12, padding: "2px 8px" }}>
              Cấp: {levelConf.label}
            </Tag>
          </div>
        </div>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="scheduled_date"
          label={
            <Space size={4}>
              <CalendarOutlined style={{ color: "#1677ff" }} />
              <span style={{ fontWeight: 600 }}>Ngày dự kiến (Kế hoạch)</span>
              <span style={{ color: "#ff4d4f" }}>*</span>
            </Space>
          }
          rules={[{ required: true, message: "Vui lòng chọn ngày dự kiến!" }]}
          extra="Mốc ngày bắt đầu của chu kỳ bảo dưỡng này."
        >
          <DatePicker
            format="DD/MM/YYYY"
            size="large"
            style={{ width: "100%", borderRadius: 8 }}
            placeholder="Chọn ngày dự kiến"
            allowClear={false}
          />
        </Form.Item>

        <Form.Item
          name="last_maintenance_date"
          label={
            <Space size={4}>
              <CheckCircleOutlined style={{ color: "#52c41a" }} />
              <span style={{ fontWeight: 600 }}>Ngày hoàn thành thực tế (Nếu đã làm)</span>
            </Space>
          }
          extra="Chỉ nhập khi muốn ghi nhận hoặc sửa lại ngày đã hoàn thành kỳ bảo dưỡng này."
        >
          <DatePicker
            format="DD/MM/YYYY"
            size="large"
            style={{ width: "100%", borderRadius: 8 }}
            placeholder="Chưa hoàn thành (để trống nếu chưa làm)"
            allowClear
          />
        </Form.Item>

        <Form.Item
          name="description"
          label={<span style={{ fontWeight: 600 }}>Ghi chú / Lý do điều chỉnh</span>}
        >
          <TextArea
            rows={2}
            placeholder="Ví dụ: Đổi ngày theo yêu cầu vận hành, dời lịch hoặc bù..."
            maxLength={255}
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 24,
            paddingTop: 14,
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <Button onClick={onClose} disabled={loading} style={{ borderRadius: 8 }}>
            Hủy bỏ
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<CalendarOutlined />}
            style={{
              borderRadius: 8,
              background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
              border: "none",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(22, 119, 255, 0.25)",
            }}
          >
            Lưu Thay Đổi Ngày
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default EditMaintenanceDateModal;
