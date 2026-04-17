import React, { useEffect, useState } from "react";
import { Form, Input, Button, Upload, message, Card, Descriptions, Avatar, Typography, Row, Col, Tabs, DatePicker } from "antd";
import { UploadOutlined, UserOutlined, LockOutlined, InfoCircleOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { getProfile, updateProfile } from "../../apis/users";
import { getToken } from "../../utils/auth";
import { IUser } from "../../types/user.types";
import { getBackendImageUrl } from "../../utils/imageUrl";
import certificatesApi from "../../apis/certificates";
import { IEmployeeCertificate, IUserTrainingRequirement } from "../../types/certificates.types";
import { Table, Tag, Popconfirm, Space } from "antd";
import dayjs from "dayjs";
import QualificationModal from "../Users/components/QualificationModal";

const { Title } = Typography;

const Profile: React.FC = () => {
    const [user, setUser] = useState<IUser | null>(null);
    const [loading, setLoading] = useState(false);
    
    // Certificate States
    const [certificates, setCertificates] = useState<IEmployeeCertificate[]>([]);
    const [requirements, setRequirements] = useState<IUserTrainingRequirement[]>([]);
    const [certLoading, setCertLoading] = useState(false);

    // Qualification modal
    const [qualModalOpen, setQualModalOpen] = useState(false);
    const [selectedQual, setSelectedQual] = useState<IEmployeeCertificate | null>(null);
    const [qualModalLoading, setQualModalLoading] = useState(false);

    // Qualification data
    const [qualifications, setQualifications] = useState<IEmployeeCertificate[]>([]);

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
                    phone_number: data.phone_number,
                    date_of_birth: data.date_of_birth ? dayjs(data.date_of_birth) : null,
                    place_of_birth: data.place_of_birth,
                    cccd_issue_date: data.cccd_issue_date ? dayjs(data.cccd_issue_date) : null,
                    permanent_address: data.permanent_address,
                    temporary_address: data.temporary_address,
                    hometown: data.hometown,
                });
            }
        } catch (error) {
            message.error("Không thể tải thông tin cá nhân");
        }
    }, [token, form]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useEffect(() => {
        const fetchCerts = async () => {
            if (!user) return;
            setCertLoading(true);
            try {
                const reqData = await certificatesApi.getTrainingRequirements(user.user_id);
                setRequirements(reqData);

                const cccm = await certificatesApi.getUserCertificates(user.user_id, 'CCCM');
                const bangCap = await certificatesApi.getUserCertificates(user.user_id, 'BANG_CAP');
                const giayPhep = await certificatesApi.getUserCertificates(user.user_id, 'GIAY_PHEP');
                
                setCertificates([...cccm, ...giayPhep]);
                setQualifications(bangCap);
            } catch (error) {
                console.error("Failed to fetch certs");
            } finally {
                setCertLoading(false);
            }
        };

        if (user) {
            fetchCerts();
        }
    }, [user]);

    const handleUpdate = async (values: any) => {
        setLoading(true);
        try {
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

    // --- Qualification handlers ---
    const handleAddQual = () => {
        setSelectedQual(null);
        setQualModalOpen(true);
    };

    const handleEditQual = (cert: IEmployeeCertificate) => {
        setSelectedQual(cert);
        setQualModalOpen(true);
    };

    const handleDeleteQual = async (id: number) => {
        try {
            await certificatesApi.deleteCertificate(id);
            setQualifications(prev => prev.filter(q => q.id !== id));
            message.success('Đã xóa');
        } catch (error: any) {
            message.error(error.message || 'Lỗi khi xóa');
        }
    };

    const handleQualModalOk = async (values: any, file?: File | null) => {
        if (!user) return;
        setQualModalLoading(true);
        try {
            if (selectedQual) {
                const res = await certificatesApi.updateCertificate(selectedQual.id, values, file || undefined);
                setQualifications(prev => prev.map(q => q.id === selectedQual.id ? res : q));
                message.success('Cập nhật thành công');
            } else {
                const res = await certificatesApi.createCertificate(user.user_id, values, file || undefined);
                setQualifications(prev => [...prev, res]);
                message.success('Thêm mới thành công');
            }
            setQualModalOpen(false);
        } catch (error: any) {
            message.error(error.message || 'Lỗi lưu thông tin');
        } finally {
            setQualModalLoading(false);
        }
    };

    if (!user) return null;

    const cccmColumns = [
        { title: 'STT', render: (_: any, __: any, index: number) => index + 1, width: 50 },
        { title: 'Loại', dataIndex: 'type', render: (t: string) => <Tag color="blue">{t}</Tag>},
        { title: 'Khóa học / Chứng chỉ', dataIndex: ['program', 'name'] },
        { title: 'Số CC/Bằng', dataIndex: 'certificate_number' },
        { title: 'Ngày cấp', dataIndex: 'issue_date', render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
        { 
            title: 'Hạn / Học lại định kỳ', 
            dataIndex: 'next_training_date', 
            render: (d: string) => {
                if (!d) return '-';
                const isExpired = dayjs(d).isBefore(dayjs());
                return <span style={{ color: isExpired ? 'red' : 'inherit', fontWeight: isExpired ? 'bold' : 'normal' }}>{dayjs(d).format('DD/MM/YYYY')}</span>;
            }
        },
    ];

    const reqColumns = [
        { title: 'STT', render: (_: any, __: any, index: number) => index + 1, width: 50 },
        { title: 'Mã', dataIndex: ['program', 'code'] },
        { title: 'Yêu cầu khóa học', dataIndex: ['program', 'name'] },
        { title: 'Hạn chót', dataIndex: 'required_date', render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
        { 
            title: 'Trạng thái', 
            dataIndex: 'status',
            render: (s: string) => (
                <Tag color={s === 'FULFILLED' ? 'success' : 'warning'}>
                    {s === 'FULFILLED' ? 'Đã hoàn thành' : 'Đang chờ'}
                </Tag>
            )
        },
        { title: 'Ghi chú', dataIndex: 'note' },
    ];

    // Degree & license columns for qualifications tab
    const degrees = qualifications.filter(c => c.qualification_type === 'BANG_CAP' || (!c.qualification_type && !c.license_class));
    const licenses = qualifications.filter(c => c.qualification_type === 'GIAY_PHEP_LAI_XE' || (!c.qualification_type && c.license_class));

    const degreeColumns = [
        { title: 'STT', render: (_: any, __: any, i: number) => i + 1, width: 50 },
        { title: 'Loại bằng', dataIndex: 'degree_type', width: 100 },
        { title: 'Chuyên ngành', dataIndex: 'major', ellipsis: true },
        { title: 'Trường', dataIndex: 'school_name', ellipsis: true },
        { title: 'Năm TN', dataIndex: 'graduation_year', width: 80, align: 'center' as const },
        { title: 'Xếp loại', dataIndex: 'grading', width: 80 },
        {
            title: 'Hành động', key: 'action', width: 90,
            render: (_: any, record: IEmployeeCertificate) => (
                <Space size="small">
                    <Button type="text" size="small" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => handleEditQual(record)} />
                    <Popconfirm title="Xóa bằng cấp này?" onConfirm={() => handleDeleteQual(record.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const licenseColumns = [
        { title: 'STT', render: (_: any, __: any, i: number) => i + 1, width: 50 },
        { title: 'Hạng', dataIndex: 'license_class', width: 60, render: (v: string) => <Tag color="blue">{v}</Tag> },
        { title: 'Số GP', dataIndex: 'certificate_number', width: 120 },
        { title: 'Ngày cấp', dataIndex: 'issue_date', width: 100, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
        { 
            title: 'Có giá trị đến', width: 120,
            render: (_: any, record: IEmployeeCertificate) => {
                if (record.is_permanent) return <Tag color="green">Không thời hạn</Tag>;
                if (!record.expiry_date) return '-';
                const daysLeft = dayjs(record.expiry_date).diff(dayjs(), 'day');
                const color = daysLeft <= 0 ? '#ff4d4f' : daysLeft <= 90 ? '#faad14' : '#52c41a';
                return <span style={{ color, fontWeight: 'bold' }}>{dayjs(record.expiry_date).format('DD/MM/YYYY')}</span>;
            }
        },
        { title: 'Nơi cấp', dataIndex: 'issuing_place' },
        {
            title: 'Hành động', key: 'action', width: 90,
            render: (_: any, record: IEmployeeCertificate) => (
                <Space size="small">
                    <Button type="text" size="small" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => handleEditQual(record)} />
                    <Popconfirm title="Xóa giấy phép này?" onConfirm={() => handleDeleteQual(record.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const qualificationsTab = (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddQual}>Thêm bằng cấp / GPLX</Button>
            </div>
            
            <h4 style={{ margin: '0 0 8px', color: '#1890ff' }}>🎓 Bằng cấp ({degrees.length})</h4>
            <Table 
                dataSource={degrees}
                columns={degreeColumns}
                rowKey="id"
                loading={certLoading}
                bordered size="small" pagination={false}
                locale={{ emptyText: 'Chưa có bằng cấp. Nhấn "Thêm bằng cấp / GPLX" để thêm.' }}
                style={{ marginBottom: 20 }}
            />

            <h4 style={{ margin: '0 0 8px', color: '#faad14' }}>🚗 Giấy phép lái xe ({licenses.length})</h4>
            <Table
                dataSource={licenses}
                columns={licenseColumns}
                rowKey="id"
                loading={certLoading}
                bordered size="small" pagination={false}
                locale={{ emptyText: 'Chưa có giấy phép lái xe.' }}
            />
        </div>
    );

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
                                    <img src={getBackendImageUrl(user.signature_url)} alt="Signature" style={{ maxWidth: 200, border: '1px dashed #ccc', padding: 8, marginTop: 8 }} />
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
                            <Descriptions.Item label="Ngày sinh">{user.date_of_birth ? dayjs(user.date_of_birth).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                            <Descriptions.Item label="Nơi sinh">{user.place_of_birth || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Quê quán">{user.hometown || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Nơi thường trú">{user.permanent_address || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Nơi tạm trú">{user.temporary_address || '-'}</Descriptions.Item>
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
                            { key: '2', label: <span><LockOutlined /> Đổi mật khẩu</span>, children: passwordTab },
                            { 
                                key: '3', 
                                label: '🎓 Bằng cấp & GPLX',
                                children: qualificationsTab
                            },
                            { 
                                key: '4', 
                                label: 'Chứng chỉ chuyên môn', 
                                children: (
                                    <Table 
                                        dataSource={certificates} 
                                        columns={cccmColumns} 
                                        rowKey="id" 
                                        loading={certLoading}
                                        bordered 
                                        size="small" 
                                        pagination={false}
                                    />
                                ) 
                            },
                            { 
                                key: '5', 
                                label: 'Yêu cầu đào tạo', 
                                children: (
                                    <Table 
                                        dataSource={requirements} 
                                        columns={reqColumns} 
                                        rowKey="id" 
                                        loading={certLoading}
                                        bordered 
                                        size="small"
                                        pagination={false}
                                    />
                                ) 
                            }
                        ]} />
                    </Card>
                </Col>
            </Row>

            <QualificationModal
                open={qualModalOpen}
                onCancel={() => setQualModalOpen(false)}
                onOk={handleQualModalOk}
                initialValues={selectedQual}
                loading={qualModalLoading}
                user={user}
            />
        </div>
    );
};

export default Profile;
