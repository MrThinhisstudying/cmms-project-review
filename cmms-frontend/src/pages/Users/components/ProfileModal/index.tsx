import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Button, Upload, message, Tabs, Avatar } from 'antd';
import { UploadOutlined, UserOutlined, LockOutlined } from '@ant-design/icons';
import { IUser } from '../../../../types/user.types';
import { uploadSignature, updateProfile } from '../../../../apis/users';
import { getToken } from '../../../../utils/auth';

interface ProfileModalProps {
    open: boolean;
    onCancel: () => void;
    user: IUser | null;
    onUpdateSuccess: (updatedUser: IUser) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ open, onCancel, user, onUpdateSuccess }) => {
    const [infoForm] = Form.useForm();
    const [passForm] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('info');
    const [signatureUrl, setSignatureUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (open && user) {
            const groupNames = user.user_device_groups?.map(g => g.device_group?.name).filter(Boolean).join(', ') || 'Chưa vào nhóm';
            
            infoForm.setFieldsValue({
                name: user.name,
                email: user.email,
                role: (() => {
                    const r = user.role?.toUpperCase();
                    switch (r) {
                        case 'ADMIN': return 'Quản trị viên';
                        case 'OPERATOR': return 'Vận hành';
                        case 'TECHNICIAN': return 'Kỹ thuật';
                        case 'TEAM_LEAD': return 'Tổ trưởng';
                        case 'UNIT_HEAD': return 'Cán bộ đội';
                        case 'DIRECTOR': return 'Ban giám đốc';
                        default: return user.role;
                    }
                })(),
                department: user.department?.name || 'Chưa thuộc phòng ban',
                position: user.position,
                citizen_identification_card: user.citizen_identification_card,
                device_group: groupNames,
                signature_url: user.signature_url,
            });
            setSignatureUrl(user.signature_url);
            passForm.resetFields();
            setActiveTab('info');
        }
    }, [open, user, infoForm, passForm]);

    const handleUpdateInfo = async (values: any) => {
        setLoading(true);
        try {
            const token = getToken();
            const updated = await updateProfile({
                name: values.name,
                signature_url: values.signature_url
            }, token);
            message.success('Cập nhật thông tin thành công');
            onUpdateSuccess(updated);
            onCancel(); // Close modal on success
        } catch (error: any) {
            message.error(error.message || 'Cập nhật thất bại');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (values: any) => {
        if (values.newPassword !== values.confirmPassword) {
            message.error('Mật khẩu xác nhận không khớp');
            return;
        }
        setLoading(true);
        try {
            const token = getToken();
            await updateProfile({
                password: values.newPassword
            }, token);
            message.success('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
            passForm.resetFields();
            onCancel();
        } catch (error: any) {
             message.error(error.message || 'Đổi mật khẩu thất bại');
        } finally {
            setLoading(false);
        }
    };

    const items = [
        {
            key: 'info',
            label: 'Thông tin chung',
            children: (
                <Form form={infoForm} layout="vertical" onFinish={handleUpdateInfo}>
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <Avatar size={80} src={user?.avatar} icon={<UserOutlined />} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="email" label="Email">
                            <Input disabled />
                        </Form.Item>
                        <Form.Item name="role" label="Vai trò">
                             <Input disabled />
                        </Form.Item>
                        
                        <Form.Item name="position" label="Chức vụ">
                             <Input disabled />
                        </Form.Item>
                        <Form.Item name="citizen_identification_card" label="CCCD">
                             <Input disabled />
                        </Form.Item>

                        <Form.Item name="department" label="Phòng ban">
                             <Input disabled />
                        </Form.Item>
                        <Form.Item name="device_group" label="Nhóm thiết bị">
                             <Input disabled />
                        </Form.Item>
                    </div>

                    <Form.Item name="name" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                        <Input />
                    </Form.Item>

                    <Form.Item label="Chữ ký số">
                         <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            {signatureUrl ? (
                                <img 
                                    src={`${process.env.REACT_APP_BASE_URL?.replace('/api', '')}${signatureUrl}`} 
                                    alt="signature" 
                                    style={{ height: 60, border: '1px dashed #d9d9d9', padding: 4, borderRadius: 4 }} 
                                />
                            ) : <div style={{ height: 60, width: 100, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 12 }}>Chưa có chữ ký</div>}
                            
                            <Upload
                                showUploadList={false}
                                customRequest={async (options) => {
                                    const { file, onSuccess, onError } = options;
                                    try {
                                        const token = getToken();
                                        if (user) {
                                            // The user reported "user_id" issues before, ensure we use user.user_id as per fix
                                            const res = await uploadSignature(user.user_id, file as File, token);
                                            infoForm.setFieldsValue({ signature_url: res.signature_url });
                                            setSignatureUrl(res.signature_url); // Update local state for immediate display
                                            message.success('Tải lên chữ ký thành công');
                                            onSuccess?.(res);
                                            onUpdateSuccess({ ...user, signature_url: res.signature_url });
                                        }
                                    } catch (err: any) {
                                        message.error(err.message || 'Tải lên thất bại');
                                        onError?.(err);
                                    }
                                }}
                            >
                                <Button icon={<UploadOutlined />}>Tải lên chữ ký</Button>
                            </Upload>
                        </div>
                         <Form.Item name="signature_url" hidden>
                            <Input />
                         </Form.Item>
                    </Form.Item>

                    <div style={{ textAlign: 'right', marginTop: 16 }}>
                        <Button type="primary" htmlType="submit" loading={loading}>Lưu thông tin</Button>
                    </div>
                </Form>
            )
        },
        {
            key: 'password',
            label: 'Đổi mật khẩu',
            children: (
                <Form form={passForm} layout="vertical" onFinish={handleChangePassword}>
                     <Form.Item 
                        name="newPassword" 
                        label="Mật khẩu mới" 
                        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới' }, { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} />
                    </Form.Item>

                    <Form.Item 
                        name="confirmPassword" 
                        label="Xác nhận mật khẩu mới" 
                        dependencies={['newPassword']}
                        rules={[
                            { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} />
                    </Form.Item>

                    <div style={{ textAlign: 'right', marginTop: 16 }}>
                        <Button type="primary" htmlType="submit" loading={loading} danger>Đổi mật khẩu</Button>
                    </div>
                </Form>
            )
        }
    ];

    return (
        <Modal
            title="Hồ sơ cá nhân"
            open={open}
            onCancel={onCancel}
            footer={null}
            width={600}
        >
            <Tabs items={items} activeKey={activeTab} onChange={setActiveTab} />
        </Modal>
    );
};

export default ProfileModal;
