import React, { useMemo, useRef, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { CustomButton } from "../../components/Button";
import Toast from "../../components/Toast";
import Pagination from "../../components/Pagination/Pagination";
import { useRepairsContext } from "../../context/RepairsContext/RepairsContext";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import RepairForm from "./components/RepairForm";
import RepairsTable from "./components/RepairsTable";
import RepairDetailDialog from "./components/RepairDetailDialog";
import RepairInspectionForm from "./components/RepairInspectionForm";
import RepairAcceptanceForm from "./components/RepairAcceptanceForm";
import {
  IRepair,
  RepairUpsertPayload,
  RepairInspectionPayload,
  RepairAcceptancePayload,
} from "../../types/repairs.types";

const RepairsManagement: React.FC = () => {
  const {
    repairs,
    loading,
    createRepairItem,
    updateRepairItem,
    reviewRepairItem,
    submitInspectionStep,
    submitAcceptanceStep,
    requestStockOutForRepair,
    exportRepairItem,
    deleteRepairItem,
  } = useRepairsContext();

  const { user } = useAuthContext();
  const role = user?.role ?? "";
  const perms = user?.permissions ?? [];

  const canCreate = role === "admin" || perms.includes("CREATE_REPAIR");
  const canUpdate = role === "admin" || perms.includes("UPDATE_REPAIR");
  const canReview = role === "admin" || perms.includes("APPROVE_REPAIR");
  const canDelete = role === "admin" || perms.includes("DELETE_REPAIR");
  const canExport = role === "admin" || perms.includes("EXPORT_REPAIR");

  const [page, setPage] = useState(1);
  const [openForm, setOpenForm] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [openInspection, setOpenInspection] = useState(false);
  const [openAcceptance, setOpenAcceptance] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<IRepair | null>(null);
  const [saving, setSaving] = useState(false);

  const toast = useRef<{ type: "success" | "error"; content: string }>({
    type: "success",
    content: "",
  });

  const [openToast, setOpenToast] = useState(false);

  const filteredData = useMemo(() => repairs, [repairs]);

  const handleSubmit = async (data: RepairUpsertPayload) => {
    try {
      setSaving(true);
      if (selectedRepair) {
        await updateRepairItem(selectedRepair.repair_id, data);
        toast.current = {
          type: "success",
          content: "Cập nhật phiếu thành công",
        };
      } else {
        await createRepairItem(data);
        toast.current = {
          type: "success",
          content: "Tạo phiếu mới thành công",
        };
      }
    } catch (e) {
      toast.current = {
        type: "error",
        content: e instanceof Error ? e.message : "Thao tác thất bại",
      };
    } finally {
      setSaving(false);
      setSelectedRepair(null);
      setOpenForm(false);
      setOpenToast(true);
    }
  };

  const handleReview = async (
    id: number,
    action: "approve" | "reject",
    reason?: string,
    phase: "request" | "inspection" | "acceptance" = "request"
  ) => {
    try {
      setSaving(true);
      await reviewRepairItem(id, { action, reason, phase });
      toast.current = { type: "success", content: "Cập nhật duyệt thành công" };
    } catch (e) {
      toast.current = {
        type: "error",
        content: e instanceof Error ? e.message : "Duyệt thất bại",
      };
    } finally {
      setSaving(false);
      setOpenToast(true);
    }
  };

  const handleInspection = async (payload: RepairInspectionPayload) => {
    if (!selectedRepair) return;
    try {
      setSaving(true);

      if (payload.inspection_materials?.length) {
        for (const m of payload.inspection_materials) {
          if (m.item_id) {
            await requestStockOutForRepair({
              item_id: m.item_id,
              quantity: m.quantity,
              purpose: "Sửa chữa",
              repair_id: selectedRepair.repair_id,
            });
          }
        }
      }

      await submitInspectionStep(selectedRepair.repair_id, payload);

      toast.current = {
        type: "success",
        content: "Đã cập nhật & duyệt kiểm nghiệm",
      };
    } catch (e) {
      toast.current = {
        type: "error",
        content: e instanceof Error ? e.message : "Kiểm nghiệm thất bại",
      };
    } finally {
      setSaving(false);
      setSelectedRepair(null);
      setOpenInspection(false);
      setOpenToast(true);
    }
  };

  const handleAcceptance = async (payload: RepairAcceptancePayload) => {
    if (!selectedRepair) return;
    try {
      setSaving(true);

      await submitAcceptanceStep(selectedRepair.repair_id, payload);
      toast.current = {
        type: "success",
        content: "Đã cập nhật & duyệt nghiệm thu",
      };
    } catch (e) {
      toast.current = {
        type: "error",
        content: e instanceof Error ? e.message : "Nghiệm thu thất bại",
      };
    } finally {
      setSaving(false);
      setSelectedRepair(null);
      setOpenAcceptance(false);
      setOpenToast(true);
    }
  };

  const handleExport = async (
    id: number,
    type: "request" | "inspection" | "acceptance"
  ) => {
    try {
      await exportRepairItem(id, type);
      toast.current = { type: "success", content: "Đã xuất file Word" };
    } catch {
      toast.current = { type: "error", content: "Xuất file thất bại" };
    } finally {
      setOpenToast(true);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteRepairItem(id);
      toast.current = { type: "success", content: "Đã xóa phiếu" };
    } catch {
      toast.current = { type: "error", content: "Xóa phiếu thất bại" };
    } finally {
      setOpenToast(true);
    }
  };

  return (
    <>
      {loading ? (
        <Box textAlign="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" height="calc(100vh - 130px)">
          <Box display="flex" justifyContent="space-between" pb={2}>
            <Typography variant="h6" fontWeight="bold">
              Quản lý quy trình phiếu sửa chữa
            </Typography>

            {canCreate && (
              <CustomButton
                variant="contained"
                startIcon={<AddIcon />}
                padding="6px 16px"
                onClick={() => {
                  setSelectedRepair(null);
                  setOpenForm(true);
                }}
              >
                Lập phiếu
              </CustomButton>
            )}
          </Box>

          <Box sx={{ flex: 1, overflow: "auto" }}>
            <RepairsTable
              rows={filteredData}
              rowsPerPage={10}
              page={page}
              onReview={handleReview}
              onDelete={handleDelete}
              onEdit={(r) => {
                setSelectedRepair(r);
                setOpenForm(true);
              }}
              onView={(r) => {
                setSelectedRepair(r);
                setOpenDetail(true);
              }}
              onOpenInspection={(r) => {
                setSelectedRepair(r);
                setOpenInspection(true);
              }}
              onOpenAcceptance={(r) => {
                setSelectedRepair(r);
                setOpenAcceptance(true);
              }}
              onExport={(r, t) => handleExport(r.repair_id, t)}
              canReview={canReview}
              canDelete={canDelete}
              canUpdate={canUpdate}
              userRole={role}
              hasPermission={(code) => perms.includes(code)}
            />
          </Box>

          <Pagination
            data={filteredData}
            rowsPerPage={10}
            page={page}
            onPageChange={setPage}
          />
        </Box>
      )}

      <Toast
        content={toast.current.content}
        variant={toast.current.type}
        open={openToast}
        onClose={() => setOpenToast(false)}
      />

      <RepairForm
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setSelectedRepair(null);
        }}
        onSubmit={handleSubmit}
        loading={saving}
        initialData={selectedRepair}
      />

      {selectedRepair && openDetail && (
        <RepairDetailDialog
          open={openDetail}
          data={selectedRepair}
          onClose={() => {
            setOpenDetail(false);
            setSelectedRepair(null);
          }}
          onExport={(type) => handleExport(selectedRepair.repair_id, type)}
          canExport={canExport}
        />
      )}

      {selectedRepair && openInspection && (
        <RepairInspectionForm
          open={openInspection}
          onClose={() => {
            setOpenInspection(false);
            setSelectedRepair(null);
          }}
          onSubmit={handleInspection}
          loading={saving}
          initialData={selectedRepair}
        />
      )}

      {selectedRepair && openAcceptance && (
        <RepairAcceptanceForm
          open={openAcceptance}
          onClose={() => {
            setOpenAcceptance(false);
            setSelectedRepair(null);
          }}
          onSubmit={handleAcceptance}
          loading={saving}
          initialData={selectedRepair}
        />
      )}
    </>
  );
};

export default RepairsManagement;
