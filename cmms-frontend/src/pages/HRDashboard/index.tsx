import React, { useEffect, useState, useMemo } from 'react';
import { Card, Col, Row, Table, Typography, Tag, Tabs, Input, Select, Button, Avatar, Tooltip, Badge } from 'antd';
import { WarningOutlined, TeamOutlined, SafetyCertificateOutlined, BookOutlined, CarOutlined, AlertOutlined, SearchOutlined, UserOutlined, EyeOutlined } from '@ant-design/icons';
import certificatesApi from '../../apis/certificates';
import { getAllUsers } from '../../apis/users';
import { IEmployeeCertificate, IUserTrainingRequirement } from '../../types/certificates.types';
import { IUser } from '../../types/user.types';
import dayjs from 'dayjs';
import ProfileModal from '../Users/components/ProfileModal';
import { getToken } from '../../utils/auth';
import { getLaborContracts, ILaborContract } from '../../apis/laborContracts';
import { FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

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
    const navigate = useNavigate();
    
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        expiringCerts: 0,
    });
    
    const [expiringCerts, setExpiringCerts] = useState<IEmployeeCertificate[]>([]);
    const [expiringContracts, setExpiringContracts] = useState<ILaborContract[]>([]);
    const [qualStats, setQualStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [allUsers, setAllUsers] = useState<IUser[]>([]);

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

                const [certs, qStats, cData] = await Promise.all([
                    certificatesApi.getExpiringCertificates(90),
                    certificatesApi.getQualificationStats(),
                    getLaborContracts()
                ]);

                // Filter expiring contracts
                const now = dayjs();
                const expCtrcts = cData.filter(c => {
                    if (c.status === 'TERMINATED') return false;
                    if (!c.end_date) return false;
                    const end = dayjs(c.end_date);
                    return end.isBefore(now) || end.diff(now, 'day') <= 30;
                });
                setExpiringContracts(expCtrcts);

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

    // Chi tiết cảnh báo cho từng chứng chỉ
    interface CertWarningDetail {
        certName: string;
        certType: string; // 'CCCM' | 'GPLX' | 'HĐ LĐ'
        expiryDate: string;
        daysLeft: number;
    }

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
        // ✨ Chi tiết cảnh báo
        warningDetails: CertWarningDetail[];
        worstDaysLeft: number; // Cảnh báo nghiêm trọng nhất (số ngày nhỏ nhất)
    }

    const userSummaries: UserCertSummary[] = useMemo(() => {
        return allUsers.map(u => {
            const data = certData[u.user_id] || { certificates: [], requirements: [] };
            const certs = data.certificates;
            const reqs = data.requirements;
            const cccm = certs.filter(c => c.type === 'CCCM');
            const degrees = certs.filter(c => c.qualification_type === 'BANG_CAP' || (!c.qualification_type && !c.license_class && c.type === 'BANG_CAP'));
            const gplx = certs.filter(c => c.qualification_type === 'GIAY_PHEP_LAI_XE' || (!c.qualification_type && c.license_class));

            // Collect warning details
            const warningDetails: CertWarningDetail[] = [];

            cccm.forEach(c => {
                const checkDate = c.expiry_date || c.next_training_date;
                if (!checkDate) return;
                const d = dayjs(checkDate);
                const daysLeft = d.diff(dayjs(), 'day');
                if (daysLeft <= 90) {
                    warningDetails.push({
                        certName: c.program?.name || c.certificate_number || 'CCCM',
                        certType: 'CCCM',
                        expiryDate: d.format('DD/MM/YYYY'),
                        daysLeft,
                    });
                }
            });

            gplx.forEach(c => {
                if (c.is_permanent) return;
                if (!c.expiry_date) return;
                const d = dayjs(c.expiry_date);
                const daysLeft = d.diff(dayjs(), 'day');
                if (daysLeft <= 90) {
                    warningDetails.push({
                        certName: `Hạng ${c.license_class || '?'}`,
                        certType: 'GPLX',
                        expiryDate: d.format('DD/MM/YYYY'),
                        daysLeft,
                    });
                }
            });

            // Sort: nghiêm trọng nhất trước
            warningDetails.sort((a, b) => a.daysLeft - b.daysLeft);

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
                warningDetails,
                worstDaysLeft: warningDetails.length > 0 ? warningDetails[0].daysLeft : Infinity,
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

    // Helper hiển thị tag cảnh báo — compact
    const getWarningTag = (daysLeft: number) => {
        if (daysLeft <= 0) return <span style={{ fontSize: 11, color: '#ff4d4f', fontWeight: 600 }}>Quá hạn {Math.abs(daysLeft)}d</span>;
        if (daysLeft <= 30) return <span style={{ fontSize: 11, color: '#ff4d4f', fontWeight: 500 }}>Còn {daysLeft}d</span>;
        if (daysLeft <= 90) return <span style={{ fontSize: 11, color: '#faad14', fontWeight: 500 }}>Còn {daysLeft}d</span>;
        return null;
    };

    const certColumns = [
        {
            title: 'Nhân viên', key: 'name', width: 200, fixed: 'left' as const,
            render: (_: any, record: UserCertSummary) => {
                const hasWarning = record.warningDetails.length > 0;
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar size={34} icon={<UserOutlined />} src={record.user.avatar}
                            style={{ backgroundColor: hasWarning ? '#fff2f0' : '#f0f5ff', color: hasWarning ? '#ff4d4f' : '#597ef7', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#262626' }}>{record.user.name}</div>
                            <div style={{ fontSize: 11, color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {record.user.position || record.user.department?.name || '---'}
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'CCCM', key: 'cccm', width: 120, align: 'center' as const,
            render: (_: any, record: UserCertSummary) => {
                if (record.cccmCount === 0) return <span style={{ color: '#d9d9d9' }}>—</span>;
                return (
                    <div>
                        <span style={{ fontSize: 12 }}>{record.cccmCount}</span>
                        {record.expiringCccm > 0 && <Badge count={record.expiringCccm} size="small" style={{ backgroundColor: '#ff4d4f', marginLeft: 6 }} />}
                    </div>
                );
            },
        },
        {
            title: 'Bằng cấp', key: 'degree', width: 110, align: 'center' as const,
            render: (_: any, record: UserCertSummary) => {
                if (record.degreeCount === 0) return <span style={{ color: '#d9d9d9' }}>—</span>;
                return <span style={{ fontSize: 12 }}>{record.degreeNames || record.degreeCount}</span>;
            },
        },
        {
            title: 'GPLX', key: 'gplx', width: 110, align: 'center' as const,
            render: (_: any, record: UserCertSummary) => {
                if (record.gplxCount === 0) return <span style={{ color: '#d9d9d9' }}>—</span>;
                return (
                    <div>
                        <span style={{ fontSize: 12 }}>{record.gplxNames ? record.gplxNames.split(', ').map(n => n).join(', ') : record.gplxCount}</span>
                        {record.expiringGplx > 0 && <Badge count={record.expiringGplx} size="small" style={{ backgroundColor: '#faad14', marginLeft: 6 }} />}
                    </div>
                );
            },
        },
        {
            title: 'Tình trạng', key: 'warnings', width: 240,
            sorter: (a: UserCertSummary, b: UserCertSummary) => a.worstDaysLeft - b.worstDaysLeft,
            defaultSortOrder: 'ascend' as const,
            render: (_: any, record: UserCertSummary) => {
                if (record.warningDetails.length === 0) {
                    return <span style={{ color: '#bfbfbf', fontSize: 12 }}>Bình thường</span>;
                }
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {record.warningDetails.slice(0, 2).map((w, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                                <Tag style={{ fontSize: 10, lineHeight: '16px', margin: 0, padding: '0 5px', borderRadius: 3, border: 'none', background: w.certType === 'CCCM' ? '#e6f7ff' : '#f9f0ff', color: w.certType === 'CCCM' ? '#1890ff' : '#722ed1' }}>
                                    {w.certType}
                                </Tag>
                                <span style={{ color: '#595959', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.certName}</span>
                                {getWarningTag(w.daysLeft)}
                            </div>
                        ))}
                        {record.warningDetails.length > 2 && (
                            <span style={{ fontSize: 10, color: '#8c8c8c', paddingLeft: 2 }}>+{record.warningDetails.length - 2} khác</span>
                        )}
                    </div>
                );
            },
        },
    ];


    // CCCM expiring columns
    const cccmColumns = [
        { title: 'STT', render: (_: any, __: any, i: number) => i + 1, width: 50 },
        { 
            title: 'Học viên', dataIndex: ['user', 'name'],
            render: (text: string, record: IEmployeeCertificate) => (
                <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => record.user && handleViewUser(record.user)}>{text}</Button>
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
        {
            title: 'Khắc phục', key: 'action', width: 100, align: 'center' as const,
            render: (_: any, record: IEmployeeCertificate) => (
                <Button 
                    type="primary" size="small" 
                    onClick={(e) => { e.stopPropagation(); record.user && handleViewUser(record.user); }}
                >
                    Cập nhật
                </Button>
            ),
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
        {
            title: 'Khắc phục', key: 'action', width: 100, align: 'center' as const,
            render: (_: any, record: any) => (
                <Button 
                    type="primary" size="small" 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        const tgt = allUsers.find(u => u.user_id === record.user_id) || allUsers.find(u => u.name === record.user_name);
                        if (tgt) handleViewUser(tgt);
                    }}
                >
                    Cập nhật
                </Button>
            ),
        },
    ];

    // Contract expiring columns
    const contractColumns = [
        { title: 'STT', render: (_: any, __: any, i: number) => i + 1, width: 50 },
        { 
            title: 'Nhân viên', dataIndex: ['user', 'name'],
            render: (text: string, record: ILaborContract) => (
                <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => record.user && handleViewUser(record.user as any)}>{text}</Button>
            )
        },
        { 
            title: 'Loại HĐ', 
            dataIndex: 'contract_type', 
            render: (t: string) => {
                const types: Record<string, string> = { 
                    '1_MONTH': '1 Tháng', 
                    'APPRENTICESHIP': 'Học việc',
                    'PROBATION': 'Thử việc', 
                    '12_MONTHS': '12 tháng', 
                    '24_MONTHS': '2 Năm', 
                    '36_MONTHS': '36 tháng', 
                    'INDEFINITE': 'Vô thời hạn' 
                };
                return <Tag color="orange">{types[t] || t}</Tag>;
            } 
        },
        { title: 'Số HĐ', dataIndex: 'contract_number' },
        { 
            title: 'Ngày hết hạn', dataIndex: 'end_date',
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
        {
            title: 'Khắc phục', key: 'action', width: 100, align: 'center' as const,
            render: (_: any, record: ILaborContract) => (
                <Button 
                    type="primary" size="small" 
                    onClick={(e) => { e.stopPropagation(); navigate('/hop-dong-lao-dong', { state: { action: 'renew', userId: record.user?.user_id } }); }}
                >
                    Gia hạn
                </Button>
            ),
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
        {
            key: 'contract',
            label: <span><FileTextOutlined /> Hợp đồng LĐ ({expiringContracts.length})</span>,
            children: (
                <Table
                    columns={contractColumns}
                    dataSource={expiringContracts}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    size="small"
                    bordered
                    locale={{ emptyText: 'Không có Hợp đồng LĐ nào sắp hết hạn' }}
                />
            )
        },
    ];

    const degreeColors = ['#1890ff', '#52c41a', '#faad14', '#722ed1', '#eb2f96', '#13c2c2'];

    const totalWarnings = stats.expiringCerts + totalExpiringLicenses + expiringContracts.length;

    return (
        <div style={{ padding: 24, background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>

                {/* HEADER — inline stats */}
                <div style={{ marginBottom: 20 }}>
                    <Title level={3} style={{ margin: 0, fontWeight: 600, letterSpacing: '-0.02em' }}>Tổng quan Nhân sự</Title>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        <Tag icon={<TeamOutlined />} style={{ border: 'none', background: '#e6f7ff', color: '#1890ff', borderRadius: 4 }}>{stats.totalUsers} nhân sự</Tag>
                        {totalWarnings > 0 && <Tag icon={<AlertOutlined />} color="error" style={{ borderRadius: 4 }}>{totalWarnings} cảnh báo</Tag>}
                        {stats.expiringCerts > 0 && <Tag style={{ border: 'none', background: '#fff2e8', color: '#d4380d', borderRadius: 4 }}>CCCM: {stats.expiringCerts}</Tag>}
                        {totalExpiringLicenses > 0 && <Tag icon={<CarOutlined />} style={{ border: 'none', background: '#fff0f6', color: '#c41d7f', borderRadius: 4 }}>GPLX: {totalExpiringLicenses}</Tag>}
                        <Tag icon={<BookOutlined />} style={{ border: 'none', background: '#f9f0ff', color: '#722ed1', borderRadius: 4 }}>{qualStats?.totalDegrees || 0} bằng cấp</Tag>
                    </div>
                </div>

                {/* CHARTS — compact */}
                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                        <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#262626' }}>🎓 Phân bổ bằng cấp</div>
                            <PieChart data={qualStats?.degreeDistribution || {}} colors={degreeColors} />
                        </Card>
                    </Col>
                    <Col span={12}>
                        <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#262626' }}>🚗 Phân bổ giấy phép lái xe</div>
                            <BarChart data={qualStats?.licenseDistribution || {}} color="#1890ff" />
                        </Card>
                    </Col>
                </Row>

                {/* WARNING TABLES */}
                <Card variant="borderless" styles={{ body: { padding: '12px 16px' } }} style={{ borderRadius: 10, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#262626' }}>
                        <AlertOutlined style={{ color: '#ff4d4f', marginRight: 6 }} />Cảnh báo sắp hết hạn
                    </div>
                    <Tabs items={warningTabs} defaultActiveKey="cccm" size="small" />
                </Card>

                {/* CERT OVERVIEW TABLE */}
                <Card variant="borderless" styles={{ body: { padding: 0 } }} style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 10 }}>
                            <SafetyCertificateOutlined style={{ color: '#1890ff', marginRight: 6 }} />Tổng quan Chứng chỉ & Bằng cấp
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Input placeholder="Tìm theo tên, email..." prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} value={certSearchText} onChange={e => setCertSearchText(e.target.value)} allowClear style={{ width: 280 }} size="middle" />
                            <Select placeholder="Lọc phòng ban" value={certFilterDept} onChange={setCertFilterDept} allowClear style={{ width: 200 }} size="middle">
                                {departments.map(d => <Select.Option key={d} value={d}>{d}</Select.Option>)}
                            </Select>
                            <span style={{ color: '#999', fontSize: 12, marginLeft: 'auto' }}>{filteredCerts.length} / {allUsers.length} nhân viên</span>
                        </div>
                    </div>

                    <Tabs activeKey={certActiveTab} onChange={setCertActiveTab} size="small" style={{ padding: '0 16px' }}
                        items={[
                            { key: 'all', label: <span>Tất cả ({userSummaries.length})</span>, children: (
                                <Table columns={certColumns} dataSource={filteredCerts} rowKey={(r) => r.user.user_id} loading={loading || certLoading} size="small" scroll={{ x: 'max-content' }} pagination={{ defaultPageSize: 15, showSizeChanger: true, pageSizeOptions: ['10', '15', '30', '50'], showTotal: (t) => <span style={{ fontSize: 12, color: '#999' }}>Tổng {t}</span> }} onRow={(record) => ({ onClick: () => handleViewUser(record.user), style: { cursor: 'pointer' } })} rowClassName={(record) => record.warningDetails.length > 0 ? 'hr-row-warning' : 'hr-row-safe'} />
                            )},
                            { key: 'warning', label: <span>⚠️ Cảnh báo ({totalWarning})</span>, children: (
                                <Table columns={certColumns} dataSource={filteredCerts} rowKey={(r) => r.user.user_id} loading={loading || certLoading} size="small" scroll={{ x: 'max-content' }} pagination={{ defaultPageSize: 15, showSizeChanger: true }} onRow={(record) => ({ onClick: () => handleViewUser(record.user), style: { cursor: 'pointer' } })} />
                            )},
                        ]}
                    />
                </Card>

                <ProfileModal open={profileOpen} user={selectedUser} onCancel={() => setProfileOpen(false)} onUpdateSuccess={() => {}} />

                <style>{`
                    .ant-table-tbody > tr:hover > td { background: #fafafa !important; }
                    .ant-table-tbody > tr { transition: all 0.15s ease; }
                    .ant-table-tbody > tr.hr-row-safe > td { opacity: 0.6; }
                    .ant-table-tbody > tr.hr-row-safe:hover > td { opacity: 1; }
                    .ant-table-tbody > tr.hr-row-warning > td { background: #fffbe6 !important; }
                    .ant-table-tbody > tr.hr-row-warning > td:first-child { border-left: 3px solid #ff4d4f; }
                    .ant-table-tbody > tr.hr-row-warning:hover > td { background: #fff7e6 !important; }
                `}</style>
            </div>
        </div>
    );
};

export default HRDashboard;
