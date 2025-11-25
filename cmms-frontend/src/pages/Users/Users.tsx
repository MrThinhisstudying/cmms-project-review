import React, { useState, useMemo, useRef, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CategoryIcon from "@mui/icons-material/Category";
import { ICreateUser, IUpdatePassword, IUser } from "../../types/user.types";
import UserStats from "./components/UserStats";
import UserSearchBar from "./components/UserSearchBar";
import UserTable from "./components/UserTable";
import UserForm from "./components/UserForm";
import Pagination from "../../components/Pagination/Pagination";
import { useUsersContext } from "../../context/UsersContext/UsersContext";
import { createUser, deleteUser, updateUser } from "../../apis/users";
import Toast from "../../components/Toast";
import EditPasswordForm from "./components/EditPasswordForm";
import UserManagementSkeleton from "./components/UserManagementSkeleton";
import { CustomButton } from "../../components/Button";
import { useDepartmentsContext } from "../../context/DepartmentsContext/DepartmentsContext";
import DepartmentModal from "./components/DepartmentModal";
import { getToken } from "../../utils/auth";

const Users: React.FC = () => {
  const { users, loading, fetchUsers } = useUsersContext();
  const { departments } = useDepartmentsContext();

  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<number | "">("");
  const [openForm, setOpenForm] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);
  const [openDeptModal, setOpenDeptModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [page, setPage] = useState<number>(1);
  const rowsPerPage = 10;

  useEffect(() => {
    setPage(1);
  }, [selectedDept, search]);

  const filteredUsers = useMemo(() => {
    let result = users;

    if (search.trim()) {
      result = result.filter((user: IUser) =>
        user.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (selectedDept) {
      result = result.filter(
        (user: IUser) => user.department?.dept_id === selectedDept
      );
    }

    return result;
  }, [users, search, selectedDept]);

  const toast = useRef<{ type: "error" | "success"; content: string }>({
    type: "success",
    content: "",
  });
  const [openToast, setOpenToast] = useState(false);

  const calculatePercentage = (value: number, total: number) =>
    total > 0 ? `${((value / total) * 100).toFixed(1)}%` : "0%";

  const stats = useMemo(() => {
    const totalUsers = users.length;

    const activeUsers = users.filter(
      (user: IUser) => user.status === "active"
    ).length;
    const deactiveUsers = users.filter(
      (user) => user.status === "deactive"
    ).length;

    const currentMonth = new Date().getMonth();
    const newUsersThisMonth = users.filter((user) => {
      const userCreatedAt = new Date(user.created_at);
      return userCreatedAt.getMonth() === currentMonth;
    }).length;

    return [
      {
        label: "Tổng số user",
        value: totalUsers,
        change: calculatePercentage(totalUsers, totalUsers),
      },
      {
        label: "Số user đang hoạt động",
        value: activeUsers,
        change: calculatePercentage(activeUsers, totalUsers),
      },
      {
        label: "Số user mới trong tháng",
        value: newUsersThisMonth,
        change: calculatePercentage(newUsersThisMonth, totalUsers),
      },
      {
        label: "Số user không hoạt động",
        value: deactiveUsers,
        change: calculatePercentage(deactiveUsers, totalUsers),
      },
    ];
  }, [users]);

  const handleAddUser = () => {
    setSelectedUser(null);
    setOpenForm(true);
  };

  const handleEditUser = (user: IUser) => {
    setSelectedUser(user);
    setOpenForm(true);
  };

  const onUpdatePassword = (user: IUser) => {
    setSelectedUser(user);
    setResetPassword(true);
  };

  const handleUpdatePassword = async (user: IUpdatePassword) => {
    try {
      const token = getToken();
      if (!selectedUser) throw new Error("Không có người dùng được chọn.");

      await updateUser(selectedUser.user_id, user, token);
      toast.current = {
        content: "Cập nhật mật khẩu thành công",
        type: "success",
      };
    } catch (error) {
      toast.current = { content: "Cập nhật mật khẩu thất bại", type: "error" };
    } finally {
      setOpenToast(true);
      setResetPassword(false);
      fetchUsers();
    }
  };

  const handleUpdateUser = async (user: ICreateUser) => {
    try {
      const token = getToken();
      const result = selectedUser
        ? await updateUser(selectedUser.user_id, user, token)
        : await createUser(user, token);

      toast.current = { content: result.message, type: "success" };
      setOpenToast(true);
      fetchUsers();
    } catch (error) {
      toast.current = {
        content:
          error instanceof Error
            ? error.message
            : selectedUser
            ? "Cập nhật người dùng thất bại"
            : "Thêm người dùng thất bại",
        type: "error",
      };
      setOpenToast(true);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      const token = getToken();
      const result = await deleteUser(userId, token);

      fetchUsers();
      toast.current = {
        content: result.message || "Xóa người dùng thành công",
        type: "success",
      };
      setOpenToast(true);
    } catch (error) {
      toast.current = {
        content:
          error instanceof Error ? error.message : "Xóa người dùng thất bại",
        type: "error",
      };
      setOpenToast(true);
    }
  };

  const onPageChange = (newPage: number) => setPage(newPage);

  const handleSearchChange = (name: string) => {
    setSearch(name);
    setPage(1);
  };

  return (
    <>
      {loading ? (
        <UserManagementSkeleton />
      ) : (
        <Box
          display="flex"
          flexDirection="column"
          sx={{ height: "calc(100vh - 120px)" }}
        >
          <Box mb={2}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6">Quản lý người dùng</Typography>
              <Box display="flex" gap={2}>
                <CustomButton
                  variant="outlined"
                  startIcon={<CategoryIcon />}
                  onClick={() => setOpenDeptModal(true)}
                  sx={{ height: 40 }}
                >
                  Quản lý phòng ban
                </CustomButton>
                <CustomButton
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddUser}
                  sx={{ height: 40 }}
                >
                  Thêm mới người dùng
                </CustomButton>
              </Box>
            </Box>
          </Box>

          <Box flex="1" display="flex" flexDirection="column" overflow="hidden">
            <UserStats stats={stats} />
            <UserSearchBar
              search={search}
              onChange={handleSearchChange}
              selectedDept={selectedDept}
              onChangeDept={setSelectedDept}
              departments={departments}
            />

            <Box flex="1" overflow="auto" mt={2}>
              <UserTable
                users={filteredUsers}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
                onUpdatePassword={onUpdatePassword}
                rowsPerPage={rowsPerPage}
                page={page}
              />
            </Box>
          </Box>

          <Box mt="auto">
            <Pagination
              data={filteredUsers}
              rowsPerPage={rowsPerPage}
              onPageChange={onPageChange}
              page={page}
            />
          </Box>

          <UserForm
            open={openForm}
            onClose={() => setOpenForm(false)}
            onSave={handleUpdateUser}
            selectedUser={selectedUser}
          />
          <EditPasswordForm
            open={resetPassword}
            onClose={() => setResetPassword(false)}
            onSave={handleUpdatePassword}
          />
          <DepartmentModal
            open={openDeptModal}
            onClose={(changed) => {
              setOpenDeptModal(false);
              if (changed) fetchUsers();
            }}
          />

          <Toast
            content={toast.current?.content}
            variant={toast.current?.type}
            open={openToast}
            onClose={() => setOpenToast(false)}
          />
        </Box>
      )}
    </>
  );
};

export default Users;
