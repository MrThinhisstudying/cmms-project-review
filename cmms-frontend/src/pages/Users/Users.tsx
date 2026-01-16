import { PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined, UserOutlined, TeamOutlined, SafetyCertificateOutlined, WarningOutlined, EyeOutlined } from "@ant-design/icons";
import { useUsersContext } from "../../context/UsersContext/UsersContext";
import { useDepartmentsContext } from "../../context/DepartmentsContext/DepartmentsContext";
import { createUser, deleteUser, updateUser } from "../../apis/users";
import { getDeviceGroups, IDeviceGroup } from "../../apis/device-groups";
import UserModal from "./components/UserModal";
import React, { useState, useEffect, useMemo } from "react";
import { Table, Button, Space, Tag, Popconfirm, message, Input, Tooltip } from "antd";
import { ICreateUser, IUser } from "../../types/user.types";
import DepartmentModal from "./components/DepartmentModal";
import DeviceGroupModal from "./components/DeviceGroupModal";
import { getToken } from "../../utils/auth";

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
                {record.avatar ? <img src={record.avatar} alt="avatar" style={{width: 24, height: 24, borderRadius: '50%'}} /> : <UserOutlined />}
                {text}
                {record.user_device_groups?.[0]?.is_group_lead && (
                    <Tooltip title="Trưởng nhóm">
                        <SafetyCertificateOutlined style={{ color: 'gold' }} />
                    </Tooltip>
                )}
                {!record.signature_url && (
                    <Tooltip title="Chưa cập nhật chữ ký số">
                        <WarningOutlined style={{ color: 'orange' }} />
                    </Tooltip>
                )}
             </Space>
          )
      },
      {
          title: 'Email',
          dataIndex: 'email',
          key: 'email',
      },
      {
          title: 'Vai trò',
          dataIndex: 'role',
          key: 'role',
          render: (role: string) => {
              let displayRole = role;
              switch(role?.toUpperCase()) {
                  case 'ADMIN': displayRole = 'Quản trị viên'; break;
                  case 'OPERATOR': displayRole = 'Vận hành'; break;
                  case 'TECHNICIAN': displayRole = 'Kỹ thuật'; break;
                  case 'TEAM_LEAD': displayRole = 'Tổ trưởng'; break;
                  case 'UNIT_HEAD': displayRole = 'Cán bộ đội'; break;
                  case 'DIRECTOR': displayRole = 'Ban giám đốc'; break;
              }
              return <Tag color={role === 'ADMIN' ? 'red' : 'blue'}>{displayRole}</Tag>;
          }
      },
      {
          title: 'Nhóm thiết bị',
          key: 'group',
          render: (_: any, record: IUser) => {
              const group = record.user_device_groups?.[0]?.device_group;
              return group ? <Tag icon={<TeamOutlined />} color="cyan">{group.name}</Tag> : '-';
          }
      },
      {
          title: 'Phòng ban',
          dataIndex: ['department', 'name'],
          key: 'department',
      },
      {
          title: 'Trạng thái',
          dataIndex: 'status',
          key: 'status',
          render: (status: string) => (
              <Tag color={status === 'active' ? 'success' : 'default'}>
                  {status === 'active' ? 'Hoạt động' : 'Ngừng hoạt động'}
              </Tag>
          )
      },
      {
          title: 'Hành động',
          key: 'action',
          render: (_: any, record: IUser) => (
              <Space>
                  <Button icon={<EyeOutlined />} size="small" onClick={() => handleView(record)} />
                  <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
                  <Popconfirm title="Bạn có chắc chắn muốn xóa?" onConfirm={() => handleDelete(record)}>
                      <Button icon={<DeleteOutlined />} size="small" danger />
                  </Popconfirm>
              </Space>
          )
      }
  ];

  return (
    <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Space>
                 <Input 
                    placeholder="Tìm kiếm..." 
                    prefix={<SearchOutlined />} 
                    onChange={e => setSearchText(e.target.value)} 
                    style={{ width: 300 }}
                 />
            </Space>
            <Space>
                <Button onClick={() => setOpenDeptModal(true)}>Quản lý phòng ban</Button>
                <Button onClick={() => setOpenGroupModal(true)}>Quản lý nhóm thiết bị</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Thêm mới</Button>
            </Space>
        </div>

        <Table 
            columns={columns} 
            dataSource={filteredUsers} 
            rowKey="user_id"
            loading={loading}
            pagination={{ pageSize: 10 }} 
        />

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
    </div>
  );
};

export default Users;
