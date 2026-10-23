import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Typography,
  Input,
  Button,
  Space,
  Tag,
  Upload,
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
import { getAllUsers, createUser, deleteUser } from '../../apis/users';
import { getToken } from '../../utils/auth';
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

const Employees: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md; // Mobile if < 768px

  const [users, setUsers] = useState<IUser[]>([]);
  const [contracts, setContracts] = useState<Record<number, ILaborContract>>({});
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [contractFilter, setContractFilter] = useState<string | null>(null);

  // View Mode: Cards or Table
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');

  // Active Tab
  const [activeTab, setActiveTab] = useState('employees');
  const [pendingCount, setPendingCount] = useState(0);

  const { departments } = useDepartmentsContext();
  const [deviceGroups, setDeviceGroups] = useState<IDeviceGroup[]>([]);
  const [openUserModal, setOpenUserModal] = useState(false);
  const [userModalSubmitting, setUserModalSubmitting] = useState(false);
  const [openDeptModal, setOpenDeptModal] = useState(false);
  const [openExportModal, setOpenExportModal] = useState(false);
  const [exportScope] = useState<'ALL' | 'SELECTED'>('ALL');

  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [openProfileDrawer, setOpenProfileDrawer] = useState(false);

  const { user: currentAuthUser } = useAuthContext();
  const canWrite = ['ADMIN', 'HR_MANAGER'].includes(currentAuthUser?.role || '');
  const canDelete = canWrite;

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

  const handleEdit = (user: IUser) => {
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
      message.loading({ content: 'Đang xuất Excel...', key: 'export' });
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
      if (rows.length === 0) {
        message.warning({ content: 'File không có dữ liệu', key: 'import' });
        return false;
      }
      const token = getToken();
      let newCount = 0,
        errorCount = 0;
      for (const row of rows) {
        try {
          if (!row.isExisting && row.email) {
            const payload: ICreateUser = {
              name: row.name,
              employee_code: row.employee_code,
              email: row.email,
              password: 'Vcs@123456',
              role: 'OPERATOR',
              status: 'active',
              position: row.position,
              gender: row.gender || undefined,
              ethnicity: row.ethnicity || undefined,
              date_of_birth: row.date_of_birth || undefined,
              place_of_birth: row.place_of_birth || undefined,
              phone_number: row.phone_number || undefined,
              citizen_identification_card: row.citizen_identification_card || '000000000000',
              cccd_issue_date: row.cccd_issue_date || undefined,
              permanent_address: row.permanent_address || undefined,
              temporary_address: row.temporary_address || undefined,
              hometown: row.hometown || undefined,
            };
            await createUser(payload, token);
            newCount++;
          }
        } catch (err) {
          errorCount++;
        }
      }
      message.success({
        content: `Thêm mới: ${newCount} | Lỗi: ${errorCount}`,
        key: 'import',
        duration: 5,
      });
      fetchData();
    } catch (err: any) {
      message.error({ content: err.message || 'Lỗi xử lý file', key: 'import' });
    } finally {
      setImporting(false);
    }
    return false;
  };

  const handleCreateUser = async (values: ICreateUser) => {
    setUserModalSubmitting(true);
    try {
      const token = getToken();
      await createUser(values, token);
      message.success('Thêm nhân viên thành công!');
      setOpenUserModal(false);
      fetchData();
    } catch (err: any) {
      message.error(err.message || 'Lỗi tạo nhân viên');
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

    return result;
  }, [users, searchText, departmentFilter, roleFilter, quickFilter, contractFilter, contracts]);

  // Quick Stats
  const stats = useMemo(() => {
    const withContract = users.filter((u) => contracts[u.user_id]).length;
    const noContract = users.length - withContract;
    const noSig = users.filter((u) => !u.signature_url).length;
    return { total: users.length, withContract, noContract, noSig };
  }, [users, contracts]);

  // Mobile More Actions Menu
  const mobileActionItems: MenuProps['items'] = [
    {
      key: 'export',
      icon: <ExportOutlined />,
      label: 'Xuất file Excel',
      onClick: handleExportExcel,
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
                style={{ width: isMobile ? '100%' : 140 }}
                value={contractFilter}
                onChange={setContractFilter}
              >
                <Select.Option value="THU_VIEC">Thử việc</Select.Option>
                <Select.Option value="XAC_DINH_1_NAM">1 năm</Select.Option>
                <Select.Option value="XAC_DINH_3_NAM">3 năm</Select.Option>
                <Select.Option value="KHONG_XAC_DINH">Vô thời hạn</Select.Option>
                <Select.Option value="NONE">Chưa có HĐ</Select.Option>
              </Select>
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
                  <Upload
                    beforeUpload={handleImportFile}
                    showUploadList={false}
                    accept=".xlsx,.xls"
                  >
                    <Button icon={<UploadOutlined />} loading={importing}>
                      Nhập Excel
                    </Button>
                  </Upload>

                  <Button icon={<ExportOutlined />} onClick={handleExportExcel}>
                    Xuất Excel
                  </Button>

                  <Button icon={<ApartmentOutlined />} onClick={() => setOpenDeptModal(true)}>
                    Phòng ban
                  </Button>
                </>
              )}

              {canWrite && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setOpenUserModal(true)}
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
                onClick={() => setActiveTab('approvals')}
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
            onChange={setActiveTab}
            items={tabItems}
            type="card"
            size={isMobile ? 'small' : 'middle'}
          />
        </Card>

        {/* Modals */}
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
          onClose={(changed) => {
            setOpenDeptModal(false);
            if (changed) fetchData();
          }}
        />

        <ExportModal
          open={openExportModal}
          onCancel={() => setOpenExportModal(false)}
          users={users}
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
