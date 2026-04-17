import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Input, Select, Tag, Badge, Tabs, Button, message, Spin, Avatar, Tooltip } from 'antd';
import { SearchOutlined, UserOutlined, WarningOutlined, SafetyCertificateOutlined, BookOutlined, CarOutlined, CalendarOutlined, EyeOutlined } from '@ant-design/icons';
import { IUser } from '../../types/user.types';
import { IEmployeeCertificate, IUserTrainingRequirement } from '../../types/certificates.types';
import { getAllUsers } from '../../apis/users';
import certificatesApi from '../../apis/certificates';
import { getToken } from '../../utils/auth';
import ProfileDrawer from '../Users/components/ProfileModal';
import dayjs from 'dayjs';

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

const HRCertificates: React.FC = () => {
    const [users, setUsers] = useState<IUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [filterDept, setFilterDept] = useState<string | undefined>(undefined);
    const [activeTab, setActiveTab] = useState('all');

    // Drawer
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<IUser | null>(null);

    // Certificate data per user (loaded in batch)
    const [certData, setCertData] = useState<Record<number, { certificates: IEmployeeCertificate[]; requirements: IUserTrainingRequirement[] }>>({});
    const [certLoading, setCertLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = getToken();
            const data = await getAllUsers(token);
            setUsers(data);
            // Load cert data for all users
            loadAllCertData(data);
        } catch (error) {
            message.error('Lỗi tải danh sách nhân viên');
        } finally {
            setLoading(false);
        }
    };

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

    const isExpiring = (cert: IEmployeeCertificate): boolean => {
        if (!cert.next_training_date && !cert.expiry_date) return false;
        const checkDate = cert.expiry_date || cert.next_training_date;
        if (!checkDate) return false;
        const d = dayjs(checkDate);
        return d.isBefore(dayjs()) || d.diff(dayjs(), 'month', true) <= 3;
    };

    // Build summary data
    const userSummaries: UserCertSummary[] = useMemo(() => {
        return users.map(u => {
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
    }, [users, certData]);

    // Unique departments
    const departments = useMemo(() => {
        return [...new Set(users.map(u => u.department?.name).filter(Boolean))].sort();
    }, [users]);

    // Filter
    const filtered = useMemo(() => {
        let result = userSummaries;
        if (filterDept) result = result.filter(s => s.user.department?.name === filterDept);
        if (searchText.trim()) {
            const lower = searchText.toLowerCase();
            result = result.filter(s => s.user.name?.toLowerCase().includes(lower) || s.user.email?.toLowerCase().includes(lower));
        }
        if (activeTab === 'warning') result = result.filter(s => s.expiringCccm > 0 || s.expiringGplx > 0);
        if (activeTab === 'training') result = result.filter(s => s.pendingReqs > 0);
        return result;
    }, [userSummaries, searchText, filterDept, activeTab]);

    const handleViewUser = (user: IUser) => {
        setSelectedUser(user);
        setDrawerOpen(true);
    };

    const columns = [
        {
            title: 'STT', key: 'stt', width: 50, align: 'center' as const,
            render: (_: any, __: any, i: number) => i + 1,
        },
        {
            title: 'Nhân viên', key: 'name', width: 200,
            render: (_: any, record: UserCertSummary) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar size={32} icon={<UserOutlined />} src={record.user.avatar} />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{record.user.name}</div>
                        <div style={{ fontSize: 11, color: '#999' }}>{record.user.position || 'Chưa cập nhật chức vụ'}</div>
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
                <div style={{ fontSize: 12 }}>
                    {record.degreeNames || <span style={{ color: '#bfbfbf' }}>-</span>}
                </div>
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
                <Button type="text" size="small" icon={<EyeOutlined style={{ color: '#1890ff' }} />} onClick={() => handleViewUser(record.user)} />
            ),
        },
    ];

    // Stats
    const totalWarning = userSummaries.filter(s => s.expiringCccm > 0 || s.expiringGplx > 0).length;
    const totalTraining = userSummaries.filter(s => s.pendingReqs > 0).length;

    // Training schedule for Tab 2
    const trainingSchedule = useMemo(() => {
        const items: { user: IUser; req: IUserTrainingRequirement }[] = [];
        users.forEach(u => {
            const data = certData[u.user_id];
            if (!data) return;
            data.requirements.filter(r => r.status === 'PENDING').forEach(req => {
                items.push({ user: u, req });
            });
        });
        return items.sort((a, b) => {
            const da = a.req.required_date ? dayjs(a.req.required_date).unix() : Infinity;
            const db = b.req.required_date ? dayjs(b.req.required_date).unix() : Infinity;
            return da - db;
        });
    }, [users, certData]);

    const scheduleColumns = [
        { title: 'STT', key: 'stt', width: 50, render: (_: any, __: any, i: number) => i + 1 },
        {
            title: 'Nhân viên', key: 'name', width: 180,
            render: (_: any, record: { user: IUser; req: IUserTrainingRequirement }) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Avatar size={28} icon={<UserOutlined />} />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{record.user.name}</div>
                        <div style={{ fontSize: 10, color: '#999' }}>{record.user.department?.name || '-'}</div>
                    </div>
                </div>
            ),
        },
        { title: 'Chương trình', key: 'program', render: (_: any, record: { user: IUser; req: IUserTrainingRequirement }) => record.req.program?.name || '-' },
        { title: 'Mã CTĐT', key: 'code', width: 100, render: (_: any, record: { user: IUser; req: IUserTrainingRequirement }) => record.req.program?.code || '-' },
        {
            title: 'Hạn hoàn thành', key: 'due', width: 120,
            render: (_: any, record: { user: IUser; req: IUserTrainingRequirement }) => {
                if (!record.req.required_date) return '-';
                const d = dayjs(record.req.required_date);
                const overdue = d.isBefore(dayjs());
                return <span style={{ color: overdue ? '#ff4d4f' : '#333', fontWeight: overdue ? 700 : 400 }}>{d.format('DD/MM/YYYY')}</span>;
            },
        },
        {
            title: 'Trạng thái', key: 'status', width: 100,
            render: (_: any, record: { user: IUser; req: IUserTrainingRequirement }) => (
                <Tag color={record.req.status === 'FULFILLED' ? 'success' : 'warning'}>
                    {record.req.status === 'FULFILLED' ? 'Hoàn thành' : 'Đang chờ'}
                </Tag>
            ),
        },
        { title: 'Ghi chú', key: 'note', width: 150, ellipsis: true, render: (_: any, record: { user: IUser; req: IUserTrainingRequirement }) => record.req.note || '-' },
        {
            title: '', key: 'action', width: 40,
            render: (_: any, record: { user: IUser; req: IUserTrainingRequirement }) => (
                <Button type="text" size="small" icon={<EyeOutlined style={{ color: '#1890ff' }} />} onClick={() => handleViewUser(record.user)} />
            ),
        },
    ];

    return (
        <Card>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#001529' }}>Quản lý Chứng chỉ & Đào tạo</div>
                    <div style={{ fontSize: 12, color: '#999' }}>Tổng quan chứng chỉ, bằng cấp, GPLX và lịch đào tạo nhân viên</div>
                </div>
            </div>

            {/* Stats summary */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                {[
                    { label: 'Tổng nhân viên', value: users.length, color: '#1890ff', bg: '#e6f7ff' },
                    { label: 'Cảnh báo', value: totalWarning, color: '#ff4d4f', bg: '#fff2f0' },
                    { label: 'Cần đào tạo', value: totalTraining, color: '#faad14', bg: '#fffbe6' },
                ].map((stat, i) => (
                    <div key={i} style={{ flex: 1, background: stat.bg, borderRadius: 8, padding: '12px 16px', border: `1px solid ${stat.color}20` }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{certLoading ? <Spin size="small" /> : stat.value}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Search + Filter */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <Input
                    placeholder="Tìm theo tên, email..."
                    prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    allowClear
                    style={{ width: 280 }}
                />
                <Select
                    placeholder="Lọc phòng ban"
                    value={filterDept}
                    onChange={setFilterDept}
                    allowClear
                    style={{ width: 200 }}
                >
                    {departments.map(d => <Select.Option key={d} value={d}>{d}</Select.Option>)}
                </Select>
                <span style={{ color: '#999', fontSize: 12, lineHeight: '32px', marginLeft: 'auto' }}>
                    {filtered.length} / {users.length} nhân viên
                </span>
            </div>

            {/* Tabs */}
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                size="small"
                items={[
                    {
                        key: 'all',
                        label: <span>📋 Tất cả ({userSummaries.length})</span>,
                        children: (
                            <Table
                                columns={columns}
                                dataSource={filtered}
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
                                columns={columns}
                                dataSource={filtered}
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
                    {
                        key: 'training',
                        label: <span>📅 Lịch đào tạo ({trainingSchedule.length})</span>,
                        children: (
                            <Table
                                columns={scheduleColumns}
                                dataSource={trainingSchedule}
                                rowKey={(r) => `${r.user.user_id}-${r.req.id}`}
                                loading={loading || certLoading}
                                size="small"
                                bordered
                                scroll={{ x: 'max-content' }}
                                pagination={{ defaultPageSize: 15, showSizeChanger: true }}
                            />
                        ),
                    },
                ]}
            />

            <ProfileDrawer
                open={drawerOpen}
                user={selectedUser}
                onCancel={() => setDrawerOpen(false)}
                onUpdateSuccess={fetchUsers}
            />
        </Card>
    );
};

export default HRCertificates;
