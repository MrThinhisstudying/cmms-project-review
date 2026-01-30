import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Upload, Button, message, Select, Divider } from "antd";
import { UploadOutlined, PlusOutlined } from "@ant-design/icons";
import { importTemplate, updateTemplate } from "../../../apis/maintenance";
import { getToken } from "../../../utils/auth";
import { getAllDeviceTypes } from "../../../apis/device-types";
import DeviceTypeManagerModal from "./DeviceTypeManagerModal";

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
  const [items, setItems] = useState<{label: string, value: string}[]>([]);
  const [showManager, setShowManager] = useState(false);

  const fetchDeviceTypes = async () => {
    try {
        const res = await getAllDeviceTypes(getToken());
        // Force new array reference and log
        console.log("Fetched device types:", res.length);
        setItems(res.map(r => ({ label: r.name, value: r.code })));
    } catch (e) {
        console.error("Error fetching device types", e);
    }
  };

  useEffect(() => {
    // Load types on mount
    fetchDeviceTypes();
  }, []);

  // 1. Load dữ liệu cũ khi mở Modal (Nếu là sửa)
  useEffect(() => {
    if (open) {
      if (editData) {
        form.setFieldsValue({
          code: editData.code,
          name: editData.name,
          device_type: editData.device_type,
          release_no: editData.release_no,
          revision_no: editData.revision_no,
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
            code: values.code,
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

        // Gọi API import
        await importTemplate(
          fileOrigin,
          values.name,
          values.device_type,
          values.code,
          token,
          values.release_no,
          values.revision_no
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
          <Select
            key={items.length}
            placeholder="Chọn loại..."
            dropdownRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: "8px 0" }} />
                <Button 
                    type="text" 
                    block 
                    icon={<PlusOutlined />} 
                    style={{ textAlign: 'left' }}
                    onClick={() => setShowManager(true)}
                >
                    Quản lý danh sách loại thiết bị...
                </Button>
              </>
            )}
            options={items.map((item) => ({ label: item.label, value: item.value }))}
          />
        </Form.Item>

        <Form.Item label="Thông tin phiên bản" style={{ marginBottom: 0 }}>
            <Form.Item
                name="release_no"
                label="Lần ban hành"
                style={{ display: 'inline-block', width: 'calc(50% - 8px)' }}
            >
                <Input placeholder="Vd: 01" />
            </Form.Item>
            <Form.Item
                name="revision_no"
                label="Lần sửa đổi"
                style={{ display: 'inline-block', width: 'calc(50% - 8px)', marginLeft: '16px' }}
            >
                <Input placeholder="Vd: 00" />
            </Form.Item>
        </Form.Item>

        <DeviceTypeManagerModal 
            open={showManager} 
            onChange={fetchDeviceTypes}
            onClose={() => {
                setShowManager(false);
                fetchDeviceTypes(); 
            }} 
        />

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
