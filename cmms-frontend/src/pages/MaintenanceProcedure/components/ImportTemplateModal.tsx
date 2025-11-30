import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Upload, Button, message, Select } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { importTemplate, updateTemplate } from "../../../apis/maintenance";
import { getToken } from "../../../utils/auth";
import { DEVICE_TYPES } from "../../../constants/device-types"; // Import danh sách chuẩn

const { Option } = Select;

interface Props {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  editData?: any; // Dữ liệu cần sửa (nếu có)
}

const ImportTemplateModal: React.FC<Props> = ({
  open,
  onCancel,
  onSuccess,
  editData,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Khi mở modal, nếu có editData -> điền vào form
  useEffect(() => {
    if (open) {
      if (editData) {
        form.setFieldsValue({
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
        await importTemplate(
          fileOrigin,
          values.name,
          values.device_type,
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
      title={editData ? "Cập Nhật Thông Tin" : "Import Quy Trình Mới"}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="name"
          label="Tên Quy Trình"
          rules={[{ required: true }]}
        >
          <Input placeholder="Vd: Quy trình xe Toyota 2025" />
        </Form.Item>

        <Form.Item
          name="device_type"
          label="Loại thiết bị"
          rules={[{ required: true }]}
        >
          <Select placeholder="Chọn loại...">
            {DEVICE_TYPES.map((type) => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Nếu là Sửa thì ẩn phần chọn file đi (hoặc cho phép re-upload nếu bạn muốn nâng cao) */}
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
            {editData ? "Cập Nhật" : "Lưu & Import"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default ImportTemplateModal;
