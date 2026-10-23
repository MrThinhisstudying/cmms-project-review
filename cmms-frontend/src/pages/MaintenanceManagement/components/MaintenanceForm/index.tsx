import React, { useState, useEffect } from "react";
import {
  Form,
  Select,
  Button,
  message,
  Card,
  DatePicker,
  Tag,
  Spin,
  Input,
} from "antd";
import {
  CarOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { createMaintenanceTicket } from "../../../../apis/maintenance";
import { getAllDevices } from "../../../../apis/devices";
import { getToken } from "../../../../utils/auth";
import dayjs from "dayjs";
import "dayjs/locale/vi";

const { Option } = Select;

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

const MaintenanceForm: React.FC<Props> = ({
  onSuccess,
  onCancel,
  initialData,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const token = getToken();

  // Load devices list if manual selection is needed
  useEffect(() => {
    if (!initialData?.device) {
      getAllDevices(token)
        .then((devs) => {
          if (Array.isArray(devs)) setDevices(devs);
        })
        .catch(() => {
          message.error("Lỗi tải danh sách thiết bị");
        });
    }
  }, [initialData, token]);

  // Sync initialData with form
  useEffect(() => {
    if (initialData) {
      form.setFieldsValue({
        device_id: initialData.device_id,
        maintenance_level:
          initialData.maintenance_level || initialData.level || "Tuần",
        execution_date: initialData.scheduled_date
          ? dayjs(initialData.scheduled_date)
          : dayjs(),
      });
      if (initialData.device) {
        setSelectedDevice(initialData.device);
      }
    } else {
      form.resetFields();
      form.setFieldsValue({
        execution_date: dayjs(),
        maintenance_level: "Tuần",
      });
      setSelectedDevice(null);
    }
  }, [initialData, form]);

  const onFinish = async (values: any) => {
    const devId =
      initialData?.device_id || values.device_id || selectedDevice?.device_id;
    if (!devId) {
      message.error("Vui lòng chọn thiết bị / xe cần bảo dưỡng!");
      return;
    }

    const execDate = values.execution_date
      ? dayjs.isDayjs(values.execution_date)
        ? values.execution_date.toISOString()
        : dayjs(values.execution_date).toISOString()
      : initialData?.scheduled_date
      ? dayjs(initialData.scheduled_date).toISOString()
      : new Date().toISOString();

    const level =
      initialData?.maintenance_level ||
      initialData?.level ||
      values.maintenance_level ||
      "Tuần";

    const payload = {
      device_id: devId,
      maintenance_level: level,
      execution_date: execDate,
      template_id: null,
      checklist_result: [],
      acceptance_result: [],
      final_conclusion: true,
      working_hours: 0,
      execution_team: [],
      status: "done",
    };

    setLoading(true);
    try {
      await createMaintenanceTicket(token, payload);
      message.success("Hoàn thành bảo dưỡng thành công!");
      onSuccess();
    } catch (err: any) {
      message.error("Lỗi: " + (err.message || "Không thể lưu bảo dưỡng"));
    } finally {
      setLoading(false);
    }
  };

  const displayDevice = initialData?.device || selectedDevice;
  const scheduledDate =
    initialData?.scheduled_date || displayDevice?.next_maintenance_date;
  const maintenanceLevel =
    initialData?.maintenance_level || initialData?.level || "Tuần";

  return (
    <Spin spinning={loading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          execution_date: initialData?.scheduled_date
            ? dayjs(initialData.scheduled_date)
            : dayjs(),
        }}
      >
        {/* Device selector if not opened directly from a plan row */}
        {!initialData?.device && (
          <Form.Item
            name="device_id"
            label="Chọn thiết bị / xe bảo dưỡng"
            rules={[{ required: true, message: "Vui lòng chọn thiết bị" }]}
            style={{ marginBottom: 16 }}
          >
            <Select
              placeholder="Chọn thiết bị..."
              showSearch
              optionFilterProp="children"
              size="large"
              onChange={(val) => {
                const dev = devices.find((d) => d.device_id === val);
                setSelectedDevice(dev);
              }}
            >
              {devices.map((d) => (
                <Option key={d.device_id} value={d.device_id}>
                  {d.name} ({d.reg_number || d.serial_number || "Chưa có biển"})
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Khối giao diện xanh dương theo chuẩn thiết kế */}
        {displayDevice ? (
          <Card
            size="small"
            style={{
              marginBottom: 20,
              background: "linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%)",
              border: "1px solid #91d5ff",
              borderRadius: 8,
              boxShadow: "0 2px 8px rgba(24, 144, 255, 0.08)",
            }}
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#1890ff",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <CarOutlined /> THÔNG TIN XE BẢO DƯỠNG THEO KẾ HOẠCH
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#002766",
                    marginTop: 4,
                  }}
                >
                  {displayDevice.name}
                </div>
                <div style={{ fontSize: 13, color: "#595959", marginTop: 2 }}>
                  Nhãn hiệu / Chủng loại:{" "}
                  <b>
                    {displayDevice.brand ||
                      displayDevice.deviceType?.name ||
                      "Nhật Bản"}
                  </b>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: "1px solid #d9d9d9",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                    BIỂN SỐ / ĐĂNG KÝ
                  </div>
                  <Tag
                    color="cyan"
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      margin: "2px 0 0 0",
                    }}
                  >
                    {displayDevice.reg_number ||
                      displayDevice.serial_number ||
                      "Chưa có biển"}
                  </Tag>
                </div>

                <div
                  style={{
                    background: "#fff",
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: "1px solid #d9d9d9",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                    NGÀY BD KẾ HOẠCH
                  </div>
                  <Tag
                    color="green"
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      margin: "2px 0 0 0",
                    }}
                  >
                    <CalendarOutlined style={{ marginRight: 4 }} />
                    {scheduledDate
                      ? dayjs(scheduledDate).format("DD/MM/YYYY")
                      : dayjs().format("DD/MM/YYYY")}
                  </Tag>
                </div>

                <div
                  style={{
                    background: "#fff",
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: "1px solid #d9d9d9",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                    CẤP BẢO DƯỠNG
                  </div>
                  <Tag
                    color="purple"
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      margin: "2px 0 0 0",
                    }}
                  >
                    {maintenanceLevel}
                  </Tag>
                </div>
              </div>
            </div>

            {/* DÒNG CHỌN NGÀY THỰC HIỆN BẢO DƯỠNG */}
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: "1px dashed #91d5ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CalendarOutlined style={{ fontSize: 18, color: "#1890ff" }} />
                <span
                  style={{ fontWeight: 600, fontSize: 14, color: "#002766" }}
                >
                  Ngày thực hiện bảo dưỡng:
                </span>
                <span style={{ fontSize: 12, color: "#8c8c8c" }}>
                  (Mặc định theo kế hoạch, có thể chọn lại nếu thực hiện ngày khác)
                </span>
              </div>

              <Form.Item
                name="execution_date"
                noStyle
                rules={[{ required: true, message: "Chọn ngày bảo dưỡng" }]}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{ width: 180, fontWeight: 600, borderColor: "#1890ff" }}
                  size="large"
                  allowClear={false}
                />
              </Form.Item>
            </div>
          </Card>
        ) : null}

        {/* Hidden inputs */}
        <Form.Item name="device_id" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="maintenance_level" hidden>
          <Input />
        </Form.Item>

        {/* Nút hành động */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 16,
          }}
        >
          <Button size="large" onClick={onCancel} disabled={loading}>
            Hủy
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            icon={<CheckCircleOutlined />}
            loading={loading}
            disabled={!displayDevice}
            style={{
              background: "#1890ff",
              borderColor: "#1890ff",
              fontWeight: 600,
              paddingLeft: 24,
              paddingRight: 24,
            }}
          >
            Hoàn thành bảo dưỡng
          </Button>
        </div>
      </Form>
    </Spin>
  );
};

export default MaintenanceForm;
