import React, { useEffect } from "react";
import { Modal, Form, Input, Select, DatePicker, InputNumber, Row, Col, Divider, notification } from "antd";
import { IDevice } from "../../../../types/devicesManagement.types";
import dayjs from "dayjs";

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

  useEffect(() => {
    if (open && initialData) {
      form.setFieldsValue({
        ...initialData,
        inspection_expiry: initialData.inspection_expiry ? dayjs(initialData.inspection_expiry) : null,
        insurance_expiry: initialData.insurance_expiry ? dayjs(initialData.insurance_expiry) : null,
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
          inspection_expiry: values.inspection_expiry ? values.inspection_expiry.toISOString() : null,
          insurance_expiry: values.insurance_expiry ? values.insurance_expiry.toISOString() : null,
      };
      await onSubmit(payload);
    } catch (error: any) {
      console.error("Validate Failed:", error);
      notification.error({
          message: "Có lỗi xảy ra",
          title: "Lỗi",
          description: error?.message || "Vui lòng kiểm tra lại thông tin.",
      });
    }
  };

  return (
    <Modal
      title={isEdit ? "Cập nhật thiết bị" : "Thêm mới thiết bị"}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={loading}
      width={1000}
      okText={isEdit ? "Lưu thay đổi" : "Tạo mới"}
      cancelText="Hủy"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ status: "MOI" }}
      >
        <Row gutter={16}>
           <Col span={8}>
              <Form.Item name="name" label="Tên phương tiện" rules={[{ required: true }]}>
                 <Input />
              </Form.Item>
           </Col>
           <Col span={8}>
               <Form.Item name="device_code" label="Mã thiết bị" rules={[{ required: true }]}>
                   <Input />
               </Form.Item>
           </Col>
        </Row>
        <Row gutter={16}>
           <Col span={8}>
               <Form.Item name="serial_number" label="Số máy (Serial Number)">
                   <Input />
               </Form.Item>
           </Col>
           <Col span={8}>
               <Form.Item name="reg_number" label="Biển số">
                   <Input />
               </Form.Item>
           </Col>
           <Col span={8}>
                <Form.Item name="daily_operation_time" label="Thời gian hoạt động/ngày">
                    <Input />
                </Form.Item>
           </Col>
        </Row>
        <Row gutter={16}>
            <Col span={8}>
                <Form.Item name="brand" label="Nhãn hiệu" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item name="country_of_origin" label="Nước sản xuất">
                    <Input />
                </Form.Item>
            </Col>
             <Col span={8}>
                <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
                    <Select>
                        <Option value="MOI">Mới</Option>
                        <Option value="DANG_SU_DUNG">Đang sử dụng</Option>
                        <Option value="SU_DUNG_HAN_CHE">Sử dụng hạn chế</Option>
                        <Option value="DANG_SUA_CHUA">Đang sửa chữa</Option>
                        <Option value="THANH_LY">Thanh lý</Option>
                        <Option value="HUY_BO">Huỷ bỏ</Option>
                    </Select>
                </Form.Item>
            </Col>
        </Row>
        <Row gutter={16}>
            <Col span={6}>
                 <Form.Item name="manufacture_year" label="Năm sản xuất">
                     <InputNumber style={{ width: '100%' }} />
                 </Form.Item>
            </Col>
            <Col span={6}>
                 <Form.Item name="usage_start_year" label="Năm bắt đầu sử dụng">
                     <InputNumber style={{ width: '100%' }} />
                 </Form.Item>
            </Col>
            <Col span={6}>
                 <Form.Item name="inspection_expiry" label="Hạn đăng kiểm">
                     <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                 </Form.Item>
            </Col>
             <Col span={6}>
                 <Form.Item name="insurance_expiry" label="Hạn bảo hiểm">
                     <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                 </Form.Item>
            </Col>
        </Row>

        <Divider>Thông tin kỹ thuật</Divider>
        
        <Row gutter={16}>
            <Col span={8}>
                <Form.Item name="usage_purpose" label="Mục đích sử dụng">
                    <Input />
                </Form.Item>
            </Col>
            <Col span={8}>
                 <Form.Item name="operating_scope" label="Phạm vi hoạt động">
                    <Input />
                </Form.Item>
            </Col>
             <Col span={8}>
                <Form.Item name="using_department" label="Đơn vị sử dụng">
                    <Input />
                </Form.Item>
            </Col>
        </Row>

        <Row gutter={16}>
            <Col span={8}>
                 <Form.Item name="technical_code_address" label="Mã số/Địa chỉ kỹ thuật">
                    <Input />
                </Form.Item>
            </Col>
            <Col span={8}>
                 <Form.Item name="fixed_asset_code" label="Mã số tài sản cố định (TSCĐ)">
                    <Input />
                </Form.Item>
            </Col>
            <Col span={8}>
                 <Form.Item name="location_coordinates" label="Địa điểm/Tọa độ">
                    <Input />
                </Form.Item>
            </Col>
        </Row>

        <Row gutter={16}>
            <Col span={12}>
                 <Form.Item name="relocation_origin" label="Xuất xứ khi di dời">
                    <Input />
                </Form.Item>
            </Col>
            <Col span={12}>
                 <Form.Item name="relocation_year" label="Năm di dời">
                    <InputNumber style={{ width: '100%' }} />
                </Form.Item>
            </Col>
        </Row>

        <Row gutter={16}>

            <Col span={6}>
                 <Form.Item name="length" label="Chiều dài">
                    <Input />
                </Form.Item>
            </Col>
            <Col span={6}>
                 <Form.Item name="width" label="Chiều rộng">
                    <Input />
                </Form.Item>
            </Col>
            <Col span={6}>
                 <Form.Item name="height" label="Chiều cao">
                    <Input />
                </Form.Item>
            </Col>
             <Col span={6}>
                 <Form.Item name="weight" label="Khối lượng">
                    <Input />
                </Form.Item>
            </Col>
        </Row>

        <Row gutter={16}>
            <Col span={12}>
                 <Form.Item name="power_source" label="Nguồn điện">
                    <Input />
                </Form.Item>
            </Col>
            <Col span={12}>
                 <Form.Item name="power_consumption" label="Công suất tiêu thụ">
                    <Input />
                </Form.Item>
            </Col>
        </Row>
        
        <Form.Item name="note" label="Ghi chú">
            <TextArea rows={3} />
        </Form.Item>

         <Form.Item name="other_specifications" label="Thông số khác">
            <TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DeviceForm;
