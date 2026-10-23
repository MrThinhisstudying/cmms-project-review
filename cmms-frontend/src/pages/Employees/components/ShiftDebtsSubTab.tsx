import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table,
  Card,
  Button,
  Tag,
  Space,
  Input,
  Row,
  Col,
  Select,
  Popconfirm,
  message,
  Typography,
  Empty,
  Avatar,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { IUser } from '../../../types/user.types';
import { IShiftDebt } from '../../../types/shiftDebt.types';
import { getShiftDebts, deleteShiftDebt } from '../../../apis/shiftDebts';
import { getBackendImageUrl } from '../../../utils/imageUrl';
import ShiftDebtImportModal from './ShiftDebtImportModal';
import ShiftDebtRecordModal from './ShiftDebtRecordModal';

const { Text } = Typography;

interface ShiftDebtsSubTabProps {
  users: IUser[];
  canWrite: boolean;
  onViewUser: (user: IUser) => void;
  isMobile: boolean;
}

export const ShiftDebtsSubTab: React.FC<ShiftDebtsSubTabProps> = ({
  users,
  canWrite,
  onViewUser,
  isMobile,
}) => {
  const [debts, setDebts] = useState<IShiftDebt[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(dayjs().year());
  const [selectedMonth, setSelectedMonth] = useState<number>(dayjs().month() + 1);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  // Modals
  const [importOpen, setImportOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IShiftDebt | null>(null);

  const fetchDebts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getShiftDebts({
        year: selectedYear,
        month: selectedMonth,
      });
      setDebts(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      console.error(err);
      message.error('Lỗi khi tải dữ liệu nợ/trả ca');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  const handleDelete = async (id: number) => {
    try {
      await deleteShiftDebt(id);
      message.success('Đã xóa bản ghi nợ ca');
      fetchDebts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xóa thất bại';
      message.error(msg);
    }
  };

  const openAdd = () => {
    setEditingItem(null);
    setRecordOpen(true);
  };

  const openEdit = (item: IShiftDebt) => {
    setEditingItem(item);
    setRecordOpen(true);
  };

  // Departments list for filter
  const departments = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      if (u.department?.name) {
        map.set(String(u.department.dept_id || u.department.name), u.department.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [users]);

  // Filtered
  const filtered = useMemo(() => {
    return debts.filter((d) => {
      if (selectedDept) {
        const uDept = d.user?.department?.name || d.department?.name || '';
        const deptObj = departments.find((dp) => dp.id === selectedDept);
        if (deptObj && uDept !== deptObj.name) return false;
      }
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const userName = d.user?.name?.toLowerCase() || '';
        const code = d.user?.employee_code?.toLowerCase() || '';
        const reason = (d.reason || '').toLowerCase();
        return userName.includes(q) || code.includes(q) || reason.includes(q);
      }
      return true;
    });
  }, [debts, selectedDept, searchText, departments]);

  // Statistics
  const summary = useMemo(() => {
    let totalOpening = 0;
    let totalTaken = 0;
    let totalAccrued = 0;
    let totalClosing = 0;
    filtered.forEach((d) => {
      totalOpening += Number(d.opening_debt) || 0;
      totalTaken += Number(d.taken_days) || 0;
      totalAccrued += Number(d.accrued_days) || 0;
      totalClosing += Number(d.closing_debt) || 0;
    });
    return {
      totalEmployees: filtered.length,
      totalOpening,
      totalTaken,
      totalAccrued,
      totalClosing,
    };
  }, [filtered]);

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 55,
      align: 'center' as const,
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: 'Họ Tên',
      key: 'name',
      width: 220,
      render: (_: unknown, r: IShiftDebt) => (
        <Space orientation="horizontal" size={8}>
          <Avatar
            size="small"
            src={getBackendImageUrl(r.user?.avatar)}
            icon={<UserOutlined />}
            style={{ backgroundColor: '#1890ff' }}
          />
          <div>
            <span
              style={{ fontWeight: 600, color: '#1890ff', cursor: 'pointer' }}
              onClick={() => r.user && onViewUser(r.user as any)}
            >
              {r.user?.name}
            </span>
            <div style={{ fontSize: 11, color: '#888' }}>
              MSNV: {r.user?.employee_code || r.user?.user_id}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Phòng ban / Đội',
      key: 'department',
      width: 150,
      render: (_: unknown, r: IShiftDebt) => r.user?.department?.name || r.department?.name || '-',
    },
    {
      title: (
        <div>
          <div>Nợ tồn trước</div>
          <div style={{ fontSize: 11, fontWeight: 'normal', color: '#888' }}>(Số ngày)</div>
        </div>
      ),
      dataIndex: 'opening_debt',
      key: 'opening_debt',
      width: 110,
      align: 'center' as const,
      render: (v: number) => <span>{v} ngày</span>,
    },
    {
      title: (
        <div>
          <div>Nghỉ bù trong tháng</div>
          <div style={{ fontSize: 11, fontWeight: 'normal', color: '#52c41a' }}>(Trả ca)</div>
        </div>
      ),
      dataIndex: 'taken_days',
      key: 'taken_days',
      width: 130,
      align: 'center' as const,
      render: (v: number) => (
        <span style={{ color: v > 0 ? '#389e0d' : '#888', fontWeight: v > 0 ? 600 : 'normal' }}>
          {v > 0 ? `-${v} ngày` : '0'}
        </span>
      ),
    },
    {
      title: (
        <div>
          <div>Nợ ca phát sinh</div>
          <div style={{ fontSize: 11, fontWeight: 'normal', color: '#fa8c16' }}>(Trực tăng cường)</div>
        </div>
      ),
      dataIndex: 'accrued_days',
      key: 'accrued_days',
      width: 130,
      align: 'center' as const,
      render: (v: number) => (
        <span style={{ color: v > 0 ? '#d46b08' : '#888', fontWeight: v > 0 ? 600 : 'normal' }}>
          {v > 0 ? `+${v} ngày` : '0'}
        </span>
      ),
    },
    {
      title: (
        <div>
          <div>Tồn hết tháng</div>
          <div style={{ fontSize: 11, fontWeight: 'normal', color: '#1890ff' }}>=(4)-(5)+(6)</div>
        </div>
      ),
      dataIndex: 'closing_debt',
      key: 'closing_debt',
      width: 120,
      align: 'center' as const,
      render: (v: number) => (
        <Tag color="blue" style={{ fontSize: 13, fontWeight: 700, padding: '2px 8px' }}>
          {v} ngày
        </Tag>
      ),
    },
    {
      title: 'Ghi chú lý do nợ ca trong tháng',
      dataIndex: 'reason',
      key: 'reason',
      render: (val: string) => (
        val ? (
          <Text style={{ fontSize: 12 }}>{val}</Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 11 }}>-</Text>
        )
      ),
    },
    ...(canWrite
      ? [
          {
            title: 'Thao tác',
            key: 'action',
            width: 90,
            align: 'center' as const,
            render: (_: unknown, r: IShiftDebt) => (
              <Space size={4}>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined style={{ color: '#1890ff' }} />}
                  onClick={() => openEdit(r)}
                />
                <Popconfirm
                  title="Xóa bản ghi nợ ca này?"
                  onConfirm={() => handleDelete(r.id)}
                  okText="Xóa"
                  cancelText="Hủy"
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
      {/* Metrics Row */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, borderColor: '#e6f7ff', background: '#fafafa' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#555' }}>Theo dõi</span>}
              value={summary.totalEmployees}
              suffix="người"
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ fontSize: 18, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, borderColor: '#fff7e6', background: '#fafafa' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#555' }}>Tồn nợ trước</span>}
              value={summary.totalOpening}
              suffix="ngày"
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ fontSize: 18, fontWeight: 700, color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, borderColor: '#f6ffed', background: '#fafafa' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#555' }}>Đã nghỉ bù</span>}
              value={summary.totalTaken}
              suffix="ngày"
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ fontSize: 18, fontWeight: 700, color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, borderColor: '#e6f7ff', background: '#f0f5ff' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#003a8c' }}>Tồn hết tháng</span>}
              value={summary.totalClosing}
              suffix="ngày"
              prefix={<ExclamationCircleOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ fontSize: 18, fontWeight: 700, color: '#003a8c' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <Space wrap style={{ flex: 1 }}>
          <Input
            placeholder="Tìm theo tên NV, MSNV, lý do..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: isMobile ? '100%' : 240 }}
            allowClear
          />
          <Select
            value={selectedYear}
            onChange={setSelectedYear}
            style={{ width: 110 }}
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <Select.Option key={y} value={y}>
                Năm {y}
              </Select.Option>
            ))}
          </Select>
          <Select
            value={selectedMonth}
            onChange={setSelectedMonth}
            style={{ width: 115 }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <Select.Option key={m} value={m}>
                Tháng {m}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="Phòng ban / Đội"
            allowClear
            value={selectedDept}
            onChange={setSelectedDept}
            style={{ width: 170 }}
          >
            {departments.map((d) => (
              <Select.Option key={d.id} value={d.id}>
                {d.name}
              </Select.Option>
            ))}
          </Select>
        </Space>

        {canWrite && (
          <Space wrap>
            <Button
              icon={<UploadOutlined />}
              onClick={() => setImportOpen(true)}
            >
              Nhập từ Excel
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openAdd}
            >
              Ghi nhận nợ/trả ca
            </Button>
          </Space>
        )}
      </div>

      {/* Table view */}
      {isMobile ? (
        <Row gutter={[12, 12]}>
          {filtered.length === 0 ? (
            <Col span={24}>
              <Empty description={`Không có dữ liệu nợ ca Tháng ${selectedMonth}/${selectedYear}`} />
            </Col>
          ) : (
            filtered.map((d) => (
              <Col xs={24} sm={12} key={d.id}>
                <Card size="small" style={{ borderRadius: 8, border: '1px solid #e8e8e8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div
                        style={{ fontWeight: 700, fontSize: 14, color: '#1890ff', cursor: 'pointer' }}
                        onClick={() => d.user && onViewUser(d.user as any)}
                      >
                        {d.user?.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#888' }}>
                        MSNV: {d.user?.employee_code || d.user?.user_id} • {d.user?.department?.name || 'Chưa gán'}
                      </div>
                    </div>
                    <Tag color="blue" style={{ fontWeight: 700 }}>
                      Tồn: {d.closing_debt} ngày
                    </Tag>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.6, color: '#555' }}>
                    <div>• Tồn tháng trước: <strong>{d.opening_debt} ngày</strong></div>
                    <div>• Nghỉ bù trong tháng: <strong style={{ color: '#389e0d' }}>{d.taken_days} ngày</strong></div>
                    <div>• Phát sinh nợ ca: <strong style={{ color: '#d46b08' }}>{d.accrued_days} ngày</strong></div>
                    {d.reason && (
                      <div style={{ marginTop: 4, fontStyle: 'italic', color: '#666' }}>
                        Lý do: {d.reason}
                      </div>
                    )}
                  </div>

                  {canWrite && (
                    <div style={{ marginTop: 10, borderTop: '1px solid #f0f0f0', paddingTop: 6, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(d)}>
                        Sửa
                      </Button>
                      <Popconfirm title="Xóa bản ghi nợ ca?" onConfirm={() => handleDelete(d.id)}>
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
          pagination={{ pageSize: 10, showTotal: (t) => `Tổng cộng ${t} nhân sự` }}
          scroll={{ x: 1050 }}
          bordered
        />
      )}

      {/* Modals */}
      <ShiftDebtImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => fetchDebts()}
        users={users}
        year={selectedYear}
        month={selectedMonth}
      />

      <ShiftDebtRecordModal
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        onSuccess={() => fetchDebts()}
        initialValues={editingItem}
        users={users}
        defaultYear={selectedYear}
        defaultMonth={selectedMonth}
      />
    </div>
  );
};

export default ShiftDebtsSubTab;
