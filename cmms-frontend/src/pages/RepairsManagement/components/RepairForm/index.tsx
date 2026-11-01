import React, { useEffect, useRef, useMemo } from "react";
import {
  Modal,
  Form,
  Input,

  Select,
  Typography,
  Descriptions,
} from "antd";
import { IRepair, RepairUpsertPayload, BulkRepairUpsertPayload } from "../../../../types/repairs.types";
import { useDevicesContext } from "../../../../context/DevicesContext/DevicesContext";

const { Title, Text } = Typography;
const { TextArea } = Input;


interface RepairFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RepairUpsertPayload | BulkRepairUpsertPayload) => void;
  loading: boolean;
  initialData: IRepair | null;
  prefilledData?: {
    device_id?: number;
    device?: any;
    location_issue?: string;
    recommendation?: string;
    incidentReportId?: number;
  } | null;
}

const RepairForm: React.FC<RepairFormProps> = ({
  open,
  onClose,
  onSubmit,
  loading,
  initialData,
  prefilledData,
}) => {
  const [form] = Form.useForm();
  const { devices, fetchDevices } = useDevicesContext();
  const lastRepairIdRef = useRef<number | null | string | undefined>(undefined);

  // Tải danh mục thiết bị nếu chưa có khi mở modal
  useEffect(() => {
    if (open && devices.length === 0) {
      fetchDevices();
    }
  }, [open, devices.length, fetchDevices]);

  // Đảm bảo thiết bị được chuyển tiếp từ sự cố luôn có mặt trong danh sách options của Select
  const availableDevices = useMemo(() => {
    if (!prefilledData?.device && !prefilledData?.device_id) return devices;
    const devId = Number(prefilledData.device_id);
    const exists = devices.some((d) => Number(d.device_id) === devId);
    if (!exists && prefilledData.device) {
      return [
        {
          ...prefilledData.device,
          device_id: devId,
        } as any,
        ...devices,
      ];
    }
    return devices;
  }, [devices, prefilledData]);

  // Khởi tạo giá trị form duy nhất 1 lần khi mở form hoặc khi đổi sang phiếu khác
  useEffect(() => {
    if (!open) {
      lastRepairIdRef.current = undefined;
      return;
    }

    const currentId = initialData
      ? initialData.repair_id
      : prefilledData
      ? `PREFILLED_${prefilledData.incidentReportId || prefilledData.device_id}`
      : "NEW";

    if (lastRepairIdRef.current !== currentId) {
      lastRepairIdRef.current = currentId;
      if (initialData) {
        form.setFieldsValue({
          device_id: initialData.device.device_id,
          location_issue: initialData.location_issue,
          recommendation: initialData.recommendation,
        });
      } else if (prefilledData) {
        form.setFieldsValue({
          device_id: prefilledData.device_id ? [prefilledData.device_id] : [],
          location_issue: prefilledData.location_issue || "",
          recommendation: "",
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initialData, prefilledData, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch (error) {
      console.error("Validate Failed:", error);
    }
  };

  // The user requested that a single device can have multiple repair tickets simultaneously.
  // Therefore, we no longer filter out devices that are currently in an active repair process.
  const filteredDevices = availableDevices;

  // Watch device_id to show details. For array, show the first selected device or a summary.
  const selectedDeviceValue = Form.useWatch("device_id", form);
  
  // Decide whether the select field is single or multiple based on whether we are updating or creating.
  const isMultiple = initialData === null;

  // Selected Device for detail display. If multiple, show details of the first selected just as preview
  const firstSelectedId = Array.isArray(selectedDeviceValue) ? selectedDeviceValue[0] : selectedDeviceValue;
  const selectedDevice =
    availableDevices.find((d) => Number(d.device_id) === Number(firstSelectedId)) ||
    (Number(firstSelectedId) === Number(prefilledData?.device_id) ? prefilledData?.device : undefined);
  const selectedCount = Array.isArray(selectedDeviceValue) ? selectedDeviceValue.length : (selectedDeviceValue ? 1 : 0);

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
          {initialData
            ? `Mã phiếu: #${initialData.repair_id}`
            : prefilledData?.incidentReportId
            ? `Lập hồ sơ sửa chữa từ sự cố #${prefilledData.incidentReportId}`
            : "Tạo phiếu mới"}
        </Text>
      </div>

      <Form form={form} layout="vertical">
        {/* SECTION 1: DEVICE INFO */}
        <Typography.Title level={5}>I. THÔNG TIN THIẾT BỊ</Typography.Title>
        <Form.Item
          name="device_id"
          label={isMultiple ? "Chọn thiết bị (Có thể chọn nhiều)" : "Chọn thiết bị"}
          rules={[{ required: true, message: "Vui lòng chọn ít nhất 1 thiết bị" }]}
        >
          <Select
            mode={isMultiple ? "multiple" : undefined}
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

        {selectedCount > 0 && (
           <Descriptions bordered size="small" column={1} style={{ marginBottom: 24 }}>
             {isMultiple && selectedCount > 1 ? (
                <>
                  <Descriptions.Item label="Số lượng đã chọn">
                    <Typography.Text type="success" strong>{selectedCount} thiết bị</Typography.Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Danh sách thiết bị">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {Array.isArray(selectedDeviceValue) && selectedDeviceValue.map(id => {
                        const d = availableDevices.find(x => Number(x.device_id) === Number(id));
                        return d ? <Typography.Text key={id}>• {d.name} ({d.reg_number || 'N/A'})</Typography.Text> : null;
                      })}
                    </div>
                  </Descriptions.Item>
                </>
             ) : (
                <>
                  <Descriptions.Item label="Tên thiết bị">
                    {selectedDevice?.name || prefilledData?.device?.name || "N/A"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Số đăng ký">
                    {selectedDevice?.reg_number || prefilledData?.device?.reg_number || "N/A"}{" "}
                    {(selectedDevice?.brand || prefilledData?.device?.brand)
                      ? `- ${selectedDevice?.brand || prefilledData?.device?.brand}`
                      : ""}
                  </Descriptions.Item>
                  <Descriptions.Item label="Đơn vị quản lý tài sản">
                    {selectedDevice?.using_department || prefilledData?.device?.using_department || "Đội Kỹ Thuật"}
                  </Descriptions.Item>
                </>
             )}
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
