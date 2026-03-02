import React, { useState, useEffect } from 'react';
import { Drawer, Tabs, Table, Button, message, Space, Popconfirm, Descriptions, Avatar, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import { IUser } from '../../../types/user.types';
import certificatesApi from '../../../apis/certificates';
import { IEmployeeCertificate, ITrainingProgram, CertificateType, IUserTrainingRequirement } from '../../../types/certificates.types';
import { getBackendImageUrl } from '../../../utils/imageUrl';
import CertificateModal from './CertificateModal';
import RequirementModal from './RequirementModal';
import { useAuthContext } from '../../../context/AuthContext/AuthContext';
import dayjs from 'dayjs';

interface UserProfileDrawerProps {
    open: boolean;
    user: IUser | null;
    onClose: () => void;
}

const UserProfileDrawer: React.FC<UserProfileDrawerProps> = ({ open, user, onClose }) => {
    const { user: currentUser } = useAuthContext();
    const canEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'HR_MANAGER';

    const [activeTab, setActiveTab] = useState('1');
    const [certificates, setCertificates] = useState<IEmployeeCertificate[]>([]);
    const [requirements, setRequirements] = useState<IUserTrainingRequirement[]>([]);
    const [trainingPrograms, setTrainingPrograms] = useState<ITrainingProgram[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCert, setSelectedCert] = useState<IEmployeeCertificate | null>(null);
    const [modalLoading, setModalLoading] = useState(false);

    const [isReqModalOpen, setIsReqModalOpen] = useState(false);
    const [selectedReq, setSelectedReq] = useState<IUserTrainingRequirement | null>(null);

    useEffect(() => {
        // Fetch training programs only once when drawer is opened
        if (open && trainingPrograms.length === 0) {
            certificatesApi.getTrainingPrograms()
                .then(data => setTrainingPrograms(data))
                .catch(err => console.error("Error fetching programs:", err));
        }
    }, [open]);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                // Map tab to certificate type
                let type: CertificateType | undefined = undefined;
                if (activeTab === '2') type = 'BANG_CAP';
                if (activeTab === '5') type = 'CCCM';
                if (activeTab === '6') type = 'QDCN';
                if (activeTab === '7') type = 'GIAY_PHEP';
                if (activeTab === '8') type = 'NANG_DINH';

                if (activeTab === '3') {
                    const data = await certificatesApi.getTrainingRequirements(user.user_id);
                    setRequirements(data);
                } else if (type) {
                    const data = await certificatesApi.getUserCertificates(user.user_id, type);
                    setCertificates(data);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
                message.error('Lỗi khi tải dữ liệu');
            } finally {
                setLoading(false);
            }
        };

        if (open && user && activeTab !== '1' && activeTab !== '4') {
            fetchData();
        }
    }, [open, user, activeTab]);

    // --- Certificates Logic ---

    const handleAdd = () => {
        setSelectedCert(null);
        setIsModalOpen(true);
    };

    const handleEdit = (cert: IEmployeeCertificate) => {
        setSelectedCert(cert);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await certificatesApi.deleteCertificate(id);
            message.success('Đã xóa chứng chỉ');
            // Refresh list
            setCertificates(prev => prev.filter(c => c.id !== id));
        } catch (error: any) {
            message.error(error.message || 'Lỗi khi xóa chứng chỉ');
        }
    };

    const handleModalOk = async (values: any, file?: File | null) => {
        if (!user) return;
        setModalLoading(true);
        try {
            if (selectedCert) {
                // Update
                const res = await certificatesApi.updateCertificate(selectedCert.id, values, file || undefined);
                setCertificates(prev => prev.map(c => c.id === selectedCert.id ? res : c));
                message.success('Cập nhật chứng chỉ thành công');
            } else {
                // Create
                const res = await certificatesApi.createCertificate(user.user_id, values, file || undefined);
                setCertificates(prev => [...prev, res]);
                message.success('Thêm chứng chỉ thành công');
            }
            setIsModalOpen(false);
        } catch (error: any) {
            message.error(error.message || 'Lỗi lưu thông tin chứng chỉ');
        } finally {
            setModalLoading(false);
        }
    };

    // --- Requirements Logic ---
    const handleAddReq = () => {
        setSelectedReq(null);
        setIsReqModalOpen(true);
    };

    const handleEditReq = (req: IUserTrainingRequirement) => {
        setSelectedReq(req);
        setIsReqModalOpen(true);
    };

    const handleDeleteReq = async (id: number) => {
        try {
            await certificatesApi.deleteTrainingRequirement(id);
            message.success('Đã xóa yêu cầu');
            setRequirements(prev => prev.filter(r => r.id !== id));
        } catch (error: any) {
            message.error(error.message || 'Lỗi khi xóa yêu cầu');
        }
    };

    const handleReqModalOk = async (values: any) => {
        if (!user) return;
        setModalLoading(true);
        try {
            if (selectedReq) {
                const res = await certificatesApi.updateTrainingRequirement(selectedReq.id, values);
                setRequirements(prev => prev.map(r => r.id === selectedReq.id ? res : r));
                message.success('Cập nhật yêu cầu thành công');
            } else {
                const res = await certificatesApi.createTrainingRequirement(user.user_id, values);
                setRequirements(prev => [...prev, res]);
                message.success('Thêm yêu cầu thành công');
            }
            setIsReqModalOpen(false);
        } catch (error: any) {
            message.error(error.message || 'Lỗi lưu thông tin yêu cầu');
        } finally {
            setModalLoading(false);
        }
    };

    const cccmColumns = [
        { title: 'STT', render: (_: any, __: any, index: number) => index + 1, width: 50 },
        { 
            title: 'File', 
            dataIndex: 'file_url', 
            width: 80,
            render: (url: string) => url ? <Button type="text" href={`http://localhost:3000${url}`} target="_blank">Xem</Button> : '-' 
        },
        { title: 'Nhóm chương trình đào tạo', dataIndex: ['program', 'group_name'], width: 150 },
        { title: 'Mã CTĐT', dataIndex: ['program', 'code'], width: 100 },
        { title: 'CCCM', dataIndex: ['program', 'name'], width: 200 },
        { title: 'Ngày bắt đầu', dataIndex: 'start_date', render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
        { title: 'Ngày kết thúc', dataIndex: 'end_date', render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
        { title: 'Số quyết định', dataIndex: 'decision_number' },
        { title: 'Ngày cấp CCCM', dataIndex: 'issue_date', render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
        { title: 'Số CCCM', dataIndex: 'certificate_number' },
        { title: 'Ngày học viên trở về', dataIndex: 'return_date', render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
        { title: 'Số ngày đánh giá', dataIndex: ['program', 'evaluation_days'] },
        { title: 'Ngày phải nộp phiếu', dataIndex: 'evaluation_submit_date', render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
        { title: 'Thời hạn định kỳ', dataIndex: ['program', 'validity_months'], render: (m: number) => m ? `${m} tháng` : '-' },
        { 
            title: 'Ngày phải học định kỳ', 
            dataIndex: 'next_training_date', 
            render: (d: string) => {
                if (!d) return '-';
                const isExpired = dayjs(d).isBefore(dayjs());
                return <span style={{ color: isExpired ? 'red' : 'inherit', fontWeight: isExpired ? 'bold' : 'normal' }}>{dayjs(d).format('DD/MM/YYYY')}</span>;
            }
        },
        {
            title: 'Hành động',
            key: 'action',
            fixed: 'right' as const,
            width: 100,
            render: (_: any, record: IEmployeeCertificate) => (
                <Space>
                    <Button type="text" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => handleEdit(record)} />
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa chứng chỉ này?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const reqColumns = [
        { title: 'STT', render: (_: any, __: any, index: number) => index + 1, width: 50 },
        { title: 'Mã CTĐT', dataIndex: ['program', 'code'], width: 120 },
        { title: 'Chương trình đào tạo / Khóa học', dataIndex: ['program', 'name'] },
        { title: 'Hạn hoàn thành', dataIndex: 'required_date', render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
        { 
            title: 'Trạng thái', 
            dataIndex: 'status',
            render: (s: string) => (
                <Tag color={s === 'FULFILLED' ? 'success' : 'warning'}>
                    {s === 'FULFILLED' ? 'Đã hoàn thành' : 'Đang chờ'}
                </Tag>
            )
        },
        { title: 'Ghi chú', dataIndex: 'note' },
        {
            title: 'Hành động',
            key: 'action',
            fixed: 'right' as const,
            width: 100,
            render: (_: any, record: IUserTrainingRequirement) => (
                <Space>
                    <Button type="text" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => handleEditReq(record)} />
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa yêu cầu này?"
                        onConfirm={() => handleDeleteReq(record.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const columnsToRender = canEdit ? cccmColumns : cccmColumns.filter(c => c.key !== 'action');
    const reqColumnsToRender = canEdit ? reqColumns : reqColumns.filter(c => c.key !== 'action');

    const getTabType = (): CertificateType => {
        if (activeTab === '2') return 'BANG_CAP';
        if (activeTab === '5') return 'CCCM';
        if (activeTab === '6') return 'QDCN';
        if (activeTab === '7') return 'GIAY_PHEP';
        return 'NANG_DINH';
    };

    const renderTable = () => (
        <div>
            {canEdit && (
                <div style={{ marginBottom: 16 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Thêm mới</Button>
                </div>
            )}
            <Table
                dataSource={certificates}
                columns={columnsToRender}
                rowKey="id"
                loading={loading}
                scroll={{ x: 'max-content' }}
                pagination={false}
                bordered
                size="small"
            />
        </div>
    );

    const renderReqTable = () => (
        <div>
            {canEdit && (
                <div style={{ marginBottom: 16 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddReq}>Gán yêu cầu</Button>
                </div>
            )}
            <Table
                dataSource={requirements}
                columns={reqColumnsToRender}
                rowKey="id"
                loading={loading}
                scroll={{ x: 'max-content' }}
                pagination={false}
                bordered
                size="small"
            />
        </div>
    );

    const renderPersonalInfo = () => {
        if (!user) return null;
        
        const groupNames = user.user_device_groups?.map(g => g.device_group?.name).filter(Boolean).join(', ') || 'Chưa vào nhóm';
        const roleLabel = (() => {
            switch (user.role?.toUpperCase()) {
                case 'ADMIN': return 'Quản trị viên';
                case 'HR_MANAGER': return 'Quản lý nhân sự';
                case 'OPERATOR': return 'Vận hành';
                case 'TECHNICIAN': return 'Kỹ thuật';
                case 'TEAM_LEAD': return 'Tổ trưởng';
                case 'UNIT_HEAD': return 'Cán bộ đội';
                case 'DIRECTOR': return 'Ban giám đốc';
                default: return user.role;
            }
        })();

        return (
            <div style={{ padding: '24px 0' }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <Avatar size={100} src={user.avatar ? getBackendImageUrl(user.avatar) : undefined} icon={<UserOutlined />} />
                    <h2 style={{ marginTop: 16 }}>{user.name}</h2>
                    <Tag color="blue">{roleLabel}</Tag>
                </div>
                
                <Descriptions bordered column={2}>
                    <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
                    <Descriptions.Item label="CCCD">{user.citizen_identification_card || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Phòng ban">{user.department?.name || 'Chưa thuộc phòng ban'}</Descriptions.Item>
                    <Descriptions.Item label="Chức vụ">{user.position || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Nhóm thiết bị">{groupNames}</Descriptions.Item>
                    <Descriptions.Item label="Trạng thái">
                        <Tag color={user.status === 'ACTIVE' ? 'success' : 'error'}>
                            {user.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Chữ ký" span={2}>
                        {user.signature_url ? (
                            <img 
                                src={getBackendImageUrl(user.signature_url)} 
                                alt="Signature" 
                                style={{ height: 60, objectFit: 'contain' }} 
                            />
                        ) : 'Chưa có chữ ký'}
                    </Descriptions.Item>
                </Descriptions>
            </div>
        );
    };

    const items = [
        { key: '1', label: 'Thông tin cá nhân', children: renderPersonalInfo() },
        { key: '2', label: 'Quản lý trình độ', children: renderTable() },
        { key: '3', label: 'Yêu cầu đào tạo', children: renderReqTable() },
        { key: '4', label: 'Lịch sử đào tạo', children: <div style={{ padding: 20 }}>Đang cập nhật...</div> },
        { key: '5', label: 'CCCM', children: renderTable() },
        { key: '6', label: 'QĐCN', children: renderTable() },
        { key: '7', label: 'Giấy phép', children: renderTable() },
        { key: '8', label: 'Năng định', children: renderTable() },
    ];

    return (
        <Drawer
            title={`Thông tin học viên ${user?.name || ''} - ${user?.user_id || ''}`}
            width={1200}
            onClose={onClose}
            open={open}
            bodyStyle={{ padding: 0 }}
        >
            <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab} 
                items={items} 
                tabBarStyle={{ padding: '0 24px', backgroundColor: '#f0f2f5', margin: 0 }}
                type="card"
                destroyInactiveTabPane
            />

            <CertificateModal
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={handleModalOk}
                initialValues={selectedCert}
                loading={modalLoading}
                trainingPrograms={trainingPrograms}
                certificateType={getTabType()}
            />

            <RequirementModal
                open={isReqModalOpen}
                onCancel={() => setIsReqModalOpen(false)}
                onOk={handleReqModalOk}
                initialValues={selectedReq}
                loading={modalLoading}
                trainingPrograms={trainingPrograms}
            />
        </Drawer>
    );
};

export default UserProfileDrawer;
