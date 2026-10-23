import React, { useMemo, useState } from "react";
import { Table, Button, Tag, Avatar } from "antd";
import { EditOutlined, DeleteOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { IUser } from "../../../../types/user.types";
import ConfirmModal from "../../../../components/Modal";

interface UserTableProps {
  users: IUser[];
  onEdit: (user: IUser) => void;
  onDelete: (userId: number) => void;
  onUpdatePassword: (user: IUser) => void;
  rowsPerPage: number;
  page: number;
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  onEdit,
  onDelete,
  onUpdatePassword,
  rowsPerPage,
  page,
}) => {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return users.slice(start, end);
  }, [users, page, rowsPerPage]);

  const handleDeleteClick = (userId: number) => {
    setSelectedUserId(userId);
    setOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedUserId !== null) {
      onDelete(selectedUserId);
    }
    setOpen(false);
    setSelectedUserId(null);
  };

  const columns = [
    {
      title: "Tên",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: IUser) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar src={record.avatar} icon={<UserOutlined />} size={32} />
          <span style={{ fontWeight: 600 }}>{text}</span>
        </div>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Chức vụ",
      dataIndex: "position",
      key: "position",
    },
    {
      title: "Phòng ban",
      key: "department",
      render: (_: any, record: IUser) => record.department?.name || "-",
    },
    {
      title: "Số CCCD",
      dataIndex: "citizen_identification_card",
      key: "citizen_identification_card",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={status === "active" || status === "ACTIVE" ? "success" : "error"}>
          {status === "active" || status === "ACTIVE" ? "Đang hoạt động" : "Không hoạt động"}
        </Tag>
      ),
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      render: (role: string) => <Tag color="blue">{role}</Tag>,
    },
    {
      title: "Đổi MK",
      key: "password",
      render: (_: any, record: IUser) => (
        <Button
          type="text"
          icon={<LockOutlined style={{ color: "#1890ff" }} />}
          onClick={() => onUpdatePassword(record)}
        />
      ),
    },
    {
      title: "Sửa",
      key: "edit",
      render: (_: any, record: IUser) => (
        <Button
          type="text"
          icon={<EditOutlined style={{ color: "#52c41a" }} />}
          onClick={() => onEdit(record)}
        />
      ),
    },
    {
      title: "Xoá",
      key: "delete",
      render: (_: any, record: IUser) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteClick(record.user_id)}
        />
      ),
    },
  ];

  return (
    <>
      <Table
        dataSource={paginatedUsers}
        columns={columns}
        rowKey="user_id"
        pagination={false}
        bordered
      />

      <ConfirmModal
        open={open}
        title="Xác nhận xóa"
        content="Bạn có chắc chắn muốn xóa người dùng này?"
        onClose={() => {
          setOpen(false);
          setSelectedUserId(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default UserTable;
