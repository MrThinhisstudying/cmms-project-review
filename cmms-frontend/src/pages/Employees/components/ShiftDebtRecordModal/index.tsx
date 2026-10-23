import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Input,
  Row,
  Col,
  message,
  Typography,
} from 'antd';
import { IUser } from '../../../../types/user.types';
import { IShiftDebt } from '../../../../types/shiftDebt.types';
import { createShiftDebt, updateShiftDebt } from '../../../../apis/shiftDebts';

const { Text } = Typography;
const { TextArea } = Input;

interface ShiftDebtRecordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialValues?: IShiftDebt | null;
  users: IUser[];
  defaultYear: number;
  defaultMonth: number;
}

const ShiftDebtRecordModal: React.FC<ShiftDebtRecordModalProps> = ({
  open,
  onClose,
  onSuccess,
  initialValues,
  users,
  defaultYear,
  defaultMonth,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue({
          user_id: initialValues.user_id,
          year: initialValues.year,
          month: initialValues.month,
          opening_debt: initialValues.opening_debt,
          taken_days: initialValues.taken_days,
          accrued_days: initialValues.accrued_days,
          closing_debt: initialValues.closing_debt,
          reason: initialValues.reason,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          year: defaultYear,
          month: defaultMonth,
          opening_debt: 0,
          taken_days: 0,
          accrued_days: 0,
          closing_debt: 0,
        });
      }
    }
  }, [open, initialValues, defaultYear, defaultMonth, form]);

  const handleValuesChange = (changed: any, all: any) => {
    if ('opening_debt' in changed || 'taken_days' in changed || 'accrued_days' in changed) {
      const opening = Number(all.opening_debt) || 0;
      const taken = Number(all.taken_days) || 0;
      const accrued = Number(all.accrued_days) || 0;
      const closing = opening - taken + accrued;
      form.setFieldsValue({ closing_debt: closing });
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      if (initialValues) {
        await updateShiftDebt(initialValues.id, values);
        message.success('Cập nhật bản ghi nợ ca thành công');
      } else {
        await createShiftDebt(values);
        message.success('Ghi nhận nợ ca thành công');
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu dữ liệu nợ ca';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={initialValues ? 'Chỉnh sửa bản ghi Nợ / Trả ca' : 'Ghi nhận Nợ / Trả ca mới'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleValuesChange}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="user_id"
          label="Nhân viên"
          rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}
        >
          <Select
            showSearch
            placeholder="Tìm và chọn nhân viên"
            optionFilterProp="children"
            disabled={!!initialValues}
          >
            {users.map((u) => (
              <Select.Option key={u.user_id} value={u.user_id}>
                {u.name} ({u.employee_code || u.user_id}) - {u.department?.name || 'Chưa gán'}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="year" label="Năm" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={2020} max={2035} disabled={!!initialValues} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="month" label="Tháng" rules={[{ required: true }]}>
              <Select disabled={!!initialValues}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <Select.Option key={m} value={m}>
                    Tháng {m}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="opening_debt"
              label="Nợ tồn tháng trước"
              rules={[{ required: true, message: 'Nhập số ngày' }]}
            >
              <InputNumber style={{ width: '100%' }} step={0.5} placeholder="0" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="taken_days"
              label="Nghỉ bù trong tháng"
              rules={[{ required: true, message: 'Nhập số ngày' }]}
            >
              <InputNumber style={{ width: '100%' }} min={0} step={0.5} placeholder="0" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="accrued_days"
              label="Nợ ca phát sinh"
              rules={[{ required: true, message: 'Nhập số ngày' }]}
            >
              <InputNumber style={{ width: '100%' }} min={0} step={0.5} placeholder="0" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Nợ ca/lễ tồn tính đến hết tháng (Số ngày)">
          <Form.Item name="closing_debt" noStyle>
            <InputNumber style={{ width: '100%' }} step={0.5} disabled />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
            * Tự động tính theo công thức: <b>(Tồn tháng trước) - (Nghỉ bù) + (Phát sinh)</b>
          </Text>
        </Form.Item>

        <Form.Item name="reason" label="Ghi chú lý do nợ ca/lễ trong tháng">
          <TextArea
            rows={3}
            placeholder="Ví dụ: Tăng cường 14/4, lễ giỗ tổ và 30/4, thay băng tải máy soi, trực tăng mạng, xua đuổi chim 1.5 ngày..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ShiftDebtRecordModal;
