import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Button } from 'antd';

interface TrainingProgramModalProps {
    open: boolean;
    onCancel: () => void;
    onOk: (values: any) => void;
    loading?: boolean;
    initialValues?: any;
}

const TrainingProgramModal: React.FC<TrainingProgramModalProps> = ({
    open,
    onCancel,
    onOk,
    loading,
    initialValues
}) => {
    const [form] = Form.useForm();

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            onOk(values);
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    useEffect(() => {
        if (open) {
            if (initialValues) {
                form.setFieldsValue(initialValues);
            } else {
                form.resetFields();
            }
        }
    }, [open, form, initialValues]);

    return (
        <Modal
            title={initialValues ? "Cập nhật CTĐT / CCCM" : "Thêm mới CTĐT / CCCM"}
            open={open}
            onCancel={onCancel}
            onOk={handleSubmit}
            confirmLoading={loading}
            width={500}
            footer={[
                <Button key="back" onClick={onCancel}>
                    Đóng
                </Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
                    Lưu
                </Button>,
            ]}
        >
            <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 24 }}>
                <Form.Item
                    name="name"
                    label={<span>Tên CTĐT / CCCM <span style={{color: 'red'}}>*</span></span>}
                    rules={[{ required: true, message: 'Vui lòng nhập tên CTĐT' }]}
                >
                    <Input placeholder="Ví dụ: Lái xe nâng hàng / Chứng chỉ quản trị..." />
                </Form.Item>

                <Form.Item
                    name="validity_months"
                    label="Thời hạn định kỳ (Tháng)"
                    initialValue={12}
                    extra="Hệ thống sẽ lấy Ngày ban hành QĐ + Thời hạn này để báo hết hạn."
                >
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default TrainingProgramModal;
