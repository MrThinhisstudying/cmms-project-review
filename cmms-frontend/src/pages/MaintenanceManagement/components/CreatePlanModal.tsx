import React, { useState, useEffect } from "react";
import { Modal, Form, Select, DatePicker, Input, Button, message } from "antd";
import { getAllDevices } from "../../../apis/devices";
import { createMaintenance } from "../../../apis/maintenance";
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
      const payload = {
        device_id: values.device_id,
        scheduled_date: values.scheduled_date.toISOString(),
        level: values.level,
        status: "active" as const,
        description: values.description,
      };

      await createMaintenance(token, payload);
      message.success("Tạo kế hoạch bảo dưỡng thành công!");
      onSuccess();
    } catch (error: any) {
      message.error(error.message || "Tạo kế hoạch thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Thêm Kế Hoạch Bảo Dưỡng Mới"
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
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
          label="Thiết bị"
          rules={[{ required: true, message: "Vui lòng chọn thiết bị" }]}
        >
          <Select
            placeholder="Chọn thiết bị..."
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.children as unknown as string)
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          >
            {devices.map((d) => (
              <Option key={d.device_id} value={d.device_id}>
                {d.name} ({d.reg_number}) - {d.brand}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="scheduled_date"
          label="Ngày bắt đầu theo dõi"
          rules={[{ required: true, message: "Chọn ngày bắt đầu" }]}
        >
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item
          name="level"
          label="Chu kỳ ban đầu (Cấp độ)"
          rules={[{ required: true, message: "Chọn cấp độ bảo dưỡng" }]}
        >
          <Select placeholder="Chọn chu kỳ...">
            <Option value="Tuần">1 Tuần</Option>
            <Option value="1M">01 Tháng</Option>
            <Option value="3M">03 Tháng</Option>
            <Option value="6M">06 Tháng</Option>
            <Option value="9M">09 Tháng</Option>
            <Option value="1Y">01 Năm</Option>
            <Option value="2Y">02 Năm</Option>
          </Select>
        </Form.Item>

        <Form.Item name="description" label="Ghi chú">
          <TextArea rows={3} placeholder="Ghi chú thêm về kế hoạch..." />
        </Form.Item>

        <Form.Item style={{ textAlign: "right", marginTop: 16 }}>
          <Button onClick={onCancel} style={{ marginRight: 8 }}>
            Hủy
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Lưu kế hoạch
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreatePlanModal;
