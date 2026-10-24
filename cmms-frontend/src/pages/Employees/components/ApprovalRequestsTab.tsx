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
  Descriptions,
  Popover,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  UserOutlined,
  ArrowRightOutlined,
  EyeOutlined,
  DownloadOutlined,
  PaperClipOutlined,
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

// ── Từ điển dịch trường dữ liệu tiếng Việt chuẩn hóa ──
const FIELD_LABEL_MAP: Record<string, string> = {
  name: 'Họ và tên',
  phone_number: 'Số điện thoại',
  email: 'Email',
  employee_code: 'Mã nhân viên',
  position: 'Chức danh / Vị trí',
  citizen_identification_card: 'Số CCCD/CMND',
  cccd: 'Số CCCD/CMND',
  cccd_issue_date: 'Ngày cấp CCCD',
  cccd_issue_place: 'Nơi cấp CCCD',
  date_of_birth: 'Ngày sinh',
  place_of_birth: 'Nơi sinh',
  gender: 'Giới tính',
  ethnicity: 'Dân tộc',
  religion: 'Tôn giáo',
  nationality: 'Quốc tịch',
  permanent_address: 'Địa chỉ thường trú',
  temporary_address: 'Địa chỉ tạm trú',
  current_address: 'Nơi ở hiện nay',
  hometown: 'Quê quán',
  tax_code: 'Mã số thuế',
  social_insurance_number: 'Số sổ BHXH',
  bank_account_number: 'Số tài khoản NH',
  bank_name: 'Ngân hàng',
  marital_status: 'Tình trạng hôn nhân',
  education_level: 'Trình độ học vấn',
  professional_qualification: 'Trình độ chuyên môn',

  // Chứng chỉ / CCCM
  qualification_type: 'Nhóm bằng cấp/CCCM',
  certificate_type: 'Loại chứng chỉ',
  degree_type: 'Loại văn bằng',
  certificate_name: 'Tên bằng cấp / Chứng chỉ',
  certificate_number: 'Số hiệu chứng chỉ',
  license_class: 'Hạng GPLX',
  issuing_place: 'Nơi cấp',
  school_name: 'Cơ sở đào tạo / Trường cấp',
  major: 'Chuyên ngành',
  graduation_year: 'Năm tốt nghiệp',
  grading: 'Xếp loại / Điểm số',
  study_mode: 'Hình thức đào tạo',
  issue_date: 'Ngày cấp',
  expiry_date: 'Ngày hết hạn',
  is_permanent: 'Thời hạn',
  start_date: 'Ngày bắt đầu',
  end_date: 'Ngày kết thúc',
  return_date: 'Ngày hoàn trả',
  decision_number: 'Số quyết định',
  program_id: 'Mã chương trình ĐT',
};

const DATE_FIELDS = [
  'date_of_birth',
  'cccd_issue_date',
  'issue_date',
  'expiry_date',
  'start_date',
  'end_date',
  'return_date',
];

const formatValue = (key: string, val: any): string => {
  if (val === null || val === undefined || val === '') return '(Trống)';
  if (typeof val === 'boolean') {
    if (key === 'is_permanent') return val ? 'Vĩnh viễn' : 'Có thời hạn';
    return val ? 'Có' : 'Không';
  }
  if (DATE_FIELDS.includes(key)) {
    if (dayjs(val).isValid()) {
      return dayjs(val).format('DD/MM/YYYY');
    }
  }
  if (key === 'gender') {
    const g = String(val).trim().toLowerCase();
    if (g === 'male' || g === 'nam') return 'Nam';
    if (g === 'female' || g === 'nu' || g === 'nữ') return 'Nữ';
    return String(val);
  }
  if (key === 'qualification_type') {
    const qualMap: Record<string, string> = {
      BANG_CAP: 'Bằng cấp',
      GIAY_PHEP_LAI_XE: 'Giấy phép lái xe',
      CHUNG_CHI_NGOAI_NGU: 'Chứng chỉ Ngoại ngữ',
      CHUNG_CHI_TIN_HOC: 'Chứng chỉ Tin học',
      CCCM: 'Chứng chỉ chuyên môn',
    };
    return qualMap[val] || String(val);
  }
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  return String(val);
};

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
    setNotes(req.notes || '');
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

  // ── Render nội dung tóm tắt hiển thị trên cột bảng ──
  const renderPayloadSummary = (req: IProfileRequest) => {
    const payload = req.data_payload || {};

    if (req.request_type === 'NEW_CERTIFICATE') {
      const typeLabel =
        formatValue('qualification_type', payload.qualification_type) ||
        payload.certificate_type ||
        'Chứng chỉ mới';

      return (
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Tag color="cyan" style={{ margin: 0, fontSize: 11, fontWeight: 600 }}>
              {typeLabel}
            </Tag>
            {payload.license_class && (
              <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>
                Hạng {payload.license_class}
              </Tag>
            )}
          </div>
          {(payload.certificate_name || payload.degree_type) && (
            <div>
              <span style={{ color: '#64748b' }}>Tên:</span>{' '}
              <strong>{payload.certificate_name || payload.degree_type}</strong>
            </div>
          )}
          {payload.certificate_number && (
            <div>
              <span style={{ color: '#64748b' }}>Số hiệu:</span>{' '}
              <Text code style={{ fontSize: 11 }}>{payload.certificate_number}</Text>
            </div>
          )}
          {(payload.school_name || payload.issuing_place) && (
            <div style={{ color: '#475569' }}>
              <span style={{ color: '#64748b' }}>Nơi cấp:</span> {payload.school_name || payload.issuing_place}
            </div>
          )}
          {payload.issue_date && (
            <div style={{ color: '#475569', fontSize: 11 }}>
              <span style={{ color: '#64748b' }}>Ngày cấp:</span> {dayjs(payload.issue_date).format('DD/MM/YYYY')}
              {payload.is_permanent ? (
                <Tag color="green" style={{ marginLeft: 6, fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>
                  Vĩnh viễn
                </Tag>
              ) : payload.expiry_date ? (
                <span style={{ marginLeft: 6 }}>- Hạn: {dayjs(payload.expiry_date).format('DD/MM/YYYY')}</span>
              ) : null}
            </div>
          )}
          {req.file_url && (
            <div style={{ marginTop: 4 }}>
              <PaperClipOutlined style={{ color: '#1890ff', marginRight: 4 }} />
              <span style={{ color: '#1890ff', fontSize: 11 }}>Có file minh chứng</span>
            </div>
          )}
        </div>
      );
    }

    const oldValues = (payload._old_values as Record<string, any>) || {};
    const keys = Object.keys(payload).filter((k) => k !== '_old_values');

    if (keys.length === 0) {
      return <Text type="secondary" style={{ fontSize: 12 }}>Không có dữ liệu thay đổi</Text>;
    }

    const renderItem = (k: string) => {
      const label = FIELD_LABEL_MAP[k] || k;
      const rawNew = payload[k];
      const rawOld = oldValues[k];
      const newDisplay = formatValue(k, rawNew);
      const oldDisplay = formatValue(k, rawOld);
      const hasOld = rawOld !== undefined && rawOld !== null && rawOld !== '';

      return (
        <div
          key={k}
          style={{
            fontSize: 12,
            lineHeight: 1.6,
            display: 'flex',
            alignItems: 'baseline',
            gap: 4,
            marginBottom: 3,
          }}
        >
          <span style={{ color: '#64748b', fontWeight: 500, flexShrink: 0 }}>{label}:</span>
          {hasOld ? (
            <span>
              <Text delete type="secondary" style={{ color: '#ef4444', fontSize: 11 }}>
                {oldDisplay}
              </Text>
              <ArrowRightOutlined style={{ fontSize: 9, color: '#94a3b8', margin: '0 4px' }} />
              <Text strong style={{ color: '#16a34a', fontSize: 12 }}>
                {newDisplay}
              </Text>
            </span>
          ) : (
            <span>
              <Tag color="cyan" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', marginRight: 4 }}>
                Mới
              </Tag>
              <Text strong style={{ color: '#1e293b', fontSize: 12 }}>
                {newDisplay}
              </Text>
            </span>
          )}
        </div>
      );
    };

    const previewKeys = keys.slice(0, 3);
    const hasMore = keys.length > 3;

    return (
      <div style={{ fontSize: 12 }}>
        {previewKeys.map(renderItem)}
        {hasMore && (
          <Popover
            title={
              <div style={{ fontWeight: 600, fontSize: 13, borderBottom: '1px solid #f0f0f0', paddingBottom: 6 }}>
                Toàn bộ thông tin thay đổi ({keys.length} trường)
              </div>
            }
            content={
              <div style={{ maxWidth: 360, maxHeight: 260, overflowY: 'auto', padding: '4px 0' }}>
                {keys.map(renderItem)}
              </div>
            }
            trigger="hover"
            placement="bottomLeft"
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 4,
                padding: '2px 8px',
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <EyeOutlined style={{ fontSize: 11 }} />
              +{keys.length - 3} trường thông tin khác (Rê chuột để xem)
            </span>
          </Popover>
        )}
      </div>
    );
  };

  // ── Render nội dung chi tiết dạng đối chiếu trong Modal ──
  const renderDetailPayload = (req: IProfileRequest) => {
    const payload = req.data_payload || {};

    if (req.request_type === 'NEW_CERTIFICATE') {
      let urls: string[] = [];
      if (req.file_url) {
        try {
          const parsed = JSON.parse(req.file_url);
          if (Array.isArray(parsed)) urls = parsed;
          else urls = [req.file_url];
        } catch {
          urls = [req.file_url];
        }
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Nhóm bằng cấp/CCCM">
              <Tag color="cyan">
                {formatValue('qualification_type', payload.qualification_type) || payload.certificate_type || 'CCCM'}
              </Tag>
            </Descriptions.Item>
            {payload.license_class && (
              <Descriptions.Item label="Hạng GPLX">
                <Tag color="blue">Hạng {payload.license_class}</Tag>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Tên bằng / Chứng chỉ" span={payload.license_class ? 1 : 2}>
              <strong>{payload.certificate_name || payload.degree_type || '-'}</strong>
            </Descriptions.Item>
            {payload.certificate_number && (
              <Descriptions.Item label="Số hiệu">
                <Text code>{payload.certificate_number}</Text>
              </Descriptions.Item>
            )}
            {payload.major && (
              <Descriptions.Item label="Chuyên ngành">
                {payload.major}
              </Descriptions.Item>
            )}
            {(payload.school_name || payload.issuing_place) && (
              <Descriptions.Item label="Cơ sở đào tạo / Nơi cấp" span={2}>
                {payload.school_name || payload.issuing_place}
              </Descriptions.Item>
            )}
            {payload.graduation_year && (
              <Descriptions.Item label="Năm tốt nghiệp">
                {payload.graduation_year}
              </Descriptions.Item>
            )}
            {payload.grading && (
              <Descriptions.Item label="Xếp loại / Điểm">
                {payload.grading}
              </Descriptions.Item>
            )}
            {payload.study_mode && (
              <Descriptions.Item label="Hình thức đào tạo">
                {payload.study_mode}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Ngày cấp">
              {payload.issue_date ? dayjs(payload.issue_date).format('DD/MM/YYYY') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Thời hạn">
              {payload.is_permanent ? (
                <Tag color="green">Vĩnh viễn</Tag>
              ) : payload.expiry_date ? (
                dayjs(payload.expiry_date).format('DD/MM/YYYY')
              ) : (
                'Không xác định'
              )}
            </Descriptions.Item>
          </Descriptions>

          {urls.length > 0 && (
            <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <PaperClipOutlined style={{ color: '#2563eb' }} /> Tài liệu / Minh chứng đính kèm ({urls.length}):
              </div>
              <Space wrap>
                {urls.map((u, idx) => (
                  <Button
                    key={idx}
                    size="small"
                    type="primary"
                    ghost
                    icon={<DownloadOutlined />}
                    href={getBackendImageUrl(u)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Xem minh chứng {urls.length > 1 ? `#${idx + 1}` : ''}
                  </Button>
                ))}
              </Space>
            </div>
          )}
        </div>
      );
    }

    // UPDATE_INFO:
    const oldValues = (payload._old_values as Record<string, any>) || {};
    const changedKeys = Object.keys(payload).filter((k) => k !== '_old_values');

    if (changedKeys.length === 0) {
      return <Empty description="Không có thông tin thay đổi" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    const comparisonData = changedKeys.map((key) => {
      const rawOld = oldValues[key];
      const rawNew = payload[key];
      const oldDisp = formatValue(key, rawOld);
      const newDisp = formatValue(key, rawNew);
      const hasOld = rawOld !== undefined && rawOld !== null && rawOld !== '';
      return {
        key,
        label: FIELD_LABEL_MAP[key] || key,
        oldVal: hasOld ? oldDisp : null,
        newVal: newDisp,
      };
    });

    const diffColumns = [
      {
        title: 'Trường thông tin',
        dataIndex: 'label',
        key: 'label',
        width: '32%',
        render: (label: string) => <strong>{label}</strong>,
      },
      {
        title: 'Dữ liệu hiện tại',
        dataIndex: 'oldVal',
        key: 'oldVal',
        width: '34%',
        render: (oldVal: string | null) =>
          oldVal ? (
            <span style={{ color: '#64748b', textDecoration: 'line-through' }}>{oldVal}</span>
          ) : (
            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa có / Trống</span>
          ),
      },
      {
        title: 'Dữ liệu đề xuất mới',
        dataIndex: 'newVal',
        key: 'newVal',
        width: '34%',
        render: (newVal: string) => (
          <span
            style={{
              color: '#15803d',
              fontWeight: 600,
              background: '#f0fdf4',
              padding: '2px 8px',
              borderRadius: 4,
              display: 'inline-block',
              border: '1px solid #bbf7d0',
            }}
          >
            {newVal}
          </span>
        ),
      },
    ];

    return (
      <Table
        columns={diffColumns}
        dataSource={comparisonData}
        rowKey="key"
        pagination={false}
        size="small"
        bordered
        style={{ marginTop: 4 }}
      />
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
    {
      title: 'Hành động',
      key: 'action',
      width: 140,
      align: 'center' as const,
      render: (_: any, r: IProfileRequest) =>
        r.status === 'PENDING' && canWrite ? (
          <Button type="primary" size="small" onClick={() => handleOpenReview(r)}>
            Xét duyệt
          </Button>
        ) : (
          <Space direction="vertical" size={2} align="center">
            <Button
              type="link"
              size="small"
              style={{ padding: 0, height: 'auto', fontSize: 12 }}
              onClick={() => handleOpenReview(r)}
            >
              Xem chi tiết
            </Button>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {r.reviewer?.name ? `Bởi ${r.reviewer.name}` : 'Đã xử lý'}
            </Text>
          </Space>
        ),
    },
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

                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    {canWrite && r.status === 'PENDING' ? (
                      <Button type="primary" size="small" onClick={() => handleOpenReview(r)}>
                        Xét duyệt
                      </Button>
                    ) : (
                      <Button type="default" size="small" onClick={() => handleOpenReview(r)}>
                        Xem chi tiết
                      </Button>
                    )}
                  </div>
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
          scroll={{ x: 850 }}
        />
      )}

      {/* Modal Review */}
      <Modal
        title={
          selectedReq?.status === 'PENDING'
            ? `Xét duyệt yêu cầu: ${selectedReq?.user?.name}`
            : `Chi tiết yêu cầu: ${selectedReq?.user?.name}`
        }
        open={reviewModalOpen}
        onCancel={() => setReviewModalOpen(false)}
        footer={
          selectedReq?.status === 'PENDING' && canWrite
            ? [
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
              ]
            : [
                <Button key="close" type="primary" onClick={() => setReviewModalOpen(false)}>
                  Đóng
                </Button>,
              ]
        }
        width={isMobile ? '95vw' : 680}
      >
        {selectedReq && (
          <div style={{ marginTop: 8 }}>
            {/* User Profile Card Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16,
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <Space size={12}>
                <Avatar
                  size={46}
                  src={selectedReq.user?.avatar ? getBackendImageUrl(selectedReq.user.avatar) : undefined}
                  icon={<UserOutlined />}
                  style={{ border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                    {selectedReq.user?.name}
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 400, marginLeft: 8 }}>
                      ({selectedReq.user?.employee_code || selectedReq.user?.user_id})
                    </Text>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    <span>Đơn vị: <strong>{selectedReq.user?.department?.name || 'Chưa phân bổ'}</strong></span>
                    <span style={{ margin: '0 8px' }}>•</span>
                    <span>Gửi lúc: {dayjs(selectedReq.created_at).format('DD/MM/YYYY HH:mm')}</span>
                  </div>
                </div>
              </Space>
              <div>
                {selectedReq.status === 'PENDING' ? (
                  <Tag color="warning" style={{ fontSize: 12, padding: '3px 10px' }}>Chờ phê duyệt</Tag>
                ) : selectedReq.status === 'APPROVED' ? (
                  <Tag color="success" style={{ fontSize: 12, padding: '3px 10px' }}>Đã phê duyệt</Tag>
                ) : (
                  <Tag color="error" style={{ fontSize: 12, padding: '3px 10px' }}>Đã từ chối</Tag>
                )}
              </div>
            </div>

            {/* Changed Content Details */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text strong style={{ fontSize: 14, color: '#1e293b' }}>
                  {selectedReq.request_type === 'NEW_CERTIFICATE'
                    ? 'Thông tin bằng cấp / chứng chỉ đề xuất:'
                    : 'Bảng đối chiếu thông tin thay đổi:'}
                </Text>
                <Tag color={selectedReq.request_type === 'NEW_CERTIFICATE' ? 'blue' : 'purple'}>
                  {selectedReq.request_type === 'NEW_CERTIFICATE' ? 'Cấp mới chứng chỉ' : 'Cập nhật thông tin cá nhân'}
                </Tag>
              </div>

              {renderDetailPayload(selectedReq)}
            </div>

            {/* If Already Reviewed Notes */}
            {selectedReq.status !== 'PENDING' && selectedReq.notes && (
              <div
                style={{
                  marginBottom: 16,
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: selectedReq.status === 'APPROVED' ? '#f6ffed' : '#fff2f0',
                  border: `1px solid ${selectedReq.status === 'APPROVED' ? '#b7eb8f' : '#ffccc7'}`,
                }}
              >
                <Text strong style={{ color: selectedReq.status === 'APPROVED' ? '#389e0d' : '#cf1322' }}>
                  Ý kiến người phê duyệt ({selectedReq.reviewer?.name || 'HR'}):
                </Text>
                <div style={{ marginTop: 4, fontSize: 13, color: '#334155' }}>{selectedReq.notes}</div>
              </div>
            )}

            {/* Approval Notes Input if Pending & CanWrite */}
            {selectedReq.status === 'PENDING' && canWrite && (
              <div style={{ marginTop: 12 }}>
                <Text strong style={{ fontSize: 13 }}>
                  Ý kiến phản hồi / Ghi chú duyệt <span style={{ color: '#ef4444' }}>(Bắt buộc nếu từ chối)</span>:
                </Text>
                <TextArea
                  rows={3}
                  placeholder="Nhập ý kiến phê duyệt hoặc lý do từ chối yêu cầu này..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ marginTop: 6 }}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ApprovalRequestsTab;
