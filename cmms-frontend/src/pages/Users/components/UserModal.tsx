import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, Upload, Button, message, DatePicker } from 'antd';
import { UploadOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { ICreateUser, IDepartment, IUser } from '../../../types/user.types';
import { IDeviceGroup } from '../../../apis/device-groups';
import { uploadSignature } from '../../../apis/users';
import { getToken } from '../../../utils/auth';
import dayjs from 'dayjs';

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
            // Map user_departments sang format cho Form.List
            const deptAssignments = initialValues.user_departments?.map(ud => ({
                dept_id: ud.dept_id,
                role_in_dept: ud.role_in_dept || 'MEMBER',
                is_primary: ud.is_primary || false,
            })) || [];

            form.setFieldsValue({
                ...initialValues,
                dept_id: initialValues.department?.dept_id,
                group_id: initialValues.user_device_groups?.[0]?.group_id,
                is_group_lead: initialValues.user_device_groups?.[0]?.is_group_lead,
                password: '',
                confirmPassword: '',
                date_of_birth: initialValues.date_of_birth ? dayjs(initialValues.date_of_birth) : null,
                cccd_issue_date: initialValues.cccd_issue_date ? dayjs(initialValues.cccd_issue_date) : null,
                dept_assignments: deptAssignments.length > 0 ? deptAssignments : [{ dept_id: initialValues.department?.dept_id, role_in_dept: 'MEMBER', is_primary: true }],
            });
        } else {
            form.resetFields();
            form.setFieldsValue({ status: 'active', role: 'OPERATOR', is_group_lead: false, dept_assignments: [] });
        }
    }, [open, initialValues, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            // Format date fields
            const formatted = {
                ...values,
                date_of_birth: values.date_of_birth ? dayjs(values.date_of_birth).format('YYYY-MM-DD') : null,
                cccd_issue_date: values.cccd_issue_date ? dayjs(values.cccd_issue_date).format('YYYY-MM-DD') : null,
            };
            onOk(formatted);
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
                    <Form.Item name="employee_code" label="Mã số NV" style={{ flex: 1 }}>
                        <Input placeholder="Ví dụ: NV001" />
                    </Form.Item>
                    <Form.Item name="citizen_identification_card" label="CCCD" style={{ flex: 1 }} rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                </div>

                <Form.Item name="position" label="Chức vụ" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>

                <Form.Item name="role" label="Vai trò hệ thống" rules={[{ required: true }]}>
                    <Select>
                        <Select.Option value="OPERATOR">Vận hành</Select.Option>
                        <Select.Option value="TECHNICIAN">Kỹ thuật</Select.Option>
                        <Select.Option value="TEAM_LEAD">Tổ trưởng</Select.Option>
                        <Select.Option value="UNIT_HEAD">Cán bộ đội</Select.Option>
                        <Select.Option value="DIRECTOR">Ban giám đốc</Select.Option>
                        <Select.Option value="HR_MANAGER">Quản lý nhân sự</Select.Option>
                        <Select.Option value="ADMIN">Quản trị viên</Select.Option>
                    </Select>
                </Form.Item>

                {/* --- ĐƠN VỊ TỔ CHỨC (MỚI) --- */}
                <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 8, paddingTop: 16, marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#722ed1' }}>🏛️ Đơn vị tổ chức</span>
                    <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>(Phòng ban / Đội / Tổ mà nhân viên thuộc)</span>
                </div>
                <Form.List name="dept_assignments">
                    {(fields, { add, remove }) => (
                        <>
                            {fields.map(({ key, name, ...restField }) => (
                                <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'dept_id']}
                                        rules={[{ required: true, message: 'Chọn đơn vị' }]}
                                        style={{ flex: 2, marginBottom: 0 }}
                                    >
                                        <Select showSearch optionFilterProp='children' placeholder="Chọn đơn vị">
                                            {departments.map(d => (
                                                <Select.Option key={d.dept_id} value={d.dept_id}>
                                                    {d.name}{d.level ? ` (${d.level === 'PHONG_BAN' ? 'PB' : d.level === 'DOI' ? 'Đội' : 'Tổ'})` : ''}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'role_in_dept']}
                                        style={{ flex: 1, marginBottom: 0 }}
                                        initialValue="MEMBER"
                                    >
                                        <Select>
                                            <Select.Option value="MEMBER">Thành viên</Select.Option>
                                            <Select.Option value="DEPUTY_LEAD">Phó</Select.Option>
                                            <Select.Option value="LEAD">Trưởng</Select.Option>
                                        </Select>
                                    </Form.Item>
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'is_primary']}
                                        valuePropName="checked"
                                        style={{ marginBottom: 0 }}
                                    >
                                        <Switch checkedChildren="Chính" unCheckedChildren="Phụ" size="small" />
                                    </Form.Item>
                                    {!readOnly && (
                                        <MinusCircleOutlined
                                            onClick={() => remove(name)}
                                            style={{ color: '#ff4d4f', fontSize: 18, cursor: 'pointer' }}
                                        />
                                    )}
                                </div>
                            ))}
                            {!readOnly && (
                                <Button type="dashed" onClick={() => add({ role_in_dept: 'MEMBER', is_primary: false })} block icon={<PlusOutlined />}>
                                    Thêm đơn vị
                                </Button>
                            )}
                        </>
                    )}
                </Form.List>

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

                {/* --- THÔNG TIN CÁ NHÂN BỔ SUNG --- */}
                <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 8, paddingTop: 16, marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#1890ff' }}>📝 Thông tin cá nhân</span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                    <Form.Item name="phone_number" label="Số điện thoại" style={{ flex: 1 }}>
                        <Input placeholder="0901234567" />
                    </Form.Item>
                    <Form.Item name="date_of_birth" label="Ngày sinh" style={{ flex: 1 }}>
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày" />
                    </Form.Item>
                    <Form.Item name="place_of_birth" label="Nơi sinh" style={{ flex: 1 }}>
                        <Input placeholder="Ví dụ: Thanh Hóa" />
                    </Form.Item>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                    <Form.Item name="cccd_issue_date" label="Ngày cấp CCCD" style={{ flex: 1 }}>
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày" />
                    </Form.Item>
                    <Form.Item name="hometown" label="Quê quán" style={{ flex: 2 }}>
                        <Input placeholder="TP. Hồ Chí Minh" />
                    </Form.Item>
                </div>
                <Form.Item name="permanent_address" label="Nơi thường trú">
                    <Input placeholder="Địa chỉ thường trú" />
                </Form.Item>
                <Form.Item name="temporary_address" label="Nơi tạm trú">
                    <Input placeholder="Địa chỉ tạm trú (nếu có)" />
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
