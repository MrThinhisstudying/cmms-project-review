import { useMemo, useRef, useState } from "react";
import {
  IMaintenance,
  MaintenanceUpsertPayload,
} from "../types/maintenance.types";
import { useMaintenanceContext } from "../context/MaintenanceContext/MaintenanceContext";
import { getToken } from "../utils/auth";
import {
  createMaintenance,
  deleteMaintenance,
  updateMaintenance,
} from "../apis/maintenance";

export function useMaintenanceCrud() {
  const { fetchMaintenances } = useMaintenanceContext();
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

  const handleCloseForm = () => {
    setOpenForm(false);
    setSelected(null);
  };

  return {
    page,
    setPage,
    rowsPerPage,
    openForm,
    selected,
    saving,
    toast,
    openToast,
    setOpenToast,
    handleAdd,
    handleEdit,
    handleDelete,
    handleSubmitUpsert,
    handleCloseForm,
  };
}
