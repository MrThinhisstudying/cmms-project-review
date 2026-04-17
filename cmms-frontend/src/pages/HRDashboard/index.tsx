import React, { useEffect, useState, useMemo } from 'react';
import { Card, Col, Row, Statistic, Table, Typography, Tag, Tabs, Input, Select, Button, Avatar, Tooltip, Badge, Spin, Empty } from 'antd';
import { WarningOutlined, TeamOutlined, SafetyCertificateOutlined, BookOutlined, CarOutlined, AlertOutlined, SearchOutlined, UserOutlined, EyeOutlined } from '@ant-design/icons';
import certificatesApi from '../../apis/certificates';
import { getAllUsers } from '../../apis/users';
import { IEmployeeCertificate, IUserTrainingRequirement } from '../../types/certificates.types';
import { IUser } from '../../types/user.types';
import dayjs from 'dayjs';
import ProfileModal from '../Users/components/ProfileModal';
import { getToken } from '../../utils/auth';

const { Title } = Typography;

// Lightweight chart components (no external lib needed)
const PieChart: React.FC<{ data: Record<string, number>; colors: string[] }> = ({ data, colors }) => {
    const entries = Object.entries(data);
    const total = entries.reduce((sum, [, v]) => sum + v, 0);
    if (total === 0) return <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>Chưa có dữ liệu</div>;

    let cumPercent = 0;
    const segments = entries.map(([label, value], i) => {
        const percent = (value / total) * 100;
        const startPercent = cumPercent;
        cumPercent += percent;
        return { label, value, percent, startPercent, color: colors[i % colors.length] };
    });

    // Create conic gradient
    const gradientParts = segments.map(s => `${s.color} ${s.startPercent}% ${s.startPercent + s.percent}%`).join(', ');

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
                width: 120, height: 120, borderRadius: '50%',
                background: `conic-gradient(${gradientParts})`,
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                {segments.map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                        <span>{s.label}: <b>{s.value}</b> ({s.percent.toFixed(0)}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const BarChart: React.FC<{ data: Record<string, number>; color: string }> = ({ data, color }) => {
    const entries = Object.entries(data);
    const max = Math.max(...entries.map(([, v]) => v), 1);
    if (entries.length === 0) return <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>Chưa có dữ liệu</div>;

    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, padding: '0 8px' }}>
            {entries.map(([label, value]) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{value}</span>
                    <div style={{
                        width: '100%', maxWidth: 40,
                        height: `${(value / max) * 80}px`,
                        background: color, borderRadius: '4px 4px 0 0',
                        minHeight: 4,
                        transition: 'height 0.3s ease',
                    }} />
                    <span style={{ fontSize: 11, marginTop: 4, color: '#666' }}>{label}</span>
                </div>
            ))}
        </div>
    );
};

const HRDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        expiringCerts: 0,
    });
    
    const [expiringCerts, setExpiringCerts] = useState<IEmployeeCertificate[]>([]);
    const [qualStats, setQualStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [allUsers, setAllUsers] = useState<IUser[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Profile Drawer states
    const [profileOpen, setProfileOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<IUser | null>(null);

    // Certificate data (merged from HRCertificates)
    const [certData, setCertData] = useState<Record<number, { certificates: IEmployeeCertificate[]; requirements: IUserTrainingRequirement[] }>>({});
    const [certLoading, setCertLoading] = useState(false);
    const [certSearchText, setCertSearchText] = useState('');
    const [certFilterDept, setCertFilterDept] = useState<string | undefined>(undefined);
    const [certActiveTab, setCertActiveTab] = useState('all');

    const loadAllCertData = async (userList: IUser[]) => {
        setCertLoading(true);
        try {
            const promises = userList.map(async (u) => {
                try {
                    const [certs, reqs] = await Promise.all([
                        certificatesApi.getUserCertificates(u.user_id),
                        certificatesApi.getTrainingRequirements(u.user_id).catch(() => []),
                    ]);
                    return { userId: u.user_id, certificates: certs, requirements: reqs };
                } catch {
                    return { userId: u.user_id, certificates: [], requirements: [] };
                }
            });
            const results = await Promise.all(promises);
            const map: Record<number, { certificates: IEmployeeCertificate[]; requirements: IUserTrainingRequirement[] }> = {};
            results.forEach(r => { map[r.userId] = { certificates: r.certificates, requirements: r.requirements }; });
            setCertData(map);
        } catch (error) {
            console.error('Error loading cert data:', error);
        } finally {
            setCertLoading(false);
        }
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const token = getToken();
                const usersList = await getAllUsers(token, {});
                setAllUsers(usersList);
                const total = usersList.length;
                const active = usersList.filter((u: any) => u.status === 'ACTIVE').length;

                const certs = await certificatesApi.getExpiringCertificates(90);
                const qStats = await certificatesApi.getQualificationStats();

                setStats({
                    totalUsers: total,
                    activeUsers: active,
                    expiringCerts: certs.length,
                });
                setExpiringCerts(certs);
                setQualStats(qStats);
                
                // Load certificate data for the merged table
                loadAllCertData(usersList);
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

    // ---- Merged Certificate Table Logic ----
    const isExpiring = (cert: IEmployeeCertificate): boolean => {
        if (!cert.next_training_date && !cert.expiry_date) return false;
        const checkDate = cert.expiry_date || cert.next_training_date;
        if (!checkDate) return false;
        const d = dayjs(checkDate);
        return d.isBefore(dayjs()) || d.diff(dayjs(), 'month', true) <= 3;
    };

    interface UserCertSummary {
        user: IUser;
        cccmCount: number;
        degreeCount: number;
        gplxCount: number;
        cccmNames: string;
        degreeNames: string;
        gplxNames: string;
        expiringCccm: number;
        expiringGplx: number;
        pendingReqs: number;
    }

    const userSummaries: UserCertSummary[] = useMemo(() => {
        return allUsers.map(u => {
            const data = certData[u.user_id] || { certificates: [], requirements: [] };
            const certs = data.certificates;
            const reqs = data.requirements;
            const cccm = certs.filter(c => c.type === 'CCCM');
            const degrees = certs.filter(c => c.qualification_type === 'BANG_CAP' || (!c.qualification_type && !c.license_class && c.type === 'BANG_CAP'));
            const gplx = certs.filter(c => c.qualification_type === 'GIAY_PHEP_LAI_XE' || (!c.qualification_type && c.license_class));
            return {
                user: u,
                cccmCount: cccm.length,
                degreeCount: degrees.length,
                gplxCount: gplx.length,
                cccmNames: cccm.map(c => c.program?.name).filter(Boolean).join(', '),
                degreeNames: degrees.map(c => c.degree_type || c.major).filter(Boolean).join(', '),
                gplxNames: gplx.map(c => c.license_class).filter(Boolean).join(', '),
                expiringCccm: cccm.filter(isExpiring).length,
                expiringGplx: gplx.filter(c => {
                    if (c.is_permanent) return false;
                    if (!c.expiry_date) return false;
                    const d = dayjs(c.expiry_date);
                    return d.isBefore(dayjs()) || d.diff(dayjs(), 'month', true) <= 3;
                }).length,
                pendingReqs: reqs.filter(r => r.status === 'PENDING').length,
            };
        });
    }, [allUsers, certData]);

    const departments = useMemo(() => {
        return [...new Set(allUsers.map(u => u.department?.name).filter(Boolean))].sort();
    }, [allUsers]);

    const filteredCerts = useMemo(() => {
        let result = userSummaries;
        if (certFilterDept) result = result.filter(s => s.user.department?.name === certFilterDept);
        if (certSearchText.trim()) {
            const lower = certSearchText.toLowerCase();
            result = result.filter(s => s.user.name?.toLowerCase().includes(lower) || s.user.email?.toLowerCase().includes(lower));
        }
        if (certActiveTab === 'warning') result = result.filter(s => s.expiringCccm > 0 || s.expiringGplx > 0);
        if (certActiveTab === 'training') result = result.filter(s => s.pendingReqs > 0);
        return result;
    }, [userSummaries, certSearchText, certFilterDept, certActiveTab]);

    const totalWarning = userSummaries.filter(s => s.expiringCccm > 0 || s.expiringGplx > 0).length;
    const totalTraining = userSummaries.filter(s => s.pendingReqs > 0).length;

    const certColumns = [
        { title: 'STT', key: 'stt', width: 50, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
        {
            title: 'Nhân viên', key: 'name', width: 200,
            render: (_: any, record: UserCertSummary) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar size={32} icon={<UserOutlined />} src={record.user.avatar} />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{record.user.name}</div>
                        <div style={{ fontSize: 11, color: '#999' }}>{record.user.position || 'Chưa cập nhật'}</div>
                    </div>
                </div>
            ),
        },
        {
            title: <Tooltip title="Chứng chỉ chuyên môn"><span><SafetyCertificateOutlined /> CCCM</span></Tooltip>,
            key: 'cccm', width: 140,
            render: (_: any, record: UserCertSummary) => (
                <div style={{ fontSize: 12 }}>
                    {record.cccmNames || <span style={{ color: '#bfbfbf' }}>-</span>}
                    {record.expiringCccm > 0 && <Badge count={record.expiringCccm} size="small" style={{ backgroundColor: '#ff4d4f', marginLeft: 4 }} />}
                </div>
            ),
        },
        {
            title: <Tooltip title="Bằng cấp học vấn"><span><BookOutlined /> Bằng cấp</span></Tooltip>,
            key: 'degree', width: 140,
            render: (_: any, record: UserCertSummary) => (
                <div style={{ fontSize: 12 }}>{record.degreeNames || <span style={{ color: '#bfbfbf' }}>-</span>}</div>
            ),
        },
        {
            title: <Tooltip title="Giấy phép lái xe"><span><CarOutlined /> GPLX</span></Tooltip>,
            key: 'gplx', width: 140,
            render: (_: any, record: UserCertSummary) => (
                <div style={{ fontSize: 12 }}>
                    {record.gplxNames ? record.gplxNames.split(', ').map(n => `Hạng ${n}`).join(', ') : <span style={{ color: '#bfbfbf' }}>-</span>}
                    {record.expiringGplx > 0 && <Badge count={record.expiringGplx} size="small" style={{ backgroundColor: '#faad14', marginLeft: 4 }} />}
                </div>
            ),
        },
        {
            title: '', key: 'action', width: 50,
            render: (_: any, record: UserCertSummary) => (
                <Button type="text" size="small" icon={<EyeOutlined style={{ color: '#1890ff' }} />} onClick={(e) => { e.stopPropagation(); handleViewUser(record.user); }} />
            ),
        },
    ];


    // CCCM expiring columns
    const cccmColumns = [
        { title: 'STT', render: (_: any, __: any, i: number) => i + 1, width: 50 },
        { 
            title: 'Học viên', dataIndex: ['user', 'name'],
            render: (text: string, record: IEmployeeCertificate) => (
                <a onClick={() => record.user && handleViewUser(record.user)}>{text}</a>
            )
        },
        { title: 'Loại', dataIndex: 'type', render: (t: string) => <Tag color="blue">{t}</Tag> },
        { title: 'Chứng chỉ', dataIndex: ['program', 'name'] },
        { title: 'Số CC', dataIndex: 'certificate_number' },
        { 
            title: 'Ngày hết hạn/học định kỳ', dataIndex: 'next_training_date',
            render: (d: string) => {
                if (!d) return '-';
                const date = dayjs(d);
                const daysLeft = date.diff(dayjs(), 'day');
                const color = daysLeft <= 0 ? '#ff4d4f' : daysLeft <= 15 ? '#faad14' : '#52c41a';
                return (
                    <span style={{ color, fontWeight: 'bold' }}>
                        {date.format('DD/MM/YYYY')}
                        {daysLeft <= 0 ? ' (Quá hạn)' : ` (${daysLeft} ngày)`}
                    </span>
                );
            }
        },
    ];

    // GPLX expiring columns
    const gplxColumns = [
        { title: 'STT', render: (_: any, __: any, i: number) => i + 1, width: 50 },
        { title: 'Học viên', dataIndex: 'user_name', render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span> },
        { title: 'Hạng', dataIndex: 'license_class', render: (v: string) => <Tag color="blue">{v}</Tag> },
        { title: 'Số GP', dataIndex: 'certificate_number' },
        { title: 'Nơi cấp', dataIndex: 'issuing_place' },
        { 
            title: 'Ngày hết hạn', dataIndex: 'expiry_date',
            render: (d: string) => {
                if (!d) return '-';
                const date = dayjs(d);
                const daysLeft = date.diff(dayjs(), 'day');
                const color = daysLeft <= 0 ? '#ff4d4f' : '#faad14';
                return (
                    <span style={{ color, fontWeight: 'bold' }}>
                        {date.format('DD/MM/YYYY')}
                        {daysLeft <= 0 ? ' (Quá hạn)' : ` (${daysLeft} ngày)`}
                    </span>
                );
            }
        },
    ];

    const totalExpiringLicenses = (qualStats?.expiringLicensesCount || 0) + (qualStats?.expiredLicensesCount || 0);

    const warningTabs = [
        {
            key: 'cccm',
            label: <span>📋 CCCM ({expiringCerts.length})</span>,
            children: (
                <Table
                    columns={cccmColumns}
                    dataSource={expiringCerts}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    size="small"
                    bordered
                />
            )
        },
        {
            key: 'gplx',
            label: <span>🚗 GPLX ({totalExpiringLicenses})</span>,
            children: (
                <Table
                    columns={gplxColumns}
                    dataSource={[...(qualStats?.expiredLicenses || []), ...(qualStats?.expiringLicenses || [])]}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    size="small"
                    bordered
                    locale={{ emptyText: 'Không có GPLX nào sắp hết hạn' }}
                />
            )
        },
    ];

    const degreeColors = ['#1890ff', '#52c41a', '#faad14', '#722ed1', '#eb2f96', '#13c2c2'];

    return (
        <div style={{ padding: 24, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
            <Title level={3} style={{ marginBottom: 24 }}>Dashboard Nhân Sự</Title>
            
            {/* Stats Row */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={5}>
                    <Card bordered={false}>
                        <Statistic
                            title="Tổng số nhân sự"
                            value={stats.totalUsers}
                            prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
                        />
                    </Card>
                </Col>
                <Col span={5}>
                    <Card bordered={false}>
                        <Statistic
                            title="Đang hoạt động"
                            value={stats.activeUsers}
                            valueStyle={{ color: '#3f8600' }}
                            prefix={<SafetyCertificateOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={5}>
                    <Card bordered={false}>
                        <Statistic
                            title="CCCM sắp hết hạn"
                            value={stats.expiringCerts}
                            valueStyle={{ color: stats.expiringCerts > 0 ? '#cf1322' : '#3f8600' }}
                            prefix={<WarningOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={5}>
                    <Card bordered={false}>
                        <Statistic
                            title="GPLX sắp hết hạn"
                            value={totalExpiringLicenses}
                            valueStyle={{ color: totalExpiringLicenses > 0 ? '#cf1322' : '#3f8600' }}
                            prefix={<CarOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card bordered={false}>
                        <Statistic
                            title="Tổng bằng cấp"
                            value={qualStats?.totalDegrees || 0}
                            prefix={<BookOutlined style={{ color: '#722ed1' }} />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Charts Row */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={12}>
                    <Card title="🎓 Phân bổ bằng cấp" bordered={false} size="small">
                        <PieChart 
                            data={qualStats?.degreeDistribution || {}} 
                            colors={degreeColors} 
                        />
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="🚗 Phân bổ giấy phép lái xe" bordered={false} size="small">
                        <BarChart 
                            data={qualStats?.licenseDistribution || {}} 
                            color="#1890ff" 
                        />
                    </Card>
                </Col>
            </Row>

            {/* Warning Tables */}
            <Card 
                title={<span><AlertOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />Cảnh báo: Bằng cấp / Chứng chỉ sắp hoặc đã quá hạn</span>} 
                bordered={false}
            >
                <Tabs items={warningTabs} defaultActiveKey="cccm" />
            </Card>

            {/* Merged: Certificate Overview Table (from HRCertificates) */}
            <Card 
                bordered={false} 
                style={{ marginTop: 24 }}
                title={<span><SafetyCertificateOutlined style={{ color: '#1890ff', marginRight: 8 }} />Tổng quan Chứng chỉ & Bằng cấp nhân viên</span>}
            >
                {/* Search + Filter */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <Input
                        placeholder="Tìm theo tên, email..."
                        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                        value={certSearchText}
                        onChange={e => setCertSearchText(e.target.value)}
                        allowClear
                        style={{ width: 280 }}
                    />
                    <Select
                        placeholder="Lọc phòng ban"
                        value={certFilterDept}
                        onChange={setCertFilterDept}
                        allowClear
                        style={{ width: 200 }}
                    >
                        {departments.map(d => <Select.Option key={d} value={d}>{d}</Select.Option>)}
                    </Select>
                    <span style={{ color: '#999', fontSize: 12, lineHeight: '32px', marginLeft: 'auto' }}>
                        {filteredCerts.length} / {allUsers.length} nhân viên
                    </span>
                </div>

                <Tabs
                    activeKey={certActiveTab}
                    onChange={setCertActiveTab}
                    size="small"
                    items={[
                        {
                            key: 'all',
                            label: <span>📋 Tất cả ({userSummaries.length})</span>,
                            children: (
                                <Table
                                    columns={certColumns}
                                    dataSource={filteredCerts}
                                    rowKey={(r) => r.user.user_id}
                                    loading={loading || certLoading}
                                    size="small"
                                    bordered
                                    scroll={{ x: 'max-content' }}
                                    pagination={{ defaultPageSize: 15, showSizeChanger: true, pageSizeOptions: ['10', '15', '30', '50'] }}
                                    onRow={(record) => ({ onClick: () => handleViewUser(record.user), style: { cursor: 'pointer' } })}
                                />
                            ),
                        },
                        {
                            key: 'warning',
                            label: <span>⚠️ Cảnh báo ({totalWarning})</span>,
                            children: (
                                <Table
                                    columns={certColumns}
                                    dataSource={filteredCerts}
                                    rowKey={(r) => r.user.user_id}
                                    loading={loading || certLoading}
                                    size="small"
                                    bordered
                                    scroll={{ x: 'max-content' }}
                                    pagination={{ defaultPageSize: 15, showSizeChanger: true }}
                                    onRow={(record) => ({ onClick: () => handleViewUser(record.user), style: { cursor: 'pointer' } })}
                                />
                            ),
                        },
                    ]}
                />
            </Card>

            <ProfileModal
                open={profileOpen}
                user={selectedUser}
                onCancel={() => setProfileOpen(false)}
                onUpdateSuccess={() => {}}
            />
        </div>
    );
};

export default HRDashboard;
