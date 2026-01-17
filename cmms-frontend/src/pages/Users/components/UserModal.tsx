import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { ICreateUser, IDepartment, IUser } from '../../../types/user.types';
import { IDeviceGroup } from '../../../apis/device-groups';
import { uploadSignature } from '../../../apis/users';
import { getToken } from '../../../utils/auth';

interface UserModalProps {
    open: boolean;
    onCancel: () => void;
    onOk: (values: ICreateUser) => void;
    initialValues?: IUser | null;
    departments: IDepartment[];
    deviceGroups: IDeviceGroup[];
    loading?: boolean;
    readOnly?: boolean;
}

const UserModal: React.FC<UserModalProps> = ({ open, onCancel, onOk, initialValues, departments, deviceGroups, loading, readOnly }) => {
    const [form] = Form.useForm();
    const isEdit = !!initialValues;

    useEffect(() => {
        if (open && initialValues) {
            form.setFieldsValue({
                ...initialValues,
                dept_id: initialValues.department?.dept_id,
                // Check if user has a group assignment
                group_id: initialValues.user_device_groups?.[0]?.group_id,
                is_group_lead: initialValues.user_device_groups?.[0]?.is_group_lead,
                password: '', // Don't fill password on edit
                confirmPassword: '',
            });
        } else {
            form.resetFields();
            form.setFieldsValue({ status: 'active', role: 'OPERATOR', is_group_lead: false });
        }
    }, [open, initialValues, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            onOk(values);
        } catch (error) {
            // Validation failed
        }
    };

    return (
        <Modal
            title={readOnly ? "Chi tiết người dùng" : (isEdit ? "Chỉnh sửa người dùng" : "Thêm người dùng mới")}
            open={open}
            onCancel={onCancel}
            onOk={handleSubmit}
            confirmLoading={loading}
            width={700}
            footer={readOnly ? null : undefined}
        >
            <Form form={form} layout="vertical" disabled={readOnly}>
                <Form.Item name="name" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Email không hợp lệ' }]}>
                    <Input />
                </Form.Item>
                
                {!isEdit && !readOnly && (
                    <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item name="password" label="Mật khẩu" style={{ flex: 1 }} rules={[{ required: !isEdit, message: 'Vui lòng nhập mật khẩu' }]}>
                            <Input.Password />
                        </Form.Item>
                        {/* Add confirm password logic if strictly needed, or skip for Admin quick creation */}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 16 }}>
                     <Form.Item name="position" label="Chức vụ" style={{ flex: 1 }} rules={[{ required: true }]}>
                        <Input />
                     </Form.Item>
                     <Form.Item name="citizen_identification_card" label="CCCD" style={{ flex: 1 }} rules={[{ required: true }]}>
                        <Input />
                     </Form.Item>
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                    <Form.Item name="role" label="Vai trò" style={{ flex: 1 }} rules={[{ required: true }]}>
                        <Select>
                            <Select.Option value="OPERATOR">Vận hành</Select.Option>
                            <Select.Option value="TECHNICIAN">Kỹ thuật</Select.Option>
                            <Select.Option value="TEAM_LEAD">Tổ trưởng</Select.Option>
                            <Select.Option value="UNIT_HEAD">Cán bộ đội</Select.Option>
                            <Select.Option value="DIRECTOR">Ban giám đốc</Select.Option>
                            <Select.Option value="ADMIN">Quản trị viên</Select.Option>
                        </Select>
                    </Form.Item>
                    
                    <Form.Item name="dept_id" label="Phòng ban" style={{ flex: 1 }} rules={[{ required: true }]}>
                        <Select showSearch optionFilterProp='children'>
                            {departments.map(d => (
                                <Select.Option key={d.dept_id} value={d.dept_id}>{d.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <Form.Item name="group_id" label="Nhóm thiết bị (Device Group)" style={{ flex: 1 }}>
                        <Select allowClear>
                            {deviceGroups.map(g => (
                                <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="is_group_lead" label="Trưởng nhóm" valuePropName="checked" style={{ paddingTop: 30 }}>
                        <Switch />
                    </Form.Item>
                </div>
                
                <Form.Item name="status" label="Trạng thái">
                     <Select>
                        <Select.Option value="active">Hoạt động</Select.Option>
                        <Select.Option value="deactive">Ngừng hoạt động</Select.Option>
                     </Select>
                </Form.Item>

                {(isEdit || readOnly) && (
                     <Form.Item label="Chữ ký số" tooltip="Chữ ký sẽ được sử dụng trong các quy trình phê duyệt">
                         <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                             <Form.Item shouldUpdate={(prev, curr) => prev.signature_url !== curr.signature_url} noStyle>
                                 {({ getFieldValue }) => (
                                     getFieldValue('signature_url') ? (
                                        <div style={{ 
                                            height: 60, 
                                            padding: '0 16px',
                                            border: '1px solid #d9d9d9',
                                            borderRadius: 6,
                                            display: 'flex',
                                            alignItems: 'center',
                                            background: '#f6ffed',
                                            color: '#389e0d'
                                        }}>
                                            Đã có chữ ký
                                        </div>
                                     ) : (
                                        <div style={{ 
                                            height: 60, 
                                            padding: '0 16px',
                                            border: '1px dashed #d9d9d9',
                                            borderRadius: 6,
                                            display: 'flex',
                                            alignItems: 'center',
                                            color: '#999'
                                        }}>
                                            Chưa có chữ ký
                                        </div>
                                     )
                                 )}
                             </Form.Item>
                             {!readOnly && (
                                 <Upload
                                    showUploadList={false}
                                    customRequest={async (options) => {
                                        const { file, onSuccess, onError } = options;
                                        try {
                                            const token = getToken();
                                            const res = await uploadSignature(initialValues!.user_id, file as File, token);
                                            form.setFieldsValue({ signature_url: res.signature_url });
                                            // Force re-render of this field's display if needed, but setState is better.
                                            // However, since we are inside Modal form, setFieldsValue might not trigger validation/render on plain div access unless we use form.getFieldValue inside a watched component or similar.
                                            // A simple force update or just let the user save to persist (actually upload persists immediately).
                                            message.success('Tải lên chữ ký thành công');
                                            onSuccess?.(res);
                                            // Force update to show image
                                            form.setFieldsValue({ ...form.getFieldsValue(), signature_url: res.signature_url });
                                        } catch (err: any) {
                                            message.error(err.message || 'Tải lên thất bại');
                                            onError?.(err);
                                        }
                                    }}
                                 >
                                     <Button icon={<UploadOutlined />}>Tải lên chữ ký</Button>
                                 </Upload>
                             )}
                         </div>
                         <Form.Item name="signature_url" hidden>
                            <Input />
                         </Form.Item>
                    </Form.Item>
                )}
            </Form>
        </Modal>
    );
};

export default UserModal;
