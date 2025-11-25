import React, { useMemo, useState } from "react";
import {
  TableHead,
  TableCell,
  TableBody,
  IconButton,
  Box,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import { IUser } from "../../../../types/user.types";
import ConfirmModal from "../../../../components/Modal";
import UNKNOWN from "../../../../assets/images/unknown.jpg";
import {
  CustomTable,
  TableCellHeader,
  TableRowBody,
  TableRowContainer,
} from "./style";

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

  return (
    <>
      <CustomTable stickyHeader>
        <TableHead>
          <TableRowContainer>
            <TableCellHeader>Tên</TableCellHeader>
            <TableCellHeader>Email</TableCellHeader>
            <TableCellHeader>Chức vụ</TableCellHeader>
            <TableCellHeader>Phòng ban</TableCellHeader>
            <TableCellHeader>Số CCCD</TableCellHeader>
            <TableCellHeader>Trạng thái</TableCellHeader>
            <TableCellHeader>Vai trò</TableCellHeader>
            <TableCellHeader>Thay đổi mật khẩu</TableCellHeader>
            <TableCellHeader>Sửa</TableCellHeader>
            <TableCellHeader>Xoá</TableCellHeader>
          </TableRowContainer>
        </TableHead>
        <TableBody>
          {paginatedUsers.map((user, index) => (
            <TableRowBody key={user.user_id} index={index}>
              <TableCell>
                <Box style={{ display: "flex", alignItems: "center" }}>
                  <img
                    src={user.avatar || UNKNOWN}
                    alt={user.name}
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      marginRight: "8px",
                    }}
                  />
                  {user.name}
                </Box>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.position}</TableCell>
              <TableCell>{user.department?.name}</TableCell>
              <TableCell>{user.citizen_identification_card}</TableCell>
              <TableCell>
                {user.status === "active" ? (
                  <>
                    <Typography
                      width="10px"
                      height="10px"
                      borderRadius="50%"
                      display="inline-block"
                      marginRight="8px"
                      bgcolor="green"
                    />
                    Đang hoạt động
                  </>
                ) : (
                  <>
                    <Typography
                      width="10px"
                      height="10px"
                      borderRadius="50%"
                      display="inline-block"
                      marginRight="8px"
                      bgcolor="red"
                    />
                    Không hoạt động
                  </>
                )}
              </TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell>
                <IconButton
                  color="primary"
                  onClick={() => onUpdatePassword(user)}
                  aria-label="pass"
                >
                  <LockIcon />
                </IconButton>
              </TableCell>
              <TableCell>
                <IconButton
                  color="primary"
                  onClick={() => onEdit(user)}
                  aria-label="edit"
                >
                  <EditIcon />
                </IconButton>
              </TableCell>
              <TableCell>
                <IconButton
                  color="error"
                  onClick={() => handleDeleteClick(user.user_id)}
                  aria-label="delete"
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRowBody>
          ))}
        </TableBody>
      </CustomTable>

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
