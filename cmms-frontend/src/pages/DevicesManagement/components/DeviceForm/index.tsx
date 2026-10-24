import React, { useEffect, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Row,
  Col,
  Tabs,
  notification,
  Button,
  Space,
  Tag,
  Divider,
} from "antd";
import {
  CarOutlined,
  EditOutlined,
  PlusOutlined,
  ToolOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { IDevice } from "../../../../types/devicesManagement.types";
import { getAllDeviceTypes, IDeviceType } from "../../../../apis/device-types";
import { getToken } from "../../../../utils/auth";

type DeviceFormProps = {
  open: boolean;
  initialData?: IDevice | null;
  onClose: () => void;
  onSubmit: (data: Partial<IDevice>) => Promise<void> | void;
  loading?: boolean;
};

const { Option } = Select;
const { TextArea } = Input;

const DeviceForm: React.FC<DeviceFormProps> = ({
  open,
  initialData,
  onClose,
  onSubmit,
  loading,
}) => {
  const [form] = Form.useForm();
  const isEdit = Boolean(initialData?.device_id);
  const [deviceTypes, setDeviceTypes] = useState<IDeviceType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("tab1");

  useEffect(() => {
    const fetchTypes = async () => {
      setLoadingTypes(true);
      try {
        const res = await getAllDeviceTypes(getToken());
        setDeviceTypes(Array.isArray(res) ? res : []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingTypes(false);
      }
    };
    if (open) {
      fetchTypes();
      setActiveTab("tab1");
    }
  }, [open]);

  useEffect(() => {
    if (open && initialData) {
      form.setFieldsValue({
        ...initialData,
        deviceTypeId: initialData.deviceType?.id,
      });
    } else {
      form.resetFields();
    }
  }, [open, initialData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const payload: Partial<IDevice> = {
        ...values,
      };
      await onSubmit(payload);
    } catch (error: any) {
      console.error("Validate Failed:", error);
      notification.error({
        message: "Thông tin chưa hợp lệ",
        title: "Lỗi",
        description: error?.message || "Vui lòng kiểm tra lại các trường bắt buộc (*).",
      });
    }
  };

  const tabItems = [
    {
      key: "tab1",
      label: (
        <span style={{ fontWeight: 600 }}>
          <AppstoreOutlined style={{ marginRight: 6 }} />
          1. Định Danh & Phân Loại
        </span>
      ),
      children: (
        <div style={{ paddingTop: 8 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label={<span style={{ fontWeight: 600 }}>Tên phương tiện / Thiết bị</span>}
                rules={[{ required: true, message: "Vui lòng nhập tên phương tiện" }]}
              >
                <Input placeholder="Ví dụ: Xe đầu kéo TLD 01" size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="reg_number"
                label={
                  <Space size={4}>
                    <span style={{ fontWeight: 600 }}>Biển số xe / Số hiệu đăng ký</span>
                    <Tag color="cyan" style={{ margin: 0, fontSize: 11 }}>
                      Định danh chính
                    </Tag>
                  </Space>
                }
              >
                <Input placeholder="Ví dụ: VCS11202, 72A-123.45" size="large" style={{ borderRadius: 8, fontWeight: 600 }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="deviceTypeId"
                label={<span style={{ fontWeight: 600 }}>Loại thiết bị / Chủng loại</span>}
                rules={[{ required: true, message: "Vui lòng chọn loại thiết bị" }]}
              >
                <Select
                  placeholder="Chọn loại xe..."
                  loading={loadingTypes}
                  size="large"
                  style={{ borderRadius: 8 }}
                  showSearch
                  optionFilterProp="children"
                >
                  {deviceTypes.map((type) => (
                    <Option key={type.id} value={type.id}>
                      {type.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="brand"
                label={<span style={{ fontWeight: 600 }}>Nhãn hiệu / Hãng SX</span>}
                rules={[{ required: true, message: "Vui lòng nhập nhãn hiệu" }]}
              >
                <Input placeholder="Ví dụ: Toyota, TLD, TUG..." size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="country_of_origin"
                label={<span style={{ fontWeight: 600 }}>Nước sản xuất</span>}
              >
                <Input placeholder="Ví dụ: Nhật Bản, Pháp, Mỹ..." size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="device_code"
                label={<span style={{ fontWeight: 600 }}>Mã thiết bị (Nội bộ)</span>}
              >
                <Input placeholder="Ví dụ: TTB-001" size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="serial_number"
                label={<span style={{ fontWeight: 600 }}>Số khung / Serial Number</span>}
              >
                <Input placeholder="Số serial khung máy" size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="status"
                label={<span style={{ fontWeight: 600 }}>Trạng thái hoạt động</span>}
                rules={[{ required: true, message: "Chọn trạng thái" }]}
              >
                <Select size="large" style={{ borderRadius: 8 }}>
                  <Option value="MOI">
                    <Tag color="blue" style={{ marginRight: 6 }}>Mới</Tag> Sẵn sàng bàn giao
                  </Option>
                  <Option value="DANG_SU_DUNG">
                    <Tag color="green" style={{ marginRight: 6 }}>Đang sử dụng</Tag> Vận hành tốt
                  </Option>
                  <Option value="SU_DUNG_HAN_CHE">
                    <Tag color="orange" style={{ marginRight: 6 }}>Sử dụng hạn chế</Tag> Theo dõi đặc biệt
                  </Option>
                  <Option value="DANG_SUA_CHUA">
                    <Tag color="red" style={{ marginRight: 6 }}>Đang sửa chữa</Tag> Đang bảo trì
                  </Option>
                  <Option value="THANH_LY">
                    <Tag color="default" style={{ marginRight: 6 }}>Thanh lý</Tag> Chờ thanh lý
                  </Option>
                  <Option value="HUY_BO">
                    <Tag color="red" style={{ marginRight: 6 }}>Hủy bỏ</Tag> Ngừng khai thác
                  </Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="using_department"
                label={<span style={{ fontWeight: 600 }}>Đơn vị / Đội sử dụng</span>}
              >
                <Input placeholder="Ví dụ: Đội Phục vụ Sân đỗ, Đội Kỹ thuật..." size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="manufacture_year"
                label={<span style={{ fontWeight: 600 }}>Năm sản xuất</span>}
              >
                <InputNumber
                  placeholder="YYYY"
                  style={{ width: "100%", borderRadius: 8 }}
                  size="large"
                  min={1980}
                  max={2100}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="usage_start_year"
                label={<span style={{ fontWeight: 600 }}>Năm đưa vào SD</span>}
              >
                <InputNumber
                  placeholder="YYYY"
                  style={{ width: "100%", borderRadius: 8 }}
                  size="large"
                  min={1980}
                  max={2100}
                />
              </Form.Item>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: "tab2",
      label: (
        <span style={{ fontWeight: 600 }}>
          <ToolOutlined style={{ marginRight: 6 }} />
          2. Vận Hành & Kỹ Thuật
        </span>
      ),
      children: (
        <div style={{ paddingTop: 8 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="usage_purpose"
                label={<span style={{ fontWeight: 600 }}>Mục đích sử dụng</span>}
              >
                <Input placeholder="Ví dụ: Kéo đẩy tàu bay, cấp điện mặt đất..." size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="operating_scope"
                label={<span style={{ fontWeight: 600 }}>Phạm vi hoạt động</span>}
              >
                <Input placeholder="Ví dụ: Khu bay, Sân đỗ số 1 & 2..." size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="daily_operation_time"
                label={<span style={{ fontWeight: 600 }}>Thời gian hoạt động/ngày</span>}
              >
                <Input placeholder="Ví dụ: 8 giờ/ngày, 16h/ngày..." size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="power_source"
                label={<span style={{ fontWeight: 600 }}>Nguồn năng lượng / Động cơ</span>}
              >
                <Input placeholder="Ví dụ: Diesel, Điện Pin Lithium, Xăng..." size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="power_consumption"
                label={<span style={{ fontWeight: 600 }}>Công suất tiêu thụ / Dung tích</span>}
              >
                <Input placeholder="Ví dụ: 75 kW, 2500 cc..." size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="start" style={{ fontSize: 13, color: "#64748b", margin: "12px 0 16px 0" }}>
            Kích thước & Trọng lượng phương tiện
          </Divider>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="length" label={<span style={{ fontWeight: 600 }}>Chiều dài (m)</span>}>
                <Input placeholder="Dài (m)" size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="width" label={<span style={{ fontWeight: 600 }}>Chiều rộng (m)</span>}>
                <Input placeholder="Rộng (m)" size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="height" label={<span style={{ fontWeight: 600 }}>Chiều cao (m)</span>}>
                <Input placeholder="Cao (m)" size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="weight" label={<span style={{ fontWeight: 600 }}>Khối lượng (kg / tấn)</span>}>
                <Input placeholder="Khối lượng" size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: "tab3",
      label: (
        <span style={{ fontWeight: 600 }}>
          <FileTextOutlined style={{ marginRight: 6 }} />
          3. Mã Quản Lý & Ghi Chú
        </span>
      ),
      children: (
        <div style={{ paddingTop: 8 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="fixed_asset_code"
                label={<span style={{ fontWeight: 600 }}>Mã tài sản cố định (TSCĐ)</span>}
              >
                <Input placeholder="Mã theo sổ sách kế toán" size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="technical_code_address"
                label={<span style={{ fontWeight: 600 }}>Mã số / Địa chỉ kỹ thuật</span>}
              >
                <Input placeholder="Mã kỹ thuật nội bộ" size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="location_coordinates"
                label={<span style={{ fontWeight: 600 }}>Vị trí / Tọa độ đỗ thường xuyên</span>}
              >
                <Input placeholder="Khu vực đỗ xe, Gate..." size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="relocation_origin"
                label={<span style={{ fontWeight: 600 }}>Xuất xứ khi di dời (nếu có)</span>}
              >
                <Input placeholder="Đơn vị hoặc sân bay trước đó" size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="relocation_year"
                label={<span style={{ fontWeight: 600 }}>Năm di dời</span>}
              >
                <InputNumber placeholder="YYYY" style={{ width: "100%", borderRadius: 8 }} size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="note" label={<span style={{ fontWeight: 600 }}>Ghi chú tổng quát</span>}>
            <TextArea rows={2} placeholder="Các lưu ý đặc thù về xe này..." style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item name="other_specifications" label={<span style={{ fontWeight: 600 }}>Thông số kỹ thuật khác</span>}>
            <TextArea rows={2} placeholder="Thông tin bổ sung..." style={{ borderRadius: 8 }} />
          </Form.Item>
        </div>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: isEdit
                ? "linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)"
                : "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 20,
              boxShadow: isEdit
                ? "0 4px 12px rgba(250, 140, 22, 0.3)"
                : "0 4px 12px rgba(22, 119, 255, 0.3)",
            }}
          >
            {isEdit ? <EditOutlined /> : <CarOutlined />}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a" }}>
              {isEdit ? "Cập Nhật Hồ Sơ Phương Tiện" : "Khai Báo Thiết Bị / Phương Tiện Mới"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>
              {isEdit
                ? `Chỉnh sửa thông số kỹ thuật và định danh cho: ${initialData?.name || ""}`
                : "Tạo mới hồ sơ số cho trang thiết bị, xe kéo, xe thang trong hệ thống"}
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      confirmLoading={loading}
      width={980}
      centered
      destroyOnClose
      maskClosable={false}
    >
      <Divider style={{ margin: "14px 0" }} />

      <Form form={form} layout="vertical" initialValues={{ status: "MOI" }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <Button size="large" onClick={onClose} style={{ borderRadius: 8 }} disabled={loading}>
            Hủy bỏ
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            onClick={handleOk}
            loading={loading}
            style={{
              borderRadius: 8,
              fontWeight: 600,
              background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
              border: "none",
              paddingLeft: 24,
              paddingRight: 24,
              boxShadow: "0 4px 14px rgba(22, 119, 255, 0.25)",
            }}
          >
            {isEdit ? "Lưu Thay Đổi" : "Khởi Tạo Thiết Bị"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default DeviceForm;
