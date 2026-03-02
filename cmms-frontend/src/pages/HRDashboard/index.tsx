import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Typography, Tag, Button } from 'antd';
import { WarningOutlined, TeamOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import certificatesApi from '../../apis/certificates';
import { getAllUsers } from '../../apis/users';
import { IEmployeeCertificate } from '../../types/certificates.types';
import { IUser } from '../../types/user.types';
import dayjs from 'dayjs';
import UserProfileDrawer from '../Users/components/UserProfileDrawer';
import { getToken } from '../../utils/auth';

const { Title } = Typography;

const HRDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        expiringCerts: 0,
    });
    
    const [expiringCerts, setExpiringCerts] = useState<IEmployeeCertificate[]>([]);
    const [loading, setLoading] = useState(false);

    // Profile Drawer states
    const [profileOpen, setProfileOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<IUser | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // Fetch basic user stats
                const token = getToken();
                const usersList = await getAllUsers(token, {});
                const total = usersList.length;
                const active = usersList.filter((u: any) => u.status === 'ACTIVE').length;

                // Fetch expiring certificates warning (within next 30 days)
                const certs = await certificatesApi.getExpiringCertificates(30);
                
                setStats({
                    totalUsers: total,
                    activeUsers: active,
                    expiringCerts: certs.length,
                });
                setExpiringCerts(certs);
                
            } catch (error) {
                console.error("Failed to load HR dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const handleViewUser = (user: IUser) => {
        setSelectedUser(user);
        setProfileOpen(true);
    };

    const columns = [
        { title: 'STT', render: (_: any, __: any, index: number) => index + 1, width: 60 },
        { 
            title: 'Học viên', 
            dataIndex: ['user', 'name'],
            render: (text: string, record: IEmployeeCertificate) => (
                <a onClick={() => record.user && handleViewUser(record.user)}>{text}</a>
            )
        },
        { title: 'Chức năng / Loại', dataIndex: 'type', render: (t: string) => <Tag color="blue">{t}</Tag> },
        { title: 'Chứng chỉ cụ thể', dataIndex: ['program', 'name'] },
        { title: 'Số chứng chỉ', dataIndex: 'certificate_number' },
        { 
            title: 'Ngày hết hạn/học định kỳ', 
            dataIndex: 'next_training_date', 
            render: (d: string) => {
                if (!d) return '-';
                const date = dayjs(d);
                const isUnder15Days = date.diff(dayjs(), 'day') <= 15;
                return (
                    <span style={{ color: isUnder15Days ? 'red' : 'orange', fontWeight: 'bold' }}>
                        {date.format('DD/MM/YYYY')}
                    </span>
                );
            }
        },
    ];

    return (
        <div style={{ padding: 24, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
            <Title level={3} style={{ marginBottom: 24 }}>Dashboard Nhân Sự</Title>
            
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                    <Card bordered={false}>
                        <Statistic
                            title="Tổng số nhân sự"
                            value={stats.totalUsers}
                            prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card bordered={false}>
                        <Statistic
                            title="Nhân sự đang hoạt động"
                            value={stats.activeUsers}
                            valueStyle={{ color: '#3f8600' }}
                            prefix={<SafetyCertificateOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card bordered={false}>
                        <Statistic
                            title="Chứng chỉ sắp hết hạn (30 ngày)"
                            value={stats.expiringCerts}
                            valueStyle={{ color: '#cf1322' }}
                            prefix={<WarningOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <Card title="Cảnh báo: Danh sách bằng cấp/chứng chỉ sắp hoặc đã quá hạn" bordered={false}>
                <Table
                    columns={columns}
                    dataSource={expiringCerts}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    size="middle"
                />
            </Card>

            <UserProfileDrawer
                open={profileOpen}
                user={selectedUser}
                onClose={() => setProfileOpen(false)}
            />
        </div>
    );
};

export default HRDashboard;
