import React, { useEffect, useState, useCallback } from 'react';
import {
    Modal, Button, Tag, Space, Typography, Card, Image, Input, Form,
    Select, notification, Badge, Alert, Spin
} from 'antd';
import {
    WarningOutlined, CheckCircleOutlined, ToolOutlined, FileAddOutlined,
    UserOutlined, PhoneOutlined, CarOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import {
    getPendingIncidentReports,
    acceptIncidentReport,
    resolveQuickIncidentReport,
    checkVehicleGroupMembership,
    requestRepairDossier,
    IVehicleIncidentReport,
    IncidentReportStatus,
    ICheckVehicleGroupResult,
} from '../../apis/vehicleIncidentReports';
import { getAllUsers } from '../../apis/users';
import { useAuthContext } from '../../context/AuthContext/AuthContext';
import { getToken } from '../../utils/auth';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

export const PendingIncidentReportsModal: React.FC = () => {
    const { user } = useAuthContext();
    const token = getToken();

    const isTechOrAdmin = ['ADMIN', 'admin', 'TECHNICIAN', 'TEAM_LEAD'].includes(user?.role || '');

    const [reports, setReports] = useState<IVehicleIncidentReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [hasDismissed, setHasDismissed] = useState(false);

    // Resolve Quick Modal state
    const [resolveModalOpen, setResolveModalOpen] = useState(false);
    const [selectedReportForResolve, setSelectedReportForResolve] = useState<IVehicleIncidentReport | null>(null);
    const [resolveForm] = Form.useForm();
    const [resolving, setResolving] = useState(false);
    const [operatorsList, setOperatorsList] = useState<any[]>([]);

    // Request Repair Dossier Modal state (Thao tác 3 mới)
    const [dossierModalOpen, setDossierModalOpen] = useState(false);
    const [selectedReportForDossier, setSelectedReportForDossier] = useState<IVehicleIncidentReport | null>(null);
    const [groupCheckData, setGroupCheckData] = useState<ICheckVehicleGroupResult | null>(null);
    const [checkingGroup, setCheckingGroup] = useState(false);
    const [dossierForm] = Form.useForm();
    const [requestingDossier, setRequestingDossier] = useState(false);

    // Fetch pending reports
    const fetchReports = useCallback(async () => {
        if (!isTechOrAdmin || !token) return;
        setLoading(true);
        try {
            const data = await getPendingIncidentReports();
            setReports(data || []);
            // Auto open modal on login if there are pending reports and user hasn't closed it yet in this session
            if (data && data.length > 0 && !hasDismissed) {
                setModalOpen(true);
            }
        } catch (err) {
            console.error('Failed to fetch pending incident reports:', err);
        } finally {
            setLoading(false);
        }
    }, [isTechOrAdmin, token, hasDismissed]);

    useEffect(() => {
        fetchReports();
        // Polling check every 60 seconds
        const interval = setInterval(fetchReports, 60000);
        return () => clearInterval(interval);
    }, [fetchReports]);

    // Load operators list for resolve acknowledgment
    useEffect(() => {
        if (token && (resolveModalOpen || dossierModalOpen) && operatorsList.length === 0) {
            getAllUsers(token).then((res: any) => {
                setOperatorsList(res || []);
            }).catch(() => {});
        }
    }, [token, resolveModalOpen, dossierModalOpen, operatorsList.length]);

    // Thao tác 1: Kỹ thuật tiếp nhận
    const handleAccept = async (reportId: number) => {
        try {
            await acceptIncidentReport(reportId);
            notification.success({
                title: 'Thành công',
                message: 'Đã tiếp nhận sự cố',
                description: 'Bạn đã tiếp nhận xử lý báo cáo tình trạng xe này.',
            });
            fetchReports();
        } catch (err: any) {
            notification.error({
                title: 'Thất bại',
                message: 'Tiếp nhận thất bại',
                description: err?.response?.data?.message || err?.message || 'Có lỗi xảy ra.',
            });
        }
    };

    // Mở popup Thao tác 2: Xác nhận đã khắc phục nhanh
    const handleOpenResolveQuick = (report: IVehicleIncidentReport) => {
        setSelectedReportForResolve(report);
        resolveForm.resetFields();
        // Prefill operator name if the reporter was an internal user
        resolveForm.setFieldsValue({
            operator_confirmed_by_id: report.reporter_user?.user_id,
            operator_confirmed_name: report.reporter_name,
            quick_solution: 'Đã kiểm tra và xử lý khắc phục hoàn tất trực tiếp tại bãi đỗ.',
        });
        setResolveModalOpen(true);
    };

    // Submit Thao tác 2: Xác nhận đã khắc phục
    const handleSubmitResolveQuick = async (values: any) => {
        if (!selectedReportForResolve) return;
        setResolving(true);
        try {
            await resolveQuickIncidentReport(selectedReportForResolve.id, {
                quick_solution: values.quick_solution,
                operator_confirmed_by_id: values.operator_confirmed_by_id,
                operator_confirmed_name: values.operator_confirmed_name,
                operator_notes: values.operator_notes,
            });
            notification.success({
                title: 'Thành công',
                message: 'Khắc phục hoàn tất',
                description: 'Đã ghi nhận kết quả khắc phục nhanh và người vận hành xác nhận.',
            });
            setResolveModalOpen(false);
            fetchReports();
        } catch (err: any) {
            notification.error({
                title: 'Thất bại',
                message: 'Lỗi xác nhận khắc phục',
                description: err?.response?.data?.message || err?.message || 'Có lỗi xảy ra.',
            });
        } finally {
            setResolving(false);
        }
    };

    // Mở popup Thao tác 3: Yêu cầu làm hồ sơ sửa chữa (Có kiểm tra chéo nhóm xe)
    const handleOpenRequestDossier = async (report: IVehicleIncidentReport) => {
        setSelectedReportForDossier(report);
        setDossierModalOpen(true);
        setCheckingGroup(true);
        dossierForm.resetFields();

        try {
            const checkRes = await checkVehicleGroupMembership(report.id);
            setGroupCheckData(checkRes);

            // Mặc định: nếu có tài khoản thì prefill người đó (hoặc người phụ trách nhóm)
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

    // Submit Thao tác 3: Gửi yêu cầu làm hồ sơ sửa chữa
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
                    ? `Yêu cầu đã được gửi đến tài khoản của người phụ trách để tiến hành lập hồ sơ B03.`
                    : `Đã ghi nhận yêu cầu lập hồ sơ sửa chữa cho phương tiện này.`,
            });

            setDossierModalOpen(false);
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

    if (!isTechOrAdmin) return null;

    return (
        <>
            {/* FLOATING ACTION BADGE (Allows opening modal anytime if there are pending reports) */}
            {reports.length > 0 && !modalOpen && (
                <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
                    <Badge count={reports.length} overflowCount={99}>
                        <Button
                            type="primary"
                            danger
                            shape="round"
                            size="large"
                            icon={<WarningOutlined />}
                            style={{ boxShadow: '0 4px 16px rgba(245, 34, 45, 0.4)', fontWeight: 600 }}
                            onClick={() => setModalOpen(true)}
                        >
                            {reports.length} Báo cáo xe chờ xử lý
                        </Button>
                    </Badge>
                </div>
            )}

            {/* MAIN TECH NOTIFICATION MODAL */}
            <Modal
                title={
                    <Space>
                        <WarningOutlined style={{ color: '#f5222d', fontSize: 22 }} />
                        <span>Báo cáo tình trạng xe phát sinh tại sân đỗ ({reports.length})</span>
                    </Space>
                }
                open={modalOpen}
                onCancel={() => {
                    setModalOpen(false);
                    setHasDismissed(true);
                }}
                footer={[
                    <Button
                        key="refresh"
                        onClick={fetchReports}
                        loading={loading}
                    >
                        Làm mới
                    </Button>,
                    <Button
                        key="close"
                        type="primary"
                        onClick={() => {
                            setModalOpen(false);
                            setHasDismissed(true);
                        }}
                    >
                        Đóng thông báo
                    </Button>,
                ]}
                width={840}
                destroyOnClose
            >
                <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: 8 }}>
                    {reports.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#52c41a' }}>
                            <CheckCircleOutlined style={{ fontSize: 48, marginBottom: 12 }} />
                            <Title level={4} style={{ color: '#52c41a' }}>Hiện không có sự cố xe nào chờ xử lý</Title>
                            <Text type="secondary">Tất cả phương tiện đều đang hoạt động bình thường hoặc đã được khắc phục.</Text>
                        </div>
                    ) : (
                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                            {reports.map((report) => (
                                <Card
                                    key={report.id}
                                    size="small"
                                    style={{
                                        borderRadius: 10,
                                        border: report.status === IncidentReportStatus.PENDING ? '1px solid #ffccc7' : '1px solid #ffe58f',
                                        background: report.status === IncidentReportStatus.PENDING ? '#fff1f0' : '#fffbe6',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                                        <div>
                                            <Space align="center">
                                                <CarOutlined style={{ fontSize: 18, color: '#1890ff' }} />
                                                <Text strong style={{ fontSize: 16 }}>{report.device?.name}</Text>
                                                {report.device?.reg_number && (
                                                    <Tag color="blue">{report.device.reg_number}</Tag>
                                                )}
                                                {report.status === IncidentReportStatus.PENDING ? (
                                                    <Tag color="red">Mới báo cáo - Chờ tiếp nhận</Tag>
                                                ) : (
                                                    <Tag color="orange">KTV đang xử lý ({report.technician?.name || 'Kỹ thuật'})</Tag>
                                                )}
                                            </Space>
                                            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                                                📍 Vị trí: <strong>{report.location_issue || 'Tại bãi xe sân bay'}</strong> | 
                                                🕒 Báo lúc: {dayjs(report.created_at).format('DD/MM/YYYY HH:mm')}
                                            </div>
                                        </div>

                                        {/* 3 THAO TÁC CỦA KỸ THUẬT VIÊN */}
                                        <Space wrap>
                                            {/* Thao tác 1: Tiếp nhận */}
                                            {report.status === IncidentReportStatus.PENDING && (
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    icon={<ToolOutlined />}
                                                    onClick={() => handleAccept(report.id)}
                                                >
                                                    Kỹ thuật tiếp nhận
                                                </Button>
                                            )}

                                            {/* Thao tác 2: Đã khắc phục / Xác nhận đã khắc phục nhanh */}
                                            <Button
                                                type="primary"
                                                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                                                size="small"
                                                icon={<CheckCircleOutlined />}
                                                onClick={() => handleOpenResolveQuick(report)}
                                            >
                                                Xác nhận đã khắc phục
                                            </Button>

                                            {/* Thao tác 3: Yêu cầu làm hồ sơ sửa chữa */}
                                            <Button
                                                type="dashed"
                                                danger
                                                size="small"
                                                icon={<FileAddOutlined />}
                                                onClick={() => handleOpenRequestDossier(report)}
                                            >
                                                Yêu cầu làm hồ sơ sửa chữa
                                            </Button>
                                        </Space>
                                    </div>

                                    {/* NỘI DUNG SỰ CỐ */}
                                    <div style={{ marginTop: 10, background: '#ffffff', borderRadius: 8, padding: '10px 14px', border: '1px solid #f0f0f0' }}>
                                        <div style={{ fontSize: 13, color: '#262626' }}>
                                            <strong>Nội dung báo cáo:</strong> {report.description}
                                        </div>

                                        {/* HÌNH ẢNH HIỆN TRƯỜNG */}
                                        {report.images && report.images.length > 0 && (
                                            <div style={{ marginTop: 8 }}>
                                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Ảnh hiện trường ({report.images.length}):</Text>
                                                <Image.PreviewGroup>
                                                    <Space size="small">
                                                        {report.images.map((imgUrl, i) => (
                                                            <Image
                                                                key={i}
                                                                width={60}
                                                                height={60}
                                                                src={`${process.env.REACT_APP_BASE_URL?.replace('/api', '')}${imgUrl}`}
                                                                style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #d9d9d9' }}
                                                            />
                                                        ))}
                                                    </Space>
                                                </Image.PreviewGroup>
                                            </div>
                                        )}

                                        <div style={{ marginTop: 8, fontSize: 12, color: '#888', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                            <span><UserOutlined /> Người báo: <strong>{report.reporter_name}</strong> {report.reporter_code ? `(${report.reporter_code})` : ''}</span>
                                            {report.reporter_department && <span>🏢 Đơn vị: {report.reporter_department}</span>}
                                            {report.reporter_phone && <span><PhoneOutlined /> SĐT: <a href={`tel:${report.reporter_phone}`}>{report.reporter_phone}</a></span>}
                                            {report.is_external_reporter && <Tag color="default">Ngoài danh mục</Tag>}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </Space>
                    )}
                </div>
            </Modal>

            {/* MODAL POPUP: XÁC NHẬN ĐÃ KHẮC PHỤC (CHỌN NGƯỜI VẬN HÀNH NGHIỆM THU) */}
            <Modal
                title={
                    <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                        <span>Nghiệm thu khắc phục nhanh: {selectedReportForResolve?.device?.name}</span>
                    </Space>
                }
                open={resolveModalOpen}
                onCancel={() => setResolveModalOpen(false)}
                onOk={() => resolveForm.submit()}
                confirmLoading={resolving}
                okText="Xác nhận hoàn tất"
                cancelText="Hủy"
                destroyOnClose
                width={560}
            >
                <div style={{ marginBottom: 16, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                    <div>Phương tiện: <strong>{selectedReportForResolve?.device?.name}</strong> {selectedReportForResolve?.device?.reg_number ? `(${selectedReportForResolve.device.reg_number})` : ''}</div>
                    <div style={{ color: '#666', marginTop: 4 }}>Sự cố: {selectedReportForResolve?.description}</div>
                </div>

                <Form
                    form={resolveForm}
                    layout="vertical"
                    onFinish={handleSubmitResolveQuick}
                >
                    <Form.Item
                        name="quick_solution"
                        label="Biện pháp xử lý / Khắc phục (*)"
                        rules={[{ required: true, message: 'Vui lòng nhập biện pháp xử lý đã thực hiện' }]}
                    >
                        <Input.TextArea
                            rows={3}
                            placeholder="Mô tả chi tiết những gì KTV đã xử lý tại chỗ để đưa xe trở lại hoạt động bình thường..."
                        />
                    </Form.Item>

                    <Form.Item
                        name="operator_confirmed_by_id"
                        label="Chọn Người vận hành có mặt kiểm tra (Tài khoản CMMS)"
                        extra="Nếu người vận hành có tài khoản trên hệ thống, chọn để tự động liên kết."
                    >
                        <Select
                            showSearch
                            allowClear
                            placeholder="Tìm kiếm theo tên hoặc mã nhân viên..."
                            optionFilterProp="children"
                            onChange={(userId) => {
                                const op = operatorsList.find(u => u.user_id === userId);
                                if (op) {
                                    resolveForm.setFieldsValue({
                                        operator_confirmed_name: op.name,
                                    });
                                }
                            }}
                        >
                            {operatorsList.map(op => (
                                <Select.Option key={op.user_id} value={op.user_id}>
                                    {op.name} ({op.employee_code || op.user_id}) - {op.department?.name || 'Tổ vận hành'}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="operator_confirmed_name"
                        label="Họ tên Người vận hành xác nhận (*)"
                        rules={[{ required: true, message: 'Vui lòng nhập họ tên người vận hành xác nhận' }]}
                    >
                        <Input placeholder="Họ và tên người vận hành đang có mặt kiểm tra" />
                    </Form.Item>

                    <Form.Item
                        name="operator_notes"
                        label="Ghi chú thêm của Người vận hành (nếu có)"
                    >
                        <Input placeholder="Đã kiểm tra xe hoạt động tốt, đồng ý đưa vào khai thác..." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* MODAL POPUP THAO TÁC 3: YÊU CẦU LÀM HỒ SƠ SỬA CHỮA (KIỂM TRA CHÉO NHÓM XE) */}
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
                width={620}
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
                                        const found = operatorsList.find(u => u.user_id === userId);
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
                                        {operatorsList.map(op => (
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
        </>
    );
};

export default PendingIncidentReportsModal;
