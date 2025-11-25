import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Box,
  Typography,
} from "@mui/material";
import { Edit, Delete, Add } from "@mui/icons-material";
import { useDepartmentsContext } from "../../../../context/DepartmentsContext/DepartmentsContext";
import { CustomButton } from "../../../../components/Button";
import DepartmentFormModal from "../DepartmentFormModal";
import Toast from "../../../../components/Toast";
import ConfirmModal from "../../../../components/Modal";

const DepartmentModal: React.FC<{
  open: boolean;
  onClose: (changed?: boolean) => void;
}> = ({ open, onClose }) => {
  const { departments, removeDepartment } = useDepartmentsContext();

  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [changed, setChanged] = useState(false);

  const toast = useRef<{ type: "error" | "success"; content: string }>({
    type: "success",
    content: "",
  });
  const [openToast, setOpenToast] = useState(false);

  const handleOpenAdd = () => {
    setEditingId(null);
    setOpenForm(true);
  };

  const handleOpenEdit = (id: number) => {
    setEditingId(id);
    setOpenForm(true);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      await removeDepartment(deleteId);
      toast.current = { type: "success", content: "Xóa phòng ban thành công" };
      onClose(true);
      setChanged(true);
    } catch (e) {
      toast.current = { type: "error", content: "Xóa phòng ban thất bại" };
    } finally {
      setConfirmOpen(false);
      setDeleteId(null);
      setOpenToast(true);
    }
  };

  const handleFormClose = (isChanged?: boolean) => {
    setOpenForm(false);
    if (isChanged) setChanged(true);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={() => onClose(changed)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Quản lý phòng ban</DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <CustomButton
              color="primary"
              variant="contained"
              padding="4px 12px"
              startIcon={<Add />}
              onClick={handleOpenAdd}
            >
              Thêm phòng ban
            </CustomButton>
          </Box>

          {departments.length === 0 && (
            <Typography>Chưa có phòng ban nào</Typography>
          )}
          <List>
            {departments.map((dept) => (
              <ListItem
                key={dept.dept_id}
                sx={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  mb: 1,
                  pr: 12,
                  "&:hover": { backgroundColor: "#fafafa" },
                }}
                secondaryAction={
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Box
                      sx={{
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        p: "2px",
                        backgroundColor: "#fff",
                      }}
                    >
                      <IconButton
                        onClick={() => handleOpenEdit(dept.dept_id)}
                        size="small"
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Box>
                    <Box
                      sx={{
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        p: "2px",
                        backgroundColor: "#fff",
                      }}
                    >
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteClick(dept.dept_id)}
                        size="small"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                }
              >
                <ListItemText
                  primary={
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "100%",
                      }}
                    >
                      {dept.name}
                    </Typography>
                  }
                  secondary={
                    dept.description && (
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "100%",
                        }}
                      >
                        {dept.description}
                      </Typography>
                    )
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <CustomButton
            color="secondary"
            variant="outlined"
            padding="4px 12px"
            onClick={() => onClose(changed)}
          >
            Đóng
          </CustomButton>
        </DialogActions>
      </Dialog>

      <DepartmentFormModal
        open={openForm}
        onClose={handleFormClose}
        editingId={editingId}
      />

      <ConfirmModal
        open={confirmOpen}
        title="Xác nhận xóa"
        content="Bạn có chắc chắn muốn xóa phòng ban này?"
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      <Toast
        content={toast.current?.content}
        variant={toast.current?.type}
        open={openToast}
        onClose={() => setOpenToast(false)}
      />
    </>
  );
};

export default DepartmentModal;
