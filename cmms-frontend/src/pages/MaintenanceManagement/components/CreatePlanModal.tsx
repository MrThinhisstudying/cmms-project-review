import React, { useState, useEffect } from "react";
import { Modal, Form, Select, DatePicker, Input, Button, message } from "antd";
import { getAllDevices } from "../../../apis/devices";
import { generateMaintenanceSeries } from "../../../apis/maintenance";
import { getToken } from "../../../utils/auth";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;

interface CreatePlanModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const CreatePlanModal: React.FC<CreatePlanModalProps> = ({
  open,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      const fetchDevices = async () => {
        try {
          const token = getToken();
          const data = await getAllDevices(token);
          setDevices(data);
        } catch (error) {
          message.error("Lỗi tải danh sách thiết bị");
        }
      };
      fetchDevices();
      form.resetFields();
    }
  }, [open, form]);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      const token = getToken();
      // Logic mới: Gọi API tạo series 2 năm
      const levels = Array.isArray(values.level) ? values.level : [values.level];
      
      const payload = {
          device_id: values.device_id,
          levels: levels,
          start_date: values.scheduled_date.toISOString(),
          description: values.description,
      };

      await generateMaintenanceSeries(token, payload);

      message.success(`Đã tạo chuỗi kế hoạch bảo dưỡng (2 năm) cho ${levels.join(', ')} thành công!`);
      onSuccess();
    } catch (error: any) {
      message.error(error.message || "Tạo kế hoạch thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "#e6f4ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1677ff",
              fontSize: 18,
            }}
          >
            📋
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              Tạo Chuỗi Kế Hoạch Bảo Dưỡng (2 Năm)
            </div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>
              Hệ thống sẽ tự động sinh lịch bảo dưỡng định kỳ tuần tự theo chu kỳ đã chọn
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      width={600}
      centered
      styles={{ body: { paddingTop: 16 } }}
    >
      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 16,
          fontSize: 12,
          color: "#166534",
          lineHeight: 1.5,
        }}
      >
        💡 <b>Gợi ý:</b> Chọn các cấp bảo dưỡng thiết bị áp dụng (VD: <b>Tuần</b>, <b>01 Tháng</b>, <b>06 Tháng</b>...). Hệ thống sẽ tự động tính toán và khởi tạo 24 tháng theo quy tắc cuốn chiếu.
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          scheduled_date: dayjs(),
          status: "active",
        }}
      >
        <Form.Item
          name="device_id"
          label={<span style={{ fontWeight: 600 }}>Thiết bị / Xe áp dụng</span>}
          rules={[{ required: true, message: "Vui lòng chọn thiết bị" }]}
        >
          <Select
            placeholder="🔍 Tìm chọn thiết bị..."
            showSearch
            optionFilterProp="children"
            size="middle"
            style={{ borderRadius: 8 }}
            filterOption={(input, option) => {
              const children = option?.children as unknown;
              if (typeof children === "string") {
                return children.toLowerCase().includes(input.toLowerCase());
              }
              if (Array.isArray(children)) {
                return children.join("").toLowerCase().includes(input.toLowerCase());
              }
              return false;
            }}
          >
            {devices.map((d) => (
              <Option key={d.device_id} value={d.device_id}>
                {d.name} {d.reg_number ? `(${d.reg_number})` : ""} {d.brand ? `- ${d.brand}` : ""}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="scheduled_date"
          label={<span style={{ fontWeight: 600 }}>Mốc thời gian bắt đầu</span>}
          rules={[{ required: true, message: "Chọn ngày bắt đầu" }]}
        >
          <DatePicker style={{ width: "100%", borderRadius: 8 }} format="DD/MM/YYYY" size="middle" />
        </Form.Item>

        <Form.Item
          name="level"
          label={<span style={{ fontWeight: 600 }}>Các cấp độ bảo dưỡng áp dụng</span>}
          rules={[{ required: true, message: "Chọn ít nhất 1 cấp độ bảo dưỡng" }]}
        >
          <Select
            placeholder="Chọn các chu kỳ bảo dưỡng..."
            mode="multiple"
            allowClear
            size="middle"
            style={{ width: "100%", borderRadius: 8 }}
          >
            <Option value="Tuần">Tuần (Định kỳ 7 ngày)</Option>
            <Option value="1M">01 Tháng (Cuối mỗi tháng)</Option>
            <Option value="3M">03 Tháng (Quý)</Option>
            <Option value="6M">06 Tháng (Nửa năm)</Option>
            <Option value="9M">09 Tháng</Option>
            <Option value="1Y">01 Năm (Hàng năm)</Option>
            <Option value="2Y">02 Năm</Option>
          </Select>
        </Form.Item>

        <Form.Item name="description" label={<span style={{ fontWeight: 600 }}>Ghi chú kế hoạch</span>}>
          <TextArea rows={3} placeholder="Ghi chú thêm về quy định bảo dưỡng của xe này..." style={{ borderRadius: 8 }} />
        </Form.Item>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Button onClick={onCancel} style={{ borderRadius: 8 }}>
            Hủy bỏ
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            style={{
              borderRadius: 8,
              fontWeight: 600,
              background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
              paddingLeft: 20,
              paddingRight: 20,
            }}
          >
            Khởi tạo kế hoạch
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default CreatePlanModal;
