import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormHelperText,
  Box,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Divider,
} from "@mui/material";
import { CustomButton } from "../../../../components/Button";
import { useDepartmentsContext } from "../../../../context/DepartmentsContext/DepartmentsContext";
import Toast from "../../../../components/Toast";
import { DEPARTMENT_PERMISSIONS } from "../../../../constants/user";

interface Props {
  open: boolean;
  onClose: (changed?: boolean) => void;
  editingId: number | null;
}

const DepartmentFormModal: React.FC<Props> = ({ open, onClose, editingId }) => {
  const { departments, addDepartment, editDepartment } =
    useDepartmentsContext();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);

  const [error, setError] = useState("");

  const toast = useRef<{ type: "error" | "success"; content: string }>({
    type: "success",
    content: "",
  });
  const [openToast, setOpenToast] = useState(false);

  useEffect(() => {
    if (editingId) {
      const dept = departments.find((d) => d.dept_id === editingId);
      setName(dept?.name || "");
      setDescription(dept?.description || "");
      setPermissions(dept?.permissions || []);
    } else {
      setName("");
      setDescription("");
      setPermissions([]);
    }
    setError("");
  }, [editingId, departments, open]);

  const handleTogglePermission = (code: string) => {
    setPermissions((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Tên phòng ban là bắt buộc");
      return;
    }

    try {
      if (editingId) {
        await editDepartment(editingId, {
          name: name.trim(),
          description: description.trim() || undefined,
          permissions,
        });
        toast.current = {
          type: "success",
          content: "Cập nhật phòng ban thành công",
        };
      } else {
        await addDepartment({
          name: name.trim(),
          description: description.trim() || undefined,
          permissions,
        });
        toast.current = {
          type: "success",
          content: "Thêm phòng ban thành công",
        };
      }
      setOpenToast(true);
      onClose(true);
    } catch (e) {
      toast.current = { type: "error", content: "Lưu phòng ban thất bại" };
      setOpenToast(true);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={() => onClose(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingId ? "Cập nhật phòng ban" : "Thêm phòng ban"}
        </DialogTitle>
        <DialogContent sx={{ paddingTop: "20px !important" }}>
          <TextField
            label="Tên phòng ban"
            fullWidth
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            error={!!error}
            autoFocus
          />
          {error && (
            <Box mt={1}>
              <FormHelperText error>{error}</FormHelperText>
            </Box>
          )}

          <Box mt={2}>
            <TextField
              label="Mô tả"
              fullWidth
              multiline
              minRows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Box>

          <Box mt={3}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Phân quyền cho phòng ban
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <FormGroup sx={{ gap: "8px" }}>
              {DEPARTMENT_PERMISSIONS.map((perm) => (
                <FormControlLabel
                  key={perm.code}
                  control={
                    <Checkbox
                      checked={permissions.includes(perm.code)}
                      onChange={() => handleTogglePermission(perm.code)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {perm.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {perm.description}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </Box>
        </DialogContent>

        <DialogActions>
          <CustomButton
            color="secondary"
            variant="outlined"
            padding="4px 12px"
            onClick={() => onClose(false)}
          >
            Hủy
          </CustomButton>
          <CustomButton
            color="primary"
            variant="contained"
            padding="4px 12px"
            onClick={handleSave}
          >
            {editingId ? "Cập nhật" : "Thêm"}
          </CustomButton>
        </DialogActions>
      </Dialog>

      <Toast
        content={toast.current?.content}
        variant={toast.current?.type}
        open={openToast}
        onClose={() => setOpenToast(false)}
      />
    </>
  );
};

export default DepartmentFormModal;
