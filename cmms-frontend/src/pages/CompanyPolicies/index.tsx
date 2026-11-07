import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Card,
    Row,
    Col,
    Typography,
    Button,
    Input,
    Tag,
    Space,
    Modal,
    Form,
    Select,
    DatePicker,
    Switch,
    Upload,
    Progress,
    Tabs,
    Alert,
    Empty,
    Spin,
    Popconfirm,
    notification,
    Grid,
    Divider,
    Avatar,
    Image,
} from 'antd';
import {
    BookOutlined,
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    PushpinOutlined,
    FilePdfOutlined,
    FileWordOutlined,
    PaperClipOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    UploadOutlined,
    DownloadOutlined,
    TeamOutlined,
    FileTextOutlined,
    SafetyCertificateOutlined,
    UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
    getCompanyPolicies,
    getCompanyPolicyDetail,
    createCompanyPolicy,
    updateCompanyPolicy,
    deleteCompanyPolicy,
    acknowledgeCompanyPolicy,
    uploadCompanyPolicyFile,
    canManageCompanyPolicies,
    canViewPolicyReadStats,
    PolicyCategory,
    POLICY_CATEGORY_META,
    ICompanyPolicy,
    ICompanyPolicyDetail,
} from '../../apis/companyPolicies';
import { useAuthContext } from '../../context/AuthContext/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import { getBackendImageUrl } from '../../utils/imageUrl';

const { Title, Text, Paragraph } = Typography;

const CompanyPoliciesPage: React.FC = () => {
    const { user } = useAuthContext();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const canManage = canManageCompanyPolicies(user);
    const canViewStats = canViewPolicyReadStats(user);

    const [policies, setPolicies] = useState<ICompanyPolicy[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        unreadCount: 0,
        acknowledgedCount: 0,
        pinnedCount: 0,
        totalActiveUsers: 0,
    });
    const [loading, setLoading] = useState(false);

    // Filters
    const [searchText, setSearchText] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<PolicyCategory | undefined>(undefined);
    const [quickFilter, setQuickFilter] = useState<'ALL' | 'UNREAD' | 'ACKNOWLEDGED' | 'PINNED'>('ALL');
    const [includeInactive, setIncludeInactive] = useState(false);

    // Detail Modal State
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState<ICompanyPolicyDetail | null>(null);
    const [activeDetailTab, setActiveDetailTab] = useState<string>('content');
    const [acknowledgingId, setAcknowledgingId] = useState<number | null>(null);
    const [ackUserSearch, setAckUserSearch] = useState('');

    // Form Modal State (Create / Edit)
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<ICompanyPolicy | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadedFileUrl, setUploadedFileUrl] = useState<string | undefined>(undefined);
    const [uploadedFileName, setUploadedFileName] = useState<string | undefined>(undefined);
    const [togglingPinId, setTogglingPinId] = useState<number | null>(null);
    const [form] = Form.useForm();
    const isPinnedWatched = Form.useWatch('is_pinned', form);

    const fetchPolicies = useCallback(
        async (silent = false) => {
            if (!silent) setLoading(true);
            try {
                const res = await getCompanyPolicies({
                    search: searchText.trim() || undefined,
                    category: categoryFilter,
                    include_inactive: canManage && includeInactive,
                });
                setPolicies(res?.items || []);
                if (res?.stats) {
                    setStats(res.stats);
                }
            } catch (err) {
                console.error('Failed to load company policies:', err);
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [searchText, categoryFilter, canManage, includeInactive],
    );

    useEffect(() => {
        fetchPolicies();
    }, [fetchPolicies]);

    const refreshDetailIfOpen = useCallback(async (policyId?: number) => {
        if (!detailModalOpen || !selectedPolicy) return;
        if (policyId && policyId !== selectedPolicy.id) return;
        try {
            const detail = await getCompanyPolicyDetail(selectedPolicy.id);
            setSelectedPolicy(detail);
        } catch (err) {
            console.error('Failed to refresh policy detail:', err);
        }
    }, [detailModalOpen, selectedPolicy]);

    // Realtime WebSocket subscription
    useSocket(user?.user_id, {
        policy_updated: (payload?: { policyId?: number }) => {
            fetchPolicies(true);
            refreshDetailIfOpen(payload?.policyId);
        },
    });

    const filteredPolicies = useMemo(() => {
        return policies.filter((item) => {
            if (quickFilter === 'UNREAD') {
                return item.is_active && item.is_mandatory_ack && !item.is_acknowledged;
            }
            if (quickFilter === 'ACKNOWLEDGED') {
                return item.is_acknowledged;
            }
            if (quickFilter === 'PINNED') {
                return item.is_pinned;
            }
            return true;
        });
    }, [policies, quickFilter]);

    const handleOpenDetail = async (policy: ICompanyPolicy, defaultTab = 'content') => {
        setDetailModalOpen(true);
        setActiveDetailTab(defaultTab);
        setAckUserSearch('');
        setDetailLoading(true);
        try {
            const detail = await getCompanyPolicyDetail(policy.id);
            setSelectedPolicy(detail);
        } catch (err: any) {
            notification.error({
                title: 'Thất bại',
                message: 'Không thể tải chi tiết quy chế',
                description: err?.response?.data?.message || err?.message,
            });
        } finally {
            setDetailLoading(false);
        }
    };

    const handleAcknowledge = async (policyId: number) => {
        setAcknowledgingId(policyId);
        try {
            const updated = await acknowledgeCompanyPolicy(policyId);
            notification.success({
                title: 'Thành công',
                message: 'Đã xác nhận đọc & nắm rõ',
                description: `Hệ thống đã ghi nhận bạn đã đọc quy định "${updated.title}".`,
            });
            if (selectedPolicy?.id === policyId) {
                setSelectedPolicy(updated);
            }
            fetchPolicies(true);
        } catch (err: any) {
            notification.error({
                title: 'Thất bại',
                message: 'Lỗi xác nhận',
                description: err?.response?.data?.message || err?.message,
            });
        } finally {
            setAcknowledgingId(null);
        }
    };

    const handleOpenCreate = () => {
        setEditingPolicy(null);
        setUploadedFileUrl(undefined);
        setUploadedFileName(undefined);
        form.resetFields();
        form.setFieldsValue({
            category: PolicyCategory.LABOR_RULES,
            effective_date: dayjs(),
            is_pinned: false,
            pin_duration_days: 7,
            is_mandatory_ack: true,
            is_active: true,
            notify_all: true,
        });
        setFormModalOpen(true);
    };

    const handleOpenEdit = (policy: ICompanyPolicy) => {
        setEditingPolicy(policy);
        setUploadedFileUrl(policy.file_url);
        setUploadedFileName(policy.file_name);
        form.resetFields();
        let initialPinDuration = 7;
        if (policy.is_pinned) {
            if (!policy.pinned_until) {
                initialPinDuration = 0;
            } else {
                const diffDays = dayjs(policy.pinned_until).diff(dayjs(), 'day');
                if (diffDays > 20) initialPinDuration = 30;
                else if (diffDays > 10) initialPinDuration = 14;
                else initialPinDuration = 7;
            }
        }
        form.setFieldsValue({
            code: policy.code,
            title: policy.title,
            category: policy.category,
            summary: policy.summary,
            content: policy.content,
            effective_date: policy.effective_date ? dayjs(policy.effective_date) : undefined,
            is_pinned: policy.is_pinned,
            pin_duration_days: initialPinDuration,
            is_mandatory_ack: policy.is_mandatory_ack,
            is_active: policy.is_active,
        });
        setFormModalOpen(true);
    };

    const handleTogglePin = async (policy: ICompanyPolicy) => {
        setTogglingPinId(policy.id);
        try {
            const nextPinned = !policy.is_pinned;
            const nextPinnedUntil = nextPinned
                ? dayjs().add(7, 'day').toISOString()
                : null;
            await updateCompanyPolicy(policy.id, {
                is_pinned: nextPinned,
                pinned_until: nextPinnedUntil,
            });
            notification.success({
                title: 'Thành công',
                message: nextPinned ? 'Đã ghim quy chế lên đầu trang (7 ngày)' : 'Đã gỡ ghim quy chế',
                description: nextPinned
                    ? `Văn bản "${policy.title}" sẽ tự động gỡ ghim sau 7 ngày hoặc khi 100% nhân sự đã đọc.`
                    : `Đã gỡ ghim văn bản "${policy.title}".`,
            });
            fetchPolicies(true);
            if (selectedPolicy?.id === policy.id) {
                refreshDetailIfOpen(policy.id);
            }
        } catch (err: any) {
            notification.error({
                title: 'Thất bại',
                message: 'Không thể cập nhật trạng thái ghim',
                description: err?.response?.data?.message || err?.message,
            });
        } finally {
            setTogglingPinId(null);
        }
    };

    const handleUploadFile = async (file: File) => {
        setUploadingFile(true);
        try {
            const res = await uploadCompanyPolicyFile(file);
            setUploadedFileUrl(res.file_url);
            setUploadedFileName(res.file_name);
            notification.success({
                title: 'Thành công',
                message: 'Tải lên văn bản thành công',
                description: res.file_name,
            });
        } catch (err: any) {
            notification.error({
                title: 'Thất bại',
                message: 'Tải file thất bại',
                description: err?.response?.data?.message || err?.message,
            });
        } finally {
            setUploadingFile(false);
        }
        return false;
    };

    const handleSubmitForm = async (values: any) => {
        setSubmitting(true);
        try {
            const isPinned = Boolean(values.is_pinned);
            const durationDays = Number(values.pin_duration_days ?? 7);
            const computedPinnedUntil = isPinned
                ? durationDays > 0
                    ? dayjs().add(durationDays, 'day').toISOString()
                    : null
                : null;

            const payload = {
                code: values.code,
                title: values.title,
                category: values.category,
                summary: values.summary,
                content: values.content,
                file_url: uploadedFileUrl || '',
                file_name: uploadedFileName || '',
                effective_date: values.effective_date
                    ? values.effective_date.format('YYYY-MM-DD')
                    : undefined,
                is_pinned: isPinned,
                pinned_until: computedPinnedUntil,
                is_mandatory_ack: Boolean(values.is_mandatory_ack),
                is_active: values.is_active !== false,
                notify_all: Boolean(values.notify_all),
            };

            if (editingPolicy) {
                await updateCompanyPolicy(editingPolicy.id, payload);
                notification.success({
                    title: 'Thành công',
                    message: 'Cập nhật thành công',
                    description: `Đã cập nhật quy định "${values.title}".`,
                });
            } else {
                await createCompanyPolicy(payload);
                notification.success({
                    title: 'Thành công',
                    message: 'Ban hành thành công',
                    description: `Đã ban hành quy chế / quy định "${values.title}".`,
                });
            }

            setFormModalOpen(false);
            fetchPolicies(true);
            if (editingPolicy && selectedPolicy?.id === editingPolicy.id) {
                refreshDetailIfOpen(editingPolicy.id);
            }
        } catch (err: any) {
            notification.error({
                title: 'Thất bại',
                message: 'Lưu quy chế thất bại',
                description: err?.response?.data?.message || err?.message,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteCompanyPolicy(id);
            notification.success({ title: 'Thành công', message: 'Đã xóa văn bản quy chế' });
            if (selectedPolicy?.id === id) {
                setDetailModalOpen(false);
                setSelectedPolicy(null);
            }
            fetchPolicies(true);
        } catch (err: any) {
            notification.error({
                title: 'Thất bại',
                message: 'Xóa thất bại',
                description: err?.response?.data?.message || err?.message,
            });
        }
    };

    const getFullFileUrl = (fileUrl?: string) => {
        if (!fileUrl) return '';
        if (fileUrl.startsWith('http')) return fileUrl;
        const base = (process.env.REACT_APP_BASE_URL || '').replace('/api', '');
        return `${base}${fileUrl}`;
    };

    const filteredAckUsers = useMemo(() => {
        const q = ackUserSearch.trim().toLowerCase();
        const ackList = selectedPolicy?.acknowledged_users || [];
        const unackList = selectedPolicy?.unacknowledged_users || [];
        if (!q) return { ackList, unackList };
        const match = (u: any) =>
            u.name?.toLowerCase().includes(q) ||
            u.employee_code?.toLowerCase().includes(q) ||
            u.department_name?.toLowerCase().includes(q) ||
            u.position?.toLowerCase().includes(q);
        return {
            ackList: ackList.filter(match),
            unackList: unackList.filter(match),
        };
    }, [selectedPolicy, ackUserSearch]);

    return (
        <div style={{ padding: '4px 0' }}>
            {/* HEADER & FILTER CARD */}
            <Card
                style={{ marginBottom: 16, borderRadius: 12 }}
                styles={{ body: { padding: isMobile ? 14 : 20 } }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: 12,
                    }}
                >
                    <div>
                        <Title
                            level={4}
                            style={{
                                margin: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: isMobile ? 17 : 20,
                            }}
                        >
                            <BookOutlined style={{ color: '#1677ff' }} />
                            <span>Quy chế, Quy định & Văn bản Nội bộ</span>
                        </Title>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            Cổng thông tin nội quy lao động, chế độ chính sách và quy định an toàn dành cho toàn thể người lao động
                        </Text>
                    </div>

                    <Space wrap size={8}>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => fetchPolicies(false)}
                            loading={loading}
                        >
                            Làm mới
                        </Button>
                        {canManage && (
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleOpenCreate}
                            >
                                Ban hành Quy định mới
                            </Button>
                        )}
                    </Space>
                </div>

                {/* QUICK KPI FILTER PILLS */}
                <div
                    style={{
                        display: 'flex',
                        gap: 8,
                        overflowX: 'auto',
                        paddingBottom: 4,
                        marginTop: 14,
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    {[
                        {
                            key: 'ALL' as const,
                            label: 'Tất cả văn bản',
                            count: stats.total,
                            color: '#1677ff',
                            bg: '#f0f5ff',
                        },
                        {
                            key: 'UNREAD' as const,
                            label: 'Chưa đọc & xác nhận',
                            count: stats.unreadCount,
                            color: '#d46b08',
                            bg: '#fff7e6',
                        },
                        {
                            key: 'ACKNOWLEDGED' as const,
                            label: 'Đã đọc & nắm rõ',
                            count: stats.acknowledgedCount,
                            color: '#389e0d',
                            bg: '#f6ffed',
                        },
                        {
                            key: 'PINNED' as const,
                            label: 'Ghim quan trọng',
                            count: stats.pinnedCount,
                            color: '#cf1322',
                            bg: '#fff1f0',
                        },
                    ].map((pill) => {
                        const isActive = quickFilter === pill.key;
                        return (
                            <div
                                key={pill.key}
                                onClick={() =>
                                    setQuickFilter(isActive && pill.key !== 'ALL' ? 'ALL' : pill.key)
                                }
                                style={{
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '6px 12px',
                                    borderRadius: 20,
                                    border: isActive
                                        ? `1.5px solid ${pill.color}`
                                        : '1px solid #e2e8f0',
                                    background: isActive ? pill.bg : '#ffffff',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s',
                                    fontSize: 12.5,
                                    fontWeight: isActive ? 600 : 500,
                                    color: isActive ? pill.color : '#475569',
                                }}
                            >
                                <span>{pill.label}</span>
                                <span
                                    style={{
                                        background: pill.bg,
                                        color: pill.color,
                                        fontWeight: 700,
                                        fontSize: 11.5,
                                        padding: '1px 8px',
                                        borderRadius: 10,
                                    }}
                                >
                                    {pill.count}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* SEARCH & CATEGORY FILTERS */}
                <Row gutter={[10, 10]} style={{ marginTop: 12 }} align="middle">
                    <Col xs={24} sm={12} md={9}>
                        <Input
                            placeholder="Tìm theo tên quy định, số hiệu văn bản, nội dung..."
                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            allowClear
                        />
                    </Col>
                    <Col xs={24} sm={12} md={9}>
                        <Select
                            allowClear
                            placeholder="Lọc theo danh mục quy chế / quy định"
                            style={{ width: '100%' }}
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                        >
                            {Object.entries(POLICY_CATEGORY_META).map(([key, meta]) => (
                                <Select.Option key={key} value={key}>
                                    {meta.iconText} {meta.label}
                                </Select.Option>
                            ))}
                        </Select>
                    </Col>
                    {canManage && (
                        <Col xs={24} sm={24} md={6}>
                            <Space size={8}>
                                <Switch
                                    size="small"
                                    checked={includeInactive}
                                    onChange={setIncludeInactive}
                                />
                                <Text style={{ fontSize: 12.5, color: '#475569' }}>
                                    Hiện cả văn bản hết hiệu lực
                                </Text>
                            </Space>
                        </Col>
                    )}
                </Row>
            </Card>

            {/* UNREAD REMINDER BANNER */}
            {stats.unreadCount > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16, borderRadius: 10 }}
                    message={
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 8,
                            }}
                        >
                            <span>
                                Bạn hiện có <strong>{stats.unreadCount}</strong> quy chế / quy định mới cần đọc và bấm{' '}
                                <strong style={{ color: '#389e0d' }}>"Xác nhận đã đọc & nắm rõ"</strong>.
                            </span>
                            {quickFilter !== 'UNREAD' && (
                                <Button
                                    size="small"
                                    type="primary"
                                    style={{ background: '#fa8c16', borderColor: '#fa8c16' }}
                                    onClick={() => setQuickFilter('UNREAD')}
                                >
                                    Xem các văn bản chưa đọc ({stats.unreadCount})
                                </Button>
                            )}
                        </div>
                    }
                />
            )}

            {/* POLICY CARDS LIST */}
            <Spin spinning={loading}>
                {filteredPolicies.length === 0 ? (
                    <Card style={{ borderRadius: 12, textAlign: 'center', padding: '32px 0' }}>
                        <Empty description="Chưa có văn bản quy chế / quy định nào trong mục này" />
                    </Card>
                ) : (
                    <Row gutter={[14, 14]}>
                        {filteredPolicies.map((policy) => {
                            const catMeta =
                                POLICY_CATEGORY_META[policy.category] ||
                                POLICY_CATEGORY_META[PolicyCategory.LABOR_RULES];
                            const ackPercent =
                                policy.total_active_users > 0
                                    ? Math.round((policy.ack_count / policy.total_active_users) * 100)
                                    : 0;
                            const needsMyAck =
                                policy.is_active && policy.is_mandatory_ack && !policy.is_acknowledged;

                            return (
                                <Col xs={24} lg={12} key={policy.id}>
                                    <Card
                                        hoverable
                                        style={{
                                            height: '100%',
                                            borderRadius: 12,
                                            border: needsMyAck
                                                ? '1.5px solid #ffd591'
                                                : policy.is_pinned
                                                ? '1.5px solid #91caff'
                                                : '1px solid #e2e8f0',
                                            background: !policy.is_active ? '#f8fafc' : '#ffffff',
                                            display: 'flex',
                                            flexDirection: 'column',
                                        }}
                                        styles={{
                                            body: {
                                                padding: isMobile ? 14 : 18,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                flex: 1,
                                            },
                                        }}
                                        onClick={() => handleOpenDetail(policy, 'content')}
                                    >
                                        {/* TOP TAGS ROW */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                gap: 8,
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            <Space size={6} wrap>
                                                {policy.is_pinned && (
                                                    <Tag
                                                        color="red"
                                                        icon={<PushpinOutlined />}
                                                        style={{ margin: 0, borderRadius: 6, fontWeight: 600 }}
                                                    >
                                                        Quan trọng
                                                        {policy.pinned_until
                                                            ? ` • đến ${dayjs(policy.pinned_until).format('DD/MM')}`
                                                            : ''}
                                                    </Tag>
                                                )}
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        padding: '2px 8px',
                                                        borderRadius: 6,
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        color: catMeta.color,
                                                        background: catMeta.bg,
                                                        border: `1px solid ${catMeta.borderColor}`,
                                                    }}
                                                >
                                                    {catMeta.iconText} {catMeta.label}
                                                </span>
                                                {policy.code && (
                                                    <Tag
                                                        color="geekblue"
                                                        style={{ margin: 0, borderRadius: 6, fontWeight: 600 }}
                                                    >
                                                        Số: {policy.code}
                                                    </Tag>
                                                )}
                                                {!policy.is_active && (
                                                    <Tag color="default" style={{ margin: 0 }}>
                                                        Hết hiệu lực
                                                    </Tag>
                                                )}
                                            </Space>

                                            {/* PERSONAL ACK BADGE */}
                                            {policy.is_acknowledged ? (
                                                <Tag
                                                    color="success"
                                                    icon={<CheckCircleOutlined />}
                                                    style={{ margin: 0, borderRadius: 12, fontWeight: 600 }}
                                                >
                                                    Đã đọc & nắm rõ
                                                </Tag>
                                            ) : policy.is_mandatory_ack ? (
                                                <Tag
                                                    color="warning"
                                                    icon={<ClockCircleOutlined />}
                                                    style={{ margin: 0, borderRadius: 12, fontWeight: 600 }}
                                                >
                                                    Cần đọc & xác nhận
                                                </Tag>
                                            ) : null}
                                        </div>

                                        {/* TITLE */}
                                        <div
                                            style={{
                                                fontWeight: 700,
                                                fontSize: isMobile ? 15 : 16,
                                                color: '#0f172a',
                                                marginTop: 10,
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            {policy.title}
                                        </div>

                                        {/* SUMMARY */}
                                        <Paragraph
                                            ellipsis={{ rows: 3 }}
                                            style={{
                                                fontSize: 13,
                                                color: '#475569',
                                                marginTop: 6,
                                                marginBottom: 10,
                                                lineHeight: 1.55,
                                                flex: 1,
                                            }}
                                        >
                                            {policy.summary ||
                                                policy.content ||
                                                'Nhấn để xem chi tiết nội dung văn bản quy chế...'}
                                        </Paragraph>

                                        {/* META INFO & ATTACHMENT */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                                gap: 8,
                                                fontSize: 12,
                                                color: '#64748b',
                                                paddingTop: 8,
                                                borderTop: '1px dashed #e2e8f0',
                                            }}
                                        >
                                            <Space size={10} wrap>
                                                <span>
                                                    📅 Ban hành:{' '}
                                                    <strong>
                                                        {dayjs(policy.effective_date || policy.created_at).format(
                                                            'DD/MM/YYYY',
                                                        )}
                                                    </strong>
                                                </span>
                                                {policy.file_url && (
                                                    <Tag
                                                        color="blue"
                                                        icon={<PaperClipOutlined />}
                                                        style={{ margin: 0, borderRadius: 6 }}
                                                    >
                                                        {policy.file_name || 'Văn bản đính kèm'}
                                                    </Tag>
                                                )}
                                            </Space>

                                            {canViewStats && (
                                                <span
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenDetail(policy, 'stats');
                                                    }}
                                                    style={{
                                                        color: '#1677ff',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    👥 Đã đọc: {policy.ack_count}/{policy.total_active_users} ({ackPercent}%)
                                                </span>
                                            )}
                                        </div>

                                        {/* ACTIONS FOOTER */}
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                                gap: 8,
                                                marginTop: 10,
                                                paddingTop: 10,
                                                borderTop: '1px solid #f1f5f9',
                                            }}
                                        >
                                            <Space size={6} wrap>
                                                <Button
                                                    size="small"
                                                    type="primary"
                                                    ghost
                                                    icon={<EyeOutlined />}
                                                    onClick={() => handleOpenDetail(policy, 'content')}
                                                >
                                                    Đọc văn bản
                                                </Button>
                                                {needsMyAck && (
                                                    <Button
                                                        size="small"
                                                        type="primary"
                                                        style={{
                                                            background: '#52c41a',
                                                            borderColor: '#52c41a',
                                                        }}
                                                        icon={<CheckCircleOutlined />}
                                                        loading={acknowledgingId === policy.id}
                                                        onClick={() => handleAcknowledge(policy.id)}
                                                    >
                                                        Xác nhận đã đọc
                                                    </Button>
                                                )}
                                            </Space>

                                            {canManage && (
                                                <Space size={4}>
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        style={{
                                                            color: policy.is_pinned ? '#cf1322' : '#64748b',
                                                            fontWeight: policy.is_pinned ? 600 : 400,
                                                        }}
                                                        icon={<PushpinOutlined />}
                                                        loading={togglingPinId === policy.id}
                                                        onClick={() => handleTogglePin(policy)}
                                                    >
                                                        {policy.is_pinned ? 'Gỡ ghim' : 'Ghim'}
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        icon={<EditOutlined />}
                                                        onClick={() => handleOpenEdit(policy)}
                                                    >
                                                        Sửa
                                                    </Button>
                                                    <Popconfirm
                                                        title="Xóa văn bản quy chế này?"
                                                        description="Hành động này không thể hoàn tác."
                                                        okText="Xóa"
                                                        cancelText="Hủy"
                                                        okButtonProps={{ danger: true }}
                                                        onConfirm={() => handleDelete(policy.id)}
                                                    >
                                                        <Button
                                                            size="small"
                                                            type="text"
                                                            danger
                                                            icon={<DeleteOutlined />}
                                                        />
                                                    </Popconfirm>
                                                </Space>
                                            )}
                                        </div>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                )}
            </Spin>

            {/* MODAL XEM CHI TIẾT QUY CHẾ & THỐNG KÊ TIẾP NHẬN */}
            <Modal
                title={
                    <Space>
                        <SafetyCertificateOutlined style={{ color: '#1677ff', fontSize: 20 }} />
                        <span>
                            {selectedPolicy?.code ? `[${selectedPolicy.code}] ` : ''}
                            {selectedPolicy?.title || 'Chi tiết Quy chế & Quy định'}
                        </span>
                    </Space>
                }
                open={detailModalOpen}
                onCancel={() => setDetailModalOpen(false)}
                width="min(860px, calc(100vw - 24px))"
                destroyOnClose
                footer={[
                    <Button key="close" onClick={() => setDetailModalOpen(false)}>
                        Đóng
                    </Button>,
                    selectedPolicy &&
                        selectedPolicy.is_active &&
                        !selectedPolicy.is_acknowledged && (
                            <Button
                                key="ack"
                                type="primary"
                                style={{ background: '#52c41a', borderColor: '#52c41a', fontWeight: 600 }}
                                icon={<CheckCircleOutlined />}
                                loading={acknowledgingId === selectedPolicy.id}
                                onClick={() => handleAcknowledge(selectedPolicy.id)}
                            >
                                Tôi đã đọc và nắm rõ quy định này
                            </Button>
                        ),
                ]}
            >
                <Spin spinning={detailLoading}>
                    {selectedPolicy && (
                        <div>
                            {/* HEADER META BAR */}
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                    marginBottom: 12,
                                }}
                            >
                                <Space size={6} wrap>
                                    {selectedPolicy.is_pinned && (
                                        <Tag color="red" icon={<PushpinOutlined />}>
                                            Ghim quan trọng
                                        </Tag>
                                    )}
                                    {POLICY_CATEGORY_META[selectedPolicy.category] && (
                                        <Tag color="blue">
                                            {POLICY_CATEGORY_META[selectedPolicy.category].iconText}{' '}
                                            {POLICY_CATEGORY_META[selectedPolicy.category].label}
                                        </Tag>
                                    )}
                                    {selectedPolicy.effective_date && (
                                        <Tag color="cyan">
                                            Hiệu lực: {dayjs(selectedPolicy.effective_date).format('DD/MM/YYYY')}
                                        </Tag>
                                    )}
                                </Space>

                                {selectedPolicy.is_acknowledged ? (
                                    <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 12.5, padding: '2px 10px' }}>
                                        Đã xác nhận đọc lúc{' '}
                                        {selectedPolicy.acknowledged_at
                                            ? dayjs(selectedPolicy.acknowledged_at).format('DD/MM/YYYY HH:mm')
                                            : ''}
                                    </Tag>
                                ) : (
                                    <Tag color="warning" icon={<ClockCircleOutlined />} style={{ fontSize: 12.5, padding: '2px 10px' }}>
                                        Chưa xác nhận đọc
                                    </Tag>
                                )}
                            </div>

                            <Tabs
                                activeKey={activeDetailTab}
                                onChange={setActiveDetailTab}
                                items={[
                                    {
                                        key: 'content',
                                        label: (
                                            <span>
                                                <FileTextOutlined /> Nội dung & Văn bản gốc
                                            </span>
                                        ),
                                        children: (
                                            <div style={{ maxHeight: '68vh', overflowY: 'auto', paddingRight: 4 }}>
                                                {/* SUMMARY HIGHLIGHT BOX */}
                                                {selectedPolicy.summary && (
                                                    <div
                                                        style={{
                                                            background: '#f0f5ff',
                                                            border: '1px solid #adc6ff',
                                                            borderRadius: 10,
                                                            padding: '12px 16px',
                                                            marginBottom: 16,
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                fontWeight: 700,
                                                                color: '#1d39c4',
                                                                fontSize: 13.5,
                                                                marginBottom: 4,
                                                            }}
                                                        >
                                                            📌 Tóm tắt các điểm cốt lõi cần nắm rõ:
                                                        </div>
                                                        <div
                                                            style={{
                                                                whiteSpace: 'pre-wrap',
                                                                fontSize: 13.5,
                                                                color: '#1e293b',
                                                                lineHeight: 1.6,
                                                            }}
                                                        >
                                                            {selectedPolicy.summary}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* DETAILED CONTENT */}
                                                {selectedPolicy.content && (
                                                    <div
                                                        style={{
                                                            background: '#ffffff',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: 10,
                                                            padding: isMobile ? 12 : 18,
                                                            marginBottom: 16,
                                                            whiteSpace: 'pre-wrap',
                                                            fontSize: 14,
                                                            color: '#1f2937',
                                                            lineHeight: 1.7,
                                                        }}
                                                    >
                                                        {selectedPolicy.content}
                                                    </div>
                                                )}

                                                {/* ATTACHED FILE VIEWER */}
                                                {selectedPolicy.file_url && (
                                                    <div
                                                        style={{
                                                            background: '#f8fafc',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: 10,
                                                            padding: 14,
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                flexWrap: 'wrap',
                                                                gap: 8,
                                                                marginBottom: 10,
                                                            }}
                                                        >
                                                            <Space>
                                                                {selectedPolicy.file_url.toLowerCase().endsWith('.pdf') ? (
                                                                    <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
                                                                ) : (
                                                                    <FileWordOutlined style={{ color: '#1677ff', fontSize: 20 }} />
                                                                )}
                                                                <div>
                                                                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                                                                        {selectedPolicy.file_name || 'Văn bản đính kèm'}
                                                                    </div>
                                                                    <div style={{ fontSize: 11.5, color: '#64748b' }}>
                                                                        Văn bản gốc ban hành
                                                                    </div>
                                                                </div>
                                                            </Space>

                                                            <Button
                                                                type="primary"
                                                                size="small"
                                                                icon={<DownloadOutlined />}
                                                                href={getFullFileUrl(selectedPolicy.file_url)}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                Mở / Tải văn bản gốc
                                                            </Button>
                                                        </div>

                                                        {/* INLINE PDF OR IMAGE PREVIEW */}
                                                        {selectedPolicy.file_url.toLowerCase().endsWith('.pdf') && (
                                                            <iframe
                                                                title="PDF Preview"
                                                                src={getFullFileUrl(selectedPolicy.file_url)}
                                                                style={{
                                                                    width: '100%',
                                                                    height: isMobile ? 380 : 500,
                                                                    border: '1px solid #e2e8f0',
                                                                    borderRadius: 8,
                                                                    background: '#fff',
                                                                }}
                                                            />
                                                        )}

                                                        {/\.(jpg|jpeg|png|webp)$/i.test(selectedPolicy.file_url) && (
                                                            <div style={{ textAlign: 'center', marginTop: 8 }}>
                                                                <Image
                                                                    src={getFullFileUrl(selectedPolicy.file_url)}
                                                                    style={{
                                                                        maxHeight: 450,
                                                                        objectFit: 'contain',
                                                                        borderRadius: 8,
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <Divider style={{ margin: '14px 0 8px 0' }} />
                                                <div style={{ fontSize: 12, color: '#64748b' }}>
                                                    Người đăng: <strong>{selectedPolicy.created_by?.name || 'Phòng Nhân sự'}</strong> •
                                                    Cập nhật lần cuối: {dayjs(selectedPolicy.updated_at).format('DD/MM/YYYY HH:mm')}
                                                </div>
                                            </div>
                                        ),
                                    },
                                    ...(canViewStats
                                        ? [
                                              {
                                                  key: 'stats',
                                                  label: (
                                                      <span>
                                                          <TeamOutlined /> Thống kê Đã đọc ({selectedPolicy.ack_count}/
                                                          {selectedPolicy.total_active_users})
                                                      </span>
                                                  ),
                                                  children: (
                                                      <div>
                                                          <div
                                                              style={{
                                                                  background: '#f8fafc',
                                                                  border: '1px solid #e2e8f0',
                                                                  borderRadius: 10,
                                                                  padding: '12px 16px',
                                                                  marginBottom: 14,
                                                              }}
                                                          >
                                                              <div
                                                                  style={{
                                                                      display: 'flex',
                                                                      justifyContent: 'space-between',
                                                                      marginBottom: 6,
                                                                      fontSize: 13,
                                                                      fontWeight: 600,
                                                                  }}
                                                              >
                                                                  <span>Tỷ lệ người lao động đã đọc & xác nhận</span>
                                                                  <span style={{ color: '#1677ff' }}>
                                                                      {selectedPolicy.ack_count} /{' '}
                                                                      {selectedPolicy.total_active_users} nhân sự
                                                                  </span>
                                                              </div>
                                                              <Progress
                                                                  percent={
                                                                      selectedPolicy.total_active_users > 0
                                                                          ? Math.round(
                                                                                (selectedPolicy.ack_count /
                                                                                    selectedPolicy.total_active_users) *
                                                                                    100,
                                                                            )
                                                                          : 0
                                                                  }
                                                                  strokeColor="#52c41a"
                                                              />
                                                              <Input
                                                                  placeholder="Tìm kiếm nhân viên theo tên, mã NV, phòng ban..."
                                                                  prefix={<SearchOutlined />}
                                                                  value={ackUserSearch}
                                                                  onChange={(e) => setAckUserSearch(e.target.value)}
                                                                  allowClear
                                                                  style={{ marginTop: 8 }}
                                                              />
                                                          </div>

                                                          <Row gutter={[14, 14]}>
                                                              {/* UNACKNOWLEDGED LIST */}
                                                              <Col xs={24} md={12}>
                                                                  <Card
                                                                      size="small"
                                                                      title={
                                                                          <span style={{ color: '#d46b08', fontSize: 13.5 }}>
                                                                              ⏳ Chưa xác nhận đọc ({filteredAckUsers.unackList.length})
                                                                          </span>
                                                                      }
                                                                      style={{ borderRadius: 10 }}
                                                                      styles={{
                                                                          body: {
                                                                              maxHeight: 340,
                                                                              overflowY: 'auto',
                                                                              padding: '8px 12px',
                                                                          },
                                                                      }}
                                                                  >
                                                                      {filteredAckUsers.unackList.length === 0 ? (
                                                                          <div
                                                                              style={{
                                                                                  padding: '20px 0',
                                                                                  textAlign: 'center',
                                                                                  color: '#52c41a',
                                                                                  fontSize: 13,
                                                                              }}
                                                                          >
                                                                              🎉 Tất cả nhân sự đã đọc và xác nhận!
                                                                          </div>
                                                                      ) : (
                                                                          <Space
                                                                              direction="vertical"
                                                                              size={8}
                                                                              style={{ width: '100%' }}
                                                                          >
                                                                              {filteredAckUsers.unackList.map((u) => (
                                                                                  <div
                                                                                      key={u.user_id}
                                                                                      style={{
                                                                                          display: 'flex',
                                                                                          alignItems: 'center',
                                                                                          gap: 10,
                                                                                          padding: '6px 8px',
                                                                                          background: '#fff7e6',
                                                                                          borderRadius: 8,
                                                                                      }}
                                                                                  >
                                                                                      <Avatar
                                                                                          size={30}
                                                                                          src={
                                                                                              u.avatar
                                                                                                  ? getBackendImageUrl(u.avatar)
                                                                                                  : undefined
                                                                                          }
                                                                                          icon={<UserOutlined />}
                                                                                      />
                                                                                      <div style={{ minWidth: 0, flex: 1 }}>
                                                                                          <div
                                                                                              style={{
                                                                                                  fontWeight: 600,
                                                                                                  fontSize: 12.5,
                                                                                                  color: '#1e293b',
                                                                                              }}
                                                                                          >
                                                                                              {u.name}{' '}
                                                                                              {u.employee_code
                                                                                                  ? `(${u.employee_code})`
                                                                                                  : ''}
                                                                                          </div>
                                                                                          <div
                                                                                              style={{
                                                                                                  fontSize: 11.5,
                                                                                                  color: '#64748b',
                                                                                              }}
                                                                                          >
                                                                                              {u.department_name || u.position || 'Nhân sự'}
                                                                                          </div>
                                                                                      </div>
                                                                                  </div>
                                                                              ))}
                                                                          </Space>
                                                                      )}
                                                                  </Card>
                                                              </Col>

                                                              {/* ACKNOWLEDGED LIST */}
                                                              <Col xs={24} md={12}>
                                                                  <Card
                                                                      size="small"
                                                                      title={
                                                                          <span style={{ color: '#389e0d', fontSize: 13.5 }}>
                                                                              ✅ Đã đọc & nắm rõ ({filteredAckUsers.ackList.length})
                                                                          </span>
                                                                      }
                                                                      style={{ borderRadius: 10 }}
                                                                      styles={{
                                                                          body: {
                                                                              maxHeight: 340,
                                                                              overflowY: 'auto',
                                                                              padding: '8px 12px',
                                                                          },
                                                                      }}
                                                                  >
                                                                      {filteredAckUsers.ackList.length === 0 ? (
                                                                          <div
                                                                              style={{
                                                                                  padding: '20px 0',
                                                                                  textAlign: 'center',
                                                                                  color: '#94a3b8',
                                                                                  fontSize: 13,
                                                                              }}
                                                                          >
                                                                              Chưa có nhân sự nào xác nhận
                                                                          </div>
                                                                      ) : (
                                                                          <Space
                                                                              direction="vertical"
                                                                              size={8}
                                                                              style={{ width: '100%' }}
                                                                          >
                                                                              {filteredAckUsers.ackList.map((u) => (
                                                                                  <div
                                                                                      key={u.user_id}
                                                                                      style={{
                                                                                          display: 'flex',
                                                                                          alignItems: 'center',
                                                                                          justifyContent: 'space-between',
                                                                                          gap: 8,
                                                                                          padding: '6px 8px',
                                                                                          background: '#f6ffed',
                                                                                          borderRadius: 8,
                                                                                      }}
                                                                                  >
                                                                                      <div
                                                                                          style={{
                                                                                              display: 'flex',
                                                                                              alignItems: 'center',
                                                                                              gap: 8,
                                                                                              minWidth: 0,
                                                                                          }}
                                                                                      >
                                                                                          <Avatar
                                                                                              size={30}
                                                                                              src={
                                                                                                  u.avatar
                                                                                                      ? getBackendImageUrl(u.avatar)
                                                                                                      : undefined
                                                                                              }
                                                                                              icon={<UserOutlined />}
                                                                                          />
                                                                                          <div style={{ minWidth: 0 }}>
                                                                                              <div
                                                                                                  style={{
                                                                                                      fontWeight: 600,
                                                                                                      fontSize: 12.5,
                                                                                                      color: '#1e293b',
                                                                                                  }}
                                                                                              >
                                                                                                  {u.name}
                                                                                              </div>
                                                                                              <div
                                                                                                  style={{
                                                                                                      fontSize: 11,
                                                                                                      color: '#64748b',
                                                                                                  }}
                                                                                              >
                                                                                                  {u.department_name || u.position || ''}
                                                                                              </div>
                                                                                          </div>
                                                                                      </div>
                                                                                      {u.acknowledged_at && (
                                                                                          <span
                                                                                              style={{
                                                                                                  fontSize: 11,
                                                                                                  color: '#389e0d',
                                                                                                  whiteSpace: 'nowrap',
                                                                                              }}
                                                                                          >
                                                                                              {dayjs(u.acknowledged_at).format(
                                                                                                  'DD/MM HH:mm',
                                                                                              )}
                                                                                          </span>
                                                                                      )}
                                                                                  </div>
                                                                              ))}
                                                                          </Space>
                                                                      )}
                                                                  </Card>
                                                              </Col>
                                                          </Row>
                                                      </div>
                                                  ),
                                              },
                                          ]
                                        : []),
                                ]}
                            />
                        </div>
                    )}
                </Spin>
            </Modal>

            {/* MODAL BAN HÀNH / CHỈNH SỬA QUY CHẾ (DÀNH CHO HR_MANAGER / ADMIN / DIRECTOR) */}
            <Modal
                title={
                    <Space>
                        <BookOutlined style={{ color: '#1677ff' }} />
                        <span>
                            {editingPolicy
                                ? `Chỉnh sửa Quy chế / Quy định`
                                : 'Ban hành Quy chế / Quy định mới'}
                        </span>
                    </Space>
                }
                open={formModalOpen}
                onCancel={() => setFormModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={submitting}
                okText={editingPolicy ? 'Lưu cập nhật' : 'Ban hành ngay'}
                cancelText="Hủy"
                width="min(680px, calc(100vw - 24px))"
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSubmitForm}>
                    <Row gutter={12}>
                        <Col xs={24} sm={16}>
                            <Form.Item
                                name="title"
                                label="Tiêu đề Quy chế / Quy định (*)"
                                rules={[{ required: true, message: 'Vui lòng nhập tiêu đề quy chế / quy định' }]}
                            >
                                <Input placeholder="VD: Nội quy lao động và thời giờ làm việc tại Cảng..." />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item name="code" label="Số hiệu văn bản">
                                <Input placeholder="VD: 15/QĐ-CHKCĐ" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={12}>
                        <Col xs={24} sm={14}>
                            <Form.Item
                                name="category"
                                label="Danh mục (*)"
                                rules={[{ required: true, message: 'Chọn danh mục' }]}
                            >
                                <Select>
                                    {Object.entries(POLICY_CATEGORY_META).map(([key, meta]) => (
                                        <Select.Option key={key} value={key}>
                                            {meta.iconText} {meta.label}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={10}>
                            <Form.Item name="effective_date" label="Ngày có hiệu lực">
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="summary"
                        label="Tóm tắt các điểm cốt lõi cần nhớ (Hiển thị nổi bật cho người lao động)"
                    >
                        <Input.TextArea
                            rows={3}
                            placeholder="Tóm tắt ngắn gọn 3-5 ý chính quan trọng nhất để người lao động nắm bắt nhanh trên điện thoại..."
                        />
                    </Form.Item>

                    <Form.Item
                        name="content"
                        label="Nội dung chi tiết quy chế / quy định"
                    >
                        <Input.TextArea
                            rows={6}
                            placeholder="Nhập nội dung chi tiết các điều khoản hoặc hướng dẫn thực hiện..."
                        />
                    </Form.Item>

                    <Form.Item label="Văn bản gốc đính kèm (PDF, Word, Excel, Hình ảnh)">
                        <Space wrap align="center">
                            <Upload
                                beforeUpload={handleUploadFile}
                                showUploadList={false}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                            >
                                <Button icon={<UploadOutlined />} loading={uploadingFile}>
                                    Chọn file đính kèm (Tối đa 20MB)
                                </Button>
                            </Upload>
                            {uploadedFileUrl && (
                                <Tag
                                    color="blue"
                                    closable
                                    onClose={() => {
                                        setUploadedFileUrl(undefined);
                                        setUploadedFileName(undefined);
                                    }}
                                    style={{ padding: '4px 8px' }}
                                >
                                    <PaperClipOutlined /> {uploadedFileName || uploadedFileUrl}
                                </Tag>
                            )}
                        </Space>
                    </Form.Item>

                    <Row gutter={[12, 8]} style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="is_pinned" valuePropName="checked" style={{ marginBottom: 4 }}>
                                <Switch checkedChildren="Ghim đầu trang" unCheckedChildren="Bình thường" />
                            </Form.Item>
                            <Text type="secondary" style={{ fontSize: 11.5 }}>
                                Tự động gỡ ghim khi hết hạn hoặc khi 100% nhân sự đã đọc
                            </Text>
                            {isPinnedWatched && (
                                <Form.Item
                                    name="pin_duration_days"
                                    label="Thời hạn tự động gỡ ghim"
                                    style={{ marginTop: 8, marginBottom: 4 }}
                                >
                                    <Select size="small">
                                        <Select.Option value={7}>Ghim trong 7 ngày (Mặc định)</Select.Option>
                                        <Select.Option value={14}>Ghim trong 14 ngày</Select.Option>
                                        <Select.Option value={30}>Ghim trong 30 ngày</Select.Option>
                                        <Select.Option value={0}>Ghim đến khi 100% nhân sự đọc xong</Select.Option>
                                    </Select>
                                </Form.Item>
                            )}
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item name="is_mandatory_ack" valuePropName="checked" style={{ marginBottom: 4 }}>
                                <Switch checkedChildren="Bắt buộc xác nhận đọc" unCheckedChildren="Không bắt buộc" />
                            </Form.Item>
                            <Text type="secondary" style={{ fontSize: 11.5 }}>
                                Yêu cầu người lao động bấm xác nhận "Đã đọc"
                            </Text>
                        </Col>
                        {!editingPolicy && (
                            <Col xs={24} style={{ marginTop: 6 }}>
                                <Form.Item name="notify_all" valuePropName="checked" style={{ marginBottom: 0 }}>
                                    <Switch
                                        checkedChildren="Gửi thông báo tới toàn bộ nhân viên"
                                        unCheckedChildren="Không gửi thông báo"
                                    />
                                </Form.Item>
                            </Col>
                        )}
                        {editingPolicy && (
                            <Col xs={24} style={{ marginTop: 6 }}>
                                <Form.Item name="is_active" valuePropName="checked" style={{ marginBottom: 0 }}>
                                    <Switch
                                        checkedChildren="Đang có hiệu lực"
                                        unCheckedChildren="Đã hết hiệu lực"
                                    />
                                </Form.Item>
                            </Col>
                        )}
                    </Row>
                </Form>
            </Modal>
        </div>
    );
};

export default CompanyPoliciesPage;
