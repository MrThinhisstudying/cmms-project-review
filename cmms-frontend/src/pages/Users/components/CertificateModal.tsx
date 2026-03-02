import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { IEmployeeCertificate, ITrainingProgram, CertificateType } from '../../../types/certificates.types';
import dayjs from 'dayjs';

interface CertificateModalProps {
    open: boolean;
    onCancel: () => void;
    onOk: (values: any, file?: File | null) => void;
    initialValues?: IEmployeeCertificate | null;
    trainingPrograms: ITrainingProgram[];
    certificateType: CertificateType;
    loading?: boolean;
}

const CertificateModal: React.FC<CertificateModalProps> = ({
    open,
    onCancel,
    onOk,
    initialValues,
    trainingPrograms,
    certificateType,
    loading
}) => {
    const [form] = Form.useForm();
    const isEdit = !!initialValues;
    const [fileList, setFileList] = useState<any[]>([]);

    useEffect(() => {
        if (open && initialValues) {
            form.setFieldsValue({
                ...initialValues,
                program_id: initialValues.program?.id,
                start_date: initialValues.start_date ? dayjs(initialValues.start_date) : null,
                end_date: initialValues.end_date ? dayjs(initialValues.end_date) : null,
                issue_date: initialValues.issue_date ? dayjs(initialValues.issue_date) : null,
                return_date: initialValues.return_date ? dayjs(initialValues.return_date) : null,
                evaluation_submit_date: initialValues.evaluation_submit_date ? dayjs(initialValues.evaluation_submit_date) : null,
            });
            if (initialValues.file_url) {
                setFileList([{
                    uid: '-1',
                    name: initialValues.file_url.split('/').pop(),
                    status: 'done',
                    url: `http://localhost:3000${initialValues.file_url}`,
                }]);
            } else {
                setFileList([]);
            }
        } else if (open && !initialValues) {
            form.resetFields();
            setFileList([]);
        }
    }, [open, initialValues, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            // Format dates
            const formattedValues = {
                ...values,
                type: certificateType,
                start_date: values.start_date?.format('YYYY-MM-DD'),
                end_date: values.end_date?.format('YYYY-MM-DD'),
                issue_date: values.issue_date?.format('YYYY-MM-DD'),
                return_date: values.return_date?.format('YYYY-MM-DD'),
                evaluation_submit_date: values.evaluation_submit_date?.format('YYYY-MM-DD'),
            };

            const file = fileList.length > 0 && fileList[0].originFileObj ? fileList[0].originFileObj : null;
            onOk(formattedValues, file);
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    const handleUploadChange = ({ fileList: newFileList }: any) => {
        setFileList(newFileList.slice(-1)); // Only keep 1 file
    };

    const beforeUpload = (file: File) => {
        const isPdfOrImg = file.type === 'application/pdf' || file.type.startsWith('image/');
        if (!isPdfOrImg) {
            message.error('Chỉ hỗ trợ file PDF hoặc Hình ảnh!');
        }
        return isPdfOrImg || Upload.LIST_IGNORE;
    };

    return (
        <Modal
            title={isEdit ? `Cập nhật ${certificateType}` : `Thêm mới ${certificateType}`}
            open={open}
            onCancel={onCancel}
            onOk={handleSubmit}
            confirmLoading={loading}
            width={700}
        >
            <Form form={form} layout="vertical">
                <Form.Item name="program_id" label="Chương trình đào tạo (Chứng chỉ)" rules={[{ required: true, message: 'Vui lòng chọn chứng chỉ' }]}>
                    <Select showSearch optionFilterProp="children">
                        {trainingPrograms.map(p => (
                            <Select.Option key={p.id} value={p.id}>{p.name} ({p.code})</Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <div style={{ display: 'flex', gap: 16 }}>
                    <Form.Item name="certificate_number" label="Số chứng chỉ/Giấy phép" style={{ flex: 1 }} rules={[{ required: true, message: 'Vui lòng nhập số CCCM' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="issue_date" label="Ngày cấp" style={{ flex: 1 }} rules={[{ required: true, message: 'Vui lòng chọn ngày cấp' }]}>
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                    </Form.Item>
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                    <Form.Item name="decision_number" label="Số quyết định" style={{ flex: 1 }}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="start_date" label="Ngày bắt đầu học" style={{ flex: 1 }}>
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="end_date" label="Ngày kết thúc học" style={{ flex: 1 }}>
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                    </Form.Item>
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                    <Form.Item name="return_date" label="Ngày trở về đơn vị" style={{ flex: 1 }}>
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="evaluation_submit_date" label="Ngày nộp phiếu đánh giá" style={{ flex: 1 }}>
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                    </Form.Item>
                </div>

                <Form.Item label="File đính kèm (Scan)">
                    <Upload
                        beforeUpload={beforeUpload}
                        fileList={fileList}
                        onChange={handleUploadChange}
                        maxCount={1}
                        customRequest={({ onSuccess }) => setTimeout(() => onSuccess?.("ok"), 0)}
                    >
                        <Button icon={<UploadOutlined />}>Tải lên PDF/Ảnh</Button>
                    </Upload>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default CertificateModal;
