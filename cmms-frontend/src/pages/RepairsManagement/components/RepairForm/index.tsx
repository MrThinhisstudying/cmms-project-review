import React, { useEffect } from "react";
import {
  Modal,
  Form,
  Input,

  Select,
  Typography,
  Descriptions,
} from "antd";
import { IRepair, RepairUpsertPayload } from "../../../../types/repairs.types";
import { useDevicesContext } from "../../../../context/DevicesContext/DevicesContext";
import { useAuthContext } from "../../../../context/AuthContext/AuthContext";
import { useRepairsContext } from "../../../../context/RepairsContext/RepairsContext";

const { Title, Text } = Typography;
const { TextArea } = Input;


interface RepairFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RepairUpsertPayload) => void;
  loading: boolean;
  initialData: IRepair | null;
}

const RepairForm: React.FC<RepairFormProps> = ({
  open,
  onClose,
  onSubmit,
  loading,
  initialData,
}) => {
  const [form] = Form.useForm();
  const { devices, fetchDevices } = useDevicesContext();


  useEffect(() => {
    if (open) {
      if (!devices.length) fetchDevices();
      if (initialData) {
        form.setFieldsValue({
          device_id: initialData.device.device_id,
          location_issue: initialData.location_issue,
          recommendation: initialData.recommendation,

        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initialData, devices.length, fetchDevices, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch (error) {
      console.error("Validate Failed:", error);
    }
  };

  const { repairs } = useRepairsContext();
  const [busyDeviceIds, setBusyDeviceIds] = React.useState<number[]>([]);

  useEffect(() => {
    // Identify devices currently in an active repair process
    if (!repairs) return;
    
    const busy = repairs
      .filter((r: IRepair) => {
          if (r.canceled) return false;
          if (r.status_request === 'REJECTED' || r.status_request === 'REJECTED_B03') return false;
          if (r.status_acceptance === 'acceptance_admin_approved') return false;
          return true;
      })
      .map((r: IRepair) => r.device?.device_id)
      .filter((id): id is number => typeof id === 'number');
      
    // Remove duplicates
    setBusyDeviceIds(Array.from(new Set(busy)));
  }, [repairs]);

  const filteredDevices = devices.filter(d => {
      // If editing, always allow the current device of this ticket
      if (initialData && initialData.device.device_id === d.device_id) return true;
      
      // Otherwise, exclude if busy
      return !busyDeviceIds.includes(d.device_id);
  });

  // Watch device_id to show details
  const selectedDeviceId = Form.useWatch("device_id", form);
  const selectedDevice = devices.find((d) => d.device_id === selectedDeviceId);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      title={null}
      width={700}
      centered
      okText={initialData ? "Cập nhật" : "Tạo phiếu"}
      cancelText="Hủy bỏ"
    >
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          PHIẾU YÊU CẦU KIỂM TRA
        </Title>
        <Title level={4} style={{ margin: 0 }}>
          BẢO DƯỠNG - SỬA CHỮA
        </Title>
        <Text type="secondary">
          {initialData ? `Mã phiếu: #${initialData.repair_id}` : "Tạo phiếu mới"}
        </Text>
      </div>

      <Form form={form} layout="vertical">
        {/* SECTION 1: DEVICE INFO */}
        <Typography.Title level={5}>I. THÔNG TIN THIẾT BỊ</Typography.Title>
        <Form.Item
          name="device_id"
          label="Chọn thiết bị"
          rules={[{ required: true, message: "Vui lòng chọn thiết bị" }]}
        >
          <Select
            placeholder="Tìm kiếm thiết bị..."
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (String(option?.label ?? "")).toLowerCase().includes(input.toLowerCase())
            }
            options={filteredDevices.map((d) => ({
              value: d.device_id,
              label: `${d.name} (${d.reg_number || 'N/A'}) - ${d.brand || 'N/A'}`,
            }))}
            onChange={() => {
                // Force re-render descriptions via useWatch
            }}
          />
        </Form.Item>

        {selectedDevice && (
           <Descriptions bordered size="small" column={1} style={{ marginBottom: 24 }}>
             <Descriptions.Item label="Tên thiết bị">
               {selectedDevice.name}
             </Descriptions.Item>
             <Descriptions.Item label="Số đăng ký">
               {selectedDevice.reg_number} - {selectedDevice.brand}
             </Descriptions.Item>
             <Descriptions.Item label="Đơn vị quản lý tài sản">
                {selectedDevice.using_department || "Đội Kỹ Thuật"}
             </Descriptions.Item>
           </Descriptions>
        )}

        {/* SECTION 2: FAULT DESCRIPTION */}
        <Typography.Title level={5}>II. MÔ TẢ TÌNH TRẠNG HƯ HỎNG</Typography.Title>
        <Form.Item
          name="location_issue"
          rules={[{ required: true, message: "Vui lòng nhập mô tả sự cố" }]}
        >
          <TextArea
            rows={4}
            placeholder="Mô tả chi tiết tình trạng hư hỏng của thiết bị..."
          />
        </Form.Item>

        {/* SECTION 3: RECOMMENDATION */}
        <Typography.Title level={5}>III. KIẾN NGHỊ / BIỆN PHÁP KHẮC PHỤC</Typography.Title>
         <Form.Item name="recommendation">
          <TextArea
            rows={3}
            placeholder="Đề xuất phương án xử lý (nếu có)..."
          />
        </Form.Item>



      </Form>
    </Modal>
  );
};

export default RepairForm;
