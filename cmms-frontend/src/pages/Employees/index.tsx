import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Card,
  Typography,
  Input,
  Button,
  Space,
  Tag,
  message,
  Dropdown,
  Select,
  Grid,
  Row,
  Col,
  Tabs,
  Badge,
  Segmented,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  SearchOutlined,
  ExportOutlined,
  UploadOutlined,
  DownloadOutlined,
  DownOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  ClearOutlined,
  CheckSquareOutlined,
  PlusOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  BarsOutlined,
  TeamOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
  TrophyOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { ICreateUser, IUser } from '../../types/user.types';
import { ILaborContract, getLaborContracts } from '../../apis/laborContracts';
import { getAllUsers, createUser, updateUser, deleteUser, syncUserDepartments } from '../../apis/users';
import { getToken } from '../../utils/auth';
import ProfileDrawer from '../Users/components/ProfileModal';
import { exportUsersToExcel, exportUserTemplate } from '../../utils/excelHelper';
import ExportModal from './components/ExportModal';
import UserImportModal from '../Users/components/UserImportModal';
import { useDepartmentsContext } from '../../context/DepartmentsContext/DepartmentsContext';
import { getDeviceGroups, IDeviceGroup } from '../../apis/device-groups';
import UserModal from '../Users/components/UserModal';
import DepartmentModal from '../Users/components/DepartmentModal';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import { useSocket } from '../../hooks/useSocket';
import { useAuthContext } from '../../context/AuthContext/AuthContext';
import { getPendingRequests } from '../../apis/profileRequests';

// Subcomponents
import EmployeeCard from './components/EmployeeCard';
import EmployeeTable from './components/EmployeeTable';
import ContractsTab from './components/ContractsTab';
import CertificatesTab from './components/CertificatesTab';
import LeavesTab from './components/LeavesTab';
import RewardDisciplineTab from './components/RewardDisciplineTab';
import ApprovalRequestsTab from './components/ApprovalRequestsTab';

const { Title, Text } = Typography;

const getActiveContractsMap = (contractsList: ILaborContract[]): Record<number, ILaborContract> => {
  const activeMap: Record<number, ILaborContract> = {};
  const userContracts: Record<number, ILaborContract[]> = {};

  contractsList.forEach((c) => {
    if (c.user?.user_id) {
      if (!userContracts[c.user.user_id]) {
        userContracts[c.user.user_id] = [];
      }
      userContracts[c.user.user_id].push(c);
    }
  });

  Object.keys(userContracts).forEach((userIdStr) => {
    const userId = Number(userIdStr);
    const list = userContracts[userId];
    const activeList = list.filter((c) => c.status === 'ACTIVE');
    if (activeList.length === 0) return;

    activeList.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    const today = new Date();
    const coveringToday = activeList.find((c) => {
      const start = new Date(c.start_date);
      const end = c.end_date ? new Date(c.end_date) : null;
      return today >= start && (!end || today <= end);
    });

    activeMap[userId] = coveringToday || activeList[0];
  });

  return activeMap;
};

const VALID_TABS = ['employees', 'contracts', 'certificates', 'leaves', 'rewards', 'approvals'];

const Employees: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md; // Mobile if < 768px
  const [searchParams, setSearchParams] = useSearchParams();

  const [users, setUsers] = useState<IUser[]>([]);
  const [contracts, setContracts] = useState<Record<number, ILaborContract>>({});
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [quickFilter, setQuickFilter] = useState<string | null>(() => {
    const qf = searchParams.get('filter');
    return qf ? qf : null;
  });
  const [departmentFilter, setDepartmentFilter] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [contractFilter, setContractFilter] = useState<string | null>(null);
  const [partyFilter, setPartyFilter] = useState<'PARTY_MEMBER' | 'NON_PARTY' | null>(null);

  // View Mode: Cards or Table (Auto-switch to CARDS on mobile)
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS'>(isMobile ? 'CARDS' : 'TABLE');

  useEffect(() => {
    setViewMode(isMobile ? 'CARDS' : 'TABLE');
  }, [isMobile]);

  // Active Tab synced with URL query ?tab=...
  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get('tab');
    return t && VALID_TABS.includes(t) ? t : 'employees';
  });
  const [pendingCount, setPendingCount] = useState(0);

  const { departments } = useDepartmentsContext();
  const [deviceGroups, setDeviceGroups] = useState<IDeviceGroup[]>([]);
  const [openUserModal, setOpenUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<IUser | null>(null);
  const [userModalSubmitting, setUserModalSubmitting] = useState(false);
  const [openDeptModal, setOpenDeptModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [openExportModal, setOpenExportModal] = useState(false);
  const [exportScope, setExportScope] = useState<'ALL' | 'FILTERED' | 'SELECTED'>('ALL');

  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [openProfileDrawer, setOpenProfileDrawer] = useState(false);

  const { user: currentAuthUser } = useAuthContext();
  const canWrite = ['ADMIN', 'HR_MANAGER'].includes(currentAuthUser?.role || '');
  const canDelete = canWrite;

  // Sync URL query params when user navigates from HRDashboard
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && VALID_TABS.includes(t) && t !== activeTab) {
      setActiveTab(t);
    }
    const qf = searchParams.get('filter');
    if (qf) {
      setQuickFilter(qf);
      if (qf === 'PARTY_MEMBER') {
        setPartyFilter('PARTY_MEMBER');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = (nextTab: string) => {
    setActiveTab(nextTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', nextTab);
      return next;
    }, { replace: true });
  };

  // Auto-switch viewMode on mobile / tablet
  useEffect(() => {
    if (isMobile) {
      setViewMode('CARDS');
    }
  }, [isMobile]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const [uData, cData, groups, pending] = await Promise.all([
        getAllUsers(token),
        getLaborContracts().catch(() => []),
        getDeviceGroups().catch(() => []),
        getPendingRequests().catch(() => []),
      ]);
      const activeContractsMap = getActiveContractsMap(cData);
      setUsers(Array.isArray(uData) ? uData : []);
      setContracts(activeContractsMap);
      setDeviceGroups(Array.isArray(groups) ? groups : []);
      setPendingCount(Array.isArray(pending) ? pending.length : 0);
    } catch (error) {
      console.error('Failed to fetch employees', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRefreshOnFocus(fetchData);

  const socketListeners = useMemo(
    () => ({
      user_updated: () => fetchData(),
    }),
    [fetchData]
  );
  useSocket(currentAuthUser?.user_id, socketListeners);

  // Handlers
  const handleViewDetail = (user: IUser) => {
    setSelectedUser(user);
    setOpenProfileDrawer(true);
  };

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setOpenUserModal(true);
  };

  const handleEdit = (user: IUser) => {
    setEditingUser(user);
    setOpenUserModal(true);
  };

  const handleResetFilters = () => {
    setSearchText('');
    setDepartmentFilter(null);
    setRoleFilter(null);
    setContractFilter(null);
    setPartyFilter(null);
    setQuickFilter(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('filter');
      return next;
    }, { replace: true });
  };

  const hasAnyFilter = Boolean(
    searchText.trim() ||
      departmentFilter ||
      roleFilter ||
      contractFilter ||
      partyFilter ||
      quickFilter
  );

  const handleDelete = async (user: IUser) => {
    try {
      const token = getToken();
      await deleteUser(user.user_id, token);
      message.success(`Đã xoá nhân viên "${user.name}"`);
      fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Xoá nhân viên thất bại';
      message.error(errorMessage);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      message.loading({ content: 'Đang chuẩn bị file mẫu...', key: 'template' });
      await exportUserTemplate(departments);
      message.success({ content: 'Đã tải xuống file mẫu nhập nhân sự!', key: 'template' });
    } catch {
      message.error({ content: 'Lỗi tải file mẫu Excel', key: 'template' });
    }
  };

  const handleQuickExportExcel = async (targetList: IUser[]) => {
    try {
      message.loading({ content: 'Đang xuất Excel...', key: 'export' });
      await exportUsersToExcel(targetList);
      message.success({
        content: `Xuất nhanh thành công (${targetList.length} nhân sự)!`,
        key: 'export',
      });
    } catch {
      message.error({ content: 'Lỗi xuất Excel', key: 'export' });
    }
  };

  const handleOpenCustomExport = () => {
    if (selectedRowKeys.length > 0) {
      setExportScope('SELECTED');
    } else {
      setExportScope('ALL');
    }
    setOpenExportModal(true);
  };

  const handleSaveUser = async (
    values: ICreateUser & {
      dept_assignments?: Array<{ dept_id: number; role_in_dept: string; is_primary: boolean }>;
    }
  ) => {
    setUserModalSubmitting(true);
    try {
      const token = getToken();
      const { dept_assignments, ...userValues } = values;
      let savedUserId: number | undefined;

      if (editingUser) {
        await updateUser(editingUser.user_id, userValues, token);
        savedUserId = editingUser.user_id;
        message.success(`Đã cập nhật thông tin nhân viên "${editingUser.name}"!`);
      } else {
        const res = await createUser(userValues, token);
        savedUserId = res?.data?.user_id;
        message.success('Thêm nhân viên thành công!');
      }

      if (savedUserId && dept_assignments && dept_assignments.length > 0) {
        try {
          await syncUserDepartments(savedUserId, dept_assignments, token);
        } catch (syncErr) {
          console.error('Sync departments failed:', syncErr);
          message.warning('Lưu phân công đơn vị chưa hoàn tất, vui lòng kiểm tra lại.');
        }
      }

      setOpenUserModal(false);
      setEditingUser(null);
      fetchData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi lưu thông tin nhân viên';
      message.error(errorMessage);
    } finally {
      setUserModalSubmitting(false);
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    let result = users;

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.employee_code?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone_number?.toLowerCase().includes(q) ||
          u.citizen_identification_card?.toLowerCase().includes(q)
      );
    }

    if (departmentFilter) {
      result = result.filter(
        (u) =>
          u.department?.dept_id === departmentFilter ||
          u.user_departments?.some((ud) => ud.department?.dept_id === departmentFilter)
      );
    }

    if (roleFilter) {
      result = result.filter((u) => u.role === roleFilter);
    }

    if (quickFilter === 'HAS_CONTRACT') {
      result = result.filter((u) => !!contracts[u.user_id]);
    } else if (quickFilter === 'NO_CONTRACT') {
      result = result.filter((u) => !contracts[u.user_id]);
    } else if (quickFilter === 'PARTY_MEMBER') {
      result = result.filter((u) => !!u.is_party_member);
    } else if (quickFilter === 'NO_SIG') {
      result = result.filter((u) => !u.signature_url);
    }

    if (contractFilter) {
      if (contractFilter === 'NONE') {
        result = result.filter((u) => !contracts[u.user_id]);
      } else {
        result = result.filter((u) => contracts[u.user_id]?.contract_type === contractFilter);
      }
    }

    if (partyFilter === 'PARTY_MEMBER') {
      result = result.filter((u) => !!u.is_party_member);
    } else if (partyFilter === 'NON_PARTY') {
      result = result.filter((u) => !u.is_party_member);
    }

    return result;
  }, [users, searchText, departmentFilter, roleFilter, quickFilter, contractFilter, partyFilter, contracts]);

  // Quick Stats
  const stats = useMemo(() => {
    const withContract = users.filter((u) => contracts[u.user_id]).length;
    const noContract = users.length - withContract;
    const partyMembers = users.filter((u) => u.is_party_member).length;
    const noSig = users.filter((u) => !u.signature_url).length;
    return { total: users.length, withContract, noContract, partyMembers, noSig };
  }, [users, contracts]);

  // Import Dropdown Menu Items
  const importMenuItems: MenuProps['items'] = [
    {
      key: 'import-modal',
      icon: <UploadOutlined />,
      label: 'Nhập dữ liệu từ Excel (Xem trước)',
      onClick: () => setOpenImportModal(true),
    },
    {
      key: 'download-template',
      icon: <DownloadOutlined />,
      label: 'Tải file mẫu Excel (.xlsx)',
      onClick: handleDownloadTemplate,
    },
  ];

  // Export Dropdown Menu Items
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'export-custom',
      icon: <SettingOutlined />,
      label: 'Xuất tùy chọn nâng cao (Đa sheet)...',
      onClick: handleOpenCustomExport,
    },
    {
      key: 'export-quick',
      icon: <ThunderboltOutlined />,
      label: `Xuất nhanh danh sách hiện tại (${filteredUsers.length})`,
      onClick: () => handleQuickExportExcel(filteredUsers),
    },
  ];

  // Mobile More Actions Menu
  const mobileActionItems: MenuProps['items'] = [
    ...(canWrite
      ? [
          {
            key: 'import-modal',
            icon: <UploadOutlined />,
            label: 'Nhập nhân sự từ Excel',
            onClick: () => setOpenImportModal(true),
          },
          {
            key: 'download-template',
            icon: <DownloadOutlined />,
            label: 'Tải file mẫu Excel (.xlsx)',
            onClick: handleDownloadTemplate,
          },
        ]
      : []),
    {
      key: 'export-custom',
      icon: <ExportOutlined />,
      label: 'Xuất Excel tùy chọn',
      onClick: handleOpenCustomExport,
    },
    {
      key: 'export-quick',
      icon: <ThunderboltOutlined />,
      label: `Xuất nhanh Excel (${filteredUsers.length})`,
      onClick: () => handleQuickExportExcel(filteredUsers),
    },
    ...(canWrite
      ? [
          {
            key: 'dept',
            icon: <ApartmentOutlined />,
            label: 'Quản lý phòng ban',
            onClick: () => setOpenDeptModal(true),
          },
        ]
      : []),
  ];

  const tabItems = [
    {
      key: 'employees',
      label: (
        <span>
          <TeamOutlined /> Hồ sơ nhân sự ({filteredUsers.length})
        </span>
      ),
      children: (
        <div>
          {/* Toolbar for Employees Tab */}
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
                placeholder="Tìm theo tên, MSNV, email, SĐT..."
                prefix={<SearchOutlined />}
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: isMobile ? '100%' : 260 }}
              />

              <Select
                placeholder="Phòng ban / Đội"
                allowClear
                style={{ width: isMobile ? '100%' : 180 }}
                value={departmentFilter}
                onChange={setDepartmentFilter}
              >
                {departments.map((d) => (
                  <Select.Option key={d.dept_id} value={d.dept_id}>
                    {d.name}
                  </Select.Option>
                ))}
              </Select>

              <Select
                placeholder="Vai trò / Chức danh"
                allowClear
                style={{ width: isMobile ? '100%' : 150 }}
                value={roleFilter}
                onChange={setRoleFilter}
              >
                <Select.Option value="ADMIN">Quản trị viên</Select.Option>
                <Select.Option value="HR_MANAGER">Quản lý NS</Select.Option>
                <Select.Option value="DIRECTOR">Ban giám đốc</Select.Option>
                <Select.Option value="UNIT_HEAD">Cán bộ đội</Select.Option>
                <Select.Option value="TEAM_LEAD">Tổ trưởng</Select.Option>
                <Select.Option value="TECHNICIAN">Kỹ thuật</Select.Option>
                <Select.Option value="OPERATOR">Vận hành</Select.Option>
              </Select>

              <Select
                placeholder="Loại HĐLĐ"
                allowClear
                style={{ width: isMobile ? '100%' : 145 }}
                value={contractFilter}
                onChange={setContractFilter}
              >
                <Select.Option value="1_MONTH">Học việc</Select.Option>
                <Select.Option value="PROBATION">Thử việc</Select.Option>
                <Select.Option value="12_MONTHS">HĐ 12 tháng</Select.Option>
                <Select.Option value="24_MONTHS">HĐ 24 tháng</Select.Option>
                <Select.Option value="36_MONTHS">HĐ 36 tháng</Select.Option>
                <Select.Option value="INDEFINITE">Vô thời hạn</Select.Option>
                <Select.Option value="NONE">Chưa có HĐ</Select.Option>
              </Select>

              <Select
                placeholder="Đảng viên / Quần chúng"
                allowClear
                style={{ width: isMobile ? '100%' : 175 }}
                value={partyFilter}
                onChange={(val) => {
                  setPartyFilter(val || null);
                  if (val === 'PARTY_MEMBER') {
                    setQuickFilter('PARTY_MEMBER');
                  } else if (quickFilter === 'PARTY_MEMBER') {
                    setQuickFilter(null);
                  }
                }}
              >
                <Select.Option value="PARTY_MEMBER">⭐ Đảng viên</Select.Option>
                <Select.Option value="NON_PARTY">Quần chúng</Select.Option>
              </Select>

              {hasAnyFilter && (
                <Button
                  type="dashed"
                  size="middle"
                  icon={<ClearOutlined />}
                  onClick={handleResetFilters}
                  style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                >
                  Xóa lọc
                </Button>
              )}
            </Space>

            <Space wrap>
              {/* Segmented View Switch (Cards vs Table) */}
              <Segmented
                value={viewMode}
                onChange={(v) => setViewMode(v as 'TABLE' | 'CARDS')}
                options={[
                  { value: 'TABLE', icon: <BarsOutlined />, label: isMobile ? undefined : 'Bảng' },
                  { value: 'CARDS', icon: <AppstoreOutlined />, label: isMobile ? undefined : 'Thẻ' },
                ]}
              />

              {canWrite && !isMobile && (
                <>
                  <Space.Compact>
                    <Button icon={<UploadOutlined />} onClick={() => setOpenImportModal(true)}>
                      Nhập Excel
                    </Button>
                    <Dropdown menu={{ items: importMenuItems }} trigger={['click']} placement="bottomRight">
                      <Button icon={<DownOutlined />} title="Tùy chọn nhập & tải file mẫu" />
                    </Dropdown>
                  </Space.Compact>

                  <Space.Compact>
                    <Button icon={<ExportOutlined />} onClick={handleOpenCustomExport}>
                      Xuất Excel
                    </Button>
                    <Dropdown menu={{ items: exportMenuItems }} trigger={['click']} placement="bottomRight">
                      <Button icon={<DownOutlined />} title="Tùy chọn xuất Excel" />
                    </Dropdown>
                  </Space.Compact>

                  <Button icon={<ApartmentOutlined />} onClick={() => setOpenDeptModal(true)}>
                    Phòng ban
                  </Button>
                </>
              )}

              {canWrite && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleOpenCreateModal}
                >
                  Thêm mới
                </Button>
              )}

              {isMobile && canWrite && (
                <Dropdown menu={{ items: mobileActionItems }} trigger={['click']}>
                  <Button icon={<MoreOutlined />} />
                </Dropdown>
              )}
            </Space>
          </div>

          {/* Contextual Bulk Action Bar when rows are selected */}
          {selectedRowKeys.length > 0 && viewMode === 'TABLE' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                marginBottom: 12,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 8,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <Space size={8}>
                <CheckSquareOutlined style={{ color: '#2563eb', fontSize: 16 }} />
                <Text strong style={{ color: '#1e3a8a', fontSize: 13 }}>
                  Đã chọn {selectedRowKeys.length} nhân sự trên bảng
                </Text>
              </Space>
              <Space size={8} wrap>
                <Button
                  size="small"
                  type="primary"
                  icon={<SettingOutlined />}
                  onClick={() => {
                    setExportScope('SELECTED');
                    setOpenExportModal(true);
                  }}
                >
                  Xuất tùy chọn ({selectedRowKeys.length})
                </Button>
                <Button
                  size="small"
                  icon={<ThunderboltOutlined />}
                  onClick={() =>
                    handleQuickExportExcel(
                      users.filter((u) => selectedRowKeys.includes(u.user_id))
                    )
                  }
                >
                  Xuất nhanh (.xlsx)
                </Button>
                <Button size="small" onClick={() => setSelectedRowKeys([])}>
                  Bỏ chọn
                </Button>
              </Space>
            </div>
          )}

          {/* Body: Cards or Table */}
          {viewMode === 'CARDS' ? (
            <Row gutter={[12, 12]}>
              {filteredUsers.map((u) => (
                <Col xs={24} sm={12} lg={8} xl={6} key={u.user_id}>
                  <EmployeeCard
                    user={u}
                    activeContract={contracts[u.user_id]}
                    canWrite={canWrite}
                    canDelete={canDelete}
                    onView={handleViewDetail}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </Col>
              ))}
            </Row>
          ) : (
            <EmployeeTable
              dataSource={filteredUsers}
              contracts={contracts}
              loading={loading}
              canWrite={canWrite}
              canDelete={canDelete}
              selectedRowKeys={selectedRowKeys}
              onSelectChange={setSelectedRowKeys}
              onView={handleViewDetail}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      ),
    },
    {
      key: 'contracts',
      label: (
        <span>
          <FileTextOutlined /> Hợp đồng lao động
        </span>
      ),
      children: (
        <ContractsTab
          users={users}
          canWrite={canWrite}
          onViewUser={handleViewDetail}
          isMobile={isMobile}
        />
      ),
    },
    {
      key: 'certificates',
      label: (
        <span>
          <SafetyCertificateOutlined /> Bằng cấp & CCCM
        </span>
      ),
      children: (
        <CertificatesTab
          users={users}
          canWrite={canWrite}
          onViewUser={handleViewDetail}
          isMobile={isMobile}
        />
      ),
    },
    {
      key: 'leaves',
      label: (
        <span>
          <CalendarOutlined /> Phép năm & Nghỉ
        </span>
      ),
      children: (
        <LeavesTab
          users={users}
          canWrite={canWrite}
          onViewUser={handleViewDetail}
          isMobile={isMobile}
        />
      ),
    },
    {
      key: 'rewards',
      label: (
        <span>
          <TrophyOutlined /> Khen thưởng / Kỷ luật
        </span>
      ),
      children: (
        <RewardDisciplineTab
          users={users}
          canWrite={canWrite}
          onViewUser={handleViewDetail}
          isMobile={isMobile}
        />
      ),
    },
    {
      key: 'approvals',
      label: (
        <span>
          <Badge count={pendingCount} size="small" offset={[8, 0]}>
            <span>📝 Phê duyệt yêu cầu</span>
          </Badge>
        </span>
      ),
      children: (
        <ApprovalRequestsTab
          canWrite={canWrite}
          onViewUser={handleViewDetail}
          isMobile={isMobile}
          onPendingCountChange={setPendingCount}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: isMobile ? 12 : 24, background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto' }}>
        {/* Header Title & Quick KPI Chips */}
        <div style={{ marginBottom: 16 }}>
          <Title
            level={3}
            style={{
              margin: 0,
              fontWeight: 700,
              fontSize: isMobile ? 20 : 24,
              color: '#001529',
              letterSpacing: '-0.02em',
            }}
          >
            Trung tâm Quản lý Nhân sự 360°
          </Title>
          <Text type="secondary" style={{ fontSize: isMobile ? 12 : 13 }}>
            Quản lý tập trung hồ sơ nhân sự, hợp đồng, chứng chỉ CCCM, phép năm và xét duyệt hồ sơ
          </Text>

          {/* Quick KPI Stat Chips */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <Tag.CheckableTag
              checked={quickFilter === null}
              onChange={() => setQuickFilter(null)}
              style={{ fontSize: 12, padding: '3px 10px', borderRadius: 12 }}
            >
              👥 Tất cả: {stats.total} nhân sự
            </Tag.CheckableTag>

            <Tag.CheckableTag
              checked={quickFilter === 'HAS_CONTRACT'}
              onChange={(c) => setQuickFilter(c ? 'HAS_CONTRACT' : null)}
              style={{
                fontSize: 12,
                padding: '3px 10px',
                borderRadius: 12,
                color: '#389e0d',
                backgroundColor: '#f6ffed',
                borderColor: '#b7eb8f',
              }}
            >
              ✓ Có HĐ: {stats.withContract}
            </Tag.CheckableTag>

            {stats.noContract > 0 && (
              <Tag.CheckableTag
                checked={quickFilter === 'NO_CONTRACT'}
                onChange={(c) => setQuickFilter(c ? 'NO_CONTRACT' : null)}
                style={{
                  fontSize: 12,
                  padding: '3px 10px',
                  borderRadius: 12,
                  color: '#fa8c16',
                  backgroundColor: '#fff7e6',
                  borderColor: '#ffd591',
                }}
              >
                ⚠ Chưa có HĐ: {stats.noContract}
              </Tag.CheckableTag>
            )}

            <Tag.CheckableTag
              checked={quickFilter === 'PARTY_MEMBER'}
              onChange={(c) => {
                setQuickFilter(c ? 'PARTY_MEMBER' : null);
                setPartyFilter(c ? 'PARTY_MEMBER' : null);
              }}
              style={{
                fontSize: 12,
                padding: '3px 10px',
                borderRadius: 12,
                ...(quickFilter !== 'PARTY_MEMBER'
                  ? {
                      color: '#cf1322',
                      backgroundColor: '#fff1f0',
                      borderColor: '#ffa39e',
                    }
                  : {}),
              }}
            >
              ⭐ Đảng viên: {stats.partyMembers}
            </Tag.CheckableTag>

            {pendingCount > 0 && (
              <Tag
                color="red"
                style={{
                  fontSize: 12,
                  padding: '3px 10px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                onClick={() => handleTabChange('approvals')}
              >
                🔔 {pendingCount} yêu cầu chờ duyệt
              </Tag>
            )}
          </div>
        </div>

        {/* Master HR Hub Tabs */}
        <Card
          styles={{ body: { padding: isMobile ? 12 : 20 } }}
          style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            items={tabItems}
            type="card"
            size={isMobile ? 'small' : 'middle'}
          />
        </Card>

        {/* Modals */}
        <UserModal
          open={openUserModal}
          onCancel={() => {
            setOpenUserModal(false);
            setEditingUser(null);
          }}
          onOk={handleSaveUser}
          initialValues={editingUser}
          departments={departments}
          deviceGroups={deviceGroups}
          loading={userModalSubmitting}
        />

        <DepartmentModal
          open={openDeptModal}
          onClose={(changed) => {
            setOpenDeptModal(false);
            if (changed) fetchData();
          }}
        />

        <UserImportModal
          open={openImportModal}
          onClose={() => setOpenImportModal(false)}
          onSuccess={fetchData}
          existingUsers={users}
          departments={departments}
        />

        <ExportModal
          open={openExportModal}
          onCancel={() => setOpenExportModal(false)}
          users={users}
          filteredUsers={filteredUsers}
          selectedRowKeys={selectedRowKeys}
          contracts={contracts}
          defaultScope={exportScope}
        />

        {selectedUser && (
          <ProfileDrawer
            open={openProfileDrawer}
            onCancel={() => {
              setOpenProfileDrawer(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            onUpdateSuccess={(u) => {
              fetchData();
              setSelectedUser(u);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Employees;
