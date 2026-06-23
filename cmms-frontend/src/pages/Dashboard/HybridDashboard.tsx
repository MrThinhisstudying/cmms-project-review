import React, { useEffect, useState, useCallback } from 'react';
import { Row, Col, Tag, Button, Badge, Tooltip } from 'antd';
import {
    TeamOutlined, SafetyCertificateOutlined,
    CarOutlined, RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import certificatesApi from '../../apis/certificates';
import { getAllUsers } from '../../apis/users';
import { getToken } from '../../utils/auth';
import dayjs from 'dayjs';
import TechnicalDashboard from './TechnicalDashboard';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';

interface WarningItem {
    name: string;
    type: string;
    daysLeft: number;
}

const HybridDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [hrStats, setHrStats] = useState({ totalUsers: 0, expiringCerts: 0, expiringGplx: 0 });
    const [topWarnings, setTopWarnings] = useState<WarningItem[]>([]);

    const loadHrData = useCallback(async () => {
        try {
            const token = getToken();
            const [usersList, certs, qStats] = await Promise.all([
                getAllUsers(token, {}),
                certificatesApi.getExpiringCertificates(90),
                certificatesApi.getQualificationStats(),
            ]);
            const totalGplx = (qStats?.expiringLicensesCount || 0) + (qStats?.expiredLicensesCount || 0);
            setHrStats({ totalUsers: usersList.length, expiringCerts: certs.length, expiringGplx: totalGplx });

            const warnings: WarningItem[] = [];
            certs.slice(0, 4).forEach((c: any) => {
                const d = c.expiry_date || c.next_training_date;
                if (d) warnings.push({ name: c.user?.name || 'N/A', type: 'CCCM', daysLeft: dayjs(d).diff(dayjs(), 'day') });
            });
            const allGplx = [...(qStats?.expiredLicenses || []), ...(qStats?.expiringLicenses || [])];
            allGplx.slice(0, 3).forEach((g: any) => {
                warnings.push({ name: g.user_name || 'N/A', type: 'GPLX', daysLeft: g.expiry_date ? dayjs(g.expiry_date).diff(dayjs(), 'day') : 0 });
            });
            warnings.sort((a, b) => a.daysLeft - b.daysLeft);
            setTopWarnings(warnings.slice(0, 5));
        } catch (err) {
            console.error('HR summary error:', err);
        }
    }, []);

    useEffect(() => {
        loadHrData();
    }, [loadHrData]);

    // Phase A: Tự refetch khi user quay lại tab
    useRefreshOnFocus(loadHrData);


    const getLabel = (d: number) => d <= 0 ? `Quá hạn ${Math.abs(d)} ngày` : `Còn ${d} ngày`;

    return (
        <div>
            {/* HR Summary Bar */}
            <div style={{ background: '#1a1a2e', padding: '12px 24px' }}>
                <Row align="middle" gutter={24}>
                    {/* Stat chips */}
                    <Col>
                        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                            <Tooltip title="Tổng nhân sự trong hệ thống">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/quan_ly_nhan_vien')}>
                                    <TeamOutlined style={{ fontSize: 20, color: '#69b1ff' }} />
                                    <div>
                                        <div style={{ color: '#8c8c8c', fontSize: 11, lineHeight: 1.2 }}>Nhân sự</div>
                                        <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{hrStats.totalUsers}</div>
                                    </div>
                                </div>
                            </Tooltip>

                            <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.1)' }} />

                            <Tooltip title="Chứng chỉ chuyên môn sắp hết hạn (90 ngày)">
                                <Badge count={hrStats.expiringCerts} size="small" offset={[6, -2]}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/hr-dashboard')}>
                                        <SafetyCertificateOutlined style={{ fontSize: 20, color: hrStats.expiringCerts > 0 ? '#ffc53d' : '#95de64' }} />
                                        <div>
                                            <div style={{ color: '#8c8c8c', fontSize: 11, lineHeight: 1.2 }}>CCCM</div>
                                            <div style={{ color: hrStats.expiringCerts > 0 ? '#ffc53d' : '#95de64', fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{hrStats.expiringCerts}</div>
                                        </div>
                                    </div>
                                </Badge>
                            </Tooltip>

                            <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.1)' }} />

                            <Tooltip title="Giấy phép lái xe sắp hết hạn">
                                <Badge count={hrStats.expiringGplx} size="small" offset={[6, -2]}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/hr-dashboard')}>
                                        <CarOutlined style={{ fontSize: 20, color: hrStats.expiringGplx > 0 ? '#ffc53d' : '#95de64' }} />
                                        <div>
                                            <div style={{ color: '#8c8c8c', fontSize: 11, lineHeight: 1.2 }}>GPLX</div>
                                            <div style={{ color: hrStats.expiringGplx > 0 ? '#ffc53d' : '#95de64', fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{hrStats.expiringGplx}</div>
                                        </div>
                                    </div>
                                </Badge>
                            </Tooltip>
                        </div>
                    </Col>

                    {/* Warning tags */}
                    {topWarnings.length > 0 && (
                        <Col flex="auto">
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                {topWarnings.slice(0, 3).map((w, i) => (
                                    <Tag
                                        key={i}
                                        color={w.daysLeft <= 0 ? 'error' : w.daysLeft <= 30 ? 'warning' : 'gold'}
                                        style={{ fontSize: 11, borderRadius: 12, padding: '1px 8px', margin: 0 }}
                                    >
                                        {w.name} • {w.type} • {getLabel(w.daysLeft)}
                                    </Tag>
                                ))}
                                {topWarnings.length > 3 && (
                                    <Tag
                                        style={{ fontSize: 11, borderRadius: 12, padding: '1px 8px', margin: 0, background: 'rgba(255,255,255,0.08)', color: '#aaa', border: 'none', cursor: 'pointer' }}
                                        onClick={() => navigate('/hr-dashboard')}
                                    >
                                        +{topWarnings.length - 3} khác
                                    </Tag>
                                )}
                            </div>
                        </Col>
                    )}

                    <Col>
                        <Button
                            size="small"
                            ghost
                            onClick={() => navigate('/hr-dashboard')}
                            style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)', fontSize: 12 }}
                        >
                            Chi tiết Nhân sự <RightOutlined />
                        </Button>
                    </Col>
                </Row>
            </div>

            {/* Technical Dashboard */}
            <TechnicalDashboard />
        </div>
    );
};

export default HybridDashboard;
