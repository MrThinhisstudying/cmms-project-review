import React, { useState, useEffect, useMemo } from "react";
import {
  Layout, Typography, Avatar, Card, Modal, Select,
  Dropdown, Space, Tag, Input, Button, Table,
  Popconfirm, message, Tooltip, Form
} from "antd";
import type { MenuProps } from "antd";
import {
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
  MoreOutlined,
  WarningOutlined,
  MailOutlined,
  PhoneOutlined,
  ApartmentOutlined,
  TeamOutlined,
  KeyOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  LockOutlined,
  CrownOutlined,
  ReloadOutlined
} from "@ant-design/icons";
import { IUser } from "../../types/user.types";
import DepartmentModal from "./components/DepartmentModal";
import DeviceGroupModal from "./components/DeviceGroupModal";
import ProfileDrawer from "./components/ProfileModal";
import UserModal from "./components/UserModal";
import UserImportModal from "./components/UserImportModal";
import certificatesApi from "../../apis/certificates";
import { IEmployeeCertificate } from "../../types/certificates.types";
import { getToken } from "../../utils/auth";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import { useUsersContext } from "../../context/UsersContext/UsersContext";
import { useDepartmentsContext } from "../../context/DepartmentsContext/DepartmentsContext";
import { exportUsersToExcel } from "../../utils/excelHelper";
import { createUser, deleteUser, updateUser, syncUserDepartments } from "../../apis/users";
import { getDeviceGroups, IDeviceGroup } from "../../apis/device-groups";

const { Content } = Layout;
const { Title, Text } = Typography;

// --- Role display mapping ---
const ROLE_MAP: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN: { label: 'Quản trị viên', color: '#ef4444', bg: '#fef2f2' },
  DIRECTOR: { label: 'Ban giám đốc', color: '#f59e0b', bg: '#fffbeb' },
  HR_MANAGER: { label: 'Quản lý NS', color: '#ec4899', bg: '#fdf2f8' },
  UNIT_HEAD: { label: 'Cán bộ đội', color: '#f97316', bg: '#fff7ed' },
  TEAM_LEAD: { label: 'Tổ trưởng', color: '#8b5cf6', bg: '#f5f3ff' },
  TECHNICIAN: { label: 'Kỹ thuật', color: '#2563eb', bg: '#eff6ff' },
  OPERATOR: { label: 'Vận hành', color: '#06b6d4', bg: '#ecfeff' },
};

const Users: React.FC = () => {
  const { user: currentUser } = useAuthContext();
  const isAdmin = currentUser?.role === 'ADMIN';

  const { users, loading, fetchUsers } = useUsersContext();
  const { departments } = useDepartmentsContext();

  const [deviceGroups, setDeviceGroups] = useState<IDeviceGroup[]>([]);
  const [expiringCerts, setExpiringCerts] = useState<IEmployeeCertificate[]>([]);
  const [searchText, setSearchText] = useState("");
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  // Modals state
  const [openUserModal, setOpenUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [openDeptModal, setOpenDeptModal] = useState(false);
  const [openGroupModal, setOpenGroupModal] = useState(false);
  const [openProfileDrawer, setOpenProfileDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewOnlyMode, setViewOnlyMode] = useState(false);

  // Password Reset Modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<IUser | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordForm] = Form.useForm();

  // Excel Import/Export states
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    getDeviceGroups().then(groups => setDeviceGroups(groups)).catch(console.error);
    certificatesApi.getExpiringCertificates(90).then(certs => setExpiringCerts(certs)).catch(console.error);
  }, []);

  // --- Handlers ---
  const handleView = (user: IUser) => {
    setSelectedUser(user);
    setOpenProfileDrawer(true);
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setViewOnlyMode(false);
    setOpenUserModal(true);
  };

  const handleEdit = (user: IUser) => {
    setSelectedUser(user);
    setViewOnlyMode(false);
    setOpenUserModal(true);
  };

  const handleOpenPasswordModal = (user: IUser) => {
    setPasswordTargetUser(user);
    passwordForm.resetFields();
    setPasswordModalOpen(true);
  };

  const handleResetPassword = async (values: any) => {
    if (!passwordTargetUser) return;
    setPasswordLoading(true);
    try {
      const token = getToken();
      await updateUser(passwordTargetUser.user_id, { password: values.newPassword }, token);
      message.success(`Đặt lại mật khẩu cho "${passwordTargetUser.name}" thành công!`);
      setPasswordModalOpen(false);
      passwordForm.resetFields();
    } catch (err: any) {
      message.error(err.message || 'Đặt lại mật khẩu thất bại');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDelete = async (user: IUser) => {
    try {
      const token = getToken();
      await deleteUser(user.user_id, token);
      message.success("Xóa người dùng thành công");
      fetchUsers();
    } catch (error: any) {
      message.error(error?.message || "Xóa người dùng thất bại");
    }
  };

  const handleSaveUser = async (values: any) => {
    setSubmitting(true);
    try {
      const token = getToken();
      const { dept_assignments, ...userValues } = values;
      let savedUserId: number;
      if (selectedUser) {
        await updateUser(selectedUser.user_id, userValues, token);
        savedUserId = selectedUser.user_id;
        message.success("Cập nhật thông tin thành công");
      } else {
        const res = await createUser(userValues, token);
        savedUserId = res?.data?.user_id;
        message.success("Tạo mới tài khoản thành công");
      }
      if (savedUserId && dept_assignments && dept_assignments.length > 0) {
        try {
          await syncUserDepartments(savedUserId, dept_assignments, token);
        } catch (err) {
          console.error('Sync departments failed:', err);
          message.warning('Lưu đơn vị tổ chức không thành công. Vui lòng cập nhật lại.');
        }
      }
      setOpenUserModal(false);
      fetchUsers();
    } catch (error: any) {
      message.error(error.message || "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Statistics ---
  const stats = useMemo(() => {
    const active = users.filter(u => u.status === 'active' || u.status === 'ACTIVE').length;
    const adminRoles = ['ADMIN', 'DIRECTOR', 'UNIT_HEAD', 'HR_MANAGER'];
    const adminCount = users.filter(u => adminRoles.includes(u.role?.toUpperCase() || '')).length;
    const noSig = users.filter(u => !u.signature_url).length;
    return {
      total: users.length,
      active,
      inactive: users.length - active,
      adminCount,
      noSig,
      warnings: expiringCerts.length
    };
  }, [users, expiringCerts]);

  // --- Filtered Users ---
  const filteredUsers = useMemo(() => {
    let result = users;
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      result = result.filter(u =>
        u.name.toLowerCase().includes(lower) ||
        u.email.toLowerCase().includes(lower) ||
        (u.employee_code || '').toLowerCase().includes(lower) ||
        (u.phone_number || '').toLowerCase().includes(lower)
      );
    }
    if (filterRole !== 'all') {
      result = result.filter(u => u.role?.toUpperCase() === filterRole);
    }
    if (filterStatus !== 'all') {
      result = result.filter(u => {
        const s = (u.status || '').toLowerCase();
        return filterStatus === 'active' ? s === 'active' : s !== 'active';
      });
    }
    if (filterDepartment !== 'all') {
      result = result.filter(u => {
        const depts = (u as any).user_departments;
        if (depts && Array.isArray(depts)) {
          return depts.some((d: any) => String(d.department?.dept_id || d.dept_id) === filterDepartment);
        }
        return String((u as any).department?.dept_id || (u as any).dept_id) === filterDepartment;
      });
    }
    return result;
  }, [users, searchText, filterRole, filterStatus, filterDepartment]);

  // --- Excel handlers ---
  const handleExportExcel = async () => {
    try {
      message.loading({ content: 'Đang xuất danh sách tài khoản...', key: 'export' });
      await exportUsersToExcel(users);
      message.success({ content: 'Xuất Excel thành công!', key: 'export' });
    } catch (err) {
      message.error({ content: 'Lỗi xuất Excel', key: 'export' });
    }
  };

  // --- More actions dropdown ---
  const moreMenuItems: MenuProps['items'] = [
    { key: 'dept', icon: <ApartmentOutlined />, label: 'Quản lý Phòng ban / Đơn vị', onClick: () => setOpenDeptModal(true) },
    { key: 'group', icon: <TeamOutlined />, label: 'Quản lý Nhóm thiết bị', onClick: () => setOpenGroupModal(true) },
    { type: 'divider' as const },
    { 
      key: 'import', 
      icon: <UploadOutlined />, 
      label: 'Nhập danh sách từ Excel', 
      onClick: () => setImportModalOpen(true),
    },
    { key: 'export', icon: <DownloadOutlined />, label: 'Xuất danh sách ra Excel', onClick: handleExportExcel },
  ];

  // --- Table columns ---
  const columns = [
    {
      title: 'Tài khoản & Nhân sự',
      key: 'employee',
      width: '32%',
      render: (_: any, record: IUser) => {
        const hasSig = !!record.signature_url;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar
              src={record.avatar}
              icon={<UserOutlined />}
              size={42}
              style={{ 
                backgroundColor: '#eff6ff', 
                color: '#2563eb', 
                border: '1.5px solid #bfdbfe',
                flexShrink: 0 
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{record.name}</span>
                {record.employee_code && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '1px 6px',
                    background: '#f1f5f9', color: '#475569', borderRadius: 4
                  }}>
                    {record.employee_code}
                  </span>
                )}
                {record.role?.toUpperCase() === 'ADMIN' && (
                  <Tooltip title="Tài khoản Quản trị cấp cao">
                    <CrownOutlined style={{ color: '#ef4444', fontSize: 13 }} />
                  </Tooltip>
                )}
                <Tooltip title={hasSig ? "Đã có chữ ký điện tử" : "Chưa cập nhật chữ ký số"}>
                  {hasSig ? (
                    <CheckCircleOutlined style={{ color: '#10b981', fontSize: 12 }} />
                  ) : (
                    <WarningOutlined style={{ color: '#f59e0b', fontSize: 12 }} />
                  )}
                </Tooltip>
              </div>

              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {record.position || 'Chưa thiết lập chức vụ'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3, fontSize: 11.5, color: '#64748b', flexWrap: 'wrap' }}>
                <span><MailOutlined style={{ marginRight: 4, color: '#94a3b8' }} />{record.email}</span>
                {record.phone_number && (
                  <span><PhoneOutlined style={{ marginRight: 4, color: '#94a3b8' }} />{record.phone_number}</span>
                )}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      title: 'Đơn vị công tác',
      key: 'unit',
      width: '24%',
      render: (_: any, record: IUser) => {
        const depts = (record as any).user_departments;
        if (depts && Array.isArray(depts) && depts.length > 0) {
          const primary = depts.find((d: any) => d.is_primary) || depts[0];
          const roleLabel = primary.role_in_dept === 'LEAD' ? 'Trưởng' : primary.role_in_dept === 'DEPUTY_LEAD' ? 'Phó' : '';
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                  {primary.department?.name || `Dept #${primary.dept_id}`}
                </span>
                {roleLabel && <Tag color="blue" style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}>{roleLabel}</Tag>}
              </div>
              {depts.length > 1 && (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  + {depts.length - 1} đơn vị kiêm nhiệm
                </div>
              )}
            </div>
          );
        }
        const deptName = (record as any).department?.name;
        return deptName ? (
          <span style={{ fontSize: 13, color: '#334155' }}>{deptName}</span>
        ) : (
          <span style={{ fontSize: 12.5, color: '#94a3b8', fontStyle: 'italic' }}>Chưa phân bổ đơn vị</span>
        );
      }
    },
    {
      title: 'Vai trò hệ thống',
      dataIndex: 'role',
      key: 'role',
      width: '18%',
      align: 'center' as const,
      render: (role: string) => {
        const roleKey = (role || '').toUpperCase();
        const info = ROLE_MAP[roleKey] || { label: role || 'Viewer', color: '#64748b', bg: '#f1f5f9' };
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '3px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              color: info.color,
              background: info.bg,
              border: `1px solid ${info.color}33`,
            }}
          >
            {info.label}
          </span>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: '12%',
      align: 'center' as const,
      render: (status: string) => {
        const isActive = (status || '').toLowerCase() === 'active';
        return (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              backgroundColor: isActive ? '#10b981' : '#cbd5e1'
            }} />
            <span style={{ fontSize: 12.5, fontWeight: 500, color: isActive ? '#059669' : '#64748b' }}>
              {isActive ? 'Hoạt động' : 'Tạm dừng'}
            </span>
          </div>
        );
      }
    },
    {
      title: 'Thao tác quản trị',
      key: 'action',
      width: '14%',
      align: 'center' as const,
      render: (_: any, record: IUser) => (
        <Space size={6} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Đổi mật khẩu tài khoản">
            <Button 
              type="text" 
              size="small" 
              icon={<KeyOutlined style={{ color: '#d97706' }} />}
              onClick={() => handleOpenPasswordModal(record)}
              style={{ borderRadius: 6 }}
            />
          </Tooltip>

          <Tooltip title="Sửa thông tin tài khoản">
            <Button 
              type="text" 
              size="small" 
              icon={<EditOutlined style={{ color: '#2563eb' }} />}
              onClick={() => handleEdit(record)}
              style={{ borderRadius: 6 }}
            />
          </Tooltip>

          {isAdmin && (
            <Popconfirm 
              title="Xác nhận xóa tài khoản này?" 
              description={`Tài khoản "${record.name}" sẽ bị gỡ khỏi hệ thống.`}
              onConfirm={() => handleDelete(record)}
              okText="Xóa vĩnh viễn"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Xóa tài khoản">
                <Button 
                  type="text" 
                  size="small" 
                  danger 
                  icon={<DeleteOutlined />}
                  style={{ borderRadius: 6 }}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: 'calc(100vh - 64px)', background: '#f8fafc', padding: '24px 28px' }}>
      <Content style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>

        {/* ── 1. Top Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Quản lý Tài khoản & Phân quyền (Admin IT)
            </Title>
            <Text type="secondary" style={{ fontSize: 13, color: '#64748b' }}>
              Trung tâm quản trị tài khoản người dùng, phân quyền truy cập hệ thống và an ninh xác thực
            </Text>
          </div>

          <Space wrap>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchUsers} 
              loading={loading}
              style={{ borderRadius: 8, borderColor: '#cbd5e1' }}
            >
              Làm mới
            </Button>
            <Button 
              icon={<UploadOutlined />} 
              onClick={() => setImportModalOpen(true)}
              style={{ borderRadius: 8, borderColor: '#86efac', background: '#f0fdf4', color: '#16a34a', fontWeight: 600 }}
            >
              Nhập Excel
            </Button>
            <Button 
              icon={<DownloadOutlined />} 
              onClick={handleExportExcel}
              style={{ borderRadius: 8, borderColor: '#cbd5e1' }}
            >
              Xuất Excel
            </Button>
            <Dropdown menu={{ items: moreMenuItems }} trigger={['click']} placement="bottomRight">
              <Button icon={<MoreOutlined />} style={{ borderRadius: 8, borderColor: '#cbd5e1' }}>
                Thao tác mở rộng
              </Button>
            </Dropdown>
            {isAdmin && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleCreate}
                style={{ 
                  borderRadius: 8, fontWeight: 600, height: 38, paddingInline: 20,
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  border: 'none', boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
                }}
              >
                + Thêm tài khoản
              </Button>
            )}
          </Space>
        </div>

        {/* ── 2. Stat Metric Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div className="usr-stat-card">
            <div className="usr-stat-header">
              <span className="usr-stat-label">Tổng số tài khoản</span>
              <div className="usr-stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><TeamOutlined /></div>
            </div>
            <div className="usr-stat-val">{stats.total}</div>
            <div className="usr-stat-sub">Toàn bộ nhân sự trong hệ thống</div>
          </div>

          <div className="usr-stat-card">
            <div className="usr-stat-header">
              <span className="usr-stat-label">Đang hoạt động</span>
              <div className="usr-stat-icon" style={{ background: '#f0fdf4', color: '#10b981' }}><CheckCircleOutlined /></div>
            </div>
            <div className="usr-stat-val" style={{ color: '#10b981' }}>{stats.active}</div>
            <div className="usr-stat-sub">
              Tỷ lệ: {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% sẵn sàng
            </div>
          </div>

          <div className="usr-stat-card">
            <div className="usr-stat-header">
              <span className="usr-stat-label">Tài khoản Tạm ngừng</span>
              <div className="usr-stat-icon" style={{ background: stats.inactive > 0 ? '#fff7ed' : '#f8fafc', color: stats.inactive > 0 ? '#f97316' : '#94a3b8' }}>
                <LockOutlined />
              </div>
            </div>
            <div className="usr-stat-val" style={{ color: stats.inactive > 0 ? '#f97316' : '#64748b' }}>{stats.inactive}</div>
            <div className="usr-stat-sub">Đã khóa hoặc ngừng kích hoạt</div>
          </div>

          <div className="usr-stat-card">
            <div className="usr-stat-header">
              <span className="usr-stat-label">Cấp Quản trị & Điều hành</span>
              <div className="usr-stat-icon" style={{ background: '#fdf2f8', color: '#ec4899' }}><CrownOutlined /></div>
            </div>
            <div className="usr-stat-val" style={{ color: '#ec4899' }}>{stats.adminCount}</div>
            <div className="usr-stat-sub">Admin, Ban GĐ, Trưởng đội, NS</div>
          </div>
        </div>

        {/* ── 3. Smart Toolbar (Luôn đầy đủ bộ lọc) ── */}
        <Card
          variant="borderless"
          styles={{ body: { padding: '14px 18px' } }}
          style={{ marginBottom: 16, borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', background: '#fff' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Input
              placeholder="Tìm theo tên, email, MSNV, số điện thoại..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              allowClear
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ flex: 1, minWidth: 260, maxWidth: 360, borderRadius: 8 }}
            />

            {/* Filter Role */}
            <Select 
              value={filterRole} 
              onChange={setFilterRole} 
              style={{ width: 170 }}
              options={[
                { value: 'all', label: 'Tất cả vai trò' },
                { value: 'ADMIN', label: 'Quản trị viên' },
                { value: 'DIRECTOR', label: 'Ban giám đốc' },
                { value: 'HR_MANAGER', label: 'Quản lý NS' },
                { value: 'UNIT_HEAD', label: 'Cán bộ đội' },
                { value: 'TEAM_LEAD', label: 'Tổ trưởng' },
                { value: 'TECHNICIAN', label: 'Kỹ thuật viên' },
                { value: 'OPERATOR', label: 'Nhân viên vận hành' },
              ]}
            />

            {/* Filter Status */}
            <Select 
              value={filterStatus} 
              onChange={setFilterStatus} 
              style={{ width: 150 }}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'active', label: '🟢 Đang hoạt động' },
                { value: 'inactive', label: '⚪ Đang tạm dừng' },
              ]}
            />

            {/* Filter Department */}
            <Select 
              value={filterDepartment} 
              onChange={setFilterDepartment} 
              style={{ width: 190 }}
              placeholder="Lọc phòng ban"
              options={[
                { value: 'all', label: 'Tất cả phòng ban' },
                ...departments.map(d => ({ value: String(d.dept_id), label: d.name }))
              ]}
            />

            {(searchText || filterRole !== 'all' || filterStatus !== 'all' || filterDepartment !== 'all') && (
              <Button 
                type="link" 
                onClick={() => { setSearchText(''); setFilterRole('all'); setFilterStatus('all'); setFilterDepartment('all'); }}
                style={{ padding: '0 4px', fontSize: 13 }}
              >
                Đặt lại
              </Button>
            )}

            <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: 13 }}>
              Hiển thị <b>{filteredUsers.length}</b> / {users.length} tài khoản
            </div>
          </div>
        </Card>

        {/* ── 4. Main User Table ── */}
        <Card
          variant="borderless"
          styles={{ body: { padding: 0 } }}
          style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', background: '#fff' }}
        >
          <Table
            columns={columns}
            dataSource={filteredUsers}
            rowKey="user_id"
            loading={loading}
            size="middle"
            scroll={{ x: 900 }}
            onRow={(record) => ({
              onClick: () => handleView(record),
              style: { cursor: 'pointer' },
            })}
            pagination={{
              pageSize: 15,
              showSizeChanger: true,
              pageSizeOptions: ['15', '30', '50'],
              showTotal: (total) => <span style={{ fontSize: 12.5, color: '#64748b' }}>Tổng {total} tài khoản</span>,
              style: { padding: '12px 20px', margin: 0 },
            }}
          />
        </Card>

        {/* ── 5. Password Reset Modal for Admin ── */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <KeyOutlined style={{ color: '#d97706', fontSize: 18 }} />
              <span>Đặt lại mật khẩu cho: <b>{passwordTargetUser?.name}</b></span>
            </div>
          }
          open={passwordModalOpen}
          onCancel={() => { setPasswordModalOpen(false); passwordForm.resetFields(); }}
          footer={null}
          width={450}
          destroyOnClose
        >
          <div style={{ padding: '12px 0 4px' }}>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
              Với vai trò Admin IT, bạn có thể thiết lập trực tiếp mật khẩu mới cho tài khoản người dùng này mà không cần nhập mật khẩu cũ.
            </p>

            <Form form={passwordForm} layout="vertical" onFinish={handleResetPassword}>
              <Form.Item
                label="Mật khẩu mới"
                name="newPassword"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                  { min: 6, message: 'Mật khẩu phải chứa ít nhất 6 ký tự' }
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu mới..." size="large" />
              </Form.Item>

              <Form.Item
                label="Xác nhận mật khẩu mới"
                name="confirmPassword"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu mới..." size="large" />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                <Button onClick={() => setPasswordModalOpen(false)}>Hủy</Button>
                <Button type="primary" htmlType="submit" loading={passwordLoading} style={{ background: '#d97706', borderColor: '#d97706' }}>
                  Xác nhận đặt lại mật khẩu
                </Button>
              </div>
            </Form>
          </div>
        </Modal>

        {/* ── 6. Modals ── */}
        <UserModal
          open={openUserModal}
          onCancel={() => setOpenUserModal(false)}
          onOk={handleSaveUser}
          initialValues={selectedUser}
          departments={departments}
          deviceGroups={deviceGroups}
          loading={submitting}
          readOnly={viewOnlyMode}
        />
        <DepartmentModal open={openDeptModal} onClose={(changed) => { setOpenDeptModal(false); if (changed) fetchUsers(); }} />
        <DeviceGroupModal open={openGroupModal} onClose={() => setOpenGroupModal(false)} />
        <ProfileDrawer
          open={openProfileDrawer}
          user={selectedUser}
          onCancel={() => setOpenProfileDrawer(false)}
          onUpdateSuccess={() => fetchUsers()}
        />

        {/* User Batch Import Modal */}
        <UserImportModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onSuccess={() => fetchUsers()}
          existingUsers={users}
          departments={departments}
        />

        {/* Custom CSS */}
        <style>{`
          .usr-stat-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px 18px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            transition: all 0.2s ease;
          }
          .usr-stat-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            transform: translateY(-1px);
          }
          .usr-stat-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 6px;
          }
          .usr-stat-label {
            font-size: 12.5px;
            font-weight: 600;
            color: #64748b;
          }
          .usr-stat-icon {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
          }
          .usr-stat-val {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
            line-height: 1.2;
            letter-spacing: -0.02em;
          }
          .usr-stat-sub {
            font-size: 11.5px;
            color: #64748b;
            margin-top: 4px;
          }
          .ant-table-tbody > tr:hover > td { background: #f8fafc !important; }
          .ant-table-tbody > tr { transition: background 0.15s ease; }
        `}</style>
      </Content>
    </Layout>
  );
};

export default Users;
