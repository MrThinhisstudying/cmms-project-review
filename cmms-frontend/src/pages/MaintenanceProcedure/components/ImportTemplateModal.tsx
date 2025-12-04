import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Upload, Button, message, Select } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { importTemplate, updateTemplate } from "../../../apis/maintenance";
import { getToken } from "../../../utils/auth";
import { DEVICE_TYPES } from "../../../constants/device-types";

const { Option } = Select;

interface Props {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  editData?: any;
}

const ImportTemplateModal: React.FC<Props> = ({
  open,
  onCancel,
  onSuccess,
  editData,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 1. Load dữ liệu cũ khi mở Modal (Nếu là sửa)
  useEffect(() => {
    if (open) {
      if (editData) {
        form.setFieldsValue({
          code: editData.code, // <--- ĐIỀN MÃ CŨ
          name: editData.name,
          device_type: editData.device_type,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, editData, form]);

  const onFinish = async (values: any) => {
    const token = getToken();
    if (!token) return message.error("Vui lòng đăng nhập lại!");

    setLoading(true);
    try {
      if (editData) {
        // --- LOGIC SỬA (UPDATE) ---
        await updateTemplate(
          editData.id,
          {
            code: values.code, // <--- GỬI MÃ MỚI
            name: values.name,
            device_type: values.device_type,
          },
          token
        );
        message.success("Cập nhật thành công!");
      } else {
        // --- LOGIC THÊM MỚI (IMPORT) ---
        if (!values.file || values.file.length === 0) {
          setLoading(false);
          return message.warning("Chưa chọn file Excel!");
        }
        const fileOrigin = values.file[0].originFileObj;

        // Gọi API import (Lưu ý thứ tự tham số phải khớp với file apis/maintenance.ts)
        await importTemplate(
          fileOrigin,
          values.name,
          values.device_type,
          values.code, // <--- GỬI MÃ
          token
        );
        message.success("Import thành công!");
      }

      onSuccess();
    } catch (err: any) {
      message.error(err.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={editData ? "Cập Nhật Quy Trình" : "Import Quy Trình Mới"}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        {/* --- Ô NHẬP MÃ QUY TRÌNH (MỚI) --- */}
        <Form.Item
          name="code"
          label="Mã Quy Trình"
          rules={[{ required: true, message: "Vui lòng nhập mã quy trình!" }]}
        >
          <Input placeholder="Vd: HD04-VCS-KT-002" />
        </Form.Item>
        {/* -------------------------------- */}

        <Form.Item
          name="name"
          label="Tên Quy Trình"
          rules={[{ required: true, message: "Vui lòng nhập tên quy trình!" }]}
        >
          <Input placeholder="Vd: Quy trình bảo dưỡng xe Toyota" />
        </Form.Item>

        <Form.Item
          name="device_type"
          label="Loại thiết bị áp dụng"
          rules={[{ required: true, message: "Vui lòng chọn loại thiết bị!" }]}
        >
          <Select placeholder="Chọn loại...">
            {DEVICE_TYPES.map((type) => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {!editData && (
          <Form.Item
            name="file"
            label="File Excel Checklist"
            valuePropName="fileList"
            getValueFromEvent={(e: any) => (Array.isArray(e) ? e : e?.fileList)}
            rules={[{ required: true, message: "Chọn file!" }]}
          >
            <Upload beforeUpload={() => false} maxCount={1} accept=".xlsx,.xls">
              <Button icon={<UploadOutlined />}>Chọn file</Button>
            </Upload>
          </Form.Item>
        )}

        <div style={{ textAlign: "right", marginTop: 24 }}>
          <Button onClick={onCancel} style={{ marginRight: 8 }}>
            Hủy
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {editData ? "Lưu Thay Đổi" : "Lưu & Import"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default ImportTemplateModal;
