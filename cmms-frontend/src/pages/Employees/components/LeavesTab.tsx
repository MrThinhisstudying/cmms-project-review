import React, { useEffect, useState, useCallback } from 'react';
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
  InputNumber,
  message,
  Typography,
  Empty,
  Avatar,
  Radio,
  Tooltip,
  Upload,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getAnnualLeaves,
  recordLeave,
  uploadLeaveAttachments,
  IAnnualLeave,
} from '../../../apis/annualLeaves';
import { IUser } from '../../../types/user.types';
import AnnualLeaveImportModal from './AnnualLeaveImportModal';
import ShiftDebtsSubTab from './ShiftDebtsSubTab';

const { Text } = Typography;

interface LeavesTabProps {
  users: IUser[];
  canWrite: boolean;
  onViewUser: (user: IUser) => void;
  isMobile: boolean;
}

export const LeavesTab: React.FC<LeavesTabProps> = ({
  users,
  canWrite,
  onViewUser,
  isMobile,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'LEAVES' | 'SHIFT_DEBTS'>('LEAVES');
  const [leaves, setLeaves] = useState<IAnnualLeave[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(dayjs().year());
  const [searchText, setSearchText] = useState('');

  // Modal Import Excel State
  const [importLeaveOpen, setImportLeaveOpen] = useState(false);

  // Modal Record Leave
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [form] = Form.useForm();

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAnnualLeaves(selectedYear);
      setLeaves(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
      message.error('Lỗi khi tải dữ liệu phép năm');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const calcTotal = (r: IAnnualLeave) =>
    (r.leave_balance_n2 || 0) + (r.leave_balance_n1 || 0) + (r.current_year_leave || 0);
  const calcTaken = (r: IAnnualLeave) =>
    (r.m1_taken || 0) + (r.m2_taken || 0) + (r.m3_taken || 0) + (r.m4_taken || 0) +
    (r.m5_taken || 0) + (r.m6_taken || 0) + (r.m7_taken || 0) + (r.m8_taken || 0) +
    (r.m9_taken || 0) + (r.m10_taken || 0) + (r.m11_taken || 0) + (r.m12_taken || 0);
  const calcRemain = (r: IAnnualLeave) => calcTotal(r) - calcTaken(r);

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      const diffDays = dates[1].startOf('day').diff(dates[0].startOf('day'), 'day') + 1;
      if (diffDays > 0) {
        form.setFieldsValue({ days: diffDays });
      }
    }
  };

  const uploadProps = {
    onRemove: (file: any) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file: File) => {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/');
      if (!isPdf && !isImage) {
        message.error('Vui lòng chọn file PDF hoặc hình ảnh giấy phép nghỉ!');
        return Upload.LIST_IGNORE;
      }
      if (file.size / 1024 / 1024 > 10) {
        message.error('Dung lượng file tối đa là 10MB!');
        return Upload.LIST_IGNORE;
      }
      const uploadFile = {
        uid: (file as any).uid || Math.random().toString(),
        name: file.name,
        status: 'done',
        originFileObj: file,
        type: file.type,
        size: file.size,
      };
      setFileList([uploadFile]);
      return false;
    },
    fileList,
    maxCount: 1,
  };

  const handleRecordLeave = async (values: any) => {
    setModalLoading(true);
    try {
      const startDate = values.date_range[0];
      const endDate = values.date_range[1];

      let attachments: string[] = [];
      if (fileList.length > 0) {
        const uploadFiles = fileList.map((f) => (f.originFileObj || f) as File);
        attachments = await uploadLeaveAttachments(uploadFiles);
      }

      const payload = {
        user_id: values.user_id,
        year: selectedYear,
        applied_month: startDate.month() + 1,
        from_date: startDate.format('YYYY-MM-DD'),
        to_date: endDate.format('YYYY-MM-DD'),
        days_taken: Number(values.days),
        leave_type: values.leave_type || 'ANNUAL',
        reason: values.reason,
        attachments,
      };

      await recordLeave(payload);
      message.success('Ghi nhận đơn nghỉ phép thành công');
      setModalOpen(false);
      form.resetFields();
      setFileList([]);
      fetchLeaves();
    } catch (e: any) {
      message.error(e.message || 'Lỗi khi ghi nhận nghỉ phép');
    } finally {
      setModalLoading(false);
    }
  };

  const filtered = leaves.filter((item) => {
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      const userName = item.user?.name?.toLowerCase() || '';
      const code = item.user?.employee_code?.toLowerCase() || '';
      return userName.includes(q) || code.includes(q);
    }
    return true;
  });

  const columns = [
    {
      title: 'Nhân viên',
      key: 'user',
      render: (_: any, r: IAnnualLeave) => (
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
      title: 'Phòng ban',
      key: 'dept',
      render: (_: any, r: IAnnualLeave) => r.user?.department?.name || '-',
    },
    {
      title: (
        <div>
          <div>Tồn {selectedYear - 2}</div>
          <div style={{ fontSize: 10, color: '#888', fontWeight: 'normal' }}>(N-2)</div>
        </div>
      ),
      key: 'n2',
      width: 85,
      align: 'center' as const,
      render: (_: any, r: IAnnualLeave) => <span>+{r.leave_balance_n2 || 0}</span>,
    },
    {
      title: (
        <div>
          <div>Phép {selectedYear - 1}</div>
          <div style={{ fontSize: 10, color: '#888', fontWeight: 'normal' }}>(N-1)</div>
        </div>
      ),
      key: 'n1',
      width: 85,
      align: 'center' as const,
      render: (_: any, r: IAnnualLeave) => <span>+{r.leave_balance_n1 || 0}</span>,
    },
    {
      title: (
        <div>
          <div>Phép {selectedYear}</div>
          <div style={{ fontSize: 10, color: '#003a8c', fontWeight: 'normal' }}>(Năm nay)</div>
        </div>
      ),
      key: 'std',
      width: 95,
      align: 'center' as const,
      render: (_: any, r: IAnnualLeave) => `${r.current_year_leave || 12} ngày`,
    },
    {
      title: 'Tổng quỹ',
      key: 'total',
      width: 95,
      align: 'center' as const,
      render: (_: any, r: IAnnualLeave) => (
        <Tag color="blue">{calcTotal(r)} ngày</Tag>
      ),
    },
    {
      title: 'Đã nghỉ',
      key: 'used',
      width: 95,
      align: 'center' as const,
      render: (_: any, r: IAnnualLeave) => {
        const taken = calcTaken(r);
        return <Tag color={taken > 0 ? 'orange' : 'default'}>{taken} ngày</Tag>;
      },
    },
    {
      title: 'Quỹ nghỉ bù',
      key: 'compensatory',
      width: 105,
      align: 'center' as const,
      render: (_: any, r: IAnnualLeave) => {
        const compQuota = Number(r.compensatory_leave_quota) || 0;
        const compTaken = Number(r.compensatory_leave_taken) || 0;
        const compRemain = compQuota - compTaken;
        if (compQuota === 0 && compTaken === 0) return <span style={{ color: '#bfbfbf' }}>-</span>;
        return (
          <Tooltip title={`Cấp tích luỹ: ${compQuota} ngày | Đã nghỉ bù: ${compTaken} ngày`}>
            <Tag color={compRemain < 0 ? 'error' : compRemain > 0 ? 'purple' : 'default'}>
              Tồn: {compRemain}d
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Còn tồn phép',
      key: 'rem',
      width: 105,
      align: 'center' as const,
      render: (_: any, r: IAnnualLeave) => {
        const remain = calcRemain(r);
        return (
          <Tag color={remain <= 2 ? 'error' : 'success'} style={{ fontWeight: 700 }}>
            {remain} ngày
          </Tag>
        );
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 105,
      align: 'center' as const,
      render: (_: any, r: IAnnualLeave) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<PlusOutlined />}
          onClick={() => {
            if (r.user?.user_id) {
              form.setFieldsValue({
                user_id: r.user.user_id,
                leave_type: 'ANNUAL',
                days: 1,
                date_range: [dayjs(), dayjs()],
                reason: '',
              });
              setFileList([]);
              setModalOpen(true);
            }
          }}
        >
          Ghi nhận
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Sub-Tabs Switcher */}
      <div style={{ marginBottom: 16 }}>
        <Radio.Group
          value={activeSubTab}
          onChange={(e) => setActiveSubTab(e.target.value)}
          buttonStyle="solid"
          size="middle"
        >
          <Radio.Button value="LEAVES">
            🌴 Quản lý Phép năm
          </Radio.Button>
          <Radio.Button value="SHIFT_DEBTS">
            ⏱️ Theo dõi Nợ / Trả ca
          </Radio.Button>
        </Radio.Group>
      </div>

      {activeSubTab === 'SHIFT_DEBTS' ? (
        <ShiftDebtsSubTab
          users={users}
          canWrite={canWrite}
          onViewUser={onViewUser}
          isMobile={isMobile}
        />
      ) : (
        <>
          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <Space wrap style={{ flex: 1 }}>
              <Input
                placeholder="Tìm theo tên NV, MSNV..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: isMobile ? '100%' : 260 }}
                allowClear
              />
              <Select
                value={selectedYear}
                onChange={setSelectedYear}
                style={{ width: 120 }}
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <Select.Option key={y} value={y}>
                    Năm {y}
                  </Select.Option>
                ))}
              </Select>
            </Space>

            {canWrite && (
              <Space wrap>
                <Button
                  icon={<UploadOutlined />}
                  onClick={() => setImportLeaveOpen(true)}
                >
                  Nhập từ Excel
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
                  Ghi nhận nghỉ phép
                </Button>
              </Space>
            )}
          </div>

      {/* Responsive View */}
      {isMobile ? (
        <Row gutter={[12, 12]}>
          {filtered.length === 0 ? (
            <Col span={24}>
              <Empty description="Không có dữ liệu phép năm" />
            </Col>
          ) : (
            filtered.map((item) => {
              const remain = calcRemain(item);
              const taken = calcTaken(item);
              return (
                <Col xs={24} sm={12} key={item.id}>
                  <Card size="small" style={{ borderRadius: 8, border: '1px solid #e8e8e8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{item.user?.name}</div>
                      <Tag color={remain <= 2 ? 'error' : 'success'} style={{ fontWeight: 700 }}>
                        Còn: {remain} ngày
                      </Tag>
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {item.user?.department?.name || 'Phòng ban'}
                    </div>

                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', background: '#f5f5f5', borderRadius: 6, padding: '6px 12px', fontSize: 11 }}>
                      <div>Tiêu chuẩn: <strong>{item.current_year_leave || 12}</strong></div>
                      <div>Tồn cũ: <strong>{(item.leave_balance_n1 || 0) + (item.leave_balance_n2 || 0)}</strong></div>
                      <div>Đã nghỉ: <strong style={{ color: '#fa8c16' }}>{taken}</strong></div>
                    </div>

                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        type="primary"
                        ghost
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          if (item.user?.user_id) {
                            form.setFieldsValue({
                              user_id: item.user.user_id,
                              leave_type: 'ANNUAL',
                              days: 1,
                              date_range: [dayjs(), dayjs()],
                              reason: '',
                            });
                            setFileList([]);
                            setModalOpen(true);
                          }
                        }}
                      >
                        Ghi nhận
                      </Button>
                    </div>
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
          scroll={{ x: 750 }}
        />
      )}

      {/* Modal Record Leave */}
      <Modal
        title="Ghi nhận Nghỉ phép nhân viên"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setFileList([]);
        }}
        onOk={() => form.submit()}
        confirmLoading={modalLoading}
        destroyOnClose
        width={isMobile ? '95vw' : 540}
      >
        <Form form={form} layout="vertical" onFinish={handleRecordLeave} style={{ marginTop: 16 }}>
          <Form.Item name="user_id" label="Nhân viên" rules={[{ required: true, message: 'Chọn nhân viên' }]}>
            <Select showSearch placeholder="Chọn nhân viên" optionFilterProp="children">
              {users.map((u) => (
                <Select.Option key={u.user_id} value={u.user_id}>
                  {u.name} ({u.employee_code || u.user_id})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="leave_type" label="Loại hình nghỉ" initialValue="ANNUAL" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="ANNUAL">🏖️ Nghỉ phép năm (Trừ quỹ phép)</Select.Option>
                  <Select.Option value="COMPENSATORY">⏰ Nghỉ bù ca/lễ (Trừ quỹ bù)</Select.Option>
                  <Select.Option value="SPECIAL_PAID">💍 Việc riêng có lương (Cưới hỏi, tang...)</Select.Option>
                  <Select.Option value="SICK_LEAVE">🏥 Nghỉ ốm / Thai sản / BHXH</Select.Option>
                  <Select.Option value="UNPAID">🚫 Nghỉ việc riêng không lương</Select.Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="days" label="Số ngày nghỉ" rules={[{ required: true, message: 'Nhập số ngày' }]}>
                <InputNumber min={0.5} max={30} step={0.5} style={{ width: '100%' }} placeholder="VD: 1, 0.5..." />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="date_range" label="Thời gian nghỉ (Từ ngày - Đến ngày)" rules={[{ required: true, message: 'Chọn khoảng ngày' }]}>
            <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" onChange={handleDateRangeChange} />
          </Form.Item>

          <Form.Item name="reason" label="Lý do nghỉ phép">
            <Input.TextArea rows={3} placeholder="Ghi chú thêm lý do..." />
          </Form.Item>

          <Form.Item label="Đính kèm file PDF nghỉ phép (Giấy nghỉ phép / Đơn xin nghỉ)">
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>Tải lên file PDF giấy phép</Button>
            </Upload>
            <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
              Hỗ trợ file PDF hoặc ảnh giấy phép nghỉ đã duyệt (tối đa 10MB)
            </Text>
          </Form.Item>
        </Form>
      </Modal>

          {/* Modal Import Excel Phép năm */}
          <AnnualLeaveImportModal
            open={importLeaveOpen}
            onClose={() => setImportLeaveOpen(false)}
            onSuccess={() => fetchLeaves()}
            users={users}
            year={selectedYear}
          />
        </>
      )}
    </div>
  );
};

export default LeavesTab;
