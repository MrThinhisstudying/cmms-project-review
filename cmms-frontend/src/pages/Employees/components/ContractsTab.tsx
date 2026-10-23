import React, { useEffect, useState } from 'react';
import {
  Table,
  Card,
  Button,
  Tag,
  Space,
  Select,
  Input,
  Row,
  Col,
  Modal,
  Form,
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
  EditOutlined,
  DeleteOutlined,
  WarningOutlined,
  UserOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import ContractImportModal from './ContractImportModal';
import dayjs from 'dayjs';
import {
  getLaborContracts,
  createLaborContract,
  updateLaborContract,
  deleteLaborContract,
  ILaborContract,
} from '../../../apis/laborContracts';
import { IUser } from '../../../types/user.types';

const { Text } = Typography;

interface ContractsTabProps {
  users: IUser[];
  canWrite: boolean;
  onViewUser: (user: IUser) => void;
  isMobile: boolean;
}

const CONTRACT_TYPE_MAP: Record<string, { label: string; color: string }> = {
  '1_MONTH': { label: 'Học việc 1T', color: 'orange' },
  'APPRENTICESHIP': { label: 'Học việc', color: 'orange' },
  'PROBATION': { label: 'Thử việc', color: 'purple' },
  '12_MONTHS': { label: '12 Tháng', color: 'blue' },
  '24_MONTHS': { label: '24 Tháng', color: 'cyan' },
  '36_MONTHS': { label: '36 Tháng', color: 'geekblue' },
  'INDEFINITE': { label: 'Vô thời hạn', color: 'green' },
};

export const ContractsTab: React.FC<ContractsTabProps> = ({ users, canWrite, onViewUser, isMobile }) => {
  const [contracts, setContracts] = useState<ILaborContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ILaborContract | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const data = await getLaborContracts();
      setContracts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
      message.error('Lỗi khi tải danh sách hợp đồng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const handleCreateOrUpdate = async (values: any) => {
    setModalLoading(true);
    try {
      const payload = {
        ...values,
        start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : undefined,
        end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : undefined,
      };

      if (editingContract) {
        await updateLaborContract(editingContract.id, payload);
        message.success('Cập nhật hợp đồng thành công');
      } else {
        await createLaborContract(payload);
        message.success('Thêm mới hợp đồng thành công');
      }
      setModalOpen(false);
      form.resetFields();
      fetchContracts();
    } catch (e: any) {
      message.error(e.message || 'Lỗi khi lưu hợp đồng');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteLaborContract(id);
      message.success('Đã xóa hợp đồng');
      fetchContracts();
    } catch (e: any) {
      message.error(e.message || 'Xóa hợp đồng thất bại');
    }
  };

  const openAdd = () => {
    setEditingContract(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'ACTIVE',
      start_date: dayjs(),
      contract_type: '12_MONTHS',
    });
    setModalOpen(true);
  };

  const openEdit = (c: ILaborContract) => {
    setEditingContract(c);
    form.resetFields();
    form.setFieldsValue({
      user_id: c.user?.user_id,
      contract_number: c.contract_number,
      contract_type: c.contract_type,
      job_title: c.job_title,
      start_date: c.start_date ? dayjs(c.start_date) : undefined,
      end_date: c.end_date ? dayjs(c.end_date) : undefined,
      status: c.status,
    });
    setModalOpen(true);
  };

  // Filter logic
  const filtered = contracts.filter((c) => {
    if (filterType && c.contract_type !== filterType) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      const userName = c.user?.name?.toLowerCase() || '';
      const num = c.contract_number?.toLowerCase() || '';
      const code = c.user?.employee_code?.toLowerCase() || '';
      return userName.includes(q) || num.includes(q) || code.includes(q);
    }
    return true;
  });

  // Expiring count
  const expiringContracts = contracts.filter((c) => {
    if (c.status !== 'ACTIVE' || !c.end_date) return false;
    const diff = dayjs(c.end_date).diff(dayjs(), 'days');
    return diff >= 0 && diff <= 60;
  });

  const columns = [
    {
      title: 'Số HĐ',
      dataIndex: 'contract_number',
      key: 'num',
      width: 140,
      render: (text: string) => <strong style={{ color: '#003a8c' }}>{text || 'N/A'}</strong>,
    },
    {
      title: 'Nhân viên',
      key: 'user',
      render: (_: any, record: ILaborContract) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <span
            style={{ fontWeight: 600, color: '#1890ff', cursor: 'pointer' }}
            onClick={() => record.user && onViewUser(record.user as any)}
          >
            {record.user?.name}
          </span>
          <Text type="secondary" style={{ fontSize: 11 }}>
            ({record.user?.employee_code || record.user?.user_id})
          </Text>
        </Space>
      ),
    },
    {
      title: 'Loại hợp đồng',
      dataIndex: 'contract_type',
      key: 'type',
      render: (t: string) => {
        const item = CONTRACT_TYPE_MAP[t] || { label: t, color: 'blue' };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: 'Chức danh',
      dataIndex: 'job_title',
      key: 'job',
      render: (t: string) => t || '-',
    },
    {
      title: 'Thời hạn',
      key: 'duration',
      render: (_: any, r: ILaborContract) => {
        const start = r.start_date ? dayjs(r.start_date).format('DD/MM/YYYY') : '';
        const end = r.end_date ? dayjs(r.end_date).format('DD/MM/YYYY') : 'Vô thời hạn';
        const isExpiring = r.end_date && dayjs(r.end_date).diff(dayjs(), 'days') <= 60 && dayjs(r.end_date).diff(dayjs(), 'days') >= 0;
        return (
          <div>
            <span>
              {start} - {end}
            </span>
            {isExpiring && (
              <Tag color="warning" icon={<WarningOutlined />} style={{ marginLeft: 6, fontSize: 10 }}>
                Sắp hết hạn
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: string) => {
        if (s === 'ACTIVE') return <Tag color="success">Còn hiệu lực</Tag>;
        if (s === 'EXPIRED') return <Tag color="error">Hết hạn</Tag>;
        return <Tag color="default">{s}</Tag>;
      },
    },
    ...(canWrite
      ? [
          {
            title: 'Thao tác',
            key: 'action',
            width: 100,
            align: 'center' as const,
            render: (_: any, record: ILaborContract) => (
              <Space size={4}>
                <Button type="text" size="small" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => openEdit(record)} />
                <Popconfirm
                  title="Xóa hợp đồng này?"
                  onConfirm={() => handleDelete(record.id)}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      {/* Expiring Alert Banner */}
      {expiringContracts.length > 0 && (
        <Card
          size="small"
          style={{
            marginBottom: 16,
            background: '#fffbe6',
            borderColor: '#ffe58f',
            borderRadius: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <WarningOutlined style={{ color: '#faad14', fontSize: 18 }} />
            <div>
              <strong style={{ color: '#ad6800' }}>Cảnh báo nhân sự:</strong> Có{' '}
              <strong>{expiringContracts.length}</strong> hợp đồng lao động sắp hết hạn trong 60 ngày tới. Cần xem xét tái ký.
            </div>
          </div>
        </Card>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <Space wrap style={{ flex: 1 }}>
          <Input
            placeholder="Tìm theo tên NV, số HĐ..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: isMobile ? '100%' : 260 }}
            allowClear
          />
          <Select
            placeholder="Loại hợp đồng"
            allowClear
            value={filterType}
            onChange={setFilterType}
            style={{ width: 160 }}
          >
            <Select.Option value="1_MONTH">Học việc 1T</Select.Option>
            <Select.Option value="PROBATION">Thử việc</Select.Option>
            <Select.Option value="12_MONTHS">12 Tháng</Select.Option>
            <Select.Option value="24_MONTHS">24 Tháng</Select.Option>
            <Select.Option value="36_MONTHS">36 Tháng</Select.Option>
            <Select.Option value="INDEFINITE">Vô thời hạn</Select.Option>
          </Select>
        </Space>

        {canWrite && (
          <Space>
            <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>
              Nhập từ Excel
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
              Thêm hợp đồng
            </Button>
          </Space>
        )}
      </div>

      {/* Mobile Card View vs Desktop Table View */}
      {isMobile ? (
        <Row gutter={[12, 12]}>
          {filtered.length === 0 ? (
            <Col span={24}>
              <Empty description="Không có hợp đồng nào" />
            </Col>
          ) : (
            filtered.map((c) => {
              const typeInfo = CONTRACT_TYPE_MAP[c.contract_type] || { label: c.contract_type, color: 'blue' };
              return (
                <Col xs={24} sm={12} key={c.id}>
                  <Card size="small" style={{ borderRadius: 8, border: '1px solid #e8e8e8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{c.user?.name}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>Số HĐ: {c.contract_number}</div>
                      </div>
                      <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
                    </div>

                    <div style={{ marginTop: 8, fontSize: 12, color: '#555', lineHeight: 1.5 }}>
                      <div>Chức danh: <strong>{c.job_title || 'Nhân viên'}</strong></div>
                      <div>
                        Thời hạn:{' '}
                        <strong>
                          {c.start_date ? dayjs(c.start_date).format('DD/MM/YYYY') : ''} -{' '}
                          {c.end_date ? dayjs(c.end_date).format('DD/MM/YYYY') : 'Vô thời hạn'}
                        </strong>
                      </div>
                    </div>

                    {canWrite && (
                      <div style={{ marginTop: 10, borderTop: '1px solid #f0f0f0', paddingTop: 6, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(c)}>
                          Sửa
                        </Button>
                        <Popconfirm title="Xóa hợp đồng?" onConfirm={() => handleDelete(c.id)}>
                          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            Xóa
                          </Button>
                        </Popconfirm>
                      </div>
                    )}
                  </Card>
                </Col>
              );
            })
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

      {/* Modal Add / Edit Contract */}
      <Modal
        title={editingContract ? 'Chỉnh sửa hợp đồng' : 'Thêm mới hợp đồng lao động'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={modalLoading}
        destroyOnClose
        width={isMobile ? '95vw' : 560}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateOrUpdate} style={{ marginTop: 16 }}>
          <Form.Item name="user_id" label="Nhân viên" rules={[{ required: true, message: 'Chọn nhân viên' }]}>
            <Select
              showSearch
              placeholder="Chọn nhân viên"
              optionFilterProp="children"
              disabled={!!editingContract}
            >
              {users.map((u) => (
                <Select.Option key={u.user_id} value={u.user_id}>
                  {u.name} ({u.employee_code || u.user_id}) - {u.department?.name || ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="contract_number"
            label="Số hợp đồng"
            rules={[{ required: true, message: 'Nhập số hợp đồng' }]}
          >
            <Input placeholder="VD: HĐLĐ-2026/001" />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="contract_type"
                label="Loại hợp đồng"
                rules={[{ required: true, message: 'Chọn loại hợp đồng' }]}
              >
                <Select placeholder="Chọn loại HĐ">
                  <Select.Option value="1_MONTH">Học việc 1 Tháng</Select.Option>
                  <Select.Option value="PROBATION">Thử việc</Select.Option>
                  <Select.Option value="12_MONTHS">12 Tháng</Select.Option>
                  <Select.Option value="24_MONTHS">24 Tháng</Select.Option>
                  <Select.Option value="36_MONTHS">36 Tháng</Select.Option>
                  <Select.Option value="INDEFINITE">Không xác định thời hạn</Select.Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="job_title" label="Chức danh công việc">
                <Input placeholder="VD: Kỹ sư thiết bị sân đỗ" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="start_date" label="Ngày bắt đầu" rules={[{ required: true, message: 'Chọn ngày bắt đầu' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="end_date" label="Ngày kết thúc (nếu có)">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="status" label="Trạng thái hợp đồng" initialValue="ACTIVE">
            <Select>
              <Select.Option value="ACTIVE">Còn hiệu lực</Select.Option>
              <Select.Option value="EXPIRED">Hết hạn</Select.Option>
              <Select.Option value="TERMINATED">Chấm dứt trước hạn</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Nhập hợp đồng từ Excel */}
      <ContractImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={fetchContracts}
        users={users}
      />
    </div>
  );
};

export default ContractsTab;
