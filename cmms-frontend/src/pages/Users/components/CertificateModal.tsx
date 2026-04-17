import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, DatePicker, Button, Space, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { IEmployeeCertificate, ITrainingProgram, CertificateType } from '../../../types/certificates.types';
import certificatesApi from '../../../apis/certificates';
import { IUser } from '../../../types/user.types';
import TrainingProgramModal from './TrainingProgramModal';
import dayjs from 'dayjs';

interface CertificateModalProps {
    open: boolean;
    onCancel: () => void;
    onOk: (values: any) => void;
    initialValues?: IEmployeeCertificate | null;
    trainingPrograms: ITrainingProgram[];
    certificateType: CertificateType;
    loading?: boolean;
    user?: IUser | null;
}

const CertificateModal: React.FC<CertificateModalProps> = ({
    open,
    onCancel,
    onOk,
    initialValues,
    trainingPrograms,
    certificateType,
    loading,
    user
}) => {
    const [form] = Form.useForm();
    const isEdit = !!initialValues;
    
    const [localPrograms, setLocalPrograms] = useState<ITrainingProgram[]>([]);
    const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
    const [programModalLoading, setProgramModalLoading] = useState(false);

    useEffect(() => {
        setLocalPrograms(trainingPrograms);
    }, [trainingPrograms]);

    useEffect(() => {
        if (open && initialValues) {
            form.setFieldsValue({
                program_id: initialValues.program?.id,
                issue_date: initialValues.issue_date ? dayjs(initialValues.issue_date) : null,
                grading: initialValues.grading,
            });
        } else if (open && !initialValues) {
            form.resetFields();
        }
    }, [open, initialValues, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const formattedValues = {
                ...values,
                type: certificateType,
                issue_date: values.issue_date?.format('YYYY-MM-DD'),
            };
            onOk(formattedValues); // No file field anymore
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    const handleAddProgram = async (values: any) => {
        setProgramModalLoading(true);
        try {
            const newProgram = await certificatesApi.createTrainingProgram(values);
            setLocalPrograms(prev => [...prev, newProgram]);
            form.setFieldValue('program_id', newProgram.id);
            setIsProgramModalOpen(false);
            message.success('Thêm chứng chỉ mới thành công');
        } catch (error: any) {
            message.error(error.message || 'Lỗi thêm chứng chỉ mới');
        } finally {
            setProgramModalLoading(false);
        }
    };

    return (
        <Modal
            title={
                <div>
                    <div>{isEdit ? `Cập nhật ${certificateType}` : `Thêm mới ${certificateType}`}</div>
                    {user && (
                        <div style={{ fontSize: '14px', fontWeight: 'normal', color: '#1890ff', marginTop: 4 }}>
                            Học viên: {user.name} - Mã: {user.employee_code || user.user_id}
                        </div>
                    )}
                </div>
            }
            open={open}
            onCancel={onCancel}
            onOk={handleSubmit}
            confirmLoading={loading}
            width={600}
            footer={[
                <Button key="back" onClick={onCancel}>
                    Đóng
                </Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
                    Lưu thông tin
                </Button>,
            ]}
        >
            <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 20 }}>
                <Form.Item 
                    name="program_id" 
                    label={<span>Chứng chỉ chuyên môn <span style={{color: 'red'}}>*</span></span>} 
                    rules={[{ required: true, message: 'Vui lòng chọn chứng chỉ' }]}
                >
                    <Select 
                        showSearch 
                        optionFilterProp="children" 
                        placeholder="-- Chọn chứng chỉ --"
                        dropdownRender={(menu) => (
                            <>
                                {menu}
                                <div style={{ padding: '8px', borderTop: '1px solid #e8e8e8' }}>
                                    <Space>
                                        <Button type="link" icon={<PlusOutlined />} onClick={() => setIsProgramModalOpen(true)}>
                                            Tạo Tên Chứng chỉ mới (nếu chưa có)
                                        </Button>
                                    </Space>
                                </div>
                            </>
                        )}
                    >
                        {localPrograms.map(p => (
                            <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <div style={{ display: 'flex', gap: 16 }}>
                    <Form.Item 
                        name="issue_date" 
                        label={<span>Ngày ban hành QĐ cấp <span style={{color: 'red'}}>*</span></span>} 
                        style={{ flex: 1 }} 
                        rules={[{ required: true, message: 'Vui lòng chọn ngày cấp' }]}
                    >
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Ngày ban hành QĐ" />
                    </Form.Item>

                    <Form.Item name="grading" label={<span>Xếp loại</span>} style={{ flex: 1 }}>
                        <Select placeholder="-- Chọn xếp loại --" allowClear>
                            <Select.Option value="Xuất sắc">Xuất sắc</Select.Option>
                            <Select.Option value="Giỏi">Giỏi</Select.Option>
                            <Select.Option value="Khá">Khá</Select.Option>
                            <Select.Option value="Trung bình">Trung bình</Select.Option>
                        </Select>
                    </Form.Item>
                </div>
            </Form>

            <TrainingProgramModal 
                open={isProgramModalOpen}
                onCancel={() => setIsProgramModalOpen(false)}
                onOk={handleAddProgram}
                loading={programModalLoading}
            />
        </Modal>
    );
};

export default CertificateModal;
