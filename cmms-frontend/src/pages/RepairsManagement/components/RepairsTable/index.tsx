import React, { useMemo, useState } from "react";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  TableBody,
  TableCell,
  TableHead,
  Chip,
} from "@mui/material";
import {
  CustomTable,
  TableCellHeader,
  TableRowBody,
  TableRowContainer,
} from "./style";
import { CustomButton } from "../../../../components/Button";
import { IRepair } from "../../../../types/repairs.types";

interface RepairsTableProps {
  rows: IRepair[];
  rowsPerPage: number;
  page: number;
  onReview?: (
    id: number,
    action: "approve" | "reject",
    reason?: string,
    phase?: "request" | "inspection" | "acceptance"
  ) => void;
  onEdit?: (item: IRepair) => void;
  onView?: (item: IRepair) => void;
  onOpenInspection?: (item: IRepair) => void;
  onOpenAcceptance?: (item: IRepair) => void;
  onDelete?: (id: number) => void;
  onExport?: (
    item: IRepair,
    type: "request" | "inspection" | "acceptance"
  ) => void;
  canUpdate?: boolean;
  canReview?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
  userRole?: string;
  hasPermission: (code: string) => boolean;
}

const RepairsTable: React.FC<RepairsTableProps> = ({
  rows,
  rowsPerPage,
  page,
  onReview,
  onEdit,
  onView,
  onOpenInspection,
  onOpenAcceptance,
  onDelete,
  onExport,
  canUpdate,
  canReview,
  canDelete,
  canExport,
  userRole,
  hasPermission,
}) => {
  const [openReject, setOpenReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<
    "request" | "inspection" | "acceptance"
  >("request");

  const paginated = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [rows, page, rowsPerPage]);

  const getPhase = (r: IRepair) => {
    const rejected =
      r.status_request === "rejected" ||
      r.status_inspection === "inspection_rejected" ||
      r.status_acceptance === "acceptance_rejected";
    const done = r.status_acceptance === "acceptance_admin_approved";
    const canceled = r.canceled;
    if (rejected || done || canceled) return "done";
    if (r.status_request !== "admin_approved") return "request";
    if (r.status_inspection !== "inspection_admin_approved")
      return "inspection";
    return "acceptance";
  };

  const canDeleteRepair = (r: IRepair) => {
    if (!canDelete || !hasPermission("DELETE_REPAIR")) return false;

    const hasAnyApproval =
      r.approved_by_manager_request ||
      r.approved_by_admin_request ||
      r.approved_by_manager_inspection ||
      r.approved_by_admin_inspection ||
      r.approved_by_manager_acceptance ||
      r.approved_by_admin_acceptance;

    return !hasAnyApproval;
  };

  const getStatusLabel = (r: IRepair) => {
    if (r.canceled) return "Đã hủy phiếu";
    if (r.status_acceptance === "acceptance_rejected")
      return "Bước 3 - Nghiệm thu: Đã từ chối";
    if (r.status_acceptance === "acceptance_admin_approved")
      return "Bước 3 - Nghiệm thu: Hoàn tất quy trình";
    if (r.status_acceptance === "acceptance_manager_approved")
      return "Bước 3 - Nghiệm thu: Chờ Ban Giám đốc duyệt";
    const hasAcceptanceData = r.failure_description || r.acceptance_note;
    if (r.status_acceptance === "acceptance_pending" && hasAcceptanceData)
      return "Bước 3 - Nghiệm thu: Chờ Trưởng phòng duyệt";
    if (
      r.status_inspection === "inspection_admin_approved" &&
      r.status_acceptance === "acceptance_pending" &&
      !hasAcceptanceData
    )
      return "Bước 3 - Nghiệm thu: Chờ lập biên bản";

    if (r.status_inspection === "inspection_rejected")
      return "Bước 2 - Kiểm nghiệm: Đã từ chối";
    if (r.status_inspection === "inspection_admin_approved")
      return "Bước 2 - Kiểm nghiệm: Hoàn tất kiểm nghiệm";
    if (r.status_inspection === "inspection_manager_approved")
      return "Bước 2 - Kiểm nghiệm: Chờ Ban Giám đốc duyệt";
    const hasInspectionData = r.inspection_items && r.inspection_items.length > 0;
    if (r.status_inspection === "inspection_pending" && hasInspectionData)
      return "Bước 2 - Kiểm nghiệm: Chờ Trưởng phòng duyệt";
    if (
      r.status_request === "admin_approved" &&
      r.status_inspection === "inspection_pending" &&
      !hasInspectionData
    )
      return "Bước 2 - Kiểm nghiệm: Chờ lập biên bản";

    if (r.status_request === "rejected") return "Bước 1 - Yêu cầu: Đã từ chối";
    if (r.status_request === "admin_approved")
      return "Bước 1 - Yêu cầu: Đã duyệt – Sang kiểm nghiệm";
    if (r.status_request === "manager_approved")
      return "Bước 1 - Yêu cầu: Chờ Ban Giám đốc duyệt";

    return "Bước 1 - Yêu cầu: Chờ Trưởng phòng duyệt";
  };

  const openRejectDialog = (
    id: number,
    phase: "request" | "inspection" | "acceptance"
  ) => {
    setSelectedId(id);
    setSelectedPhase(phase);
    setRejectReason("");
    setOpenReject(true);
  };

  return (
    <>
      <CustomTable stickyHeader>
        <TableHead>
          <TableRowContainer>
            <TableCellHeader>#</TableCellHeader>
            <TableCellHeader>Thiết bị</TableCellHeader>
            <TableCellHeader>Đơn vị</TableCellHeader>
            <TableCellHeader>Người lập</TableCellHeader>
            <TableCellHeader>Trạng thái</TableCellHeader>
            <TableCellHeader align="center">Thao tác</TableCellHeader>
          </TableRowContainer>
        </TableHead>

        <TableBody>
          {paginated.map((item, idx) => {
            const phase = getPhase(item);
            const isStaff = userRole === "staff";
            const isManager = userRole === "manager";
            const isAdmin = userRole === "admin";

            const rejected =
              item.status_request === "rejected" ||
              item.status_inspection === "inspection_rejected" ||
              item.status_acceptance === "acceptance_rejected";

            const completed =
              item.status_acceptance === "acceptance_admin_approved";
            const canceled = item.canceled;
            const locked = rejected || completed || canceled;

            const inspectionDone = item.inspection_items && item.inspection_items.length > 0;
            const acceptanceDone = !!(item.failure_description || item.acceptance_note);

            const canEdit =
              canUpdate && !locked && item.status_request === "pending";

            const managerCanApproveRequest =
              canReview &&
              isManager &&
              hasPermission("APPROVE_REPAIR") &&
              !locked &&
              item.status_request === "pending";

            const adminCanApproveRequest =
              canReview &&
              isAdmin &&
              !locked &&
              item.status_request === "manager_approved";

            const canCreateInspection =
              !locked &&
              isStaff &&
              hasPermission("CREATE_REPAIR") &&
              item.status_request === "admin_approved" &&
              item.status_inspection === "inspection_pending" &&
              !inspectionDone;

            const managerCanApproveInspection =
              canReview &&
              isManager &&
              hasPermission("APPROVE_REPAIR") &&
              !locked &&
              item.status_inspection === "inspection_pending" &&
              inspectionDone;

            const adminCanApproveInspection =
              canReview &&
              isAdmin &&
              !locked &&
              item.status_inspection === "inspection_manager_approved";

            const canCreateAcceptance =
              !locked &&
              (isStaff || isAdmin) &&
              hasPermission("CREATE_REPAIR") &&
              item.status_inspection === "inspection_admin_approved" &&
              item.status_acceptance === "acceptance_pending" &&
              !acceptanceDone;

            const managerCanApproveAcceptance =
              canReview &&
              isManager &&
              hasPermission("APPROVE_REPAIR") &&
              !locked &&
              item.status_acceptance === "acceptance_pending" &&
              acceptanceDone;

            const adminCanApproveAcceptance =
              canReview &&
              isAdmin &&
              !locked &&
              item.status_acceptance === "acceptance_manager_approved";

            return (
              <TableRowBody key={item.repair_id} index={idx}>
                <TableCell>{(page - 1) * rowsPerPage + idx + 1}</TableCell>
                <TableCell>{item.device?.name}</TableCell>
                <TableCell>{item.created_department?.name}</TableCell>
                <TableCell>{item.created_by?.name}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(item)}
                    sx={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      borderRadius: "8px",
                      backgroundColor: "#e3f2fd",
                      color: "#0d47a1",
                    }}
                  />
                </TableCell>

                <TableCell align="center">
                  <Box display="flex" gap={1} justifyContent="center">
                    <CustomButton
                      variant="contained"
                      padding="4px 12px"
                      bgrColor="#0288d1"
                      onClick={() => onView?.(item)}
                    >
                      Xem
                    </CustomButton>

                    <CustomButton
                      variant="contained"
                      padding="4px 12px"
                      bgrColor="#1976d2"
                      disabled={!canEdit}
                      onClick={() => onEdit?.(item)}
                    >
                      Sửa
                    </CustomButton>

                    {phase === "request" && canReview && (
                      <>
                        <CustomButton
                          variant="contained"
                          padding="4px 12px"
                          bgrColor="#2e7d32"
                          disabled={
                            !managerCanApproveRequest && !adminCanApproveRequest
                          }
                          onClick={() =>
                            onReview?.(item.repair_id, "approve", "", "request")
                          }
                        >
                          Duyệt yêu cầu
                        </CustomButton>

                        <CustomButton
                          variant="contained"
                          padding="4px 12px"
                          bgrColor="#d32f2f"
                          disabled={
                            !managerCanApproveRequest && !adminCanApproveRequest
                          }
                          onClick={() =>
                            openRejectDialog(item.repair_id, "request")
                          }
                        >
                          Từ chối yêu cầu
                        </CustomButton>
                      </>
                    )}

                    {phase === "inspection" && (
                      <>
                        <CustomButton
                          variant="contained"
                          padding="4px 12px"
                          bgrColor="#8e24aa"
                          disabled={!canCreateInspection}
                          onClick={() => onOpenInspection?.(item)}
                        >
                          Tạo kiểm nghiệm
                        </CustomButton>

                        {canReview && (
                          <>
                            <CustomButton
                              variant="contained"
                              padding="4px 12px"
                              bgrColor="#2e7d32"
                              disabled={
                                !managerCanApproveInspection &&
                                !adminCanApproveInspection
                              }
                              onClick={() =>
                                onReview?.(
                                  item.repair_id,
                                  "approve",
                                  "",
                                  "inspection"
                                )
                              }
                            >
                              Duyệt kiểm nghiệm
                            </CustomButton>

                            <CustomButton
                              variant="contained"
                              padding="4px 12px"
                              bgrColor="#d32f2f"
                              disabled={
                                !managerCanApproveInspection &&
                                !adminCanApproveInspection
                              }
                              onClick={() =>
                                openRejectDialog(item.repair_id, "inspection")
                              }
                            >
                              Từ chối kiểm nghiệm
                            </CustomButton>
                          </>
                        )}
                      </>
                    )}

                    {phase === "acceptance" && (
                      <>
                        <CustomButton
                          variant="contained"
                          padding="4px 12px"
                          bgrColor="#00796b"
                          disabled={!canCreateAcceptance}
                          onClick={() => onOpenAcceptance?.(item)}
                        >
                          Tạo nghiệm thu
                        </CustomButton>

                        {canReview && (
                          <>
                            <CustomButton
                              variant="contained"
                              padding="4px 12px"
                              bgrColor="#2e7d32"
                              disabled={
                                !managerCanApproveAcceptance &&
                                !adminCanApproveAcceptance
                              }
                              onClick={() =>
                                onReview?.(
                                  item.repair_id,
                                  "approve",
                                  "",
                                  "acceptance"
                                )
                              }
                            >
                              Duyệt nghiệm thu
                            </CustomButton>

                            <CustomButton
                              variant="contained"
                              padding="4px 12px"
                              bgrColor="#d32f2f"
                              disabled={
                                !managerCanApproveAcceptance &&
                                !adminCanApproveAcceptance
                              }
                              onClick={() =>
                                openRejectDialog(item.repair_id, "acceptance")
                              }
                            >
                              Từ chối nghiệm thu
                            </CustomButton>
                          </>
                        )}
                      </>
                    )}

                    {canDeleteRepair(item) && (
                      <CustomButton
                        variant="contained"
                        padding="4px 12px"
                        bgrColor="#9e9e9e"
                        onClick={() => onDelete?.(item.repair_id)}
                        title="Chỉ có thể xóa phiếu chưa được duyệt"
                      >
                        Xóa
                      </CustomButton>
                    )}

                    {canExport && (
                      <CustomButton
                        variant="contained"
                        padding="4px 12px"
                        bgrColor="#455a64"
                        onClick={() => {
                          if (
                            phase === "request" ||
                            phase === "inspection" ||
                            phase === "acceptance"
                          ) {
                            onExport?.(item, phase);
                          }
                        }}
                      >
                        Xuất file
                      </CustomButton>
                    )}
                  </Box>
                </TableCell>
              </TableRowBody>
            );
          })}
        </TableBody>
      </CustomTable>

      <Dialog
        open={openReject}
        onClose={() => setOpenReject(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle fontWeight="bold">Lý do từ chối</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <CustomButton
            bgrColor="#757575"
            variant="contained"
            padding="4px 12px"
            onClick={() => setOpenReject(false)}
          >
            Hủy
          </CustomButton>

          <CustomButton
            bgrColor="#d32f2f"
            variant="contained"
            padding="4px 12px"
            onClick={() => {
              if (selectedId)
                onReview?.(selectedId, "reject", rejectReason, selectedPhase);
              setOpenReject(false);
            }}
          >
            Xác nhận
          </CustomButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RepairsTable;
