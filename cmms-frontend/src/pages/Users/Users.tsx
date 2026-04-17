import { PlusOutlined, DeleteOutlined, EditOutlined, UserOutlined, TeamOutlined, SafetyCertificateOutlined, WarningOutlined, EyeOutlined, UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import { useUsersContext } from "../../context/UsersContext/UsersContext";
import { useDepartmentsContext } from "../../context/DepartmentsContext/DepartmentsContext";
import { createUser, deleteUser, updateUser } from "../../apis/users";
import { getDeviceGroups, IDeviceGroup } from "../../apis/device-groups";
import UserModal from "./components/UserModal";
import React, { useState, useEffect, useMemo } from "react";
import { Table, Button, Space, Tag, Popconfirm, message, Input, Tooltip, Row, Col, Layout, Typography, Avatar, Card, Upload, Modal } from "antd";
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

const { Content } = Layout;
const { Title, Text } = Typography;

const Users: React.FC = () => {
  const { user: currentUser } = useAuthContext();
  const isTeamLead = currentUser?.role === 'TEAM_LEAD';

  const { users, loading, fetchUsers } = useUsersContext();
  const { departments } = useDepartmentsContext();
  
  const [deviceGroups, setDeviceGroups] = useState<IDeviceGroup[]>([]);
  const [expiringCerts, setExpiringCerts] = useState<IEmployeeCertificate[]>([]);
  const [searchText, setSearchText] = useState("");
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
     // Fetch device groups
     getDeviceGroups().then(groups => setDeviceGroups(groups)).catch(console.error);
     // Fetch expiring certificates
     certificatesApi.getExpiringCertificates(90).then(certs => setExpiringCerts(certs)).catch(console.error);
  }, []);

  const handleView = (user: IUser) => {
      setSelectedUser(user);
      setOpenProfileDrawer(true);
  }

  const handleCreate = () => {
      setSelectedUser(null);
      setViewOnlyMode(false);
      setOpenUserModal(true);
  }

  const handleEdit = (user: IUser) => {
      setSelectedUser(user);
      setViewOnlyMode(false);
      setOpenUserModal(true);
  }

  const handleDelete = async (user: IUser) => {
      try {
          const token = getToken();
          await deleteUser(user.user_id, token);
          message.success("Xóa người dùng thành công");
          fetchUsers();
      } catch (error) {
          message.error("Xóa người dùng thất bại");
      }
  }

  const handleSaveUser = async (values: ICreateUser) => {
      setSubmitting(true);
      try {
          const token = getToken();
          // If editing, use updateUser, else createUser
          if (selectedUser) {
             await updateUser(selectedUser.user_id, values, token);
             message.success("Cập nhật thành công");
          } else {
             await createUser(values, token);
             message.success("Tạo mới thành công");
          }
          setOpenUserModal(false);
          fetchUsers();
      } catch (error: any) {
          message.error(error.message || "Có lỗi xảy ra");
      } finally {
          setSubmitting(false);
      }
  }

  const filteredUsers = useMemo(() => {
      if (!searchText) return users;
      const lower = searchText.toLowerCase();
      return users.filter(u => 
          u.name.toLowerCase().includes(lower) || 
          u.email.toLowerCase().includes(lower) ||
          u.role.toLowerCase().includes(lower)
      );
  }, [users, searchText]);

  // --- Excel Import/Export handlers ---
  const handleExportExcel = async () => {
      try {
          message.loading({ content: 'Đang xuất file Excel...', key: 'export' });
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
          if (rows.length === 0) {
              message.warning('File không có dữ liệu hợp lệ');
              return;
          }
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
          let created = 0;
          let updated = 0;
          for (const row of importPreview) {
              const payload: Partial<ICreateUser> = {
                  name: row.name || undefined,
                  employee_code: row.employee_code || undefined,
                  position: row.position || undefined,
                  email: row.email || undefined,
                  phone_number: row.phone_number || undefined,
                  citizen_identification_card: row.citizen_identification_card || undefined,
                  date_of_birth: row.date_of_birth || undefined,
                  place_of_birth: row.place_of_birth || undefined,
                  cccd_issue_date: row.cccd_issue_date || undefined,
                  permanent_address: row.permanent_address || undefined,
                  temporary_address: row.temporary_address || undefined,
                  hometown: row.hometown || undefined,
              };
              if (row.isExisting && row.existingUserId) {
                  await updateUser(row.existingUserId, payload as ICreateUser, token);
                  updated++;
              } else {
                  await createUser({ ...payload, password: 'Default@123', role: 'OPERATOR', status: 'active' } as ICreateUser, token);
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

  const columns = [
      {
          title: 'Họ và tên',
          dataIndex: 'name',
          key: 'name',
          onCell: () => ({ 'data-label': 'Họ và tên' }) as any,
          render: (text: string, record: IUser) => (
             <Space>
                <Avatar 
                    src={record.avatar} 
                    icon={<UserOutlined />} 
                    style={{ backgroundColor: '#f0f2f5', color: '#8c8c8c' }} 
                />
                <Space direction="vertical" size={0}>
                    <Space size={4}>
                        <Text strong>{text}</Text>
                        {record.user_device_groups?.[0]?.is_group_lead && (
                            <Tooltip title="Trưởng nhóm">
                                <SafetyCertificateOutlined style={{ color: '#faad14' }} />
                            </Tooltip>
                        )}
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.employee_code || 'Chưa có MSNV'}</Text>
                    {!record.signature_url && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            <WarningOutlined style={{ color: '#faad14', marginRight: 4 }} /> 
                            Thiếu chữ ký
                        </Text>
                    )}
                </Space>
             </Space>
          )
      },
      {
          title: 'Liên hệ',
          dataIndex: 'email',
          key: 'email',
          render: (email: string, record: IUser) => (
              <Space direction="vertical" size={0}>
                  <Text>{email}</Text>
                  {record.phone_number && <Text type="secondary" style={{ fontSize: 12 }}>{record.phone_number}</Text>}
              </Space>
          )
      },
      {
          title: 'Vai trò',
          dataIndex: 'role',
          key: 'role',
          align: 'center' as const,
          render: (role: string) => {
              let displayRole = role;
              let color = 'blue';
              switch(role?.toUpperCase()) {
                  case 'ADMIN': displayRole = 'Quản trị viên'; color = 'red'; break;
                  case 'OPERATOR': displayRole = 'Vận hành'; color = 'cyan'; break;
                  case 'TECHNICIAN': displayRole = 'Kỹ thuật'; color = 'geekblue'; break;
                  case 'TEAM_LEAD': displayRole = 'Tổ trưởng'; color = 'purple'; break;
                  case 'UNIT_HEAD': displayRole = 'Cán bộ đội'; color = 'volcano'; break;
                  case 'DIRECTOR': displayRole = 'Ban giám đốc'; color = 'gold'; break;
              }
              return <Tag color={color} style={{ minWidth: 80, textAlign: 'center' }}>{displayRole}</Tag>;
          }
      },
      {
          title: 'Nhóm thiết bị',
          key: 'group',
          onCell: () => ({ 'data-label': 'Nhóm thiết bị' }) as any,
          render: (_: any, record: IUser) => {
              const group = record.user_device_groups?.[0]?.device_group;
              return group ? <Tag icon={<TeamOutlined />} color="default">{group.name}</Tag> : '-';
          }
      },
      {
          title: 'Phòng ban',
          dataIndex: ['department', 'name'],
          key: 'department',
          onCell: () => ({ 'data-label': 'Phòng ban' }) as any,
          render: (text: string) => text || '-'
      },
      {
          title: 'Trạng thái',
          dataIndex: 'status',
          key: 'status',
          align: 'center' as const,
          onCell: () => ({ 'data-label': 'Trạng thái' }) as any,
          render: (status: string) => (
              <Tag color={status === 'active' ? 'success' : 'default'} style={{ borderRadius: 12 }}>
                  {status === 'active' ? 'Hoạt động' : 'Ngừng hoạt động'}
              </Tag>
          )
      },
      {
          title: 'Hành động',
          key: 'action',
          align: 'right' as const,
          width: 120,
          render: (_: any, record: IUser) => (
              <Space size="small">
                  <Tooltip title="Xem chi tiết">
                    <Button type="text" icon={<EyeOutlined style={{ color: '#1890ff' }} />} size="small" onClick={() => handleView(record)} />
                  </Tooltip>
                  {!isTeamLead && (
                      <>
                          <Tooltip title="Chỉnh sửa">
                            <Button type="text" icon={<EditOutlined style={{ color: '#faad14' }} />} size="small" onClick={() => handleEdit(record)} />
                          </Tooltip>
                          <Popconfirm title="Xóa người dùng?" onConfirm={() => handleDelete(record)}>
                              <Button type="text" icon={<DeleteOutlined />} size="small" danger />
                          </Popconfirm>
                      </>
                  )}
              </Space>
          )
      }
  ];

  return (
    <Layout style={{ height: '100%', background: '#f0f2f5', padding: 24 }}>
      <Content style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {expiringCerts.length > 0 && !isTeamLead && (
            <Card variant="borderless" style={{ marginBottom: 24, borderRadius: 8, borderColor: '#ffa39e', backgroundColor: '#fff1f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }} styles={{ body: { padding: '16px 24px' } }}>
                <Title level={5} style={{ margin: 0, color: '#cf1322' }}>
                    <WarningOutlined style={{ marginRight: 8 }} />
                    Cảnh báo: Có {expiringCerts.length} chứng chỉ sắp hết hạn (trong vòng 3 tháng)
                </Title>
                <div style={{ marginTop: 8 }}>
                    {expiringCerts.map(cert => (
                        <div key={cert.id} style={{ marginBottom: 4 }}>
                            • Nhân viên <strong>{cert.user?.name}</strong> - Chứng chỉ <strong>{cert.program?.name}</strong> (Hết hạn: {dayjs(cert.next_training_date).format('DD/MM/YYYY')})
                        </div>
                    ))}
                </div>
            </Card>
        )}

        {/* Toolbar */}
        <Card variant="borderless" styles={{ body: { padding: '16px 24px' } }} style={{ marginBottom: 24, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <Row justify="space-between" align="middle" gutter={[16, 16]}>
                <Col xs={24} md={10}>
                    <Space size={16} wrap>
                        <Title level={4} style={{ margin: 0 }}>{isTeamLead ? 'Danh sách nhân sự đội/phòng' : 'Quản lý người dùng'}</Title>
                        <Input.Search 
                            placeholder="Tìm kiếm theo tên, email..." 
                            allowClear 
                            onSearch={val => setSearchText(val)}
                            onChange={e => setSearchText(e.target.value)}
                            style={{ width: 250 }}
                        />
                    </Space>
                </Col>
                <Col xs={24} md={14} style={{ textAlign: 'right' }}>
                    {!isTeamLead && (
                        <Space wrap>
                            <Button onClick={() => setOpenDeptModal(true)}>Phòng ban</Button>
                            <Button onClick={() => setOpenGroupModal(true)}>Nhóm thiết bị</Button>
                            <Upload
                                accept=".xlsx,.xls,.csv"
                                showUploadList={false}
                                beforeUpload={(file) => {
                                    handleImportFile(file as File);
                                    return false;
                                }}
                            >
                                <Button icon={<UploadOutlined />} loading={importLoading}>Import Excel</Button>
                            </Upload>
                            <Button icon={<DownloadOutlined />} onClick={handleExportExcel}>Xuất Excel</Button>
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Thêm mới</Button>
                        </Space>
                    )}
                </Col>
            </Row>
        </Card>

        {/* Table/Card Responsive Handling */}
        <Card variant="borderless" styles={{ body: { padding: 0 } }} style={{ borderRadius: 8, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'none' }} className="mobile-list">
               <Table 
                    columns={columns} 
                    dataSource={filteredUsers} 
                    rowKey="user_id"
                    loading={loading}
                    pagination={{ 
                        pageSize: 10,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50'],
                        showTotal: (total) => `Tổng ${total} người dùng`
                    }} 
                    scroll={{ x: '100%' }}
                    size="middle"
                />
            </div>
            
            <div className="desktop-table">
                <Table 
                    columns={columns} 
                    dataSource={filteredUsers} 
                    rowKey="user_id"
                    loading={loading}
                    pagination={{ 
                        pageSize: 10,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50'],
                        showTotal: (total) => `Tổng ${total} người dùng`
                    }} 
                    scroll={{ x: 1000 }}
                    size="middle"
                />
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .desktop-table { display: none; }
                    .mobile-list { display: block !important; }
                    .mobile-list .ant-table-thead { display: none; }
                    .mobile-list .ant-table-tbody > tr {
                        display: block;
                        margin-bottom: 16px;
                        border: 1px solid #f0f0f0;
                        border-radius: 8px;
                        padding: 12px;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                    }
                    .mobile-list .ant-table-tbody > tr > td {
                        display: flex;
                        justify-content: space-between;
                        text-align: right;
                        border-bottom: 1px solid #f0f0f0;
                        padding: 8px 4px !important;
                    }
                    .mobile-list .ant-table-tbody > tr > td:last-child {
                        border-bottom: none;
                        justify-content: flex-end;
                    }
                    .mobile-list .ant-table-tbody > tr > td::before {
                        content: attr(data-label);
                        font-weight: 600;
                        text-align: left;
                        flex: 1;
                        color: #555;
                    }
                }
            `}</style>
        </Card>

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

        <DepartmentModal
            open={openDeptModal}
            onClose={(changed) => {
              setOpenDeptModal(false);
              if (changed) fetchUsers();
            }}
        />

        <DeviceGroupModal
            open={openGroupModal}
            onClose={() => setOpenGroupModal(false)}
        />

        <ProfileDrawer
            open={openProfileDrawer}
            user={selectedUser}
            onCancel={() => setOpenProfileDrawer(false)}
            onUpdateSuccess={() => {
                fetchUsers();
            }}
        />

        {/* Import Preview Modal */}
        <Modal
            title={<span>📥 Preview Import Excel ({importPreview.length} dòng)</span>}
            open={importModalOpen}
            onCancel={() => { setImportModalOpen(false); setImportPreview([]); }}
            onOk={handleConfirmImport}
            confirmLoading={importLoading}
            okText={`Xác nhận Import ${importPreview.length} dòng`}
            cancelText="Hủy"
            width={1000}
            style={{ top: 30 }}
        >
            <div style={{ marginBottom: 12, fontSize: 13, color: '#8c8c8c' }}>
                <Tag color="green">{importPreview.filter(r => !r.isExisting).length} tạo mới</Tag>
                <Tag color="blue">{importPreview.filter(r => r.isExisting).length} cập nhật (MSNV trùng)</Tag>
            </div>
            <Table
                dataSource={importPreview}
                rowKey="rowIndex"
                size="small"
                scroll={{ x: 1200, y: 400 }}
                pagination={false}
                columns={[
                    { title: 'Dòng', dataIndex: 'rowIndex', width: 50 },
                    { title: 'Họ tên', dataIndex: 'name', width: 150 },
                    { title: 'MSNV', dataIndex: 'employee_code', width: 80 },
                    { title: 'Chức vụ', dataIndex: 'position', width: 120 },
                    { title: 'Ngày sinh', dataIndex: 'date_of_birth', width: 100, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
                    { title: 'Email', dataIndex: 'email', width: 160, ellipsis: true },
                    { title: 'SĐT', dataIndex: 'phone_number', width: 110 },
                    { title: 'CCCD', dataIndex: 'citizen_identification_card', width: 120 },
                    { title: 'Quê', dataIndex: 'hometown', width: 120, ellipsis: true },
                    {
                        title: 'Trạng thái', width: 100,
                        render: (_: any, record: ParsedRow) => (
                            <Tag color={record.isExisting ? 'blue' : 'green'}>
                                {record.isExisting ? 'Cập nhật' : 'Tạo mới'}
                            </Tag>
                        )
                    },
                ]}
            />
        </Modal>
      </Content>
    </Layout>
  );
};

export default Users;
