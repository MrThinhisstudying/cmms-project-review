import React, { useEffect, useState } from "react";
import { Modal, Form, DatePicker, Select, Button, message, Space, Tag, Typography, Divider } from "antd";
import { EditOutlined, CalendarOutlined, CarOutlined, SaveOutlined } from "@ant-design/icons";
import { updateMaintenance } from "../../../apis/maintenance";
import { getToken } from "../../../utils/auth";
import dayjs from "dayjs";

const { Option } = Select;
const { Text } = Typography;

interface Props {
  open: boolean;
  data: any; // Dữ liệu dòng cần sửa
  onCancel: () => void;
  onSuccess: () => void;
}

const LEVEL_OPTIONS = [
  { value: "Tuần", label: "Tuần (Định kỳ hàng tuần)", color: "blue" },
  { value: "1M", label: "01 Tháng (Định kỳ 1 tháng)", color: "cyan" },
  { value: "3M", label: "03 Tháng (Định kỳ 3 tháng)", color: "geekblue" },
  { value: "6M", label: "06 Tháng (Định kỳ 6 tháng)", color: "purple" },
  { value: "9M", label: "09 Tháng (Định kỳ 9 tháng)", color: "magenta" },
  { value: "1Y", label: "01 Năm (Định kỳ 1 năm)", color: "volcano" },
  { value: "2Y", label: "02 Năm (Định kỳ 2 năm)", color: "red" },
];

const EditPlanModal: React.FC<Props> = ({
  open,
  data,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Điền dữ liệu cũ vào form khi mở
  useEffect(() => {
    if (data && open) {
      form.setFieldsValue({
        level: data.level || "Tuần",
        scheduled_date: data.next_maintenance_date || data.scheduled_date
          ? dayjs(data.next_maintenance_date || data.scheduled_date)
          : null,
      });
    } else {
      form.resetFields();
    }
  }, [data, open, form]);

  const onFinish = async (values: any) => {
    if (!data?.maintenance_id) {
      message.error("Không tìm thấy mã kế hoạch!");
      return;
    }

    setLoading(true);
    try {
      const token = getToken();
      const payload: any = {
        level: values.level,
      };

      if (values.scheduled_date) {
        // Neo 12:00 trưa để chống lệch múi giờ UTC/GMT+7
        const isoDate = values.scheduled_date
          .hour(12)
          .minute(0)
          .second(0)
          .millisecond(0)
          .toISOString();
        payload.scheduled_date = isoDate;
        payload.next_maintenance_date = isoDate;
      }

      await updateMaintenance(data.maintenance_id, token, payload);
      message.success("Cập nhật kế hoạch bảo dưỡng thành công!");
      onSuccess();
      onCancel();
    } catch (err: any) {
      message.error(err.message || "Lỗi cập nhật kế hoạch");
    } finally {
      setLoading(false);
    }
  };

  const deviceName = data?.device?.name || data?.name || "Thiết bị";
  const regNumber = data?.device?.reg_number || data?.reg_number || data?.device?.serial_number || "";

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
            <EditOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>
              Điều Chỉnh Chu Kỳ Kế Hoạch
            </div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>
              Cập nhật cấp độ và mốc thời gian bảo dưỡng dự kiến của thiết bị
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      width={520}
      centered
      maskClosable={false}
    >
      <Divider style={{ margin: "14px 0" }} />

      {/* Thông tin thiết bị hiện tại */}
      <div
        style={{
          background: "linear-gradient(135deg, #f0f7ff 0%, #e6f4ff 100%)",
          border: "1px solid #bae0ff",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, color: "#003a8c", fontSize: 14 }}>
            <CarOutlined style={{ marginRight: 6, color: "#1677ff" }} />
            {deviceName}
          </div>
          {regNumber && (
            <div style={{ fontSize: 12, color: "#595959", marginTop: 2 }}>
              Biển số / Mã quản lý:{" "}
              <Tag color="cyan" style={{ fontWeight: 600, margin: 0 }}>
                {regNumber}
              </Tag>
            </div>
          )}
        </div>
        <div>
          <Tag color="blue" style={{ fontWeight: 600, padding: "2px 8px" }}>
            Mã: #{data?.maintenance_id || "N/A"}
          </Tag>
        </div>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="level"
          label={
            <Space size={4}>
              <span style={{ fontWeight: 600 }}>Cấp độ bảo dưỡng</span>
              <span style={{ color: "#ff4d4f" }}>*</span>
            </Space>
          }
          rules={[{ required: true, message: "Vui lòng chọn cấp độ bảo dưỡng" }]}
          extra="Chu kỳ áp dụng cho đợt bảo dưỡng này."
        >
          <Select size="large" style={{ width: "100%" }} placeholder="Chọn cấp độ...">
            {LEVEL_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                <Space>
                  <Tag color={opt.color} style={{ margin: 0, fontWeight: 600 }}>
                    {opt.value}
                  </Tag>
                  <span>{opt.label}</span>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="scheduled_date"
          label={
            <Space size={4}>
              <CalendarOutlined style={{ color: "#1677ff" }} />
              <span style={{ fontWeight: 600 }}>Ngày đến hạn (Dự kiến)</span>
              <span style={{ color: "#ff4d4f" }}>*</span>
            </Space>
          }
          rules={[{ required: true, message: "Vui lòng chọn ngày đến hạn" }]}
          extra="Thời điểm hệ thống sẽ cảnh báo và kích hoạt kỳ bảo dưỡng tiếp theo."
        >
          <DatePicker
            format="DD/MM/YYYY"
            size="large"
            style={{ width: "100%", borderRadius: 8 }}
            placeholder="Chọn ngày đến hạn"
            allowClear={false}
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
          <Button onClick={onCancel} style={{ borderRadius: 8 }} disabled={loading}>
            Hủy bỏ
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<SaveOutlined />}
            style={{
              borderRadius: 8,
              background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
              border: "none",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(22, 119, 255, 0.25)",
            }}
          >
            Lưu Thay Đổi
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default EditPlanModal;
