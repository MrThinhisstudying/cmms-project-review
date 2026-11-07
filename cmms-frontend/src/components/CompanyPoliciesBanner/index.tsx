import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Space, Tag, Button, Typography } from 'antd';
import {
    BookOutlined,
    PushpinOutlined,
    RightOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import {
    getCompanyPolicies,
    ICompanyPolicy,
    POLICY_CATEGORY_META,
} from '../../apis/companyPolicies';
import { useAuthContext } from '../../context/AuthContext/AuthContext';
import { useSocket } from '../../hooks/useSocket';

const { Text } = Typography;

export const CompanyPoliciesBanner: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthContext();
    const [unreadCount, setUnreadCount] = useState(0);
    const [highlightPolicies, setHighlightPolicies] = useState<ICompanyPolicy[]>([]);

    const loadPolicies = useCallback(async () => {
        if (!user) return;
        try {
            const res = await getCompanyPolicies();
            const items = res?.items || [];
            setUnreadCount(res?.stats?.unreadCount || 0);
            const highlights = items
                .filter((p) => p.is_active && p.is_mandatory_ack && !p.is_acknowledged)
                .slice(0, 2);
            setHighlightPolicies(highlights);
        } catch (err) {
            // Silent ignore on dashboard widget
        }
    }, [user]);

    useEffect(() => {
        loadPolicies();
    }, [loadPolicies]);

    useSocket(user?.user_id, {
        policy_updated: () => {
            loadPolicies();
        },
    });

    if (unreadCount === 0) {
        return null;
    }

    return (
        <Card
            size="small"
            style={{
                marginBottom: 16,
                borderRadius: 12,
                border: unreadCount > 0 ? '1px solid #ffd591' : '1px solid #bae0ff',
                background:
                    unreadCount > 0
                        ? 'linear-gradient(90deg, #fffbe6 0%, #ffffff 100%)'
                        : 'linear-gradient(90deg, #f0f5ff 0%, #ffffff 100%)',
            }}
            styles={{ body: { padding: '10px 16px' } }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
                    <Tag
                        color={unreadCount > 0 ? 'warning' : 'blue'}
                        icon={unreadCount > 0 ? <WarningOutlined /> : <BookOutlined />}
                        style={{ margin: 0, borderRadius: 8, fontWeight: 600, padding: '2px 8px' }}
                    >
                        {unreadCount > 0
                            ? `${unreadCount} Quy chế / Quy định mới cần đọc`
                            : 'Quy chế & Quy định cơ quan'}
                    </Tag>

                    <Space size={12} wrap>
                        {highlightPolicies.map((p) => {
                            const meta = POLICY_CATEGORY_META[p.category];
                            return (
                                <span
                                    key={p.id}
                                    onClick={() => navigate('/quy_che_quy_dinh')}
                                    style={{
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        color: '#1e293b',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    {p.is_pinned && (
                                        <PushpinOutlined style={{ color: '#ff4d4f' }} />
                                    )}
                                    <Text strong style={{ fontSize: 13 }}>
                                        {meta?.iconText} {p.title}
                                    </Text>
                                    {!p.is_acknowledged && p.is_mandatory_ack && (
                                        <Tag color="orange" style={{ margin: 0, fontSize: 10.5 }}>
                                            Chưa xác nhận
                                        </Tag>
                                    )}
                                </span>
                            );
                        })}
                    </Space>
                </div>

                <Button
                    size="small"
                    type={unreadCount > 0 ? 'primary' : 'default'}
                    onClick={() => navigate('/quy_che_quy_dinh')}
                    icon={<RightOutlined />}
                    iconPosition="end"
                    style={{ borderRadius: 6 }}
                >
                    Xem & Xác nhận
                </Button>
            </div>
        </Card>
    );
};

export default CompanyPoliciesBanner;

