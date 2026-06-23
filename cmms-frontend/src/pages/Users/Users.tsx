import {
  PlusOutlined, DeleteOutlined, EditOutlined, UserOutlined, TeamOutlined,
  SafetyCertificateOutlined, WarningOutlined, EyeOutlined, UploadOutlined,
  DownloadOutlined, FileTextOutlined, TrophyOutlined, ApartmentOutlined,
  MoreOutlined, MailOutlined, PhoneOutlined
} from "@ant-design/icons";
import { useUsersContext } from "../../context/UsersContext/UsersContext";
import { useDepartmentsContext } from "../../context/DepartmentsContext/DepartmentsContext";
import { createUser, deleteUser, updateUser, syncUserDepartments } from "../../apis/users";
import { getDeviceGroups, IDeviceGroup } from "../../apis/device-groups";
import UserModal from "./components/UserModal";
import React, { useState, useEffect, useMemo } from "react";
import {
  Table, Button, Space, Tag, Popconfirm, message, Input, Tooltip,
  Row, Col, Layout, Typography, Avatar, Card, Upload, Modal, Select,
  Dropdown, Badge, Divider
} from "antd";
import type { MenuProps } from "antd";
import { CheckCircleOutlined, StopOutlined, EditFilled } from "@ant-design/icons";
import { ICreateUser, IUser } from "../../types/user.types";
import DepartmentModal from "./components/DepartmentModal";
import DeviceGroupModal from "./components/DeviceGroupModal";
import ProfileDrawer from "./components/ProfileModal";
import certificatesApi from "../../apis/certificates";
import { IEmployeeCertificate } from "../../types/certificates.types";
import dayjs from "dayjs";
import { getToken } from "../../utils/auth";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import { exportUsersToExcel, parseExcelFile, ParsedRow } from "../../utils/excelHelper";
import { useLocation, useNavigate } from "react-router-dom";

const { Content } = Layout;
const { Title, Text } = Typography;

// --- Role display map ---
const ROLE_MAP: Record<string, { label: string; color: string }> = {
  ADMIN: { label: 'Quản trị viên', color: '#ff4d4f' },
  OPERATOR: { label: 'Vận hành', color: '#13c2c2' },
  TECHNICIAN: { label: 'Kỹ thuật', color: '#2f54eb' },
  TEAM_LEAD: { label: 'Tổ trưởng', color: '#722ed1' },
  UNIT_HEAD: { label: 'Cán bộ đội', color: '#fa541c' },
  DIRECTOR: { label: 'Ban giám đốc', color: '#faad14' },
  HR_MANAGER: { label: 'Quản lý NS', color: '#eb2f96' },
};

const Users: React.FC = () => {
  const { user: currentUser } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();
  const isHRMode = location.pathname === '/quan_ly_nhan_vien';
  const isAdmin = currentUser?.role === 'ADMIN';
  const isReadOnlyRole = ['OPERATOR', 'TECHNICIAN'].includes(currentUser?.role || '');

  const { users, loading, fetchUsers } = useUsersContext();
  const { departments } = useDepartmentsContext();

  const [deviceGroups, setDeviceGroups] = useState<IDeviceGroup[]>([]);
  const [expiringCerts, setExpiringCerts] = useState<IEmployeeCertificate[]>([]);
  const [searchText, setSearchText] = useState("");
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [openUserModal, setOpenUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [openDeptModal, setOpenDeptModal] = useState(false);
  const [openGroupModal, setOpenGroupModal] = useState(false);
  const [openProfileDrawer, setOpenProfileDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewOnlyMode, setViewOnlyMode] = useState(false);

  // Excel Import/Export states
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ParsedRow[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    getDeviceGroups().then(groups => setDeviceGroups(groups)).catch(console.error);
    certificatesApi.getExpiringCertificates(90).then(certs => setExpiringCerts(certs)).catch(console.error);
  }, []);

  // --- Handlers (giữ nguyên logic) ---
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

  const handleDelete = async (user: IUser) => {
    try {
      const token = getToken();
      await deleteUser(user.user_id, token);
      message.success("Xóa người dùng thành công");
      fetchUsers();
    } catch (error) {
      message.error("Xóa người dùng thất bại");
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
        message.success("Cập nhật thành công");
      } else {
        const res = await createUser(userValues, token);
        savedUserId = res?.data?.user_id;
        message.success("Tạo mới thành công");
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

  // --- Stats ---
  const stats = useMemo(() => {
    const active = users.filter(u => u.status === 'active').length;
    const noSig = users.filter(u => !u.signature_url).length;
    return { total: users.length, active, inactive: users.length - active, noSig, warnings: expiringCerts.length };
  }, [users, expiringCerts]);

  const filteredUsers = useMemo(() => {
    let result = users;
    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter(u =>
        u.name.toLowerCase().includes(lower) ||
        u.email.toLowerCase().includes(lower) ||
        (u.employee_code || '').toLowerCase().includes(lower)
      );
    }
    if (filterRole !== 'all') result = result.filter(u => u.role === filterRole);
    if (filterStatus !== 'all') result = result.filter(u => u.status === filterStatus);
    return result;
  }, [users, searchText, filterRole, filterStatus]);

  // --- Excel handlers ---
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
      setImportLoading(true);
      const rows = await parseExcelFile(file, users);
      if (rows.length === 0) { message.warning('File không có dữ liệu hợp lệ'); return; }
      setImportPreview(rows);
      setImportModalOpen(true);
    } catch (err) {
      message.error('Lỗi đọc file Excel');
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    setImportLoading(true);
    try {
      const token = getToken();
      let created = 0, updated = 0;
      for (const row of importPreview) {
        const payload: Partial<ICreateUser> = {
          name: row.name || undefined, employee_code: row.employee_code || undefined,
          position: row.position || undefined, email: row.email || undefined,
          phone_number: row.phone_number || undefined, citizen_identification_card: row.citizen_identification_card || undefined,
          date_of_birth: row.date_of_birth || undefined, place_of_birth: row.place_of_birth || undefined,
          cccd_issue_date: row.cccd_issue_date || undefined, permanent_address: row.permanent_address || undefined,
          temporary_address: row.temporary_address || undefined, hometown: row.hometown || undefined,
        };
        if (row.isExisting && row.existingUserId) {
          await updateUser(row.existingUserId, payload as ICreateUser, token);
          updated++;
        } else {
          await createUser({ ...payload, password: 'Vcs@123456', role: 'OPERATOR', status: 'active' } as ICreateUser, token);
          created++;
        }
      }
      message.success(`Import thành công: ${created} tạo mới, ${updated} cập nhật`);
      setImportModalOpen(false);
      setImportPreview([]);
      fetchUsers();
    } catch (err: any) {
      message.error(err.message || 'Lỗi import dữ liệu');
    } finally {
      setImportLoading(false);
    }
  };

  // --- Dropdown menu items ---
  const moreMenuItems: MenuProps['items'] = [
    { key: 'dept', icon: <ApartmentOutlined />, label: 'Quản lý Phòng ban', onClick: () => setOpenDeptModal(true) },
    ...(isHRMode ? [
      { key: 'contract', icon: <FileTextOutlined />, label: 'HĐ Lao động', onClick: () => navigate('/hop-dong-lao-dong') },
      { key: 'reward', icon: <TrophyOutlined />, label: 'Khen thưởng / Kỷ luật', onClick: () => navigate('/khen-thuong-ky-luat') },
    ] : [
      { key: 'group', icon: <TeamOutlined />, label: 'Nhóm thiết bị', onClick: () => setOpenGroupModal(true) },
    ]),
    { type: 'divider' as const },
    { key: 'import', icon: <UploadOutlined />, label: 'Import Excel', onClick: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.xls,.csv';
      input.onchange = (e: any) => { if (e.target.files?.[0]) handleImportFile(e.target.files[0]); };
      input.click();
    }},
    { key: 'export', icon: <DownloadOutlined />, label: 'Xuất Excel', onClick: handleExportExcel },
  ];

  // --- Table columns (redesigned: 5 cột gọn) ---
  const columns = [
    {
      title: 'Nhân viên',
      key: 'employee',
      width: '35%',
      render: (_: any, record: IUser) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar
            src={record.avatar}
            icon={<UserOutlined />}
            size={40}
            style={{ backgroundColor: '#f0f5ff', color: '#597ef7', flexShrink: 0 }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text strong style={{ fontSize: 14 }}>{record.name}</Text>
              {record.user_device_groups?.[0]?.is_group_lead && (
                <SafetyCertificateOutlined style={{ color: '#faad14', fontSize: 12 }} />
              )}
              {!record.signature_url && (
                <Tooltip title="Thiếu chữ ký số">
                  <WarningOutlined style={{ color: '#faad14', fontSize: 11 }} />
                </Tooltip>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{record.employee_code || '---'}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>•</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{record.position || '---'}</Text>
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
      title: 'Đơn vị',
      key: 'unit',
      width: '20%',
      render: (_: any, record: IUser) => {
        // Hiển thị từ user_departments nếu có
        const depts = (record as any).user_departments;
        if (depts && Array.isArray(depts) && depts.length > 0) {
          const primary = depts.find((d: any) => d.is_primary);
          const dept = primary || depts[0];
          return (
            <Text style={{ fontSize: 13 }}>{dept.department?.name || '---'}</Text>
          );
        }
        // Fallback: department cũ
        const deptName = (record as any).department?.name;
        return <Text style={{ fontSize: 13 }}>{deptName || '---'}</Text>;
      }
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: '15%',
      align: 'center' as const,
      render: (role: string) => {
        const info = ROLE_MAP[role?.toUpperCase()] || { label: role, color: '#8c8c8c' };
        return (
          <Tag
            style={{
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 500,
              border: 'none',
              backgroundColor: `${info.color}12`,
              color: info.color,
              padding: '2px 10px',
            }}
          >
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
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            backgroundColor: status === 'active' ? '#52c41a' : '#d9d9d9',
          }} />
          <Text style={{ fontSize: 12.5, color: status === 'active' ? '#52c41a' : '#8c8c8c' }}>
            {status === 'active' ? 'Hoạt động' : 'Ngừng'}
          </Text>
        </div>
      )
    },
    {
      title: '',
      key: 'action',
      width: '10%',
      align: 'right' as const,
      render: (_: any, record: IUser) => (
        <Space size={4} onClick={(e) => e.stopPropagation()}>
          {!isReadOnlyRole && (
            <>
              <Tooltip title="Chỉnh sửa">
                <Button type="text" size="small" icon={<EditOutlined />}
                  style={{ color: '#8c8c8c' }}
                  onClick={(e) => { e.stopPropagation(); handleEdit(record); }}
                />
              </Tooltip>
              <Popconfirm title="Xóa người dùng này?" onConfirm={() => handleDelete(record)}
                onPopupClick={(e) => e.stopPropagation()}>
                <Button type="text" size="small" icon={<DeleteOutlined />}
                  style={{ color: '#8c8c8c' }}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <Layout style={{ height: '100%', background: '#f5f5f5', padding: 24 }}>
      <Content style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: 1400, margin: '0 auto', width: '100%' }}>

        {/* ===== A. HEADER: Inline compact ===== */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Title level={3} style={{ margin: 0, fontWeight: 600, letterSpacing: '-0.02em' }}>
                {isReadOnlyRole ? 'Danh sách nhân sự' : isHRMode ? 'Quản lý nhân viên' : 'Quản lý tài khoản'}
              </Title>
              {/* Inline stats */}
              {!isReadOnlyRole && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    <TeamOutlined style={{ marginRight: 4 }} />{stats.total} nhân sự
                  </Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>•</Text>
                  <Text style={{ fontSize: 13, color: '#52c41a' }}>{stats.active} hoạt động</Text>
                  {stats.inactive > 0 && (
                    <>
                      <Text type="secondary" style={{ fontSize: 13 }}>•</Text>
                      <Text style={{ fontSize: 13, color: '#8c8c8c' }}>{stats.inactive} ngừng</Text>
                    </>
                  )}
                  {isHRMode && stats.warnings > 0 && (
                    <>
                      <Text type="secondary" style={{ fontSize: 13 }}>•</Text>
                      <Badge count={stats.warnings} size="small" offset={[2, 0]}>
                        <Text style={{ fontSize: 13, color: '#ff4d4f' }}>
                          <WarningOutlined style={{ marginRight: 3 }} />CC sắp hạn
                        </Text>
                      </Badge>
                    </>
                  )}
                  {isHRMode && stats.noSig > 0 && (
                    <>
                      <Text type="secondary" style={{ fontSize: 13 }}>•</Text>
                      <Text style={{ fontSize: 13, color: '#faad14' }}>
                        <EditFilled style={{ marginRight: 3 }} />{stats.noSig} thiếu chữ ký
                      </Text>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Primary action */}
            {isAdmin && !isReadOnlyRole && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}
                size="large"
                style={{ borderRadius: 8, fontWeight: 500, height: 42, paddingInline: 20 }}
              >
                Thêm mới
              </Button>
            )}
          </div>
        </div>

        {/* ===== B. TOOLBAR: Search + Filters + Menu ===== */}
        <Card
          variant="borderless"
          styles={{ body: { padding: '10px 16px' } }}
          style={{ marginBottom: 16, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Tìm theo tên, MSNV, email..."
              allowClear
              onSearch={val => setSearchText(val)}
              onChange={e => setSearchText(e.target.value)}
              style={{ flex: 1, minWidth: 200, maxWidth: 360 }}
              size="middle"
            />
            {isHRMode && (
              <>
                <Select value={filterRole} onChange={setFilterRole} style={{ width: 150 }} size="middle"
                  options={[
                    { value: 'all', label: 'Tất cả vai trò' },
                    { value: 'ADMIN', label: 'Quản trị viên' },
                    { value: 'HR_MANAGER', label: 'Quản lý NS' },
                    { value: 'DIRECTOR', label: 'Ban giám đốc' },
                    { value: 'UNIT_HEAD', label: 'Cán bộ đội' },
                    { value: 'TEAM_LEAD', label: 'Tổ trưởng' },
                    { value: 'TECHNICIAN', label: 'Kỹ thuật' },
                    { value: 'OPERATOR', label: 'Vận hành' },
                  ]}
                />
                <Select value={filterStatus} onChange={setFilterStatus} style={{ width: 140 }} size="middle"
                  options={[
                    { value: 'all', label: 'Tất cả TT' },
                    { value: 'active', label: '🟢 Hoạt động' },
                    { value: 'inactive', label: '⚪ Ngừng HĐ' },
                  ]}
                />
              </>
            )}
            <div style={{ flex: 1 }} />
            {!isReadOnlyRole && (
              <Dropdown menu={{ items: moreMenuItems }} trigger={['click']} placement="bottomRight">
                <Button icon={<MoreOutlined />} style={{ borderRadius: 8 }}>
                  Thao tác
                </Button>
              </Dropdown>
            )}
          </div>
        </Card>

        {/* ===== C. TABLE ===== */}
        <Card
          variant="borderless"
          styles={{ body: { padding: 0 } }}
          style={{ borderRadius: 10, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <Table
            columns={columns}
            dataSource={filteredUsers}
            rowKey="user_id"
            loading={loading}
            size="middle"
            scroll={{ x: 800 }}
            onRow={(record) => ({
              onClick: () => handleView(record),
              style: { cursor: 'pointer' },
            })}
            pagination={{
              pageSize: 15,
              showSizeChanger: true,
              pageSizeOptions: ['15', '30', '50'],
              showTotal: (total) => <Text type="secondary" style={{ fontSize: 13 }}>Tổng {total} người dùng</Text>,
              style: { padding: '0 16px' },
            }}
          />
        </Card>

        {/* ===== MODALS (giữ nguyên) ===== */}
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

        {/* Import Preview Modal */}
        <Modal
          title={<span>📥 Preview Import ({importPreview.length} dòng)</span>}
          open={importModalOpen}
          onCancel={() => { setImportModalOpen(false); setImportPreview([]); }}
          onOk={handleConfirmImport}
          confirmLoading={importLoading}
          okText={`Import ${importPreview.length} dòng`}
          cancelText="Hủy"
          width={1000}
          style={{ top: 30 }}
        >
          <div style={{ marginBottom: 12 }}>
            <Tag color="green">{importPreview.filter(r => !r.isExisting).length} tạo mới</Tag>
            <Tag color="blue">{importPreview.filter(r => r.isExisting).length} cập nhật</Tag>
          </div>
          <Table
            dataSource={importPreview} rowKey="rowIndex" size="small"
            scroll={{ x: 1200, y: 400 }} pagination={false}
            columns={[
              { title: '#', dataIndex: 'rowIndex', width: 50 },
              { title: 'Họ tên', dataIndex: 'name', width: 150 },
              { title: 'MSNV', dataIndex: 'employee_code', width: 80 },
              { title: 'Chức vụ', dataIndex: 'position', width: 120 },
              { title: 'Ngày sinh', dataIndex: 'date_of_birth', width: 100, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
              { title: 'Email', dataIndex: 'email', width: 160, ellipsis: true },
              { title: 'SĐT', dataIndex: 'phone_number', width: 110 },
              { title: 'CCCD', dataIndex: 'citizen_identification_card', width: 120 },
              { title: 'Trạng thái', width: 90, render: (_: any, r: ParsedRow) => <Tag color={r.isExisting ? 'blue' : 'green'}>{r.isExisting ? 'Cập nhật' : 'Mới'}</Tag> },
            ]}
          />
        </Modal>

        {/* Minimal CSS cho hover effect */}
        <style>{`
          .ant-table-tbody > tr:hover > td { background: #fafafa !important; }
          .ant-table-tbody > tr { transition: background 0.15s ease; }
        `}</style>
      </Content>
    </Layout>
  );
};

export default Users;
