import React, { useEffect, useState } from "react";
import { Form, Input, Button, Upload, message, Card, Descriptions, Avatar, Typography, Row, Col, Tabs } from "antd";
import { UploadOutlined, UserOutlined, LockOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { getProfile, updateProfile } from "../../apis/users";
import { getToken } from "../../utils/auth";
import { IUser } from "../../types/user.types";

const { Title } = Typography;

const Profile: React.FC = () => {
    const [user, setUser] = useState<IUser | null>(null);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const token = getToken();

    const fetchProfile = React.useCallback(async () => {
        try {
            const data = await getProfile(token);
            if (data) {
                setUser(data);
                form.setFieldsValue({
                    name: data.name,
                    email: data.email,
                    // phone: '', 
                });
            }
        } catch (error) {
            message.error("Không thể tải thông tin cá nhân");
        }
    }, [token, form]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleUpdate = async (values: any) => {
        setLoading(true);
        try {
            // Handle signature upload -> Convert to Base64 or URL?
            // If signature is file, upload it? Backend expects URL string in updateProfile.
            // But usually upload returns a URL.
            // My backend updateProfile expects `signature_url` string.
            // So I need to upload first (where?) or send base64?
            // User requested "Signature Upload: Implement AntD Upload with preview".
            // If I don't have a file upload API, I might need to send base64 or create one.
            // Current backend has no "upload" endpoint for general files in my changes.
            // There is `FileUploadComponent` in project (`Users.tsx` uses it). It reads as DataURL.
            // So I can send Base64 string as `signature_url`.
            
            let signatureUrl = user?.signature_url;
            if (values.signature && values.signature.fileList && values.signature.fileList.length > 0) {
                 const file = values.signature.fileList[0].originFileObj;
                 signatureUrl = await new Promise((resolve) => {
                     const reader = new FileReader();
                     reader.onload = () => resolve(reader.result as string);
                     reader.readAsDataURL(file);
                 });
            }

            const payload: Partial<IUser> = {
                name: values.name,
                // email: values.email, // email usually read-only or requires verify
                signature_url: signatureUrl,
            };

            await updateProfile(payload, token);
            message.success("Cập nhật thành công");
            fetchProfile();
        } catch (error) {
            message.error("Cập nhật thất bại");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (values: any) => {
        setLoading(true);
        try {
            if (values.password !== values.confirmPassword) {
                message.error("Mật khẩu xác nhận không khớp");
                setLoading(false);
                return;
            }
            await updateProfile({ password: values.password }, token);
            message.success("Đổi mật khẩu thành công");
            form.resetFields(['password', 'confirmPassword']);
        } catch (error) {
            message.error("Đổi mật khẩu thất bại");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    const infoTab = (
                        <Form form={form} layout="vertical" onFinish={handleUpdate}>
                            <Form.Item name="name" label="Họ và tên" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item name="email" label="Email">
                                <Input disabled />
                            </Form.Item>

                            <Form.Item name="signature" label="Chữ ký (Ảnh nền trong suốt)">
                                <Upload 
                                    listType="picture-card" 
                                    maxCount={1} 
                                    beforeUpload={() => false}
                                    accept="image/png"
                                >
                                    <div>
                                        <UploadOutlined />
                                        <div style={{ marginTop: 8 }}>Tải lên</div>
                                    </div>
                                </Upload>
                            </Form.Item>
                            {user.signature_url && (
                                <div style={{ marginBottom: 24 }}>
                                    <Typography.Text>Chữ ký hiện tại:</Typography.Text>
                                    <br/>
                                    <img src={user.signature_url} alt="Signature" style={{ maxWidth: 200, border: '1px dashed #ccc', padding: 8, marginTop: 8 }} />
                                </div>
                            )}

                            <Form.Item>
                                <Button type="primary" htmlType="submit" loading={loading}>
                                    Lưu thay đổi
                                </Button>
                            </Form.Item>
                        </Form>
    );

    const passwordTab = (
        <Form layout="vertical" onFinish={handlePasswordChange}>
            <Form.Item name="password" label="Mật khẩu mới" rules={[{ required: true, min: 6, message: 'Tối thiểu 6 ký tự' }]}>
                <Input.Password prefix={<LockOutlined />} />
            </Form.Item>
            <Form.Item name="confirmPassword" label="Xác nhận mật khẩu" rules={[{ required: true, min: 6 }]}>
                <Input.Password prefix={<LockOutlined />} />
            </Form.Item>
            <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} danger>
                    Đổi mật khẩu
                </Button>
            </Form.Item>
        </Form>
    );

    return (
        <div style={{ padding: 24 }}>
            <Title level={2}>Thông tin cá nhân</Title>
            <Row gutter={24}>
                <Col span={8}>
                    <Card>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
                            <Avatar size={100} src={user.avatar} icon={<UserOutlined />} />
                            <Title level={4} style={{ marginTop: 16 }}>{user.name}</Title>
                            <Typography.Text type="secondary">{user.role}</Typography.Text>
                        </div>
                        <Descriptions column={1} bordered>
                            <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
                            <Descriptions.Item label="Chức vụ">{user.position}</Descriptions.Item>
                            <Descriptions.Item label="Phòng ban">{user.department?.name}</Descriptions.Item>
                            <Descriptions.Item label="CCCD">{user.citizen_identification_card}</Descriptions.Item>
                            {user.user_device_groups && user.user_device_groups.length > 0 && (
                                <Descriptions.Item label="Nhóm thiết bị">
                                    {user.user_device_groups.map(g => (
                                        <div key={g.id}>
                                            {g.device_group?.name} {g.is_group_lead ? '(Trưởng nhóm)' : ''}
                                        </div>
                                    ))}
                                </Descriptions.Item>
                            )}
                        </Descriptions>
                    </Card>
                </Col>
                <Col span={16}>
                    <Card>
                        <Tabs defaultActiveKey="1" items={[
                            { key: '1', label: <span><InfoCircleOutlined /> Thông tin chung</span>, children: infoTab },
                            { key: '2', label: <span><LockOutlined /> Đổi mật khẩu</span>, children: passwordTab }
                        ]} />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Profile;
