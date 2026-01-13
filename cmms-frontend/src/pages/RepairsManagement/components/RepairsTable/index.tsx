import React, { useState } from "react";
import { Table, Button, Tag, Space, Modal, Input, Tooltip, Popconfirm } from "antd";
import type { ColumnsType } from "antd/es/table";
import { IRepair } from "../../../../types/repairs.types";
import {
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileSearchOutlined,
  FileDoneOutlined,
  DeleteOutlined,
  ExportOutlined,
} from "@ant-design/icons";

interface RepairsTableProps {
  rows: IRepair[];
  rowsPerPage: number; // Ignored for AntD table with internal pagination or keep if external
  page: number; // Ignored if using internal pagination
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
  currentUser?: any;
  hasPermission: (code: string) => boolean;
}

const RepairsTable: React.FC<RepairsTableProps> = ({
  rows,
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
  currentUser,
  hasPermission,
}) => {
  const [rejectReason, setRejectReason] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{
    id: number;
    phase: "request" | "inspection" | "acceptance";
  } | null>(null);

  const getPhase = (r: IRepair) => {
    const rejected =
      r.status_request === "REJECTED" ||
      r.status_inspection === "inspection_rejected" ||
      r.status_acceptance === "acceptance_rejected";
    const done = r.status_acceptance === "acceptance_admin_approved";
    const canceled = r.canceled;
    if (rejected || done || canceled) return "done";
    if (r.status_request !== "COMPLETED") return "request";
    if (r.status_inspection !== "inspection_admin_approved")
      return "inspection";
    return "acceptance";
  };

  const getStatusTag = (r: IRepair) => {
    if (r.canceled) return <Tag color="default">Đã hủy</Tag>;
    if (r.status_acceptance === "acceptance_rejected") return <Tag color="error">Nghiệm thu: Từ chối</Tag>;
    if (r.status_acceptance === "acceptance_admin_approved") return <Tag color="success">Hoàn tất quy trình</Tag>;
    if (r.status_acceptance === "acceptance_manager_approved") return <Tag color="processing">Nghiệm thu: Chờ GĐ duyệt</Tag>;
    const hasAcceptanceData = r.failure_description || r.acceptance_note;
    if (r.status_acceptance === "acceptance_pending" && hasAcceptanceData) return <Tag color="warning">Nghiệm thu: Chờ TP duyệt</Tag>;
    if (r.status_inspection === "inspection_admin_approved" && !hasAcceptanceData) return <Tag color="cyan">Chờ nghiệm thu</Tag>;

    if (r.status_inspection === "inspection_rejected") return <Tag color="error">Kiểm nghiệm: Từ chối</Tag>;
    if (r.status_inspection === "inspection_admin_approved") return <Tag color="blue">Hoàn tất kiểm nghiệm</Tag>;
    if (r.status_inspection === "inspection_manager_approved") return <Tag color="processing">Kiểm nghiệm: Chờ GĐ duyệt</Tag>;
    const hasInspectionData = r.inspection_items && r.inspection_items.length > 0;
    if (r.status_inspection === "inspection_pending" && hasInspectionData) return <Tag color="warning">Kiểm nghiệm: Chờ TP duyệt</Tag>;
    if (r.status_request === "COMPLETED" && !hasInspectionData) return <Tag color="cyan">Chờ kiểm nghiệm</Tag>;

    if (r.status_request === "REJECTED") return <Tag color="error">Yêu cầu: Từ chối</Tag>;
    if (r.status_request === "COMPLETED") return <Tag color="blue">Yêu cầu: Đã duyệt</Tag>;
    if (r.status_request === "WAITING_DIRECTOR") return <Tag color="processing">Yêu cầu: Chờ GĐ duyệt</Tag>;
    if (r.status_request === "WAITING_TEAM_LEAD") return <Tag color="blue">Yêu cầu: Chờ Đội duyệt</Tag>;

    return <Tag color="warning">Yêu cầu: Chờ KT duyệt</Tag>;
  };

  const handleOpenReject = (id: number, phase: "request" | "inspection" | "acceptance") => {
    setSelectedAction({ id, phase });
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const submitReject = () => {
    if (selectedAction && onReview) {
      onReview(selectedAction.id, "reject", rejectReason, selectedAction.phase);
    }
    setRejectModalOpen(false);
  };

  const columns: ColumnsType<IRepair> = [
    {
      title: "#",
      key: "index",
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: "Thiết bị",
      dataIndex: ["device", "name"],
      key: "device",
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: 12, color: "#888" }}>{record.device?.serial_number}</div>
        </div>
      ),
    },
    {
      title: "Đơn vị",
      dataIndex: ["created_department", "name"],
      key: "department",
    },
    {
      title: "Người lập",
      dataIndex: ["created_by", "name"],
      key: "creator",
    },
    {
      title: "Trạng thái",
      key: "status",
      render: (_, record) => getStatusTag(record),
      filters: [
        { text: "Pending", value: "WAITING_TECH" },
        { text: "Approved", value: "COMPLETED" },
        { text: "Rejected", value: "REJECTED" },
      ],
      onFilter: (value, record) => {
        // Simple client-side filtering logic for display purposes if needed
        // Ideally backend filtering is preferred
        const status = JSON.stringify(record).toLowerCase();
        return status.includes((value as string).toLowerCase());
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      fixed: "right",
      width: 300,
      render: (_, record) => {
        const phase = getPhase(record);
        const isStaff = userRole === "staff"; // Assuming role usage from props
        const isManager = userRole === "manager";
        const isAdmin = userRole === "admin";
        
        // Logic copied from original component
        const locked = record.canceled || record.status_acceptance === "acceptance_admin_approved";
        const canEdit = canUpdate && !locked && (record.status_request === "WAITING_TECH" || record.status_request === "REJECTED");

        // Approval Logic
        const canApproveReq = canReview && !locked && (
            (record.status_request === "WAITING_TECH") ||
            (isManager && record.status_request === "WAITING_TEAM_LEAD") ||
            (isAdmin && record.status_request === "WAITING_DIRECTOR")
        );

        const inspectionDone = record.inspection_items && record.inspection_items.length > 0;
        const canCreateInsp = !locked && isStaff && hasPermission("CREATE_REPAIR") && record.status_request === "COMPLETED" && record.status_inspection === "inspection_pending" && !inspectionDone;
        const managerApproveInsp = canReview && isManager && hasPermission("APPROVE_REPAIR") && !locked && record.status_inspection === "inspection_pending" && inspectionDone;
        const adminApproveInsp = canReview && isAdmin && !locked && record.status_inspection === "inspection_manager_approved";

        const acceptanceDone = !!(record.failure_description || record.acceptance_note);
        const canCreateAcc = !locked && (isStaff || isAdmin) && hasPermission("CREATE_REPAIR") && record.status_inspection === "inspection_admin_approved" && record.status_acceptance === "acceptance_pending" && !acceptanceDone;
        const managerApproveAcc = canReview && isManager && hasPermission("APPROVE_REPAIR") && !locked && record.status_acceptance === "acceptance_pending" && acceptanceDone;
        const adminApproveAcc = canReview && isAdmin && !locked && record.status_acceptance === "acceptance_manager_approved";

        const showDelete = canDelete && hasPermission("DELETE_REPAIR") && (!record.approved_by_manager_request && !record.approved_by_admin_request);

        return (
          <Space size="small" wrap>
             <Tooltip title="Xem chi tiết">
                <Button icon={<EyeOutlined />} size="small" onClick={() => onView?.(record)} />
             </Tooltip>

             {canEdit && (userRole === "admin" || (record.created_by?.user_id === currentUser?.user_id)) && (
               <Tooltip title="Chỉnh sửa">
                 <Button icon={<EditOutlined />} type="primary" ghost size="small" onClick={() => onEdit?.(record)} />
               </Tooltip>
             )}

            {/* Hidden approval actions as requested to simplify UI. Approval is now done via Detail Drawer. */}

            {phase === "inspection" && (
                <>
                    {canCreateInsp && (
                         <Tooltip title="Tạo kiểm nghiệm">
                            <Button icon={<FileSearchOutlined />} color="default" variant="solid" style={{background: '#722ed1', color: 'white'}} size="small" onClick={() => onOpenInspection?.(record)} />
                         </Tooltip>
                    )}
                </>
            )}

            {phase === "acceptance" && (
                <>
                    {canCreateAcc && (
                        <Tooltip title="Tạo nghiệm thu">
                            <Button icon={<FileDoneOutlined />} style={{background: '#006d75', color: 'white'}} size="small" onClick={() => onOpenAcceptance?.(record)} />
                        </Tooltip>
                    )}
                </>
            )}

             {canExport && (
                <Tooltip title="Xuất file">
                    <Button icon={<ExportOutlined />} size="small" onClick={() => onExport?.(record, phase as any)} />
                </Tooltip>
             )}

             {showDelete && (
                <Popconfirm title="Bạn có chắc chắn muốn xóa phiếu này?" onConfirm={() => onDelete?.(record.repair_id)}>
                    <Button icon={<DeleteOutlined />} size="small" danger />
                </Popconfirm>
             )}
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={rows}
        rowKey="repair_id"
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 10 }}
        sticky
      />
      <Modal
        title="Lý do từ chối"
        open={rejectModalOpen}
        onCancel={() => setRejectModalOpen(false)}
        onOk={submitReject}
      >
          <Input.TextArea 
            rows={4} 
            value={rejectReason} 
            onChange={(e) => setRejectReason(e.target.value)} 
            placeholder="Nhập lý do từ chối..."
          />
      </Modal>
    </>
  );
};

export default RepairsTable;
