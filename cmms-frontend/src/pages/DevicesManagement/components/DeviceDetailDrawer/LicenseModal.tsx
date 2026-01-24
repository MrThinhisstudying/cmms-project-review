import React, { useEffect } from "react";
import { Modal, Form, Input, DatePicker, Select } from "antd";

type LicenseModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
};

const LicenseModal: React.FC<LicenseModalProps> = ({ open, onClose, onSubmit }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit({
        ...values,
        expiry: values.expiry ? values.expiry.toISOString() : null,
      });
      onClose();
    } catch (error) {
      console.error("Validate Failed:", error);
    }
  };

  return (
    <Modal
      title="Thêm mới Giấy phép / Kiểm định"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="Thêm"
      cancelText="Hủy"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="type"
          label="Loại giấy phép / tem"
          rules={[{ required: true, message: "Vui lòng chọn hoặc nhập loại giấy phép" }]}
        >
          <Select
             showSearch
             mode="tags"
             options={[
                 { value: 'Đăng kiểm', label: 'Đăng kiểm' },
                 { value: 'Bảo hiểm', label: 'Bảo hiểm' },
                 { value: 'Giấy phép khai thác', label: 'Giấy phép khai thác' },
             ]}
             placeholder="Chọn hoặc nhập loại mới"
          />
        </Form.Item>
        <Form.Item
          name="number"
          label="Số Giấy phép / Tem"
          rules={[{ required: true, message: "Vui lòng nhập số giấy phép/tem" }]}
        >
          <Input placeholder="VD: 163/QA-TCTHKVN" />
        </Form.Item>
        <Form.Item name="issuer" label="Đơn vị cấp">
          <Input placeholder="VD: ACV, Cục đăng kiểm..." />
        </Form.Item>
        <Form.Item
          name="expiry"
          label="Thời hạn"
          rules={[{ required: true, message: "Vui lòng chọn thời hạn" }]}
        >
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LicenseModal;
