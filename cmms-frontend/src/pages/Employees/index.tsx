import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Table, Typography, Input, Button, Space, Avatar, Tag, Tooltip,
  Upload, message, Dropdown, Badge, Popconfirm, Select
} from 'antd';
import type { MenuProps } from 'antd';
import {
  SearchOutlined, ExportOutlined, EditOutlined, DeleteOutlined,
  UserOutlined, UploadOutlined, MoreOutlined, ApartmentOutlined,
  PlusOutlined, MailOutlined, PhoneOutlined, WarningOutlined,
  FileTextOutlined, TrophyOutlined, SafetyCertificateOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { ICreateUser, IUser } from '../../types/user.types';
import { ILaborContract, getLaborContracts } from '../../apis/laborContracts';
import { getAllUsers, createUser, updateUser, deleteUser } from '../../apis/users';
import { getToken } from '../../utils/auth';
import { getBackendImageUrl } from '../../utils/imageUrl';
import ProfileDrawer from '../Users/components/ProfileModal';
import { exportUsersToExcel, parseExcelFile } from '../../utils/excelHelper';
import ExportModal from './components/ExportModal';
import { useDepartmentsContext } from '../../context/DepartmentsContext/DepartmentsContext';
import { getDeviceGroups, IDeviceGroup } from '../../apis/device-groups';
import UserModal from '../Users/components/UserModal';
import DepartmentModal from '../Users/components/DepartmentModal';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import { useSocket } from '../../hooks/useSocket';
import { useAuthContext } from '../../context/AuthContext/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

// Contract type display map
const CONTRACT_MAP: Record<string, { label: string; color: string; bg: string }> = {
  '1_MONTH': { label: 'Học việc', color: '#d4380d', bg: '#fff2e8' },
  'PROBATION': { label: 'Thử việc', color: '#c41d7f', bg: '#fff0f6' },
  '12_MONTHS': { label: '12 Tháng', color: '#096dd9', bg: '#e6f7ff' },
  '24_MONTHS': { label: '24 Tháng', color: '#08979c', bg: '#e6fffb' },
  '36_MONTHS': { label: '36 Tháng', color: '#1d39c4', bg: '#f0f5ff' },
  'INDEFINITE': { label: 'Vô thời hạn', color: '#389e0d', bg: '#f6ffed' },
};

const getActiveContractsMap = (contractsList: ILaborContract[]): Record<number, ILaborContract> => {
  const activeMap: Record<number, ILaborContract> = {};
  
  // Group contracts by user_id
  const userContracts: Record<number, ILaborContract[]> = {};
  contractsList.forEach(c => {
    if (c.user?.user_id) {
      if (!userContracts[c.user.user_id]) {
        userContracts[c.user.user_id] = [];
      }
      userContracts[c.user.user_id].push(c);
    }
  });

  // Find the best active contract for each user
  Object.keys(userContracts).forEach(userIdStr => {
    const userId = Number(userIdStr);
    const list = userContracts[userId];
    
    // Filter ACTIVE status
    const activeList = list.filter(c => c.status === 'ACTIVE');
    if (activeList.length === 0) return;

    // Sort by start_date descending
    activeList.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    
    // Find contract that covers today
    const today = new Date();
    const coveringToday = activeList.find(c => {
      const start = new Date(c.start_date);
      const end = c.end_date ? new Date(c.end_date) : null;
      return today >= start && (!end || today <= end);
    });

    // Use coveringToday or fallback to the latest active contract
    activeMap[userId] = coveringToday || activeList[0];
  });

  return activeMap;
};

const Employees = () => {
  const [users, setUsers] = useState<IUser[]>([]);
  const [contracts, setContracts] = useState<Record<number, ILaborContract>>({});
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [contractFilter, setContractFilter] = useState<string | null>(null);

  const { departments } = useDepartmentsContext();
  const [deviceGroups, setDeviceGroups] = useState<IDeviceGroup[]>([]);
  const [openUserModal, setOpenUserModal] = useState(false);
  const [userModalSubmitting, setUserModalSubmitting] = useState(false);
  const [openDeptModal, setOpenDeptModal] = useState(false);
  const [openExportModal, setOpenExportModal] = useState(false);
  const [exportScope, setExportScope] = useState<'ALL' | 'SELECTED'>('ALL');

  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [openProfileDrawer, setOpenProfileDrawer] = useState(false);

  const { user: currentAuthUser } = useAuthContext();
  const navigate = useNavigate();
  const canWrite = ['ADMIN', 'HR_MANAGER'].includes(currentAuthUser?.role || '');
  const canDelete = canWrite;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const [uData, cData, groups] = await Promise.all([
        getAllUsers(token), getLaborContracts(), getDeviceGroups()
      ]);
      const activeContractsMap = getActiveContractsMap(cData);
      setUsers(uData);
      setContracts(activeContractsMap);
      setDeviceGroups(groups);
    } catch (error) {
      console.error("Failed to fetch employees", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRefreshOnFocus(fetchData);

  const socketListeners = useMemo(() => ({
    user_updated: () => fetchData(),
  }), [fetchData]);
  useSocket(currentAuthUser?.user_id, socketListeners);

  // --- Handlers ---
  const handleViewDetail = (user: IUser) => {
    setSelectedUser(user);
    setOpenProfileDrawer(true);
  };

  const handleDelete = async (user: IUser) => {
    try {
      const token = getToken();
      await deleteUser(user.user_id, token);
      message.success(`Đã xoá nhân viên "${user.name}"`);
      fetchData();
    } catch (error: any) {
      message.error(error.message || 'Xoá nhân viên thất bại');
    }
  };

  const handleExportExcel = async () => {
    try {
      message.loading({ content: 'Đang xuất...', key: 'export' });
      await exportUsersToExcel(users);
      message.success({ content: 'Xuất Excel thành công!', key: 'export' });
    } catch (err) {
      message.error({ content: 'Lỗi xuất Excel', key: 'export' });
    }
  };

  const handleImportFile = async (file: File) => {
    try {
      setImporting(true);
      message.loading({ content: 'Đang phân tích...', key: 'import' });
      const rows = await parseExcelFile(file, users);
      if (rows.length === 0) { message.warning({ content: 'File không có dữ liệu', key: 'import' }); return false; }
      const token = getToken();
      let newCount = 0, updateCount = 0, errorCount = 0;
      for (const row of rows) {
        try {
          if (row.isExisting && row.existingUserId) {
            const existingUser = users.find(u => u.user_id === row.existingUserId);
            if (!existingUser) continue;
            const payload: ICreateUser = {
              name: row.name || existingUser.name,
              employee_code: row.employee_code || existingUser.employee_code,
              email: existingUser.email, role: existingUser.role,
              position: row.position || existingUser.position,
              gender: row.gender || existingUser.gender,
              ethnicity: row.ethnicity || existingUser.ethnicity,
              date_of_birth: row.date_of_birth || existingUser.date_of_birth,
              place_of_birth: row.place_of_birth || existingUser.place_of_birth,
              phone_number: row.phone_number || existingUser.phone_number,
              citizen_identification_card: row.citizen_identification_card || existingUser.citizen_identification_card || '000000000000',
              cccd_issue_date: row.cccd_issue_date || existingUser.cccd_issue_date,
              permanent_address: row.permanent_address || existingUser.permanent_address,
              temporary_address: row.temporary_address || existingUser.temporary_address,
              hometown: row.hometown || existingUser.hometown,
            };
            await updateUser(row.existingUserId, payload, token);
            updateCount++;
          } else if (!row.isExisting && row.email) {
            const payload: ICreateUser = {
              name: row.name, employee_code: row.employee_code, email: row.email,
              password: 'Vcs@123456', role: 'OPERATOR', status: 'active',
              position: row.position,
              gender: row.gender || undefined,
              ethnicity: row.ethnicity || undefined,
              date_of_birth: row.date_of_birth || undefined,
              place_of_birth: row.place_of_birth || undefined, phone_number: row.phone_number || undefined,
              citizen_identification_card: row.citizen_identification_card || '000000000000',
              cccd_issue_date: row.cccd_issue_date || undefined,
              permanent_address: row.permanent_address || undefined,
              temporary_address: row.temporary_address || undefined,
              hometown: row.hometown || undefined,
            };
            await createUser(payload, token);
            newCount++;
          } else { errorCount++; }
        } catch (err) { errorCount++; }
      }
      message.success({ content: `Mới: ${newCount} | Cập nhật: ${updateCount} | Bỏ qua: ${errorCount}`, key: 'import', duration: 5 });
      const [uData, cData] = await Promise.all([getAllUsers(token), getLaborContracts()]);
      const activeMap = getActiveContractsMap(cData);
      setUsers(uData);
      setContracts(activeMap);
    } catch (err: any) {
      message.error({ content: err.message || 'Lỗi xử lý file', key: 'import' });
    } finally { setImporting(false); }
    return false;
  };

  const handleCreateUser = async (values: ICreateUser) => {
    setUserModalSubmitting(true);
    try {
      const token = getToken();
      await createUser(values, token);
      message.success('Thêm nhân viên thành công!');
      setOpenUserModal(false);
      const [uData, cData] = await Promise.all([getAllUsers(token), getLaborContracts()]);
      const activeMap = getActiveContractsMap(cData);
      setUsers(uData);
      setContracts(activeMap);
    } catch (err: any) {
      message.error(err.message || 'Lỗi tạo nhân viên');
    } finally { setUserModalSubmitting(false); }
  };

  // --- Derived ---
  const filteredUsers = useMemo(() => {
    let result = users;
    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter(u =>
        u.name?.toLowerCase().includes(lower) ||
        u.employee_code?.toLowerCase().includes(lower) ||
        u.email?.toLowerCase().includes(lower)
      );
    }
    // Quick filter từ thanh thống kê
    if (quickFilter === 'HAS_CONTRACT') {
      result = result.filter(u => !!contracts[u.user_id]);
    } else if (quickFilter === 'NO_CONTRACT') {
      result = result.filter(u => !contracts[u.user_id]);
    } else if (quickFilter === 'NO_SIG') {
      result = result.filter(u => !u.signature_url);
    }

    if (contractFilter) {
      if (contractFilter === 'NONE') {
        result = result.filter(u => !contracts[u.user_id]);
      } else if (contractFilter === 'APPRENTICESHIP') {
        result = result.filter(u => {
          const type = contracts[u.user_id]?.contract_type;
          return type === 'APPRENTICESHIP' || type === '1_MONTH';
        });
      } else {
        result = result.filter(u => contracts[u.user_id]?.contract_type === contractFilter);
      }
    }

    return result;
  }, [users, searchText, contracts, quickFilter, contractFilter]);

  // Stats
  const stats = useMemo(() => {
    const withContract = users.filter(u => contracts[u.user_id]).length;
    const noContract = users.length - withContract;
    const noSig = users.filter(u => !u.signature_url).length;
    return { total: users.length, withContract, noContract, noSig };
  }, [users, contracts]);

  // --- Bulk Actions menu (chỉ áp dụng cho dòng đã chọn) ---
  const bulkMenuItems: MenuProps['items'] = [
    { key: 'export_selected', icon: <ExportOutlined />, label: 'Xuất Excel dòng đã chọn', onClick: () => {
      setExportScope('SELECTED');
      setOpenExportModal(true);
    }},
    { key: 'contract', icon: <FileTextOutlined />, label: 'HĐ Lao động', onClick: () => navigate('/hop-dong-lao-dong') },
    { key: 'reward', icon: <TrophyOutlined />, label: 'Khen thưởng / Kỷ luật', onClick: () => navigate('/khen-thuong-ky-luat') },
    ...(canDelete ? [
      { type: 'divider' as const },
      { key: 'delete_selected', icon: <DeleteOutlined />, label: 'Xoá nhân viên đã chọn', danger: true, onClick: () => {
        // Placeholder: cần confirm trước khi xoá hàng loạt
        message.warning(`Chức năng xoá hàng loạt ${selectedRowKeys.length} nhân viên đang phát triển.`);
      }},
    ] : []),
  ];

  // Detect duplicate names
  const nameCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => { counts[u.name] = (counts[u.name] || 0) + 1; });
    return counts;
  }, [users]);

  // --- Columns (redesigned) ---
  const columns = [
    {
      title: 'Nhân viên',
      key: 'employee',
      width: '30%',
      render: (_: any, record: IUser) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar
            src={getBackendImageUrl(record.avatar)}
            icon={!record.avatar && <UserOutlined />}
            size={40}
            style={{ backgroundColor: '#f0f5ff', color: '#597ef7', flexShrink: 0, border: '1px solid #e8e8e8' }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text strong style={{ fontSize: 14 }}>{record.name}</Text>
              {nameCounts[record.name] > 1 && (
                <Tooltip title="Cảnh báo: Phát hiện trùng họ tên trên hệ thống. Vui lòng kiểm tra lại.">
                  <WarningOutlined style={{ color: '#fa8c16', fontSize: 12, cursor: 'help' }} />
                </Tooltip>
              )}
              {!record.signature_url && (
                <Tooltip title="Thiếu chữ ký số">
                  <WarningOutlined style={{ color: '#faad14', fontSize: 11 }} />
                </Tooltip>
              )}
            </div>
            <div style={{ marginTop: 2 }}>
              <Text type="secondary" style={{ fontSize: 11.5 }}>
                <MailOutlined style={{ marginRight: 4 }} />{record.email}
              </Text>
              {record.phone_number && (
                <Text type="secondary" style={{ fontSize: 11.5, marginLeft: 10 }}>
                  <PhoneOutlined style={{ marginRight: 4 }} />{record.phone_number}
                </Text>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Mã số & Chức vụ',
      key: 'code_position',
      width: '14%',
      sorter: (a: IUser, b: IUser) => (a.employee_code || '').localeCompare(b.employee_code || ''),
      render: (_: any, record: IUser) => (
        <div>
          <Text strong style={{ fontSize: 13, color: '#1890ff' }}>{record.employee_code || '---'}</Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>{record.position || '---'}</Text></div>
        </div>
      )
    },
    {
      title: 'Đơn vị',
      key: 'unit',
      width: '16%',
      render: (_: any, record: IUser) => {
        const depts = (record as any).user_departments;
        if (depts && Array.isArray(depts) && depts.length > 0) {
          const primary = depts.find((d: any) => d.is_primary);
          const dept = primary || depts[0];
          return <Text style={{ fontSize: 13 }}>{dept.department?.name || '---'}</Text>;
        }
        const deptName = (record as any).department?.name;
        return <Text style={{ fontSize: 13 }}>{deptName || '---'}</Text>;
      }
    },
    {
      title: 'Hợp đồng',
      key: 'contract',
      width: '12%',
      align: 'center' as const,
      render: (_: any, record: IUser) => {
        const contract = contracts[record.user_id];
        if (!contract) return <Tag style={{ borderRadius: 4, fontSize: 12, border: 'none', backgroundColor: '#fff7e6', color: '#fa8c16', padding: '2px 10px' }}>Chưa có HĐ</Tag>;
        const info = CONTRACT_MAP[contract.contract_type] || { label: contract.contract_type, color: '#8c8c8c', bg: '#f5f5f5' };
        return (
          <Tag style={{ borderRadius: 4, fontSize: 12, fontWeight: 500, border: 'none', backgroundColor: info.bg, color: info.color, padding: '2px 10px' }}>
            {info.label}
          </Tag>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: '10%',
      align: 'center' as const,
      render: (status: string) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: status === 'active' ? '#52c41a' : '#d9d9d9' }} />
          <Text style={{ fontSize: 12.5, color: status === 'active' ? '#52c41a' : '#8c8c8c' }}>
            {status === 'active' ? 'Hoạt động' : 'Ngừng'}
          </Text>
        </div>
      )
    },
    {
      title: '',
      key: 'action',
      width: '8%',
      align: 'right' as const,
      render: (_: any, record: IUser) => (
        <Space size={4} onClick={(e) => e.stopPropagation()}>
          <Tooltip title={canWrite ? "Chỉnh sửa hồ sơ" : "Xem hồ sơ"}>
            <Button type="text" size="small" icon={canWrite ? <EditOutlined /> : <EyeOutlined />}
              style={{ color: '#8c8c8c' }}
              onClick={(e) => { e.stopPropagation(); handleViewDetail(record); }}
            />
          </Tooltip>
          {canDelete && (
            <Popconfirm
              title={`Xoá nhân viên "${record.name}"?`}
              description="Hành động này không thể hoàn tác."
              onConfirm={() => handleDelete(record)}
              onPopupClick={(e) => e.stopPropagation()}
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" size="small" icon={<DeleteOutlined />}
                style={{ color: '#8c8c8c' }}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* ===== HEADER ===== */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Title level={3} style={{ margin: 0, fontWeight: 600, letterSpacing: '-0.02em' }}>
                Quản lý nhân viên
              </Title>
            </div>
            {canWrite && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpenUserModal(true)}
                size="large"
                style={{ borderRadius: 8, fontWeight: 500, height: 42, paddingInline: 20 }}
              >
                Thêm mới
              </Button>
            )}
          </div>

          {/* Quick Filter Stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <Tag.CheckableTag
              checked={quickFilter === null}
              onChange={() => setQuickFilter(null)}
              style={{ fontSize: 13, padding: '2px 10px', borderRadius: 12 }}
            >
              {stats.total} nhân sự
            </Tag.CheckableTag>
            <Tag.CheckableTag
              checked={quickFilter === 'HAS_CONTRACT'}
              onChange={(checked) => setQuickFilter(checked ? 'HAS_CONTRACT' : null)}
              style={{ fontSize: 13, padding: '2px 10px', borderRadius: 12, ...(quickFilter !== 'HAS_CONTRACT' ? { color: '#389e0d', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' } : {}) }}
            >
              ✓ {stats.withContract} có HĐ
            </Tag.CheckableTag>
            {stats.noContract > 0 && (
              <Tag.CheckableTag
                checked={quickFilter === 'NO_CONTRACT'}
                onChange={(checked) => setQuickFilter(checked ? 'NO_CONTRACT' : null)}
                style={{ fontSize: 13, padding: '2px 10px', borderRadius: 12, ...(quickFilter !== 'NO_CONTRACT' ? { color: '#fa8c16', backgroundColor: '#fff7e6', border: '1px solid #ffd591' } : {}) }}
              >
                ⚠ {stats.noContract} chưa có HĐ
              </Tag.CheckableTag>
            )}
            {stats.noSig > 0 && (
              <Tag.CheckableTag
                checked={quickFilter === 'NO_SIG'}
                onChange={(checked) => setQuickFilter(checked ? 'NO_SIG' : null)}
                style={{ fontSize: 13, padding: '2px 10px', borderRadius: 12, ...(quickFilter !== 'NO_SIG' ? { color: '#8c8c8c', backgroundColor: '#fafafa', border: '1px solid #d9d9d9' } : {}) }}
              >
                ✎ {stats.noSig} thiếu chữ ký
              </Tag.CheckableTag>
            )}
          </div>
        </div>

        {/* ===== TOOLBAR ===== */}
        <Card
          variant="borderless"
          styles={{ body: { padding: '10px 16px' } }}
          style={{ marginBottom: 16, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Tìm kiếm */}
            <Input.Search
              placeholder="Tìm theo tên, MSNV, email..."
              allowClear
              onSearch={val => setSearchText(val)}
              onChange={e => setSearchText(e.target.value)}
              style={{ flex: 1, minWidth: 200, maxWidth: 360 }}
              size="middle"
            />

            {/* Bộ lọc Hợp đồng */}
            <Select
              placeholder="Lọc loại hợp đồng"
              allowClear
              value={contractFilter}
              onChange={(val) => setContractFilter(val)}
              style={{ width: 180 }}
            >
              <Select.Option value="NONE">Chưa có HĐ</Select.Option>
              <Select.Option value="APPRENTICESHIP">Học việc</Select.Option>
              <Select.Option value="PROBATION">Thử việc</Select.Option>
              <Select.Option value="12_MONTHS">12 tháng</Select.Option>
              <Select.Option value="36_MONTHS">36 tháng</Select.Option>
              <Select.Option value="INDEFINITE">Vô thời hạn</Select.Option>
            </Select>

            <div style={{ flex: 1 }} />

            {/* === Bulk Actions: chỉ hiện khi có dòng được chọn === */}
            {selectedRowKeys.length > 0 && (
              <>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Đã chọn <Text strong style={{ color: '#1890ff' }}>{selectedRowKeys.length}</Text> nhân viên
                </Text>
                <Dropdown
                  menu={{ items: bulkMenuItems }}
                  trigger={['click']}
                  placement="bottomRight"
                >
                  <Button
                    icon={<MoreOutlined />}
                    style={{ borderRadius: 8, borderColor: '#1890ff', color: '#1890ff' }}
                  >
                    Thao tác
                  </Button>
                </Dropdown>
                <div style={{ width: 1, height: 24, background: '#e8e8e8' }} />
              </>
            )}

            {/* === Global Actions: luôn hiển thị === */}
            {canWrite && (
              <Tooltip title="Import Excel">
                <Button
                  icon={<UploadOutlined />}
                  loading={importing}
                  style={{ borderRadius: 8 }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file'; input.accept = '.xlsx,.xls';
                    input.onchange = (e: any) => { if (e.target.files?.[0]) handleImportFile(e.target.files[0]); };
                    input.click();
                  }}
                />
              </Tooltip>
            )}
            <Tooltip title="Xuất Excel tùy chọn">
              <Button
                icon={<ExportOutlined />}
                style={{ borderRadius: 8 }}
                onClick={() => { setExportScope('ALL'); setOpenExportModal(true); }}
              />
            </Tooltip>
            {canWrite && (
              <Button icon={<ApartmentOutlined />} onClick={() => setOpenDeptModal(true)}
                style={{ borderRadius: 8, borderColor: '#1890ff', color: '#1890ff' }}
              >
                Đơn vị tổ chức
              </Button>
            )}
          </div>
        </Card>

        {/* ===== TABLE ===== */}
        <Card
          variant="borderless"
          styles={{ body: { padding: 0 } }}
          style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <Table
            columns={columns}
            dataSource={filteredUsers}
            rowKey="user_id"
            loading={loading}
            size="middle"
            scroll={{ x: 900 }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
              columnWidth: 48,
            }}
            onRow={(record) => ({
              onClick: () => handleViewDetail(record),
              style: { cursor: 'pointer' },
            })}
            pagination={{
              pageSize: 15,
              showSizeChanger: true,
              pageSizeOptions: ['15', '30', '50'],
              showTotal: (total) => <Text type="secondary" style={{ fontSize: 13 }}>Tổng {total} nhân viên</Text>,
              style: { padding: '0 16px' },
            }}
          />
        </Card>

        {/* ===== MODALS ===== */}
        {selectedUser && (
          <ProfileDrawer
            open={openProfileDrawer}
            user={selectedUser}
            onCancel={() => { setOpenProfileDrawer(false); setSelectedUser(null); }}
            onUpdateSuccess={() => fetchData()}
          />
        )}

        <UserModal
          open={openUserModal}
          onCancel={() => setOpenUserModal(false)}
          onOk={handleCreateUser}
          departments={departments}
          deviceGroups={deviceGroups}
          loading={userModalSubmitting}
        />

        <DepartmentModal
          open={openDeptModal}
          onClose={(changed) => { setOpenDeptModal(false); if (changed) fetchData(); }}
        />

        <ExportModal
          open={openExportModal}
          onCancel={() => setOpenExportModal(false)}
          users={users}
          selectedRowKeys={selectedRowKeys}
          contracts={contracts}
          defaultScope={exportScope}
        />

        {/* Hover effect */}
        <style>{`
          .ant-table-tbody > tr:hover > td { background: #fafafa !important; }
          .ant-table-tbody > tr { transition: background 0.15s ease; }
        `}</style>
      </div>
    </div>
  );
};

export default Employees;
