import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Space, message, Typography, Avatar, Modal, Input, Row, Col, Tabs } from 'antd';
import { CheckOutlined, CloseOutlined, UserOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { IProfileRequest, getAllRequests, reviewProfileRequest } from '../../apis/profileRequests';
import ProfileModal from '../Users/components/ProfileModal';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ProfileRequests: React.FC = () => {
    const [requests, setRequests] = useState<IProfileRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedReq, setSelectedReq] = useState<IProfileRequest | null>(null);
    const [notes, setNotes] = useState('');
    const [reviewLoading, setReviewLoading] = useState(false);

    const [userModalOpen, setUserModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const fetchRequests = async (background = false) => {
        if (!background) setLoading(true);
        try {
            const data = await getAllRequests();
            setRequests(data);
        } catch (error: any) {
            if (!background) message.error(error.message || 'Lỗi lấy danh sách phê duyệt');
        } finally {
            if (!background) setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(() => {
            fetchRequests(true);
        }, 15000); // Tự động làm mới mỗi 15 giây
        
        return () => clearInterval(interval);
    }, []);

    const handleAction = (req: IProfileRequest) => {
        setSelectedReq(req);
        setNotes('');
        setReviewModalOpen(true);
    };

    const submitReview = async (status: 'APPROVED' | 'REJECTED') => {
        if (!selectedReq) return;
        if (status === 'REJECTED' && !notes.trim()) {
            message.error('Vui lòng nhập lý do từ chối');
            return;
        }

        setReviewLoading(true);
        try {
            await reviewProfileRequest(selectedReq.id, { status, notes });
            message.success(status === 'APPROVED' ? 'Đã duyệt yêu cầu' : 'Đã từ chối yêu cầu');
            setReviewModalOpen(false);
            fetchRequests();
        } catch (error: any) {
            message.error(error.message || 'Lỗi xử lý yêu cầu');
        } finally {
            setReviewLoading(false);
        }
    };

    const renderPayloadData = (req: IProfileRequest) => {
        const payload = req.data_payload;
        if (req.request_type === 'UPDATE_INFO') {
            const keyMap: Record<string, string> = {
                name: 'Họ và tên',
                phone_number: 'Số điện thoại',
                employee_code: 'Mã NV',
                citizen_identification_card: 'CCCD',
                position: 'Chức vụ',
                date_of_birth: 'Ngày sinh',
                place_of_birth: 'Nơi sinh',
                cccd_issue_date: 'Ngày cấp',
                permanent_address: 'Thường trú',
                hometown: 'Quê quán'
            };
            
            return Object.entries(payload).map(([k, v]) => {
                if (v === null || v === undefined || v === '') return null;
                
                let displayValue = String(v);
                if (k === 'date_of_birth' || k === 'cccd_issue_date') {
                    displayValue = dayjs(displayValue).isValid() ? dayjs(displayValue).format('DD/MM/YYYY') : displayValue;
                }
                
                return (
                    <div key={k} style={{ marginBottom: 4 }}>
                        <Text type="secondary">{keyMap[k] || k}: </Text>
                        <Text strong>{displayValue}</Text>
                    </div>
                );
            }).filter(Boolean);
        } else if (req.request_type === 'NEW_CERTIFICATE') {
            const qualMap: Record<string, string> = {
                BANG_CAP: 'Bằng cấp',
                GIAY_PHEP_LAI_XE: 'Giấy phép lái xe',
                CHUNG_CHI_NGOAI_NGU: 'Chứng chỉ Ngoại ngữ',
                CHUNG_CHI_TIN_HOC: 'Chứng chỉ Tin học'
            };
            
            const renderRow = (label: string, value: any) => {
                if (value === null || value === undefined || value === '') return null;
                return (
                    <div style={{ marginBottom: 4 }}>
                        <Text type="secondary">{label}: </Text>
                        <Text strong>{value}</Text>
                    </div>
                );
            };

            return (
                <div>
                    {renderRow('Nhóm', qualMap[payload.qualification_type] || 'Khác')}
                    {payload.program_id && renderRow('Chương trình ĐT (ID)', payload.program_id)}
                    
                    {payload.qualification_type === 'GIAY_PHEP_LAI_XE' ? (
                        <>
                            {renderRow('Hạng GPLX', payload.license_class)}
                            {renderRow('Số GPLX', payload.certificate_number)}
                            {renderRow('Nơi cấp', payload.issuing_place)}
                        </>
                    ) : (
                        <>
                            {renderRow('Loại chứng chỉ/bằng', payload.degree_type)}
                            {renderRow('Chuyên ngành', payload.major)}
                            {renderRow('Số hiệu', payload.certificate_number)}
                            {renderRow('Nơi cấp/Trường', payload.school_name)}
                            {renderRow('Năm tốt nghiệp', payload.graduation_year)}
                            {renderRow('Xếp loại/Điểm số', payload.grading)}
                            {renderRow('Hình thức', payload.study_mode)}
                        </>
                    )}

                    {payload.issue_date && renderRow('Ngày cấp', dayjs(payload.issue_date).format('DD/MM/YYYY'))}
                    
                    {payload.is_permanent ? (
                        renderRow('Hết hạn', 'Vĩnh viễn')
                    ) : (
                        payload.expiry_date && renderRow('Hết hạn', dayjs(payload.expiry_date).format('DD/MM/YYYY'))
                    )}

                    {req.file_url && (
                        <div style={{ marginTop: 8 }}>
                            <Button size="small" type="dashed" href={`http://localhost:3000${req.file_url}`} target="_blank">Xem File Đính Kèm</Button>
                        </div>
                    )}
                </div>
            );
        }
        return JSON.stringify(payload);
    };

    const columns = [
        {
            title: 'Ngày gửi',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 130,
            render: (val: string) => dayjs(val).format('DD/MM/YYYY HH:mm')
        },
        {
            title: 'Người lao động',
            key: 'user',
            render: (_: any, record: IProfileRequest) => (
                <Space>
                    <Avatar src={record.user.avatar} icon={<UserOutlined />} />
                    <Space direction="vertical" size={0}>
                        <Text strong>{record.user.name}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {record.user.employee_code || '-'} • {record.user.department?.name || 'Không có PB'}
                        </Text>
                    </Space>
                </Space>
            )
        },
        {
            title: 'Loại yêu cầu',
            dataIndex: 'request_type',
            key: 'request_type',
            width: 150,
            render: (type: string) => (
                <Tag color={type === 'UPDATE_INFO' ? 'blue' : 'purple'}>
                    {type === 'UPDATE_INFO' ? 'Cập nhật Thông tin' : 'Thêm Chứng chỉ mới'}
                </Tag>
            )
        },
        {
            title: 'Nội dung thay đổi',
            key: 'payload',
            render: (_: any, record: IProfileRequest) => renderPayloadData(record)
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 180,
            align: 'right' as const,
            render: (_: any, record: IProfileRequest) => (
                <Space>
                    <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => { setSelectedUser(record.user); setUserModalOpen(true); }}
                    >
                        Hồ sơ
                    </Button>
                    <Button type="primary" size="small" onClick={() => handleAction(record)}>
                        Xử lý
                    </Button>
                </Space>
            )
        }
    ];
    const columnsHistory = [
        ...columns.slice(0, 4),
        {
            title: 'Trạng thái',
            key: 'status',
            render: (_: any, record: IProfileRequest) => (
                <Space direction="vertical">
                    <Tag color={record.status === 'APPROVED' ? 'green' : 'red'}>
                        {record.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                    </Tag>
                    {record.reviewer && (
                        <Text type="secondary" style={{ fontSize: 12 }}>Bởi: {record.reviewer.name}</Text>
                    )}
                    {record.notes && record.status === 'REJECTED' && (
                        <Text type="danger" style={{ fontSize: 12 }}>Lý do: {record.notes}</Text>
                    )}
                </Space>
            )
        }
    ];

    const pendingRequests = requests.filter(r => r.status === 'PENDING');
    const historyRequests = requests.filter(r => r.status !== 'PENDING');

    const tabItems = [
        {
            key: 'pending',
            label: `Cần xử lý (${pendingRequests.length})`,
            children: (
                <Table
                    columns={columns}
                    dataSource={pendingRequests}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 15 }}
                />
            )
        },
        {
            key: 'history',
            label: `Lịch sử (${historyRequests.length})`,
            children: (
                <Table
                    columns={columnsHistory}
                    dataSource={historyRequests}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 15 }}
                />
            )
        }
    ];

    return (
        <div style={{ padding: 24, minHeight: '100%', background: '#f0f2f5' }}>
            <Card variant="borderless" style={{ marginBottom: 24, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }} styles={{ body: { padding: '16px 24px' } }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Title level={4} style={{ margin: 0 }}>Phê duyệt Hồ sơ nhân sự</Title>
                        <Text type="secondary">Giải quyết các yêu cầu thay đổi thông tin và nộp chứng chỉ từ người lao động</Text>
                    </Col>
                    <Col>
                        <Button loading={loading} onClick={() => fetchRequests(false)}>Tải lại</Button>
                    </Col>
                </Row>
            </Card>

            <Card variant="borderless" style={{ borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }} styles={{ body: { padding: 0 } }}>
                <Tabs items={tabItems} style={{ padding: '0 24px' }} size="large" />
            </Card>

            <Modal
                title="Xử lý yêu cầu"
                open={reviewModalOpen}
                onCancel={() => setReviewModalOpen(false)}
                footer={[
                    <Button key="reject" danger icon={<CloseOutlined />} onClick={() => submitReview('REJECTED')} loading={reviewLoading}>Từ chối</Button>,
                    <Button key="approve" type="primary" icon={<CheckOutlined />} onClick={() => submitReview('APPROVED')} loading={reviewLoading}>Phê duyệt</Button>
                ]}
            >
                {selectedReq && (
                    <div style={{ marginTop: 16 }}>
                        <div style={{ background: '#fafafa', padding: 12, borderRadius: 6, marginBottom: 16 }}>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>Chi tiết thay đổi:</Text>
                            {renderPayloadData(selectedReq)}
                        </div>
                        
                        <div style={{ marginBottom: 8 }}>Ghi chú / Lý do từ chối (bắt buộc nếu từ chối):</div>
                        <TextArea 
                            rows={4} 
                            placeholder="Nhập phản hồi cho người lao động..." 
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                )}
            </Modal>

            {userModalOpen && selectedUser && (
                <ProfileModal
                    open={userModalOpen}
                    user={selectedUser}
                    onCancel={() => setUserModalOpen(false)}
                    onUpdateSuccess={() => {}}
                />
            )}
        </div>
    );
};

export default ProfileRequests;
