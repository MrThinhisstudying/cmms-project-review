import { PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined, UserOutlined, TeamOutlined, SafetyCertificateOutlined, WarningOutlined, EyeOutlined } from "@ant-design/icons";
import { useUsersContext } from "../../context/UsersContext/UsersContext";
import { useDepartmentsContext } from "../../context/DepartmentsContext/DepartmentsContext";
import { createUser, deleteUser, updateUser } from "../../apis/users";
import { getDeviceGroups, IDeviceGroup } from "../../apis/device-groups";
import UserModal from "./components/UserModal";
import React, { useState, useEffect, useMemo } from "react";
import { Table, Button, Space, Tag, Popconfirm, message, Input, Tooltip, Row, Col, Layout, Typography, Avatar, Card } from "antd";
import { ICreateUser, IUser } from "../../types/user.types";
import DepartmentModal from "./components/DepartmentModal";
import DeviceGroupModal from "./components/DeviceGroupModal";
import { getToken } from "../../utils/auth";

const { Content } = Layout;
const { Title, Text } = Typography;

const Users: React.FC = () => {
  const { users, loading, fetchUsers } = useUsersContext();
  const { departments } = useDepartmentsContext();
  
  const [deviceGroups, setDeviceGroups] = useState<IDeviceGroup[]>([]);
  const [searchText, setSearchText] = useState("");
  const [openUserModal, setOpenUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [openDeptModal, setOpenDeptModal] = useState(false);
  const [openGroupModal, setOpenGroupModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewOnlyMode, setViewOnlyMode] = useState(false);

  useEffect(() => {
     // Fetch device groups
     getDeviceGroups().then(groups => setDeviceGroups(groups)).catch(console.error);
  }, []);

  const handleView = (user: IUser) => {
      setSelectedUser(user);
      setViewOnlyMode(true);
      setOpenUserModal(true);
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

  const columns = [
      {
          title: 'Họ và tên',
          dataIndex: 'name',
          key: 'name',
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
          render: (email: string) => <Text>{email}</Text>
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
          render: (_: any, record: IUser) => {
              const group = record.user_device_groups?.[0]?.device_group;
              return group ? <Tag icon={<TeamOutlined />} color="default">{group.name}</Tag> : '-';
          }
      },
      {
          title: 'Phòng ban',
          dataIndex: ['department', 'name'],
          key: 'department',
          render: (text: string) => text || '-'
      },
      {
          title: 'Trạng thái',
          dataIndex: 'status',
          key: 'status',
          align: 'center' as const,
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
                  <Tooltip title="Chỉnh sửa">
                    <Button type="text" icon={<EditOutlined style={{ color: '#faad14' }} />} size="small" onClick={() => handleEdit(record)} />
                  </Tooltip>
                  <Popconfirm title="Xóa người dùng?" onConfirm={() => handleDelete(record)}>
                      <Button type="text" icon={<DeleteOutlined />} size="small" danger />
                  </Popconfirm>
              </Space>
          )
      }
  ];

  return (
    <Layout style={{ height: '100%', background: '#f0f2f5', padding: 24 }}>
      <Content style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {/* Toolbar */}
        <Card bordered={false} bodyStyle={{ padding: '16px 24px' }} style={{ marginBottom: 24, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <Row justify="space-between" align="middle" gutter={[16, 16]}>
                <Col xs={24} md={10}>
                    <Space size={16} wrap>
                        <Title level={4} style={{ margin: 0 }}>Quản lý người dùng</Title>
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
                    <Space wrap>
                        <Button onClick={() => setOpenDeptModal(true)}>Phòng ban</Button>
                        <Button onClick={() => setOpenGroupModal(true)}>Nhóm thiết bị</Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Thêm mới</Button>
                    </Space>
                </Col>
            </Row>
        </Card>

        {/* Table */}
        <Card bordered={false} bodyStyle={{ padding: 0 }} style={{ borderRadius: 8, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
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
      </Content>
    </Layout>
  );
};

export default Users;
