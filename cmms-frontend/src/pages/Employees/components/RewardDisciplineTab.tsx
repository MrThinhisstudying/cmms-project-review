import React, { useEffect, useState } from 'react';
import {
  Table,
  Card,
  Button,
  Tag,
  Space,
  Input,
  Row,
  Col,
  Modal,
  Form,
  Select,
  DatePicker,
  Popconfirm,
  message,
  Typography,
  Empty,
  Avatar,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  TrophyOutlined,
  WarningOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getRewardDisciplines,
  createRewardDiscipline,
  deleteRewardDiscipline,
  IRewardDiscipline,
} from '../../../apis/rewardDisciplines';
import { IUser } from '../../../types/user.types';
import { BatchRewardDisciplineModal } from './BatchRewardDisciplineModal';

const { Text } = Typography;

interface RewardDisciplineTabProps {
  users: IUser[];
  canWrite: boolean;
  onViewUser: (user: IUser) => void;
  isMobile: boolean;
}

export const RewardDisciplineTab: React.FC<RewardDisciplineTabProps> = ({
  users,
  canWrite,
  onViewUser,
  isMobile,
}) => {
  const [items, setItems] = useState<IRewardDiscipline[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await getRewardDisciplines();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
      message.error('Lỗi khi tải danh sách khen thưởng / kỷ luật');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleCreate = async (values: any) => {
    setModalLoading(true);
    try {
      const payload = {
        ...values,
        effective_date: values.effective_date.format('YYYY-MM-DD'),
      };
      await createRewardDiscipline(payload);
      message.success('Thêm quyết định khen thưởng / kỷ luật thành công');
      setModalOpen(false);
      form.resetFields();
      fetchItems();
    } catch (e: any) {
      message.error(e.message || 'Lỗi khi lưu quyết định');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteRewardDiscipline(id);
      message.success('Đã xóa quyết định');
      fetchItems();
    } catch (e: any) {
      message.error(e.message || 'Xóa thất bại');
    }
  };

  const filtered = items.filter((item) => {
    if (filterType && item.record_type !== filterType) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      const userName = item.user?.name?.toLowerCase() || '';
      const num = item.decision_number?.toLowerCase() || '';
      const content = item.content?.toLowerCase() || '';
      return userName.includes(q) || num.includes(q) || content.includes(q);
    }
    return true;
  });

  const columns = [
    {
      title: 'Số quyết định',
      dataIndex: 'decision_number',
      key: 'num',
      width: 150,
      render: (t: string) => <strong style={{ color: '#003a8c' }}>{t || 'QĐ-NIL'}</strong>,
    },
    {
      title: 'Nhân viên',
      key: 'user',
      render: (_: any, r: IRewardDiscipline) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
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
      title: 'Phân loại',
      dataIndex: 'record_type',
      key: 'type',
      width: 140,
      render: (t: string) => {
        if (t === 'REWARD') {
          return (
            <Tag color="success" icon={<TrophyOutlined />}>
              Khen thưởng
            </Tag>
          );
        }
        return (
          <Tag color="error" icon={<WarningOutlined />}>
            Kỷ luật
          </Tag>
        );
      },
    },
    {
      title: 'Nội dung quyết định',
      dataIndex: 'content',
      key: 'content',
      render: (t: string) => t || '-',
    },
    {
      title: 'Ngày hiệu lực',
      dataIndex: 'effective_date',
      key: 'date',
      width: 130,
      render: (d: string) => (d ? dayjs(d).format('DD/MM/YYYY') : '-'),
    },
    ...(canWrite
      ? [
          {
            title: 'Thao tác',
            key: 'action',
            width: 80,
            align: 'center' as const,
            render: (_: any, r: IRewardDiscipline) => (
              <Popconfirm title="Xóa quyết định này?" onConfirm={() => handleDelete(r.id)}>
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <Space wrap style={{ flex: 1 }}>
          <Input
            placeholder="Tìm theo tên NV, số QĐ, nội dung..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: isMobile ? '100%' : 260 }}
            allowClear
          />
          <Select
            placeholder="Phân loại"
            allowClear
            value={filterType}
            onChange={setFilterType}
            style={{ width: 150 }}
          >
            <Select.Option value="REWARD">🏆 Khen thưởng</Select.Option>
            <Select.Option value="DISCIPLINE">⚠️ Kỷ luật</Select.Option>
          </Select>
        </Space>

        {canWrite && (
          <Space wrap>
            <Button
              type="primary"
              icon={<TeamOutlined />}
              onClick={() => setBatchModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
              }}
            >
              Thêm hàng loạt (Nhiều NV)
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ borderRadius: 8 }}>
              Thêm quyết định
            </Button>
          </Space>
        )}
      </div>

      {/* Responsive View */}
      {isMobile ? (
        <Row gutter={[12, 12]}>
          {filtered.length === 0 ? (
            <Col span={24}>
              <Empty description="Chưa có quyết định nào" />
            </Col>
          ) : (
            filtered.map((r) => (
              <Col xs={24} sm={12} key={r.id}>
                <Card
                  size="small"
                  style={{
                    borderRadius: 8,
                    borderLeft: `4px solid ${r.record_type === 'REWARD' ? '#52c41a' : '#ff4d4f'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{r.user?.name}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>Số QĐ: {r.decision_number}</div>
                    </div>
                    <Tag color={r.record_type === 'REWARD' ? 'success' : 'error'}>
                      {r.record_type === 'REWARD' ? 'Khen thưởng' : 'Kỷ luật'}
                    </Tag>
                  </div>

                  <div style={{ marginTop: 8, fontSize: 12, color: '#333' }}>
                    <div>{r.content}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                      Hiệu lực: <strong>{dayjs(r.effective_date).format('DD/MM/YYYY')}</strong>
                    </div>
                  </div>

                  {canWrite && (
                    <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
                      <Popconfirm title="Xóa quyết định?" onConfirm={() => handleDelete(r.id)}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                          Xóa
                        </Button>
                      </Popconfirm>
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
          scroll={{ x: 750 }}
        />
      )}

      {/* Modal Add Decision */}
      <Modal
        title="Thêm Quyết định Khen thưởng / Kỷ luật"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={modalLoading}
        destroyOnClose
        width={isMobile ? '95vw' : 520}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="user_id" label="Nhân viên" rules={[{ required: true, message: 'Chọn nhân viên' }]}>
            <Select showSearch placeholder="Chọn nhân viên" optionFilterProp="children">
              {users.map((u) => (
                <Select.Option key={u.user_id} value={u.user_id}>
                  {u.name} ({u.employee_code || u.user_id})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="record_type" label="Phân loại" initialValue="REWARD" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="REWARD">🏆 Khen thưởng</Select.Option>
              <Select.Option value="DISCIPLINE">⚠️ Kỷ luật</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="decision_number"
            label="Số quyết định"
            rules={[{ required: true, message: 'Nhập số quyết định' }]}
          >
            <Input placeholder="VD: QĐKT-2026/01" />
          </Form.Item>

          <Form.Item
            name="content"
            label="Nội dung quyết định"
            rules={[{ required: true, message: 'Nhập nội dung' }]}
          >
            <Input.TextArea rows={3} placeholder="Mô tả lý do khen thưởng / kỷ luật..." />
          </Form.Item>

          <Form.Item
            name="effective_date"
            label="Ngày hiệu lực"
            rules={[{ required: true, message: 'Chọn ngày hiệu lực' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Batch Reward Discipline Modal */}
      <BatchRewardDisciplineModal
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        onSuccess={fetchItems}
        users={users}
      />
    </div>
  );
};

export default RewardDisciplineTab;
