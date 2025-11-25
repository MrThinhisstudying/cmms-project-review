import React, { useMemo, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import {
  IMaintenance,
  MaintenanceUpsertPayload,
} from "../../types/maintenance.types";
import { useMaintenanceContext } from "../../context/MaintenanceContext/MaintenanceContext";
import Pagination from "../../components/Pagination/Pagination";
import Toast from "../../components/Toast";
import { CustomButton } from "../../components/Button";
import AddIcon from "@mui/icons-material/Add";
import {
  createMaintenance,
  deleteMaintenance,
  updateMaintenance,
} from "../../apis/maintenance";
import MaintenanceSkeleton from "./components/MaintenanceManagementSkeleton";
import MaintenanceTable from "./components/MaintenanceTable";
import MaintenanceForm from "./components/MaintenanceForm";
import { getToken } from "../../utils/auth";

const MaintenanceManagement: React.FC = () => {
  const {
    maintenances = [],
    loading,
    fetchMaintenances,
  } = useMaintenanceContext();
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const [openForm, setOpenForm] = useState(false);
  const [selected, setSelected] = useState<IMaintenance | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useRef<{ type: "error" | "success"; content: string }>({
    type: "success",
    content: "",
  });
  const [openToast, setOpenToast] = useState(false);

  const handleAdd = () => {
    setSelected(null);
    setOpenForm(true);
  };

  const handleEdit = (row: IMaintenance) => {
    setSelected(row);
    setOpenForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const token = getToken();
      const res = await deleteMaintenance(id, token);
      toast.current = {
        type: "success",
        content: (res as any).message || "Xóa thành công",
      };
      setOpenToast(true);
      fetchMaintenances();
    } catch (err: any) {
      toast.current = {
        type: "error",
        content: err?.message || "Xóa thất bại",
      };
      setOpenToast(true);
    }
  };

  const handleSubmitUpsert = async (data: MaintenanceUpsertPayload) => {
    try {
      setSaving(true);
      const token = getToken();
      if (selected?.maintenance_id) {
        const res = await updateMaintenance(
          selected.maintenance_id,
          token,
          data
        );
        toast.current = {
          type: "success",
          content: (res as any).message || "Cập nhật thành công",
        };
      } else {
        const res = await createMaintenance(token, data);
        toast.current = {
          type: "success",
          content: (res as any).message || "Tạo thành công",
        };
      }
      setOpenToast(true);
      setOpenForm(false);
      setSelected(null);
      fetchMaintenances();
    } catch (err: any) {
      toast.current = {
        type: "error",
        content: err?.message || "Lưu thất bại",
      };
      setOpenToast(true);
    } finally {
      setSaving(false);
    }
  };

  const filteredData = useMemo(() => maintenances, [maintenances]);

  return (
    <>
      {loading ? (
        <MaintenanceSkeleton />
      ) : (
        <Box display="flex" flexDirection="column" height="calc(100vh - 130px)">
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            pb={2}
          >
            <Typography variant="h6">Lập lịch bảo dưỡng</Typography>
            <CustomButton
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              sx={{ height: "40px" }}
            >
              Thêm mới
            </CustomButton>
          </Box>
          <Box sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
            <MaintenanceTable
              rows={filteredData}
              rowsPerPage={rowsPerPage}
              page={page}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </Box>
          <Pagination
            data={filteredData}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            page={page}
          />
        </Box>
      )}
      <Toast
        content={toast.current?.content}
        variant={toast.current?.type}
        open={openToast}
        onClose={() => setOpenToast(false)}
      />
      <MaintenanceForm
        open={openForm}
        initialData={selected}
        onClose={() => {
          setOpenForm(false);
          setSelected(null);
        }}
        onSubmit={handleSubmitUpsert}
        loading={saving}
      />
    </>
  );
};

export default MaintenanceManagement;
