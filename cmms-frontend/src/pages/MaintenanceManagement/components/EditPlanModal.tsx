import React, { useEffect, useState } from "react";
import { Modal, Form, DatePicker, Select, Button, message } from "antd";
import { updateMaintenance } from "../../../apis/maintenance";
import { getToken } from "../../../utils/auth";
import dayjs from "dayjs";

const { Option } = Select;

interface Props {
  open: boolean;
  data: any; // Dữ liệu dòng cần sửa
  onCancel: () => void;
  onSuccess: () => void;
}

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
    if (data) {
      form.setFieldsValue({
        level: data.level,
        // Chuyển chuỗi ngày sang dayjs object cho DatePicker
        scheduled_date: data.next_maintenance_date
          ? dayjs(data.next_maintenance_date)
          : null,
      });
    }
  }, [data, form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const token = getToken();
      const payload = {
        level: values.level,
        scheduled_date: values.scheduled_date
          ? values.scheduled_date.toISOString()
          : null,
      };

      await updateMaintenance(data.maintenance_id, token, payload);

      message.success("Cập nhật kế hoạch thành công!");
      onSuccess(); // Reload bảng
    } catch (err: any) {
      message.error(err.message || "Lỗi cập nhật");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="✏️ Chỉnh Sửa Kế Hoạch"
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="level"
          label="Cấp độ tiếp theo"
          rules={[{ required: true }]}
        >
          <Select>
            <Option value="1M">01 Tháng</Option>
            <Option value="3M">03 Tháng</Option>
            <Option value="6M">06 Tháng</Option>
            <Option value="1Y">01 Năm</Option>
            <Option value="2Y">02 Năm</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="scheduled_date"
          label="Ngày đến hạn (Dự kiến)"
          rules={[{ required: true }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
        </Form.Item>

        <div style={{ textAlign: "right", marginTop: 20 }}>
          <Button onClick={onCancel} style={{ marginRight: 8 }}>
            Hủy
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Lưu Thay Đổi
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default EditPlanModal;
