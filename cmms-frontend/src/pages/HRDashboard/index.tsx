import React, { useEffect, useState, useMemo } from 'react';
import { Card, Col, Row, Table, Typography, Tag, Tabs, Input, Select, Button, Avatar, Badge, Space } from 'antd';
import { 
    TeamOutlined, 
    SafetyCertificateOutlined, 
    BookOutlined, 
    CarOutlined, 
    AlertOutlined, 
    SearchOutlined, 
    UserOutlined, 
    FileTextOutlined,
    CheckCircleOutlined,
    ReloadOutlined,
    RightOutlined
} from '@ant-design/icons';
import certificatesApi from '../../apis/certificates';
import { getAllUsers } from '../../apis/users';
import { IEmployeeCertificate, IUserTrainingRequirement } from '../../types/certificates.types';
import { IUser } from '../../types/user.types';
import dayjs from 'dayjs';
import ProfileModal from '../Users/components/ProfileModal';
import { getToken } from '../../utils/auth';
import { getLaborContracts, ILaborContract } from '../../apis/laborContracts';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

// ── SVG Donut Chart ──
interface DonutSlice {
    label: string;
    value: number;
    color: string;
    percent: number;
}

const ModernDonutChart: React.FC<{ data: Record<string, number>; colors: string[] }> = ({ data, colors }) => {
    const entries = Object.entries(data);
    const total = entries.reduce((sum, [, v]) => sum + v, 0);

    if (total === 0) {
        return (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '36px 0', fontSize: 13 }}>
                Chưa có dữ liệu thống kê
            </div>
        );
    }

    const slices: DonutSlice[] = entries.map(([label, value], i) => ({
        label,
        value,
        color: colors[i % colors.length],
        percent: Math.round((value / total) * 100),
    }));

    // SVG coordinates for donut ring
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPercent = 0;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '8px 0' }}>
            <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="60" cy="60" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="16" />
                    {slices.map((slice, idx) => {
                        const strokeDasharray = `${(slice.percent / 100) * circumference} ${circumference}`;
                        const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                        accumulatedPercent += slice.percent;
                        return (
                            <circle
                                key={idx}
                                cx="60"
                                cy="60"
                                r={radius}
                                fill="none"
                                stroke={slice.color}
                                strokeWidth="16"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dasharray 0.4s ease' }}
                            />
                        );
                    })}
                </svg>
                <div style={{
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
                }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{total}</span>
                    <span style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Văn bằng</span>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                {slices.slice(0, 5).map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                            <span style={{ color: '#334155', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.label}>
                                {s.label}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{s.value}</span>
                            <span style={{ color: '#94a3b8', fontSize: 11 }}>({s.percent}%)</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Modern Bar Distribution Chart ──
const ModernBarChart: React.FC<{ data: Record<string, number>; color: string }> = ({ data, color }) => {
    const entries = Object.entries(data);
    const max = Math.max(...entries.map(([, v]) => v), 1);

    if (entries.length === 0) {
        return (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '36px 0', fontSize: 13 }}>
                Chưa có dữ liệu GPLX
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 130, padding: '10px 4px 0' }}>
            {entries.map(([label, value]) => {
                const heightPercent = Math.max((value / max) * 100, 12);
                return (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{value}</span>
                        <div style={{
                            width: '100%', maxWidth: 36,
                            height: `${heightPercent}%`,
                            background: `linear-gradient(180deg, ${color} 0%, ${color}dd 100%)`,
                            borderRadius: '6px 6px 0 0',
                            transition: 'height 0.4s ease',
                            boxShadow: `0 2px 6px ${color}33`,
                        }} />
                        <span style={{ fontSize: 11.5, marginTop: 8, color: '#475569', fontWeight: 600, textTransform: 'uppercase' }}>
                            {label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

// ── Main HRDashboard Component ──
const HRDashboard: React.FC = () => {
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        expiringCerts: 0,
    });

    const [allUsers, setAllUsers] = useState<IUser[]>([]);
    const [expiringCerts, setExpiringCerts] = useState<IEmployeeCertificate[]>([]);
    const [expiringContracts, setExpiringContracts] = useState<ILaborContract[]>([]);
    const [activeContractsCount, setActiveContractsCount] = useState(0);
    const [qualStats, setQualStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Profile Drawer states
    const [profileOpen, setProfileOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<IUser | null>(null);

    // Certificate matrix states
    const [certData, setCertData] = useState<Record<number, { certificates: IEmployeeCertificate[]; requirements: IUserTrainingRequirement[] }>>({});
    const [certLoading, setCertLoading] = useState(false);
    const [certSearchText, setCertSearchText] = useState('');
    const [certFilterDept, setCertFilterDept] = useState<string | undefined>(undefined);
    const [certActiveTab, setCertActiveTab] = useState('all');

    // ── Optimized Single-Shot Data Fetching ──
    const fetchDashboardData = async () => {
        setLoading(true);
        setCertLoading(true);
        try {
            const token = getToken();
            const [usersList, certs, qStats, cData, allCertificates] = await Promise.all([
                getAllUsers(token, {}).catch(() => []),
                certificatesApi.getExpiringCertificates(90).catch(() => []),
                certificatesApi.getQualificationStats().catch(() => null),
                getLaborContracts().catch(() => []),
                certificatesApi.getAllCertificates().catch(() => []),
            ]);

            const users = Array.isArray(usersList) ? usersList : [];
            setAllUsers(users);
            const total = users.length;
            const active = users.filter((u: any) => u.status === 'ACTIVE' || u.status === 'active').length;

            // Filter expiring & active contracts
            const now = dayjs();
            const contracts = Array.isArray(cData) ? cData : [];
            const activeCount = contracts.filter(c => c.status === 'ACTIVE').length;
            setActiveContractsCount(activeCount);

            const expCtrcts = contracts.filter(c => {
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

            // Group all certificates by user_id in 1 operation (O(N) instead of 200 HTTP calls)
            const map: Record<number, { certificates: IEmployeeCertificate[]; requirements: IUserTrainingRequirement[] }> = {};
            users.forEach(u => {
                map[u.user_id] = { certificates: [], requirements: [] };
            });
            if (Array.isArray(allCertificates)) {
                allCertificates.forEach(c => {
                    const uid = c.user?.user_id;
                    if (uid && map[uid]) {
                        map[uid].certificates.push(c);
                    }
                });
            }
            setCertData(map);
        } catch (error) {
            console.error("Failed to load HR dashboard data", error);
        } finally {
            setLoading(false);
            setCertLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleViewUser = (user: IUser) => {
        setSelectedUser(user);
        setProfileOpen(true);
    };

    // Helper kiểm tra chứng chỉ sắp hết hạn trong 3 tháng
    const isExpiring = (cert: IEmployeeCertificate): boolean => {
        const checkDate = cert.expiry_date || cert.next_training_date;
        if (!checkDate) return false;
        const d = dayjs(checkDate);
        return d.isBefore(dayjs()) || d.diff(dayjs(), 'month', true) <= 3;
    };

    // Warning detail record
    interface CertWarningDetail {
        certName: string;
        certType: 'CCCM' | 'GPLX';
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
        warningDetails: CertWarningDetail[];
        worstDaysLeft: number;
    }

    const userSummaries: UserCertSummary[] = useMemo(() => {
        return allUsers.map(u => {
            const data = certData[u.user_id] || { certificates: [], requirements: [] };
            const certs = data.certificates;
            const cccm = certs.filter(c => c.type === 'CCCM');
            const degrees = certs.filter(c => c.qualification_type === 'BANG_CAP' || (!c.qualification_type && !c.license_class && c.type === 'BANG_CAP'));
            const gplx = certs.filter(c => c.qualification_type === 'GIAY_PHEP_LAI_XE' || (!c.qualification_type && c.license_class));

            const warningDetails: CertWarningDetail[] = [];

            cccm.forEach(c => {
                const checkDate = c.expiry_date || c.next_training_date;
                if (!checkDate) return;
                const d = dayjs(checkDate);
                const daysLeft = d.diff(dayjs(), 'day');
                if (daysLeft <= 90) {
                    warningDetails.push({
                        certName: c.program?.name || c.degree_type || c.certificate_number || 'CCCM',
                        certType: 'CCCM',
                        expiryDate: d.format('DD/MM/YYYY'),
                        daysLeft,
                    });
                }
            });

            gplx.forEach(c => {
                if (c.is_permanent || !c.expiry_date) return;
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

            warningDetails.sort((a, b) => a.daysLeft - b.daysLeft);

            return {
                user: u,
                cccmCount: cccm.length,
                degreeCount: degrees.length,
                gplxCount: gplx.length,
                cccmNames: cccm.map(c => c.program?.name || c.degree_type).filter(Boolean).join(', '),
                degreeNames: degrees.map(c => c.degree_type || c.major).filter(Boolean).join(', '),
                gplxNames: gplx.map(c => c.license_class).filter(Boolean).join(', '),
                expiringCccm: cccm.filter(isExpiring).length,
                expiringGplx: gplx.filter(c => {
                    if (c.is_permanent || !c.expiry_date) return false;
                    const d = dayjs(c.expiry_date);
                    return d.isBefore(dayjs()) || d.diff(dayjs(), 'month', true) <= 3;
                }).length,
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
            result = result.filter(s => 
                s.user.name?.toLowerCase().includes(lower) || 
                s.user.email?.toLowerCase().includes(lower) ||
                (s.user.employee_code || '').toLowerCase().includes(lower)
            );
        }
        if (certActiveTab === 'warning') result = result.filter(s => s.warningDetails.length > 0);
        return result;
    }, [userSummaries, certSearchText, certFilterDept, certActiveTab]);

    const totalWarningUsers = userSummaries.filter(s => s.warningDetails.length > 0).length;

    const totalExpiringLicenses = (qualStats?.expiringLicensesCount || 0) + (qualStats?.expiredLicensesCount || 0);
    const totalWarnings = stats.expiringCerts + totalExpiringLicenses + expiringContracts.length;

    // Helper tag cảnh báo ngày
    const renderWarningTag = (daysLeft: number) => {
        if (daysLeft <= 0) {
            return (
                <Tag color="error" style={{ fontSize: 11, fontWeight: 700, margin: 0, borderRadius: 4 }}>
                    Quá hạn {Math.abs(daysLeft)}d
                </Tag>
            );
        }
        if (daysLeft <= 30) {
            return (
                <Tag color="volcano" style={{ fontSize: 11, fontWeight: 600, margin: 0, borderRadius: 4 }}>
                    Còn {daysLeft}d
                </Tag>
            );
        }
        return (
            <Tag color="warning" style={{ fontSize: 11, fontWeight: 600, margin: 0, borderRadius: 4 }}>
                Còn {daysLeft}d
            </Tag>
        );
    };

    // ── Table Columns ──
    const certColumns = [
        {
            title: 'Nhân sự',
            key: 'name',
            width: 220,
            fixed: 'left' as const,
            render: (_: any, record: UserCertSummary) => {
                const hasWarning = record.warningDetails.length > 0;
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar
                            size={36}
                            icon={<UserOutlined />}
                            src={record.user.avatar}
                            style={{
                                backgroundColor: hasWarning ? '#fef2f2' : '#eff6ff',
                                color: hasWarning ? '#ef4444' : '#3b82f6',
                                border: hasWarning ? '1.5px solid #fca5a5' : '1.5px solid #bfdbfe',
                                flexShrink: 0
                            }}
                        />
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a' }}>{record.user.name}</div>
                            <div style={{ fontSize: 11.5, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {record.user.employee_code ? `MSNV: ${record.user.employee_code} • ` : ''}
                                {record.user.position || record.user.department?.name || 'Chưa gán vị trí'}
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'CCCM / Đào tạo',
            key: 'cccm',
            width: 140,
            align: 'center' as const,
            render: (_: any, record: UserCertSummary) => {
                if (record.cccmCount === 0) return <span style={{ color: '#cbd5e1' }}>—</span>;
                return (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600, margin: 0 }}>
                            {record.cccmCount} khóa
                        </Tag>
                        {record.expiringCccm > 0 && (
                            <Badge count={record.expiringCccm} size="small" style={{ backgroundColor: '#ef4444' }} />
                        )}
                    </div>
                );
            },
        },
        {
            title: 'Văn bằng chuyên môn',
            key: 'degree',
            width: 170,
            render: (_: any, record: UserCertSummary) => {
                if (record.degreeCount === 0) return <span style={{ color: '#cbd5e1' }}>—</span>;
                return (
                    <span style={{ fontSize: 12.5, color: '#334155' }}>
                        {record.degreeNames || `${record.degreeCount} bằng cấp`}
                    </span>
                );
            },
        },
        {
            title: 'GPLX',
            key: 'gplx',
            width: 130,
            align: 'center' as const,
            render: (_: any, record: UserCertSummary) => {
                if (record.gplxCount === 0) return <span style={{ color: '#cbd5e1' }}>—</span>;
                return (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 600, margin: 0 }}>
                            {record.gplxNames || `${record.gplxCount} hạng`}
                        </Tag>
                        {record.expiringGplx > 0 && (
                            <Badge count={record.expiringGplx} size="small" style={{ backgroundColor: '#f59e0b' }} />
                        )}
                    </div>
                );
            },
        },
        {
            title: 'Tình trạng tuân thủ',
            key: 'warnings',
            width: 250,
            sorter: (a: UserCertSummary, b: UserCertSummary) => a.worstDaysLeft - b.worstDaysLeft,
            defaultSortOrder: 'ascend' as const,
            render: (_: any, record: UserCertSummary) => {
                if (record.warningDetails.length === 0) {
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontSize: 12.5 }}>
                            <CheckCircleOutlined />
                            <span>Đầy đủ & Hợp lệ</span>
                        </div>
                    );
                }
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {record.warningDetails.slice(0, 2).map((w, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                                <span style={{
                                    fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                                    background: w.certType === 'CCCM' ? '#e0f2fe' : '#fef3c7',
                                    color: w.certType === 'CCCM' ? '#0369a1' : '#b45309'
                                }}>
                                    {w.certType}
                                </span>
                                <span style={{ color: '#334155', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {w.certName}
                                </span>
                                {renderWarningTag(w.daysLeft)}
                            </div>
                        ))}
                        {record.warningDetails.length > 2 && (
                            <span style={{ fontSize: 10.5, color: '#94a3b8' }}>
                                +{record.warningDetails.length - 2} cảnh báo khác
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 90,
            align: 'center' as const,
            render: (_: any, record: UserCertSummary) => (
                <Button 
                    type="link" 
                    size="small" 
                    icon={<RightOutlined style={{ fontSize: 11 }} />} 
                    onClick={(e) => { e.stopPropagation(); handleViewUser(record.user); }}
                    style={{ fontSize: 12 }}
                >
                    Chi tiết
                </Button>
            ),
        }
    ];

    // CCCM warning table columns
    const cccmColumns = [
        { title: 'STT', render: (_: any, __: any, i: number) => i + 1, width: 50, align: 'center' as const },
        { 
            title: 'Học viên / Nhân sự', dataIndex: ['user', 'name'],
            render: (text: string, record: IEmployeeCertificate) => (
                <Button type="link" style={{ padding: 0, fontWeight: 600 }} onClick={() => record.user && handleViewUser(record.user)}>
                    {text}
                </Button>
            )
        },
        { title: 'Chương trình / Khóa học', dataIndex: ['program', 'name'], render: (text: string, r: IEmployeeCertificate) => text || r.degree_type || '-' },
        { title: 'Số hiệu chứng chỉ', dataIndex: 'certificate_number', render: (val: string) => val ? <Tag>{val}</Tag> : '-' },
        { 
            title: 'Hạn học định kỳ', dataIndex: 'next_training_date',
            render: (d: string) => {
                if (!d) return '-';
                const date = dayjs(d);
                const daysLeft = date.diff(dayjs(), 'day');
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{date.format('DD/MM/YYYY')}</span>
                        {renderWarningTag(daysLeft)}
                    </div>
                );
            }
        },
        {
            title: 'Khắc phục', key: 'action', width: 110, align: 'center' as const,
            render: (_: any, record: IEmployeeCertificate) => (
                <Button 
                    type="primary" size="small" 
                    style={{ background: '#2563eb', borderRadius: 6 }}
                    onClick={(e) => { e.stopPropagation(); record.user && handleViewUser(record.user); }}
                >
                    Cập nhật
                </Button>
            ),
        },
    ];

    // GPLX warning table columns
    const gplxColumns = [
        { title: 'STT', render: (_: any, __: any, i: number) => i + 1, width: 50, align: 'center' as const },
        { title: 'Nhân sự', dataIndex: 'user_name', render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span> },
        { title: 'Hạng GPLX', dataIndex: 'license_class', render: (v: string) => <Tag color="cyan" style={{ fontWeight: 700 }}>Hạng {v}</Tag> },
        { title: 'Số GPLX', dataIndex: 'certificate_number' },
        { title: 'Nơi cấp', dataIndex: 'issuing_place' },
        { 
            title: 'Ngày hết hạn', dataIndex: 'expiry_date',
            render: (d: string) => {
                if (!d) return '-';
                const date = dayjs(d);
                const daysLeft = date.diff(dayjs(), 'day');
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{date.format('DD/MM/YYYY')}</span>
                        {renderWarningTag(daysLeft)}
                    </div>
                );
            }
        },
        {
            title: 'Khắc phục', key: 'action', width: 110, align: 'center' as const,
            render: (_: any, record: any) => (
                <Button 
                    type="primary" size="small" 
                    style={{ background: '#2563eb', borderRadius: 6 }}
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

    // Contract warning table columns
    const contractColumns = [
        { title: 'STT', render: (_: any, __: any, i: number) => i + 1, width: 50, align: 'center' as const },
        { 
            title: 'Nhân sự', dataIndex: ['user', 'name'],
            render: (text: string, record: ILaborContract) => (
                <Button type="link" style={{ padding: 0, fontWeight: 600 }} onClick={() => record.user && handleViewUser(record.user as any)}>
                    {text}
                </Button>
            )
        },
        { 
            title: 'Loại hợp đồng', dataIndex: 'contract_type', 
            render: (t: string) => {
                const types: Record<string, string> = { 
                    '1_MONTH': '1 Tháng', 'APPRENTICESHIP': 'Học việc', 'PROBATION': 'Thử việc', 
                    '12_MONTHS': '12 tháng', '24_MONTHS': '2 Năm', '36_MONTHS': '36 tháng', 'INDEFINITE': 'Vô thời hạn' 
                };
                return <Tag color="purple">{types[t] || t}</Tag>;
            } 
        },
        { title: 'Số hợp đồng', dataIndex: 'contract_number' },
        { 
            title: 'Ngày hết hạn', dataIndex: 'end_date',
            render: (d: string) => {
                if (!d) return '-';
                const date = dayjs(d);
                const daysLeft = date.diff(dayjs(), 'day');
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{date.format('DD/MM/YYYY')}</span>
                        {renderWarningTag(daysLeft)}
                    </div>
                );
            }
        },
        {
            title: 'Khắc phục', key: 'action', width: 110, align: 'center' as const,
            render: (_: any, record: ILaborContract) => (
                <Button 
                    type="primary" size="small" 
                    style={{ background: '#7c3aed', borderColor: '#7c3aed', borderRadius: 6 }}
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if (record.user) handleViewUser(record.user as any);
                    }}
                >
                    Tái ký HĐ
                </Button>
            ),
        },
    ];

    const warningTabs = [
        {
            key: 'cccm',
            label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BookOutlined /> CCCM cần đào tạo lại 
                    <Badge count={expiringCerts.length} overflowCount={99} style={{ backgroundColor: '#ef4444' }} />
                </span>
            ),
            children: (
                <Table
                    columns={cccmColumns}
                    dataSource={expiringCerts}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 5 }}
                    size="small"
                />
            )
        },
        {
            key: 'gplx',
            label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CarOutlined /> GPLX đến hạn sát hạch
                    <Badge count={totalExpiringLicenses} overflowCount={99} style={{ backgroundColor: '#f59e0b' }} />
                </span>
            ),
            children: (
                <Table
                    columns={gplxColumns}
                    dataSource={[...(qualStats?.expiredLicenses || []), ...(qualStats?.expiringLicenses || [])]}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 5 }}
                    size="small"
                    locale={{ emptyText: 'Không có GPLX nào đến hạn sát hạch' }}
                />
            )
        },
        {
            key: 'contract',
            label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileTextOutlined /> Hợp đồng sắp hết hạn
                    <Badge count={expiringContracts.length} overflowCount={99} style={{ backgroundColor: '#ec4899' }} />
                </span>
            ),
            children: (
                <Table
                    columns={contractColumns}
                    dataSource={expiringContracts}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 5 }}
                    size="small"
                    locale={{ emptyText: 'Không có Hợp đồng lao động nào sắp hết hạn' }}
                />
            )
        },
    ];

    const degreeColors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

    return (
        <div style={{ padding: '24px 28px', background: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}>
            <div style={{ maxWidth: 1440, margin: '0 auto' }}>

                {/* ── Top Header ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
                            Tổng quan & Báo cáo Nhân sự
                        </Title>
                        <Text type="secondary" style={{ fontSize: 13, color: '#64748b' }}>
                            Theo dõi thời gian thực cơ cấu nhân lực, chỉ số tuân thủ quy chuẩn đào tạo và rủi ro hết hạn hồ sơ
                        </Text>
                    </div>

                    <Space>
                        <Button 
                            icon={<ReloadOutlined />} 
                            onClick={fetchDashboardData} 
                            loading={loading}
                            style={{ borderRadius: 8, borderColor: '#cbd5e1' }}
                        >
                            Làm mới
                        </Button>
                        <Button 
                            type="primary" 
                            icon={<TeamOutlined />} 
                            onClick={() => navigate('/quan_ly_nhan_vien')}
                            style={{ borderRadius: 8, background: '#2563eb' }}
                        >
                            Trung tâm Nhân sự 360°
                        </Button>
                    </Space>
                </div>

                {/* ── 1. Modern KPI Metric Cards ── */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    {/* Card 1: Tổng nhân sự */}
                    <Col xs={24} sm={12} lg={6}>
                        <div className="hr-kpi-card">
                            <div className="hr-kpi-header">
                                <span className="hr-kpi-label">Tổng quy mô nhân sự</span>
                                <div className="hr-kpi-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
                                    <TeamOutlined />
                                </div>
                            </div>
                            <div className="hr-kpi-value">{stats.totalUsers}</div>
                            <div className="hr-kpi-sub">
                                <span style={{ color: '#10b981', fontWeight: 600 }}>{stats.activeUsers} hoạt động</span>
                                <span style={{ color: '#94a3b8' }}>•</span>
                                <span style={{ color: '#64748b' }}>Tỷ lệ: {stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%</span>
                            </div>
                        </div>
                    </Col>

                    {/* Card 2: Tuân thủ & Bằng cấp */}
                    <Col xs={24} sm={12} lg={6}>
                        <div className="hr-kpi-card">
                            <div className="hr-kpi-header">
                                <span className="hr-kpi-label">Hồ sơ & Trình độ văn bằng</span>
                                <div className="hr-kpi-icon-wrap" style={{ background: '#f0fdf4', color: '#10b981' }}>
                                    <BookOutlined />
                                </div>
                            </div>
                            <div className="hr-kpi-value">{qualStats?.totalDegrees || 0}</div>
                            <div className="hr-kpi-sub">
                                <span style={{ color: '#64748b' }}>Đã hoàn thiện hồ sơ chuẩn hóa</span>
                            </div>
                        </div>
                    </Col>

                    {/* Card 3: Cảnh báo khẩn cấp */}
                    <Col xs={24} sm={12} lg={6}>
                        <div className="hr-kpi-card" style={{ borderColor: totalWarnings > 0 ? '#fecaca' : '#e2e8f0' }}>
                            <div className="hr-kpi-header">
                                <span className="hr-kpi-label">Cảnh báo rủi ro sắp/quá hạn</span>
                                <div className="hr-kpi-icon-wrap" style={{ background: totalWarnings > 0 ? '#fef2f2' : '#f0fdf4', color: totalWarnings > 0 ? '#ef4444' : '#10b981' }}>
                                    <AlertOutlined />
                                </div>
                            </div>
                            <div className="hr-kpi-value" style={{ color: totalWarnings > 0 ? '#ef4444' : '#10b981' }}>
                                {totalWarnings}
                            </div>
                            <div className="hr-kpi-sub">
                                <span>{stats.expiringCerts} CCCM</span>
                                <span style={{ color: '#94a3b8' }}>•</span>
                                <span>{totalExpiringLicenses} GPLX</span>
                                <span style={{ color: '#94a3b8' }}>•</span>
                                <span>{expiringContracts.length} HĐLĐ</span>
                            </div>
                        </div>
                    </Col>

                    {/* Card 4: Tình trạng Hợp đồng */}
                    <Col xs={24} sm={12} lg={6}>
                        <div className="hr-kpi-card">
                            <div className="hr-kpi-header">
                                <span className="hr-kpi-label">Hợp đồng lao động hiệu lực</span>
                                <div className="hr-kpi-icon-wrap" style={{ background: '#faf5ff', color: '#8b5cf6' }}>
                                    <FileTextOutlined />
                                </div>
                            </div>
                            <div className="hr-kpi-value">{activeContractsCount}</div>
                            <div className="hr-kpi-sub">
                                <span style={{ color: '#8b5cf6', fontWeight: 600 }}>Tỷ lệ: {stats.totalUsers > 0 ? Math.round((activeContractsCount / stats.totalUsers) * 100) : 0}%</span>
                                <span style={{ color: '#94a3b8' }}>•</span>
                                <span style={{ color: '#64748b' }}>{expiringContracts.length} cần tái ký</span>
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* ── 2. Distribution Analytics Section ── */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} lg={12}>
                        <Card 
                            variant="borderless" 
                            styles={{ body: { padding: '18px 22px' } }}
                            style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', background: '#fff' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                <BookOutlined style={{ color: '#2563eb', fontSize: 16 }} />
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Cơ cấu Trình độ & Bằng cấp chuyên môn</span>
                            </div>
                            <ModernDonutChart data={qualStats?.degreeDistribution || {}} colors={degreeColors} />
                        </Card>
                    </Col>

                    <Col xs={24} lg={12}>
                        <Card 
                            variant="borderless" 
                            styles={{ body: { padding: '18px 22px' } }}
                            style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', background: '#fff' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                <CarOutlined style={{ color: '#06b6d4', fontSize: 16 }} />
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Phân bổ Giấy phép lái xe & Vận hành</span>
                            </div>
                            <ModernBarChart data={qualStats?.licenseDistribution || {}} color="#06b6d4" />
                        </Card>
                    </Col>
                </Row>

                {/* ── 3. Actionable Warning Center ── */}
                <Card 
                    variant="borderless" 
                    styles={{ body: { padding: '16px 20px' } }} 
                    style={{ borderRadius: 12, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', background: '#fff' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <AlertOutlined style={{ color: '#ef4444', fontSize: 16 }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Trung tâm Xử lý Cảnh báo đến hạn</span>
                        <Tag color={totalWarnings > 0 ? 'error' : 'success'} style={{ borderRadius: 12, marginLeft: 6 }}>
                            {totalWarnings > 0 ? `${totalWarnings} cảnh báo cần xử lý` : 'Tất cả an toàn'}
                        </Tag>
                    </div>
                    <Tabs items={warningTabs} defaultActiveKey="cccm" size="middle" />
                </Card>

                {/* ── 4. Detailed Talent Compliance Matrix ── */}
                <Card 
                    variant="borderless" 
                    styles={{ body: { padding: 0 } }} 
                    style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', background: '#fff' }}
                >
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <SafetyCertificateOutlined style={{ color: '#2563eb', fontSize: 16 }} />
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Ma trận Tuân thủ Chứng chỉ & Năng lực Nhân sự</span>
                            </div>
                            <span style={{ color: '#64748b', fontSize: 12.5 }}>
                                Hiển thị <b>{filteredCerts.length}</b> / {allUsers.length} nhân sự
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Input 
                                placeholder="Tìm theo tên, email, MSNV..." 
                                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />} 
                                value={certSearchText} 
                                onChange={e => setCertSearchText(e.target.value)} 
                                allowClear 
                                style={{ width: 300, borderRadius: 8 }} 
                            />
                            <Select 
                                placeholder="Lọc theo phòng ban / tổ đội" 
                                value={certFilterDept} 
                                onChange={setCertFilterDept} 
                                allowClear 
                                style={{ width: 220 }}
                            >
                                {departments.map(d => <Select.Option key={d} value={d}>{d}</Select.Option>)}
                            </Select>
                        </div>
                    </div>

                    <div style={{ padding: '0 20px' }}>
                        <Tabs 
                            activeKey={certActiveTab} 
                            onChange={setCertActiveTab} 
                            items={[
                                { 
                                    key: 'all', 
                                    label: <span>Tất cả nhân sự ({userSummaries.length})</span>, 
                                    children: (
                                        <Table 
                                            columns={certColumns} 
                                            dataSource={filteredCerts} 
                                            rowKey={(r) => r.user.user_id} 
                                            loading={loading || certLoading} 
                                            size="middle" 
                                            scroll={{ x: 'max-content' }} 
                                            pagination={{ 
                                                defaultPageSize: 15, 
                                                showSizeChanger: true, 
                                                pageSizeOptions: ['10', '15', '30', '50'], 
                                                showTotal: (t) => <span style={{ fontSize: 12, color: '#64748b' }}>Tổng {t} nhân viên</span> 
                                            }} 
                                            onRow={(record) => ({ 
                                                onClick: () => handleViewUser(record.user), 
                                                style: { cursor: 'pointer' } 
                                            })} 
                                            rowClassName={(record) => record.warningDetails.length > 0 ? 'hr-row-warning' : 'hr-row-safe'} 
                                        />
                                    )
                                },
                                { 
                                    key: 'warning', 
                                    label: (
                                        <span style={{ color: totalWarningUsers > 0 ? '#ef4444' : undefined, fontWeight: totalWarningUsers > 0 ? 600 : 400 }}>
                                            ⚠️ Nhân sự có cảnh báo ({totalWarningUsers})
                                        </span>
                                    ), 
                                    children: (
                                        <Table 
                                            columns={certColumns} 
                                            dataSource={filteredCerts} 
                                            rowKey={(r) => r.user.user_id} 
                                            loading={loading || certLoading} 
                                            size="middle" 
                                            scroll={{ x: 'max-content' }} 
                                            pagination={{ defaultPageSize: 15, showSizeChanger: true }} 
                                            onRow={(record) => ({ 
                                                onClick: () => handleViewUser(record.user), 
                                                style: { cursor: 'pointer' } 
                                            })} 
                                        />
                                    )
                                },
                            ]}
                        />
                    </div>
                </Card>

                {/* Profile Drawer */}
                <ProfileModal 
                    open={profileOpen} 
                    user={selectedUser} 
                    onCancel={() => setProfileOpen(false)} 
                    onUpdateSuccess={() => fetchDashboardData()} 
                />

                <style>{`
                    .hr-kpi-card {
                        background: #ffffff;
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        padding: 18px 20px;
                        transition: all 0.2s ease;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                    }
                    .hr-kpi-card:hover {
                        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                        transform: translateY(-1px);
                    }
                    .hr-kpi-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 8px;
                    }
                    .hr-kpi-label {
                        font-size: 13px;
                        font-weight: 600;
                        color: #64748b;
                    }
                    .hr-kpi-icon-wrap {
                        width: 34px;
                        height: 34px;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 16px;
                    }
                    .hr-kpi-value {
                        font-size: 26px;
                        font-weight: 700;
                        color: #0f172a;
                        letter-spacing: -0.02em;
                        line-height: 1.2;
                    }
                    .hr-kpi-sub {
                        margin-top: 6px;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        color: #64748b;
                    }
                    .ant-table-tbody > tr:hover > td { background: #f8fafc !important; }
                    .ant-table-tbody > tr { transition: all 0.15s ease; }
                    .ant-table-tbody > tr.hr-row-warning > td { background: #fffbeb !important; }
                    .ant-table-tbody > tr.hr-row-warning > td:first-child { border-left: 3px solid #f59e0b; }
                    .ant-table-tbody > tr.hr-row-warning:hover > td { background: #fef3c7 !important; }
                `}</style>
            </div>
        </div>
    );
};

export default HRDashboard;
