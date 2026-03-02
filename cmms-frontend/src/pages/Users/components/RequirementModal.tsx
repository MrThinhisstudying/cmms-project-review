import React, { useEffect } from 'react';
import { Modal, Form, Select, DatePicker, Input, Button } from 'antd';
import { ITrainingProgram, IUserTrainingRequirement } from '../../../types/certificates.types';
import dayjs from 'dayjs';

interface RequirementModalProps {
    open: boolean;
    onCancel: () => void;
    onOk: (values: any) => void;
    initialValues: IUserTrainingRequirement | null;
    loading: boolean;
    trainingPrograms: ITrainingProgram[];
}

const RequirementModal: React.FC<RequirementModalProps> = ({
    open,
    onCancel,
    onOk,
    initialValues,
    loading,
    trainingPrograms
}) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open) {
            if (initialValues) {
                form.setFieldsValue({
                    program_id: initialValues.program?.id,
                    required_date: initialValues.required_date ? dayjs(initialValues.required_date) : undefined,
                    note: initialValues.note,
                    status: initialValues.status,
                });
            } else {
                form.resetFields();
            }
        }
    }, [open, initialValues, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const formattedValues = {
                ...values,
                required_date: values.required_date ? values.required_date.format('YYYY-MM-DD') : null,
            };
            onOk(formattedValues);
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    return (
        <Modal
            title={initialValues ? 'Cập nhật yêu cầu đào tạo' : 'Thêm yêu cầu đào tạo'}
            open={open}
            onCancel={onCancel}
            onOk={handleSubmit}
            confirmLoading={loading}
            okText="Lưu"
            cancelText="Hủy"
            destroyOnClose
            width={600}
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    name="program_id"
                    label="Chương trình đào tạo / Khóa học"
                    rules={[{ required: true, message: 'Vui lòng chọn khóa học!' }]}
                >
                    <Select
                        showSearch
                        placeholder="Chọn khóa học"
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                            (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                        }
                        options={trainingPrograms.map(p => ({
                            value: p.id,
                            label: `${p.code ? p.code + ' - ' : ''}${p.name}`
                        }))}
                    />
                </Form.Item>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Form.Item name="required_date" label="Hạn chót hoàn thành">
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                    </Form.Item>
                    
                    {initialValues && (
                        <Form.Item name="status" label="Trạng thái">
                            <Select>
                                <Select.Option value="PENDING">Đang chờ</Select.Option>
                                <Select.Option value="FULFILLED">Đã hoàn thành</Select.Option>
                            </Select>
                        </Form.Item>
                    )}
                </div>

                <Form.Item name="note" label="Ghi chú">
                    <Input.TextArea rows={3} placeholder="Nhập ghi chú (nếu có)" />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default RequirementModal;
