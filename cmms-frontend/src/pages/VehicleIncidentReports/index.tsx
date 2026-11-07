import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Table, Card, Button, Tag, Space, Input, Row, Col, Select, DatePicker,
    Image, Modal, Form, Typography, notification, Descriptions, Divider, Alert, Spin, Grid, Empty
} from 'antd';
import {
    SearchOutlined, ReloadOutlined, WarningOutlined, CheckCircleOutlined,
    ToolOutlined, FileAddOutlined, PhoneOutlined, EyeOutlined, ClockCircleOutlined,
    CarOutlined, ExclamationCircleOutlined, LinkOutlined, EnvironmentOutlined
} from '@ant-design/icons';
import {
    getVehicleIncidentReports,
    acceptIncidentReport,
    resolveQuickIncidentReport,
    checkVehicleGroupMembership,
    requestRepairDossier,
    linkRepairDossier,
    IVehicleIncidentReport,
    IncidentReportStatus,
    ICheckVehicleGroupResult,
    canProcessIncidentAsTech,
    isIncidentReportViewOnly,
} from '../../apis/vehicleIncidentReports';
import { getAllDevices } from '../../apis/devices';
import { getAllUsers } from '../../apis/users';
import { getRepairsByDevice } from '../../apis/repairs';
import { getToken } from '../../utils/auth';
import { useAuthContext } from '../../context/AuthContext/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const STATUS_TAGS: Record<IncidentReportStatus, { color: string; label: string }> = {
    [IncidentReportStatus.PENDING]: { color: 'red', label: 'Chờ tiếp nhận' },
    [IncidentReportStatus.IN_PROGRESS]: { color: 'orange', label: 'Đang xử lý' },
    [IncidentReportStatus.RESOLVED_QUICK]: { color: 'green', label: 'Đã khắc phục nhanh' },
    [IncidentReportStatus.REQUESTED_REPAIR]: { color: 'purple', label: 'Chờ lập hồ sơ sửa chữa' },
    [IncidentReportStatus.CONVERTED_REPAIR]: { color: 'geekblue', label: 'Đã lập hồ sơ B03' },
};

const VehicleIncidentReportsPage: React.FC = () => {
    const token = getToken();
    const navigate = useNavigate();
    const { user } = useAuthContext();

    const isTechOrAdmin = canProcessIncidentAsTech(user);
    const isViewOnly = isIncidentReportViewOnly(user);

    // Kiểm tra người dùng hiện tại có phải là người được giao hoặc người báo cáo sự cố không
    const checkCanHandleDossier = (r: IVehicleIncidentReport) => {
        if (isViewOnly) return false;
        if (isTechOrAdmin) return true;
        if (!user) return false;
        const isAssigned = (user.user_id && r.assigned_dossier_user_id === user.user_id) ||
            (user.name && r.assigned_dossier_user_name?.trim().toLowerCase() === user.name.trim().toLowerCase());
        const isReporter = (user.user_id && (r.reporter_user_id === user.user_id || r.reporter_user?.user_id === user.user_id)) ||
            (user.name && r.reporter_name?.trim().toLowerCase() === user.name.trim().toLowerCase());
        return Boolean(isAssigned || isReporter);
    };

    // Điều hướng sang trang Quản lý sửa chữa và tự động điền sẵn thông tin xe & hư hỏng
    const handleGoToCreateRepair = (r: IVehicleIncidentReport) => {
        const fullDevice = devices.find(d => Number(d.device_id) === Number(r.device_id));
        navigate('/quan_ly_sua_chua', {
            state: {
                fromIncidentReport: true,
                deviceId: r.device_id,
                device: { ...(fullDevice || {}), ...(r.device || {}) },
                incidentReportId: r.id,
                description: r.description,
            },
        });
    };

    const [reports, setReports] = useState<IVehicleIncidentReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [devices, setDevices] = useState<any[]>([]);
    const [usersList, setUsersList] = useState<any[]>([]);

    // Filters
    const [statusFilter, setStatusFilter] = useState<IncidentReportStatus | undefined>(undefined);
    const [deviceFilter, setDeviceFilter] = useState<number | undefined>(undefined);
    const [searchText, setSearchText] = useState('');
    const [dateRange, setDateRange] = useState<any>(null);

    // Resolve Quick Modal state
    const [resolveModalOpen, setResolveModalOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<IVehicleIncidentReport | null>(null);
    const [resolveForm] = Form.useForm();
    const [resolving, setResolving] = useState(false);

    // Request Repair Dossier Modal state (Thao tác 3 mới)
    const [dossierModalOpen, setDossierModalOpen] = useState(false);
    const [selectedReportForDossier, setSelectedReportForDossier] = useState<IVehicleIncidentReport | null>(null);
    const [groupCheckData, setGroupCheckData] = useState<ICheckVehicleGroupResult | null>(null);
    const [checkingGroup, setCheckingGroup] = useState(false);
    const [dossierForm] = Form.useForm();
    const [requestingDossier, setRequestingDossier] = useState(false);

    // Link Repair Modal state
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [selectedReportForLink, setSelectedReportForLink] = useState<IVehicleIncidentReport | null>(null);
    const [deviceRepairs, setDeviceRepairs] = useState<any[]>([]);
    const [loadingRepairs, setLoadingRepairs] = useState(false);
    const [linkForm] = Form.useForm();
    const [linking, setLinking] = useState(false);

    // Detail Modal state
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailReport, setDetailReport] = useState<IVehicleIncidentReport | null>(null);

    // Load data
    const fetchReports = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const params: any = {};
            if (statusFilter) params.status = statusFilter;
            if (deviceFilter) params.device_id = deviceFilter;
            if (searchText.trim()) params.search = searchText.trim();
            if (dateRange && dateRange[0] && dateRange[1]) {
                params.from_date = dateRange[0].format('YYYY-MM-DD');
                params.to_date = dateRange[1].format('YYYY-MM-DD');
            }

            const data = await getVehicleIncidentReports(params);
            const list = data || [];
            setReports(list);
            setDetailReport((prev) => {
                if (!prev) return null;
                const updated = list.find((item) => item.id === prev.id);
                return updated || prev;
            });
        } catch (err) {
            console.error('Failed to load incident reports:', err);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [statusFilter, deviceFilter, searchText, dateRange]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    // Realtime WebSocket subscription
    useSocket(user?.user_id, {
        incident_report_updated: () => {
            fetchReports(true);
        },
        repair_updated: () => {
            fetchReports(true);
        },
    });

    useEffect(() => {
        if (token) {
            getAllDevices().then((res: any) => setDevices(res || [])).catch(() => {});
            getAllUsers(token).then((res: any) => {
                const active = (res || []).filter(
                    (u: any) => !u.status || u.status.trim().toLowerCase() === 'active'
                );
                setUsersList(active);
            }).catch(() => {});
        }
    }, [token]);

    // Handlers
    const handleAccept = async (id: number) => {
        try {
            await acceptIncidentReport(id);
            notification.success({ title: 'Thành công', message: 'Đã tiếp nhận xử lý sự cố' });
            fetchReports();
            if (detailModalOpen && detailReport?.id === id) {
                setDetailReport(prev => prev ? { ...prev, status: IncidentReportStatus.IN_PROGRESS } : null);
            }
        } catch (err: any) {
            notification.error({ title: 'Thất bại', message: 'Lỗi tiếp nhận', description: err?.message });
        }
    };

    const handleOpenResolve = (report: IVehicleIncidentReport) => {
        setSelectedReport(report);
        resolveForm.resetFields();
        resolveForm.setFieldsValue({
            operator_confirmed_by_id: report.reporter_user?.user_id,
            operator_confirmed_name: report.reporter_name,
            quick_solution: 'Đã xử lý khắc phục hoàn tất tại hiện trường.',
        });
        setResolveModalOpen(true);
    };

    const handleSubmitResolve = async (values: any) => {
        if (!selectedReport) return;
        setResolving(true);
        try {
            await resolveQuickIncidentReport(selectedReport.id, values);
            notification.success({ title: 'Thành công', message: 'Xác nhận khắc phục thành công' });
            setResolveModalOpen(false);
            if (detailModalOpen && detailReport?.id === selectedReport.id) {
                setDetailModalOpen(false);
            }
            fetchReports();
        } catch (err: any) {
            notification.error({ title: 'Thất bại', message: 'Lỗi', description: err?.message });
        } finally {
            setResolving(false);
        }
    };

    // Mở popup Thao tác 3: Yêu cầu làm hồ sơ sửa chữa (kiểm tra chéo nhóm xe)
    const handleOpenRequestDossier = async (report: IVehicleIncidentReport) => {
        setSelectedReportForDossier(report);
        setDossierModalOpen(true);
        setCheckingGroup(true);
        dossierForm.resetFields();

        try {
            const checkRes = await checkVehicleGroupMembership(report.id);
            setGroupCheckData(checkRes);

            const defaultUserId = checkRes.reporter_user?.user_id || undefined;
            const defaultUserName = checkRes.reporter_name || '';

            dossierForm.setFieldsValue({
                assigned_user_id: defaultUserId,
                assigned_user_name: defaultUserName,
                request_note: `Xe có sự cố: ${report.description}. Yêu cầu lập Hồ sơ sửa chữa (B03) để chuyển bộ phận kỹ thuật xem xét khắc phục.`,
            });
        } catch (err: any) {
            notification.error({
                title: 'Thất bại',
                message: 'Lỗi kiểm tra nhóm xe',
                description: err?.message || 'Không thể kiểm tra chéo nhóm quản lý xe.',
            });
        } finally {
            setCheckingGroup(false);
        }
    };

    const handleSubmitRequestDossier = async (values: any) => {
        if (!selectedReportForDossier) return;
        setRequestingDossier(true);
        try {
            await requestRepairDossier(selectedReportForDossier.id, {
                assigned_user_id: values.assigned_user_id,
                assigned_user_name: values.assigned_user_name,
                request_note: values.request_note,
            });

            notification.success({
                title: 'Thành công',
                message: 'Đã gửi yêu cầu làm hồ sơ sửa chữa',
                description: values.assigned_user_id
                    ? `Yêu cầu đã được gửi đến tài khoản người phụ trách.`
                    : `Đã ghi nhận yêu cầu lập hồ sơ sửa chữa cho phương tiện này.`,
            });

            setDossierModalOpen(false);
            if (detailModalOpen && detailReport?.id === selectedReportForDossier.id) {
                setDetailModalOpen(false);
            }
            fetchReports();
        } catch (err: any) {
            notification.error({
                title: 'Thất bại',
                message: 'Gửi yêu cầu thất bại',
                description: err?.response?.data?.message || err?.message || 'Có lỗi xảy ra.',
            });
        } finally {
            setRequestingDossier(false);
        }
    };

    // Mở popup gắn mã phiếu sửa chữa B03
    const handleOpenLinkRepair = async (report: IVehicleIncidentReport) => {
        setSelectedReportForLink(report);
        setLinkModalOpen(true);
        setLoadingRepairs(true);
        linkForm.resetFields();

        try {
            const res = await getRepairsByDevice(report.device_id, token);
            setDeviceRepairs(res?.repairs || []);
        } catch (err) {
            console.error('Failed to load device repairs:', err);
        } finally {
            setLoadingRepairs(false);
        }
    };

    const handleSubmitLinkRepair = async (values: any) => {
        if (!selectedReportForLink) return;
        setLinking(true);
        try {
            await linkRepairDossier(selectedReportForLink.id, values.repair_id);
            notification.success({
                title: 'Thành công',
                message: 'Đã liên kết hồ sơ sửa chữa',
                description: `Báo cáo đã được liên kết với phiếu sửa chữa #${values.repair_id}.`,
            });
            setLinkModalOpen(false);
            if (detailModalOpen && detailReport?.id === selectedReportForLink.id) {
                setDetailModalOpen(false);
            }
            fetchReports();
        } catch (err: any) {
            notification.error({
                title: 'Thất bại',
                message: 'Lỗi liên kết',
                description: err?.response?.data?.message || err?.message || 'Có lỗi xảy ra.',
            });
        } finally {
            setLinking(false);
        }
    };

    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const handleViewDetail = (report: IVehicleIncidentReport) => {
        setDetailReport(report);
        setDetailModalOpen(true);
    };

    const summaryStats = useMemo(() => {
        const total = reports.length;
        const pending = reports.filter(r => r.status === IncidentReportStatus.PENDING || r.status === IncidentReportStatus.IN_PROGRESS).length;
        const requestedRepair = reports.filter(r => r.status === IncidentReportStatus.REQUESTED_REPAIR).length;
        const resolvedQuick = reports.filter(r => r.status === IncidentReportStatus.RESOLVED_QUICK).length;
        const convertedRepair = reports.filter(r => r.status === IncidentReportStatus.CONVERTED_REPAIR).length;
        return { total, pending, requestedRepair, resolvedQuick, convertedRepair };
    }, [reports]);

    const renderResolutionDetail = (r: IVehicleIncidentReport) => {
        const conf = STATUS_TAGS[r.status] || { color: 'default', label: r.status };

        if (r.status === IncidentReportStatus.RESOLVED_QUICK) {
            return (
                <div style={{ fontSize: 12, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: '8px 10px', lineHeight: 1.45 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                        <Tag color={conf.color} style={{ borderRadius: 10, margin: 0, fontWeight: 600, fontSize: 11.5 }}>
                            ✅ {conf.label}
                        </Tag>
                        {r.operator_confirmed_at && (
                            <span style={{ color: '#52c41a', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <ClockCircleOutlined />
                                {dayjs(r.operator_confirmed_at).format('DD/MM/YYYY HH:mm')}
                            </span>
                        )}
                    </div>
                    <div style={{ color: '#262626' }}>
                        <strong style={{ color: '#389e0d' }}>KTV:</strong> {r.technician?.name || 'Kỹ thuật'}
                        {r.operator_confirmed_name && (
                            <span style={{ color: '#595959' }}> • <strong>Nghiệm thu:</strong> {r.operator_confirmed_name}</span>
                        )}
                    </div>
                    {r.quick_solution && (
                        <div style={{ color: '#434343', marginTop: 2, wordBreak: 'break-word' }}>
                            <strong>Biện pháp:</strong> {r.quick_solution}
                        </div>
                    )}
                </div>
            );
        }

        if (r.status === IncidentReportStatus.REQUESTED_REPAIR) {
            return (
                <div style={{ fontSize: 12, background: '#f9f0ff', border: '1px solid #d3adf7', borderRadius: 8, padding: '8px 10px', lineHeight: 1.45 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                        <Tag color={conf.color} style={{ borderRadius: 10, margin: 0, fontWeight: 600, fontSize: 11.5 }}>
                            📋 {conf.label}
                        </Tag>
                        {r.is_reporter_in_vehicle_group ? (
                            <Tag color="success" style={{ fontSize: 10, margin: 0 }}>Thuộc nhóm xe</Tag>
                        ) : r.reporter_user_id ? (
                            <Tag color="warning" style={{ fontSize: 10, margin: 0 }}>Khác nhóm xe</Tag>
                        ) : null}
                    </div>
                    <div><strong>Giao lập B03:</strong> {r.assigned_dossier_user_name || r.reporter_name || 'Tổ xe'}</div>
                    {r.dossier_request_note && (
                        <div style={{ color: '#595959', marginTop: 2, fontSize: 11.5, wordBreak: 'break-word' }}>
                            {r.dossier_request_note}
                        </div>
                    )}
                    {r.dossier_requested_at && (
                        <div style={{ color: '#8c8c8c', fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ClockCircleOutlined />
                            <span>{dayjs(r.dossier_requested_at).format('DD/MM/YYYY HH:mm')}</span>
                        </div>
                    )}
                </div>
            );
        }

        if (r.status === IncidentReportStatus.CONVERTED_REPAIR) {
            return (
                <div style={{ fontSize: 12, background: '#f0f5ff', border: '1px solid #adc6ff', borderRadius: 8, padding: '8px 10px', lineHeight: 1.45 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                        <Tag color={conf.color} style={{ borderRadius: 10, margin: 0, fontWeight: 600, fontSize: 11.5 }}>
                            📑 {conf.label}
                        </Tag>
                        <Tag color="blue" style={{ margin: 0, fontWeight: 700, borderRadius: 6 }}>
                            Phiếu #{r.converted_repair_id}
                        </Tag>
                    </div>
                    <div style={{ color: '#1d39c4', fontSize: 11.5, marginTop: 4 }}>
                        Đã chuyển sang quy trình Hồ sơ sửa chữa B03
                    </div>
                </div>
            );
        }

        if (r.status === IncidentReportStatus.IN_PROGRESS) {
            return (
                <div style={{ fontSize: 12, color: '#d46b08', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: '8px 10px', lineHeight: 1.45 }}>
                    <Tag color={conf.color} style={{ borderRadius: 10, margin: '0 0 4px 0', fontWeight: 600, fontSize: 11.5 }}>
                        ⏳ {conf.label}
                    </Tag>
                    <div><strong>KTV phụ trách:</strong> {r.technician?.name || 'Kỹ thuật viên'}</div>
                </div>
            );
        }

        return (
            <div style={{ fontSize: 12, background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 8, padding: '8px 10px', lineHeight: 1.45 }}>
                <Tag color={conf.color} style={{ borderRadius: 10, margin: '0 0 4px 0', fontWeight: 600, fontSize: 11.5 }}>
                    🚨 {conf.label}
                </Tag>
                <div style={{ color: '#cf1322', fontSize: 11.5 }}>Đang chờ Kỹ thuật viên tiếp nhận</div>
            </div>
        );
    };

    const renderActionButtons = (r: IVehicleIncidentReport, isCardLayout = false) => {
        if (isViewOnly) {
            return (
                <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewDetail(r)}
                    style={{ borderRadius: 6, width: isCardLayout ? 'auto' : '100%' }}
                >
                    Xem chi tiết
                </Button>
            );
        }

        const canHandleDossier = checkCanHandleDossier(r);

        // 1. Trạng thái đã hoàn tất (Khắc phục nhanh hoặc Đã tạo B03)
        if (r.status === IncidentReportStatus.RESOLVED_QUICK || r.status === IncidentReportStatus.CONVERTED_REPAIR) {
            return (
                <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewDetail(r)}
                    style={{ borderRadius: 6, width: isCardLayout ? 'auto' : '100%' }}
                >
                    Xem chi tiết
                </Button>
            );
        }

        // 2. Trạng thái Chờ lập hồ sơ sửa chữa (REQUESTED_REPAIR)
        if (r.status === IncidentReportStatus.REQUESTED_REPAIR) {
            return (
                <Space direction={isCardLayout ? 'horizontal' : 'vertical'} size={5} wrap style={{ width: isCardLayout ? 'auto' : '100%' }}>
                    {canHandleDossier ? (
                        <>
                            <Button
                                type="primary"
                                size="small"
                                block={!isCardLayout}
                                style={{ background: '#722ed1', borderColor: '#722ed1', borderRadius: 6 }}
                                icon={<FileAddOutlined />}
                                onClick={() => handleGoToCreateRepair(r)}
                            >
                                Lập hồ sơ B03
                            </Button>
                            {isTechOrAdmin && (
                                <Button
                                    size="small"
                                    block={!isCardLayout}
                                    style={{ borderRadius: 6 }}
                                    icon={<LinkOutlined />}
                                    onClick={() => handleOpenLinkRepair(r)}
                                >
                                    Gắn mã B03
                                </Button>
                            )}
                        </>
                    ) : (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            (Chờ tổ xe lập)
                        </Text>
                    )}
                    <Button
                        size="small"
                        type={isCardLayout ? 'default' : 'link'}
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetail(r)}
                        style={{ fontSize: 12, padding: isCardLayout ? undefined : 0 }}
                    >
                        Xem chi tiết
                    </Button>
                </Space>
            );
        }

        // 3. Trạng thái PENDING / IN_PROGRESS:
        if (isTechOrAdmin) {
            return (
                <Space direction={isCardLayout ? 'horizontal' : 'vertical'} size={5} wrap style={{ width: isCardLayout ? 'auto' : '100%' }}>
                    {r.status === IncidentReportStatus.PENDING && (
                        <Button
                            type="primary"
                            size="small"
                            block={!isCardLayout}
                            style={{ borderRadius: 6 }}
                            icon={<ToolOutlined />}
                            onClick={() => handleAccept(r.id)}
                        >
                            Tiếp nhận
                        </Button>
                    )}
                    <Button
                        type="primary"
                        size="small"
                        block={!isCardLayout}
                        style={{ background: '#52c41a', borderColor: '#52c41a', borderRadius: 6 }}
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleOpenResolve(r)}
                    >
                        Khắc phục xong
                    </Button>
                    <Button
                        type="dashed"
                        danger
                        size="small"
                        block={!isCardLayout}
                        style={{ borderRadius: 6 }}
                        icon={<FileAddOutlined />}
                        onClick={() => handleOpenRequestDossier(r)}
                    >
                        Yêu cầu B03
                    </Button>
                    <Button
                        size="small"
                        type={isCardLayout ? 'default' : 'link'}
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetail(r)}
                        style={{ fontSize: 12, padding: isCardLayout ? undefined : 0 }}
                    >
                        Chi tiết
                    </Button>
                </Space>
            );
        }

        // Đối với Người vận hành (OPERATOR)
        return (
            <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleViewDetail(r)}
                style={{ borderRadius: 6, width: isCardLayout ? 'auto' : '100%' }}
            >
                Xem chi tiết
            </Button>
        );
    };

    const columns: any[] = [
        {
            title: 'Phương tiện & Vị trí',
            width: '23%',
            render: (_: any, r: IVehicleIncidentReport) => (
                <div style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <Tag color="blue" style={{ fontWeight: 700, margin: '1px 0 0 0', borderRadius: 6 }}>
                            #{r.id}
                        </Tag>
                        <div style={{ fontWeight: 600, color: '#1f1f1f', fontSize: 13, lineHeight: 1.4 }}>
                            {r.device?.name || 'Phương tiện'}
                        </div>
                    </div>
                    <Space size={6} wrap style={{ fontSize: 12, marginTop: 6 }}>
                        {r.device?.reg_number && (
                            <Tag color="geekblue" style={{ borderRadius: 4, margin: 0, fontWeight: 600 }}>
                                {r.device.reg_number}
                            </Tag>
                        )}
                        {r.device?.device_code && <Text type="secondary" style={{ fontSize: 12 }}>{r.device.device_code}</Text>}
                    </Space>
                    {r.location_issue && (
                        <div style={{ fontSize: 11.5, color: '#595959', marginTop: 5, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                            <EnvironmentOutlined style={{ color: '#ff4d4f', marginTop: 2, flexShrink: 0 }} />
                            <span>{r.location_issue}</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Nội dung & Ảnh hiện trường',
            dataIndex: 'description',
            width: '24%',
            render: (text: string, r: IVehicleIncidentReport) => (
                <div style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: '#1f1f1f', fontWeight: 500 }}>
                        {text}
                    </div>
                    {r.images && r.images.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                            <Image.PreviewGroup>
                                <Space size={6} wrap>
                                    {r.images.map((img, i) => (
                                        <Image
                                            key={i}
                                            width={46}
                                            height={46}
                                            src={`${process.env.REACT_APP_BASE_URL?.replace('/api', '')}${img}`}
                                            style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #d9d9d9' }}
                                        />
                                    ))}
                                </Space>
                            </Image.PreviewGroup>
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Người báo & Thời gian',
            width: '18%',
            render: (_: any, r: IVehicleIncidentReport) => (
                <div style={{ fontSize: 12, wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: 1.45 }}>
                    <div style={{ fontWeight: 600, color: '#262626', fontSize: 13 }}>
                        {r.reporter_name} {r.reporter_code ? <span style={{ color: '#595959', fontWeight: 500 }}>({r.reporter_code})</span> : ''}
                    </div>
                    {r.reporter_department && (
                        <div style={{ color: '#595959', marginTop: 2 }}>{r.reporter_department}</div>
                    )}
                    {r.reporter_phone && (
                        <div style={{ marginTop: 2 }}>
                            <a href={`tel:${r.reporter_phone}`} style={{ color: '#1890ff', fontWeight: 500 }}>
                                <PhoneOutlined /> {r.reporter_phone}
                            </a>
                        </div>
                    )}
                    <div style={{ color: '#8c8c8c', fontSize: 11.5, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ClockCircleOutlined />
                        <span>{dayjs(r.created_at).format('DD/MM/YYYY HH:mm')}</span>
                    </div>
                    {r.is_external_reporter && (
                        <Tag color="default" style={{ fontSize: 10, marginTop: 4 }}>Ngoài danh mục</Tag>
                    )}
                </div>
            ),
        },
        {
            title: 'Trạng thái & Kết quả xử lý',
            width: '23%',
            render: (_: any, r: IVehicleIncidentReport) => renderResolutionDetail(r),
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: '12%',
            align: 'center',
            render: (_: any, r: IVehicleIncidentReport) => renderActionButtons(r, false),
        },
    ];

    return (
        <div style={{ padding: '4px 0' }}>
            <style>{`
                .vehicle-incident-table .ant-table-thead > tr > th {
                    background-color: #f8fafc !important;
                    color: #334155 !important;
                    font-weight: 600;
                    padding: 12px 12px !important;
                }
                .vehicle-incident-table .ant-table-tbody > tr > td {
                    vertical-align: top;
                    padding: 12px 12px !important;
                }
            `}</style>

            <Card style={{ marginBottom: 16, borderRadius: 12 }} styles={{ body: { padding: isMobile ? 14 : 20 } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: isMobile ? 17 : 20 }}>
                            <WarningOutlined style={{ color: '#ff4d4f' }} />
                            <span>Báo cáo tình trạng xe tại hiện trường</span>
                        </Title>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            Theo dõi sự cố phát sinh từ quét QR xe và lịch sử xử lý của Kỹ thuật viên
                        </Text>
                    </div>

                    <Space wrap size={8}>
                        <Button icon={<ReloadOutlined />} onClick={() => fetchReports(false)} loading={loading}>
                            Làm mới
                        </Button>
                    </Space>
                </div>

                {/* QUICK KPI STATUS PILLS */}
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
                        { key: undefined, label: 'Tất cả báo cáo', count: summaryStats.total, color: '#1677ff', bg: '#f0f5ff' },
                        { key: IncidentReportStatus.PENDING, label: 'Chờ tiếp nhận / Đang xử lý', count: summaryStats.pending, color: '#cf1322', bg: '#fff1f0' },
                        { key: IncidentReportStatus.REQUESTED_REPAIR, label: 'Chờ lập hồ sơ B03', count: summaryStats.requestedRepair, color: '#722ed1', bg: '#f9f0ff' },
                        { key: IncidentReportStatus.RESOLVED_QUICK, label: 'Đã khắc phục nhanh', count: summaryStats.resolvedQuick, color: '#389e0d', bg: '#f6ffed' },
                        { key: IncidentReportStatus.CONVERTED_REPAIR, label: 'Đã lập hồ sơ B03', count: summaryStats.convertedRepair, color: '#0958d9', bg: '#e6f4ff' },
                    ].map((pill) => {
                        const isActive = statusFilter === pill.key;
                        return (
                            <div
                                key={String(pill.key || 'ALL')}
                                onClick={() => setStatusFilter(isActive && pill.key !== undefined ? undefined : pill.key)}
                                style={{
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '6px 12px',
                                    borderRadius: 20,
                                    border: isActive ? `1.5px solid ${pill.color}` : '1px solid #e2e8f0',
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

                {/* FILTERS */}
                <Row gutter={[10, 10]} style={{ marginTop: 12 }}>
                    <Col xs={24} sm={12} md={7}>
                        <Input
                            placeholder="Tìm kiếm người báo, MSNV, nội dung..."
                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            allowClear
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Select
                            allowClear
                            placeholder="Lọc theo phương tiện / xe"
                            style={{ width: '100%' }}
                            value={deviceFilter}
                            onChange={setDeviceFilter}
                            showSearch
                            optionFilterProp="children"
                        >
                            {devices.map(d => (
                                <Select.Option key={d.device_id} value={d.device_id}>
                                    {d.name} {d.reg_number ? `(${d.reg_number})` : ''}
                                </Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={5}>
                        <Select
                            allowClear
                            placeholder="Lọc theo trạng thái"
                            style={{ width: '100%' }}
                            value={statusFilter}
                            onChange={setStatusFilter}
                        >
                            <Select.Option value={IncidentReportStatus.PENDING}>🚨 Chờ tiếp nhận</Select.Option>
                            <Select.Option value={IncidentReportStatus.IN_PROGRESS}>⏳ Đang xử lý</Select.Option>
                            <Select.Option value={IncidentReportStatus.RESOLVED_QUICK}>✅ Đã khắc phục nhanh</Select.Option>
                            <Select.Option value={IncidentReportStatus.REQUESTED_REPAIR}>📋 Chờ lập hồ sơ sửa chữa</Select.Option>
                            <Select.Option value={IncidentReportStatus.CONVERTED_REPAIR}>📑 Đã lập hồ sơ B03</Select.Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <DatePicker.RangePicker
                            style={{ width: '100%' }}
                            format="DD/MM/YYYY"
                            placeholder={['Từ ngày', 'Đến ngày']}
                            value={dateRange}
                            onChange={setDateRange}
                        />
                    </Col>
                </Row>
            </Card>

            {/* THÔNG BÁO CHO NGƯỜI VẬN HÀNH CÓ SỰ CỐ CẦN ĐI LẬP HỒ SƠ B03 */}
            {reports.filter(r => r.status === IncidentReportStatus.REQUESTED_REPAIR && checkCanHandleDossier(r)).length > 0 && !isTechOrAdmin && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    message={
                        <span>
                            <strong>Nhiệm vụ cần thực hiện:</strong> Bạn có{' '}
                            <strong>
                                {reports.filter(r => r.status === IncidentReportStatus.REQUESTED_REPAIR && checkCanHandleDossier(r)).length}
                            </strong>{' '}
                            báo cáo sự cố xe đang được KTV yêu cầu lập hồ sơ sửa chữa B03. Vui lòng bấm{' '}
                            <strong style={{ color: '#722ed1' }}>"Lập hồ sơ B03"</strong> tại cột thao tác để lập phiếu đề nghị sửa chữa.
                        </span>
                    }
                />
            )}

            {/* DESKTOP TABLE (NO HORIZONTAL SCROLL) OR MOBILE CARD LIST */}
            {isMobile ? (
                <Spin spinning={loading}>
                    {reports.length === 0 ? (
                        <Card style={{ borderRadius: 12, textAlign: 'center', padding: '24px 0' }}>
                            <Empty description="Không có báo cáo tình trạng xe nào" />
                        </Card>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {reports.map((r) => (
                                <Card
                                    key={r.id}
                                    size="small"
                                    style={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                                    styles={{ body: { padding: 14 } }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            <Tag color="blue" style={{ margin: 0, fontWeight: 700, borderRadius: 6 }}>#{r.id}</Tag>
                                            <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                                                {r.device?.name}
                                            </span>
                                            {r.device?.reg_number && (
                                                <Tag color="geekblue" style={{ margin: 0, borderRadius: 4 }}>
                                                    {r.device.reg_number}
                                                </Tag>
                                            )}
                                        </div>
                                        <span style={{ fontSize: 11.5, color: '#64748b', whiteSpace: 'nowrap' }}>
                                            {dayjs(r.created_at).format('DD/MM/YYYY HH:mm')}
                                        </span>
                                    </div>

                                    {r.location_issue && (
                                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                                            📍 {r.location_issue}
                                        </div>
                                    )}

                                    <div style={{ marginTop: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#1e293b' }}>
                                        <div style={{ fontWeight: 500 }}>{r.description}</div>
                                        {r.images && r.images.length > 0 && (
                                            <div style={{ marginTop: 8 }}>
                                                <Image.PreviewGroup>
                                                    <Space size={6} wrap>
                                                        {r.images.map((img, i) => (
                                                            <Image
                                                                key={i}
                                                                width={48}
                                                                height={48}
                                                                src={`${process.env.REACT_APP_BASE_URL?.replace('/api', '')}${img}`}
                                                                style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #cbd5e1' }}
                                                            />
                                                        ))}
                                                    </Space>
                                                </Image.PreviewGroup>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ marginTop: 8, fontSize: 12, color: '#475569', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                                        <span>
                                            👤 <strong>{r.reporter_name}</strong> {r.reporter_code ? `(${r.reporter_code})` : ''}
                                            {r.reporter_department ? ` • ${r.reporter_department}` : ''}
                                        </span>
                                        {r.reporter_phone && (
                                            <a href={`tel:${r.reporter_phone}`} style={{ color: '#1677ff', fontWeight: 500 }}>
                                                <PhoneOutlined /> {r.reporter_phone}
                                            </a>
                                        )}
                                    </div>

                                    <div style={{ marginTop: 10 }}>
                                        {renderResolutionDetail(r)}
                                    </div>

                                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                                        {renderActionButtons(r, true)}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </Spin>
            ) : (
                <Card style={{ borderRadius: 12 }} styles={{ body: { padding: '8px 16px 16px 16px' } }}>
                    <Table
                        className="vehicle-incident-table"
                        columns={columns}
                        dataSource={reports}
                        rowKey="id"
                        loading={loading}
                        tableLayout="fixed"
                        pagination={{ pageSize: 10, showTotal: (total) => `Tổng cộng ${total} báo cáo` }}
                    />
                </Card>
            )}

            {/* MODAL CHI TIẾT BÁO CÁO */}
            <Modal
                title={
                    <Space>
                        <CarOutlined style={{ color: '#1890ff' }} />
                        <span>Chi tiết Báo cáo tình trạng xe #{detailReport?.id}</span>
                    </Space>
                }
                open={detailModalOpen}
                onCancel={() => setDetailModalOpen(false)}
                footer={[
                    <Button key="close" onClick={() => setDetailModalOpen(false)}>
                        Đóng
                    </Button>,
                    isTechOrAdmin && detailReport?.status === IncidentReportStatus.PENDING && (
                        <Button
                            key="accept"
                            type="primary"
                            icon={<ToolOutlined />}
                            onClick={() => detailReport && handleAccept(detailReport.id)}
                        >
                            Tiếp nhận xử lý
                        </Button>
                    ),
                    isTechOrAdmin && detailReport &&
                    detailReport.status !== IncidentReportStatus.RESOLVED_QUICK &&
                    detailReport.status !== IncidentReportStatus.CONVERTED_REPAIR &&
                    detailReport.status !== IncidentReportStatus.REQUESTED_REPAIR && (
                        <Button
                            key="resolve"
                            type="primary"
                            style={{ background: '#52c41a', borderColor: '#52c41a' }}
                            icon={<CheckCircleOutlined />}
                            onClick={() => {
                                handleOpenResolve(detailReport);
                            }}
                        >
                            Khắc phục xong
                        </Button>
                    ),
                    isTechOrAdmin && detailReport &&
                    detailReport.status !== IncidentReportStatus.RESOLVED_QUICK &&
                    detailReport.status !== IncidentReportStatus.CONVERTED_REPAIR &&
                    detailReport.status !== IncidentReportStatus.REQUESTED_REPAIR && (
                        <Button
                            key="request"
                            type="dashed"
                            danger
                            icon={<FileAddOutlined />}
                            onClick={() => {
                                handleOpenRequestDossier(detailReport);
                            }}
                        >
                            Yêu cầu làm hồ sơ
                        </Button>
                    ),
                    detailReport && detailReport.status === IncidentReportStatus.REQUESTED_REPAIR && checkCanHandleDossier(detailReport) && (
                        <Button
                            key="go_b03"
                            type="primary"
                            style={{ background: '#722ed1', borderColor: '#722ed1' }}
                            icon={<FileAddOutlined />}
                            onClick={() => {
                                setDetailModalOpen(false);
                                handleGoToCreateRepair(detailReport);
                            }}
                        >
                            Lập hồ sơ sửa chữa
                        </Button>
                    ),
                    isTechOrAdmin && detailReport && detailReport.status === IncidentReportStatus.REQUESTED_REPAIR && (
                        <Button
                            key="link_b03"
                            icon={<LinkOutlined />}
                            onClick={() => {
                                setDetailModalOpen(false);
                                handleOpenLinkRepair(detailReport);
                            }}
                        >
                            Gắn mã B03
                        </Button>
                    ),
                ]}
                width="min(700px, calc(100vw - 24px))"
                destroyOnClose
            >
                {detailReport && (
                    <div>
                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space>
                                <Tag color="blue" style={{ fontSize: 13, padding: '2px 8px' }}>#{detailReport.id}</Tag>
                                {STATUS_TAGS[detailReport.status] && (
                                    <Tag color={STATUS_TAGS[detailReport.status].color} style={{ fontSize: 13, padding: '2px 8px' }}>
                                        {STATUS_TAGS[detailReport.status].label}
                                    </Tag>
                                )}
                            </Space>
                            <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                                Báo lúc: {dayjs(detailReport.created_at).format('DD/MM/YYYY HH:mm')}
                            </span>
                        </div>

                        <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
                            <Descriptions.Item label="Phương tiện / Thiết bị" span={2}>
                                <strong>{detailReport.device?.name}</strong> {detailReport.device?.reg_number ? `(${detailReport.device.reg_number})` : ''}
                            </Descriptions.Item>
                            <Descriptions.Item label="Vị trí xảy ra sự cố" span={2}>
                                📍 {detailReport.location_issue || 'Không ghi nhận'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Người báo cáo">
                                {detailReport.reporter_name} {detailReport.reporter_code ? `(${detailReport.reporter_code})` : ''}
                            </Descriptions.Item>
                            <Descriptions.Item label="Đơn vị / Phòng ban">
                                {detailReport.reporter_department || 'N/A'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Số điện thoại" span={2}>
                                {detailReport.reporter_phone ? (
                                    <a href={`tel:${detailReport.reporter_phone}`}>{detailReport.reporter_phone}</a>
                                ) : 'Không có'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Nội dung tình trạng" span={2}>
                                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#1f1f1f' }}>
                                    {detailReport.description}
                                </div>
                            </Descriptions.Item>
                        </Descriptions>

                        {detailReport.images && detailReport.images.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                    Hình ảnh hiện trường ({detailReport.images.length}):
                                </Text>
                                <Image.PreviewGroup>
                                    <Space size="middle" wrap>
                                        {detailReport.images.map((img, i) => (
                                            <Image
                                                key={i}
                                                width={90}
                                                height={90}
                                                src={`${process.env.REACT_APP_BASE_URL?.replace('/api', '')}${img}`}
                                                style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #d9d9d9' }}
                                            />
                                        ))}
                                    </Space>
                                </Image.PreviewGroup>
                            </div>
                        )}

                        <Divider style={{ margin: '16px 0' }} />

                        <Title level={5} style={{ marginBottom: 12 }}>Tiến độ xử lý & Nghiệm thu</Title>
                        {detailReport.status === IncidentReportStatus.RESOLVED_QUICK ? (
                            <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: 12 }}>
                                <Row gutter={[16, 8]}>
                                    <Col span={12}>
                                        <Text type="secondary">KTV thực hiện:</Text>
                                        <div><strong>{detailReport.technician?.name || 'Kỹ thuật viên'}</strong></div>
                                    </Col>
                                    <Col span={12}>
                                        <Text type="secondary">Người vận hành nghiệm thu:</Text>
                                        <div><strong>{detailReport.operator_confirmed_name || '-'}</strong></div>
                                    </Col>
                                    <Col span={24}>
                                        <Text type="secondary">Biện pháp khắc phục:</Text>
                                        <div>{detailReport.quick_solution || '-'}</div>
                                    </Col>
                                    {detailReport.operator_notes && (
                                        <Col span={24}>
                                            <Text type="secondary">Ghi chú của người nghiệm thu:</Text>
                                            <div>{detailReport.operator_notes}</div>
                                        </Col>
                                    )}
                                    {detailReport.operator_confirmed_at && (
                                        <Col span={24}>
                                            <Text type="secondary">Thời gian nghiệm thu:</Text>
                                            <div style={{ color: '#52c41a', fontWeight: 500 }}>
                                                {dayjs(detailReport.operator_confirmed_at).format('DD/MM/YYYY HH:mm')}
                                            </div>
                                        </Col>
                                    )}
                                </Row>
                            </div>
                        ) : detailReport.status === IncidentReportStatus.REQUESTED_REPAIR ? (
                            <div style={{ background: '#f9f0ff', border: '1px solid #d3adf7', borderRadius: 8, padding: 12 }}>
                                <Row gutter={[16, 8]}>
                                    <Col span={12}>
                                        <Text type="secondary">KTV yêu cầu:</Text>
                                        <div><strong>{detailReport.technician?.name || 'KTV'}</strong></div>
                                    </Col>
                                    <Col span={12}>
                                        <Text type="secondary">Người được giao lập hồ sơ:</Text>
                                        <div>
                                            <strong>{detailReport.assigned_dossier_user_name || detailReport.reporter_name}</strong>
                                            {detailReport.is_reporter_in_vehicle_group ? (
                                                <Tag color="success" style={{ marginLeft: 6 }}>Thuộc nhóm xe</Tag>
                                            ) : detailReport.reporter_user_id ? (
                                                <Tag color="warning" style={{ marginLeft: 6 }}>Khác nhóm xe</Tag>
                                            ) : null}
                                        </div>
                                    </Col>
                                    <Col span={24}>
                                        <Text type="secondary">Nội dung yêu cầu / Hạng mục hư hỏng:</Text>
                                        <div>{detailReport.dossier_request_note || '-'}</div>
                                    </Col>
                                    {detailReport.dossier_requested_at && (
                                        <Col span={24}>
                                            <Text type="secondary">Thời gian yêu cầu:</Text>
                                            <div style={{ color: '#722ed1', fontWeight: 500 }}>
                                                {dayjs(detailReport.dossier_requested_at).format('DD/MM/YYYY HH:mm')}
                                            </div>
                                        </Col>
                                    )}
                                </Row>
                            </div>
                        ) : detailReport.status === IncidentReportStatus.CONVERTED_REPAIR ? (
                            <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 8, padding: 12 }}>
                                <div>Đã hoàn tất lập hồ sơ sửa chữa chính thức:</div>
                                <Tag color="geekblue" style={{ fontSize: 13, marginTop: 4 }}>
                                    Hồ sơ sửa chữa #{detailReport.converted_repair_id}
                                </Tag>
                            </div>
                        ) : detailReport.status === IncidentReportStatus.IN_PROGRESS ? (
                            <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: 12 }}>
                                <Text style={{ color: '#fa8c16', fontWeight: 600 }}>
                                    Kỹ thuật viên ({detailReport.technician?.name || 'KTV'}) đang trực tiếp xử lý tại hiện trường.
                                </Text>
                            </div>
                        ) : (
                            <Text type="secondary">Chưa có kỹ thuật viên tiếp nhận.</Text>
                        )}
                    </div>
                )}
            </Modal>

            {/* MODAL NGHIỆM THU KHẮC PHỤC */}
            <Modal
                title="Xác nhận nghiệm thu khắc phục nhanh"
                open={resolveModalOpen}
                onCancel={() => setResolveModalOpen(false)}
                onOk={() => resolveForm.submit()}
                confirmLoading={resolving}
                okText="Hoàn tất nghiệm thu"
                cancelText="Hủy"
                destroyOnClose
                width="min(520px, calc(100vw - 24px))"
            >
                <div style={{ marginBottom: 12, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                    Xe: <strong>{selectedReport?.device?.name}</strong> {selectedReport?.device?.reg_number ? `(${selectedReport.device.reg_number})` : ''}
                </div>

                <Form form={resolveForm} layout="vertical" onFinish={handleSubmitResolve}>
                    <Form.Item
                        name="quick_solution"
                        label="Biện pháp khắc phục (*)"
                        rules={[{ required: true, message: 'Nhập biện pháp khắc phục' }]}
                    >
                        <Input.TextArea rows={3} placeholder="Mô tả công việc đã xử lý tại chỗ..." />
                    </Form.Item>

                    <Form.Item name="operator_confirmed_by_id" label="Chọn Người vận hành (Từ hệ thống)">
                        <Select
                            showSearch
                            allowClear
                            placeholder="Tìm kiếm người vận hành..."
                            optionFilterProp="children"
                            onChange={(userId) => {
                                const op = usersList.find(u => u.user_id === userId);
                                if (op) {
                                    resolveForm.setFieldsValue({ operator_confirmed_name: op.name });
                                }
                            }}
                        >
                            {usersList.map(u => (
                                <Select.Option key={u.user_id} value={u.user_id}>
                                    {u.name} ({u.employee_code || u.user_id}) - {u.department?.name || ''}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="operator_confirmed_name"
                        label="Họ tên Người vận hành xác nhận (*)"
                        rules={[{ required: true, message: 'Nhập họ tên người vận hành' }]}
                    >
                        <Input placeholder="Họ và tên người vận hành đang có mặt kiểm tra" />
                    </Form.Item>

                    <Form.Item name="operator_notes" label="Ghi chú nghiệm thu">
                        <Input placeholder="Tình trạng xe sau khi khắc phục..." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* MODAL THAO TÁC 3: YÊU CẦU LÀM HỒ SƠ SỬA CHỮA (KIỂM TRA CHÉO NHÓM XE) */}
            <Modal
                title={
                    <Space>
                        <FileAddOutlined style={{ color: '#fa8c16', fontSize: 20 }} />
                        <span>Yêu cầu làm Hồ sơ sửa chữa: {selectedReportForDossier?.device?.name}</span>
                    </Space>
                }
                open={dossierModalOpen}
                onCancel={() => setDossierModalOpen(false)}
                onOk={() => dossierForm.submit()}
                confirmLoading={requestingDossier}
                okText="Gửi yêu cầu làm hồ sơ"
                cancelText="Hủy"
                destroyOnClose
                width="min(620px, calc(100vw - 24px))"
            >
                {checkingGroup ? (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                        <Spin tip="Đang kiểm tra chéo nhóm quản lý xe..." />
                    </div>
                ) : (
                    <div>
                        <div style={{ marginBottom: 12, background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                            <div>Phương tiện: <strong>{selectedReportForDossier?.device?.name}</strong> {selectedReportForDossier?.device?.reg_number ? `(${selectedReportForDossier.device.reg_number})` : ''}</div>
                            {groupCheckData?.device_group_name && (
                                <div style={{ color: '#1890ff', marginTop: 2 }}>
                                    🚗 Thuộc nhóm quản lý: <strong>{groupCheckData.device_group_name}</strong>
                                </div>
                            )}
                            <div style={{ color: '#666', marginTop: 4 }}>
                                Tình trạng báo hỏng: {selectedReportForDossier?.description}
                            </div>
                        </div>

                        {/* KẾT QUẢ KIỂM TRA CHÉO */}
                        <div style={{ marginBottom: 16 }}>
                            {groupCheckData?.is_external_reporter ? (
                                <Alert
                                    type="info"
                                    showIcon
                                    message="Nhân viên mới / Thuê ngoài (Chưa có tài khoản CMMS)"
                                    description="Người báo cáo tại xe chưa có tài khoản trên hệ thống. Yêu cầu làm hồ sơ sửa chữa sẽ được ghi nhận để Tổ xe / Đội kỹ thuật chủ động lập hồ sơ giấy tờ."
                                />
                            ) : groupCheckData?.is_in_group ? (
                                <Alert
                                    type="success"
                                    showIcon
                                    message="Hợp lệ: Người báo cáo thuộc nhóm quản lý xe"
                                    description={`Nhân viên ${groupCheckData.reporter_name} (${groupCheckData.reporter_code || ''}) thuộc nhóm quản lý của phương tiện này. Hệ thống sẽ gửi thông báo trực tiếp đến tài khoản nhân viên để đi làm giấy tờ hồ sơ sửa chữa.`}
                                />
                            ) : (
                                <Alert
                                    type="warning"
                                    showIcon
                                    icon={<ExclamationCircleOutlined />}
                                    message="Cảnh báo kiểm tra chéo: Không thuộc nhóm xe!"
                                    description={`Nhân viên báo cáo (${groupCheckData?.reporter_name} - ${groupCheckData?.reporter_code || ''}) KHÔNG thuộc nhóm quản lý hoặc danh sách phụ trách xe này. Vui lòng chọn đúng người vận hành thuộc nhóm quản lý xe để giao lập hồ sơ bên dưới.`}
                                />
                            )}
                        </div>

                        <Form
                            form={dossierForm}
                            layout="vertical"
                            onFinish={handleSubmitRequestDossier}
                        >
                            <Form.Item
                                name="assigned_user_id"
                                label="Người phụ trách lập Hồ sơ sửa chữa (*)"
                                extra={groupCheckData?.is_in_group
                                    ? "Đã tự động chọn người báo cáo vì thuộc nhóm quản lý xe."
                                    : "Nên chọn nhân viên hoặc trưởng nhóm thuộc danh sách quản lý xe bên dưới."
                                }
                            >
                                <Select
                                    showSearch
                                    allowClear
                                    placeholder="Chọn người được giao lập hồ sơ sửa chữa..."
                                    optionFilterProp="children"
                                    onChange={(userId) => {
                                        const found = usersList.find(u => u.user_id === userId);
                                        if (found) {
                                            dossierForm.setFieldsValue({ assigned_user_name: found.name });
                                        }
                                    }}
                                >
                                    {/* Option 1: Người báo cáo nếu có tài khoản */}
                                    {groupCheckData?.reporter_user && (
                                        <Select.Option value={groupCheckData.reporter_user.user_id}>
                                            👤 {groupCheckData.reporter_name} ({groupCheckData.reporter_code || 'MSNV'}) - [Người báo cáo] {groupCheckData.is_in_group ? '✅ (Thuộc nhóm xe)' : '⚠️ (Khác nhóm xe)'}
                                        </Select.Option>
                                    )}

                                    {/* Option 2: Thành viên trong nhóm xe */}
                                    {groupCheckData?.group_members && groupCheckData.group_members.length > 0 && (
                                        <Select.OptGroup label={`Thành viên nhóm xe (${groupCheckData.device_group_name || 'Nhóm xe'})`}>
                                            {groupCheckData.group_members.map(m => (
                                                <Select.Option key={m.user_id} value={m.user_id}>
                                                    {m.name} ({m.employee_code || m.user_id}) - {m.is_group_lead ? '⭐ Trưởng nhóm xe' : 'Thành viên nhóm xe'}
                                                </Select.Option>
                                            ))}
                                        </Select.OptGroup>
                                    )}

                                    {/* Option 3: Toàn bộ danh sách người dùng hệ thống */}
                                    <Select.OptGroup label="Tất cả nhân sự / Người vận hành">
                                        {usersList.map(op => (
                                            <Select.Option key={op.user_id} value={op.user_id}>
                                                {op.name} ({op.employee_code || op.user_id}) - {op.department?.name || 'Vận hành'}
                                            </Select.Option>
                                        ))}
                                    </Select.OptGroup>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="assigned_user_name"
                                label="Họ tên người được giao (ghi nhận trên phiếu)"
                            >
                                <Input placeholder="Họ và tên người nhận nhiệm vụ lập hồ sơ" />
                            </Form.Item>

                            <Form.Item
                                name="request_note"
                                label="Nội dung yêu cầu / Hạng mục hư hỏng cần lập hồ sơ B03 (*)"
                                rules={[{ required: true, message: 'Vui lòng nhập nội dung yêu cầu làm hồ sơ sửa chữa' }]}
                            >
                                <Input.TextArea
                                    rows={3}
                                    placeholder="Nêu rõ tình trạng hỏng hóc, tính cấp bách và yêu cầu người vận hành lập hồ sơ đề nghị sửa chữa B03..."
                                />
                            </Form.Item>
                        </Form>
                    </div>
                )}
            </Modal>

            {/* MODAL GẮN MÃ PHIẾU SỬA CHỮA B03 */}
            <Modal
                title={
                    <Space>
                        <LinkOutlined style={{ color: '#1890ff' }} />
                        <span>Gắn liên kết mã Phiếu sửa chữa (B03)</span>
                    </Space>
                }
                open={linkModalOpen}
                onCancel={() => setLinkModalOpen(false)}
                onOk={() => linkForm.submit()}
                confirmLoading={linking}
                okText="Xác nhận liên kết"
                cancelText="Hủy"
                destroyOnClose
                width="min(520px, calc(100vw - 24px))"
            >
                <div style={{ marginBottom: 12, background: '#f5f5f5', borderRadius: 8, padding: 12, fontSize: 13 }}>
                    Xe: <strong>{selectedReportForLink?.device?.name}</strong> {selectedReportForLink?.device?.reg_number ? `(${selectedReportForLink.device.reg_number})` : ''}
                </div>

                <Form form={linkForm} layout="vertical" onFinish={handleSubmitLinkRepair}>
                    <Form.Item
                        name="repair_id"
                        label="Chọn Phiếu sửa chữa (B03) đã tạo cho xe này (*)"
                        rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập mã phiếu sửa chữa' }]}
                    >
                        {loadingRepairs ? (
                            <Spin size="small" />
                        ) : (
                            <Select
                                showSearch
                                placeholder="Chọn phiếu sửa chữa trong danh sách..."
                                optionFilterProp="children"
                            >
                                {deviceRepairs.map((rp: any) => (
                                    <Select.Option key={rp.repair_id} value={rp.repair_id}>
                                        Phiếu #{rp.repair_id} - {rp.recommendation || rp.description || 'Sửa chữa'} ({dayjs(rp.created_at).format('DD/MM/YYYY')})
                                    </Select.Option>
                                ))}
                            </Select>
                        )}
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default VehicleIncidentReportsPage;
