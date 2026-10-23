import React, { useEffect, useState } from 'react';
import {
  Table,
  Card,
  Tag,
  Button,
  Space,
  message,
  Typography,
  Avatar,
  Modal,
  Input,
  Row,
  Col,
  Empty,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  IProfileRequest,
  getAllRequests,
  reviewProfileRequest,
} from '../../../apis/profileRequests';
import { IUser } from '../../../types/user.types';
import { getBackendImageUrl } from '../../../utils/imageUrl';

const { Text } = Typography;
const { TextArea } = Input;

interface ApprovalRequestsTabProps {
  canWrite: boolean;
  onViewUser: (user: IUser) => void;
  isMobile: boolean;
  onPendingCountChange?: (count: number) => void;
}

export const ApprovalRequestsTab: React.FC<ApprovalRequestsTabProps> = ({
  canWrite,
  onViewUser,
  isMobile,
  onPendingCountChange,
}) => {
  const [requests, setRequests] = useState<IProfileRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<IProfileRequest | null>(null);
  const [notes, setNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'PENDING' | 'ALL'>('PENDING');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await getAllRequests();
      const list = Array.isArray(data) ? data : [];
      setRequests(list);
      const pendingCount = list.filter((r) => r.status === 'PENDING').length;
      onPendingCountChange?.(pendingCount);
    } catch (e: any) {
      console.error(e);
      message.error('Lỗi khi tải danh sách yêu cầu phê duyệt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenReview = (req: IProfileRequest) => {
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
      message.success(status === 'APPROVED' ? 'Đã duyệt yêu cầu thành công' : 'Đã từ chối yêu cầu');
      setReviewModalOpen(false);
      fetchRequests();
    } catch (e: any) {
      message.error(e.message || 'Thao tác thất bại');
    } finally {
      setReviewLoading(false);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const filtered = filterStatus === 'PENDING' ? pendingRequests : requests;

  const renderPayloadSummary = (req: IProfileRequest) => {
    const payload = req.data_payload || {};
    if (req.request_type === 'NEW_CERTIFICATE') {
      return (
        <div>
          <div>Loại: <strong>{payload.certificate_type || 'CCCM'}</strong></div>
          <div>Tên CCCM: <strong>{payload.certificate_name}</strong></div>
          {payload.certificate_number && <div>Số: {payload.certificate_number}</div>}
        </div>
      );
    }

    const keys = Object.keys(payload);
    return (
      <div style={{ fontSize: 12 }}>
        {keys.slice(0, 3).map((k) => (
          <div key={k}>
            <span style={{ color: '#888' }}>{k}:</span> <strong>{String(payload[k])}</strong>
          </div>
        ))}
        {keys.length > 3 && <Text type="secondary">+{keys.length - 3} trường thông tin khác...</Text>}
      </div>
    );
  };

  const columns = [
    {
      title: 'Nhân viên đề xuất',
      key: 'user',
      render: (_: any, r: IProfileRequest) => (
        <Space>
          <Avatar size="small" src={r.user?.avatar ? getBackendImageUrl(r.user.avatar) : undefined} icon={<UserOutlined />} />
          <span
            style={{ fontWeight: 600, color: '#1890ff', cursor: 'pointer' }}
            onClick={() => r.user && onViewUser(r.user as any)}
          >
            {r.user?.name}
          </span>
          <Text type="secondary" style={{ fontSize: 11 }}>
            ({r.user?.employee_code || r.user?.user_id})
          </Text>
        </Space>
      ),
    },
    {
      title: 'Loại yêu cầu',
      dataIndex: 'request_type',
      key: 'type',
      width: 170,
      render: (t: string) => {
        if (t === 'NEW_CERTIFICATE') return <Tag color="blue">Cấp mới chứng chỉ</Tag>;
        return <Tag color="purple">Cập nhật hồ sơ cá nhân</Tag>;
      },
    },
    {
      title: 'Nội dung thay đổi',
      key: 'payload',
      render: (_: any, r: IProfileRequest) => renderPayloadSummary(r),
    },
    {
      title: 'Thời gian gửi',
      dataIndex: 'created_at',
      key: 'date',
      width: 130,
      render: (d: string) => (d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: string) => {
        if (s === 'PENDING') return <Tag color="warning">Chờ phê duyệt</Tag>;
        if (s === 'APPROVED') return <Tag color="success">Đã duyệt</Tag>;
        return <Tag color="error">Từ chối</Tag>;
      },
    },
    ...(canWrite
      ? [
          {
            title: 'Hành động',
            key: 'action',
            width: 130,
            align: 'center' as const,
            render: (_: any, r: IProfileRequest) =>
              r.status === 'PENDING' ? (
                <Button type="primary" size="small" onClick={() => handleOpenReview(r)}>
                  Xét duyệt
                </Button>
              ) : (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {r.reviewer?.name ? `Bởi ${r.reviewer.name}` : 'Đã xử lý'}
                </Text>
              ),
          },
        ]
      : []),
  ];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <Space>
          <Button
            type={filterStatus === 'PENDING' ? 'primary' : 'default'}
            onClick={() => setFilterStatus('PENDING')}
          >
            Chờ xét duyệt ({pendingRequests.length})
          </Button>
          <Button
            type={filterStatus === 'ALL' ? 'primary' : 'default'}
            onClick={() => setFilterStatus('ALL')}
          >
            Tất cả yêu cầu ({requests.length})
          </Button>
        </Space>
      </div>

      {/* Responsive View */}
      {isMobile ? (
        <Row gutter={[12, 12]}>
          {filtered.length === 0 ? (
            <Col span={24}>
              <Empty description="Không có yêu cầu nào cần duyệt" />
            </Col>
          ) : (
            filtered.map((r) => (
              <Col xs={24} sm={12} key={r.id}>
                <Card size="small" style={{ borderRadius: 8, border: '1px solid #e8e8e8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{r.user?.name}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>
                        {dayjs(r.created_at).format('DD/MM/YYYY HH:mm')}
                      </div>
                    </div>
                    <Tag color={r.status === 'PENDING' ? 'warning' : r.status === 'APPROVED' ? 'success' : 'error'}>
                      {r.status === 'PENDING' ? 'Chờ duyệt' : r.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                    </Tag>
                  </div>

                  <div style={{ marginTop: 8, background: '#f9f9f9', borderRadius: 6, padding: '8px 10px', fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: '#1890ff', marginBottom: 4 }}>
                      {r.request_type === 'NEW_CERTIFICATE' ? '🎓 Bổ sung chứng chỉ mới' : '👤 Cập nhật thông tin'}
                    </div>
                    {renderPayloadSummary(r)}
                  </div>

                  {canWrite && r.status === 'PENDING' && (
                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <Button type="primary" size="small" onClick={() => handleOpenReview(r)}>
                        Xét duyệt
                      </Button>
                    </div>
                  )}
                </Card>
              </Col>
            ))
          )}
        </Row>
      ) : (
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      )}

      {/* Modal Review */}
      <Modal
        title={`Xét duyệt yêu cầu: ${selectedReq?.user?.name}`}
        open={reviewModalOpen}
        onCancel={() => setReviewModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setReviewModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="reject"
            danger
            icon={<CloseOutlined />}
            loading={reviewLoading}
            onClick={() => submitReview('REJECTED')}
          >
            Từ chối
          </Button>,
          <Button
            key="approve"
            type="primary"
            icon={<CheckOutlined />}
            loading={reviewLoading}
            onClick={() => submitReview('APPROVED')}
          >
            Phê duyệt & Cập nhật
          </Button>,
        ]}
        width={isMobile ? '95vw' : 540}
      >
        {selectedReq && (
          <div style={{ marginTop: 12 }}>
            <div style={{ background: '#f5f5f5', borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
              <div><strong>Nhân viên:</strong> {selectedReq.user?.name} ({selectedReq.user?.employee_code || selectedReq.user?.user_id})</div>
              <div><strong>Đơn vị:</strong> {selectedReq.user?.department?.name || 'N/A'}</div>
              <div><strong>Loại:</strong> {selectedReq.request_type === 'NEW_CERTIFICATE' ? 'Bổ sung chứng chỉ' : 'Cập nhật thông tin'}</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <Text strong>Chi tiết thông tin đề xuất:</Text>
              <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 6, padding: '8px 12px', marginTop: 4, maxHeight: 180, overflowY: 'auto' }}>
                <pre style={{ margin: 0, fontSize: 12, fontFamily: 'monospace' }}>
                  {JSON.stringify(selectedReq.data_payload, null, 2)}
                </pre>
              </div>
            </div>

            <div>
              <Text strong>Ghi chú / Ý kiến phản hồi (Bắt buộc nếu từ chối):</Text>
              <TextArea
                rows={3}
                placeholder="Nhập ý kiến phê duyệt hoặc lý do từ chối..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ marginTop: 6 }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ApprovalRequestsTab;
