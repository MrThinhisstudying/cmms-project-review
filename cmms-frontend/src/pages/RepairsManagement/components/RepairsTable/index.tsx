import React from "react";

import { Table, Button, Tag, Space, Tooltip, Popconfirm } from "antd";
import type { ColumnsType } from "antd/es/table";
import { IRepair } from "../../../../types/repairs.types";
import {
  EyeOutlined,
  EditOutlined,
  FileSearchOutlined,
  FileDoneOutlined,
  DeleteOutlined,
  PrinterOutlined,
  DownOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import { getToken } from "../../../../utils/auth";
import type { MenuProps } from 'antd';
import { Dropdown, message } from 'antd';

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
    type: "request" | "inspection" | "acceptance" | "B03" | "B04" | "B05" | "COMBINED"
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
  // Unused state removed
  // const [rejectReason, setRejectReason] = useState("");
  // const [rejectModalOpen, setRejectModalOpen] = useState(false);
  // const [selectedAction, setSelectedAction] = useState...

  const getPhase = (r: IRepair) => {
    // If Admin Approved Acceptance, it's strictly done.
    if (r.status_acceptance === "acceptance_admin_approved") return "done";
    
    // If canceled, it's done/locked.
    if (r.canceled) return "done";

    // If Request is Rejected, it's done (unless we allow re-open, but currently REJECTED request is final unless edited)
    // If Request is Rejected
    if (r.status_request === "REJECTED_B03") return "request"; 
    
    // If Inspection Rejected
    if (r.status_inspection === "REJECTED_B04") return "inspection";

    // If Acceptance Rejected
    if (r.status_acceptance === "REJECTED_B05") return "acceptance";

    if (r.status_request !== "COMPLETED") return "request";
    if (r.status_inspection !== "inspection_admin_approved") return "inspection";
    
    return "acceptance";
  };


  const getStatusTag = (r: IRepair) => {
    // 1. Determine Current Phase (Same as RepairDetailDrawer)
    let currentPhase = 'request';
    if (r.status_request === 'REJECTED_B03' || r.status_request === 'REJECTED') currentPhase = 'request'; 
    else if (r.status_request !== 'COMPLETED') currentPhase = 'request';
    else if (r.status_inspection === 'REJECTED_B04' || r.status_inspection === 'inspection_rejected') currentPhase = 'inspection';
    else if (r.status_inspection !== 'inspection_admin_approved') currentPhase = 'inspection';
    else if (r.status_acceptance === 'REJECTED_B05' || r.status_acceptance === 'acceptance_rejected') currentPhase = 'acceptance';
    else if (r.status_acceptance !== 'acceptance_admin_approved') currentPhase = 'acceptance';
    else currentPhase = 'completed';

    // 2. Determine raw status key to display
    let statusKey: string = r.status_request || 'WAITING_TECH';
    if (currentPhase === 'completed') statusKey = 'COMPLETED';
    else if (currentPhase === 'acceptance' || r.status_acceptance === 'REJECTED_B05' || r.status_acceptance === 'acceptance_rejected') statusKey = r.status_acceptance || 'acceptance_pending';
    else if (currentPhase === 'inspection' || r.status_inspection === 'REJECTED_B04' || r.status_inspection === 'inspection_rejected') statusKey = r.status_inspection || 'inspection_pending';
    
    // 3. Map to Label/Color (Same as RepairDetailDrawer)
     const colorMap: Record<string, string> = {
      WAITING_TECH: "blue",
      WAITING_TEAM_LEAD: "blue",
      WAITING_MANAGER: "orange", // Default for Manager/Unit Head
      WAITING_DIRECTOR: "purple",
      REJECTED_B03: "red",
      REJECTED: "red",
      COMPLETED: "green",

      inspection_pending: "purple",
      inspection_lead_approved: "warning",
      inspection_manager_approved: "cyan",
      inspection_admin_approved: "teal",
      REJECTED_B04: "red",
      inspection_rejected: "red",

      acceptance_pending: "cyan",
      acceptance_lead_approved: "warning",
      acceptance_manager_approved: "cyan",
      acceptance_admin_approved: "green",
      REJECTED_B05: "red",
      acceptance_rejected: "red",
    };

    const labelMap: Record<string, string> = {
      WAITING_TECH: "Yêu cầu: Chờ KT tiếp nhận",
      WAITING_TEAM_LEAD: "Yêu cầu: Chờ Tổ trưởng duyệt",
      WAITING_MANAGER: "Yêu cầu: Chờ CB đội duyệt",
      WAITING_DIRECTOR: "Yêu cầu: Chờ Ban GĐ duyệt",
      REJECTED_B03: "B03: Đã từ chối",
      REJECTED: "Đã hủy",
      COMPLETED: "Hoàn thành",

      // If pending but no data -> "Chờ kiểm nghiệm"
      // If pending AND has data -> "Chờ Tổ trưởng duyệt"
      inspection_pending: r.inspection_created_at ? "Kiểm nghiệm: chờ CB tổ duyệt" : "Chờ kiểm nghiệm",
      inspection_lead_approved: "Kiểm nghiệm: Chờ CB đội duyệt",
      inspection_manager_approved: "Kiểm nghiệm: chờ ban GĐ duyệt",
      inspection_admin_approved: "Hoàn tất kiểm nghiệm",
      REJECTED_B04: "B04: Đã từ chối",
      inspection_rejected: "B04: Đã từ chối",

      acceptance_pending: r.acceptance_created_at ? "Nghiệm thu: Chờ CB tổ duyệt" : "Chờ nghiệm thu",
      acceptance_lead_approved: "Nghiệm thu: Chờ CB đội duyệt",
      acceptance_manager_approved: "Nghiệm thu: chờ ban GĐ duyệt",
      acceptance_admin_approved: "Hoàn tất toàn bộ quy trình",
      REJECTED_B05: "B05: Đã từ chối",
      acceptance_rejected: "B05: Đã từ chối",
    };

    const label = labelMap[statusKey] || statusKey;
    const color = colorMap[statusKey] || (statusKey.includes('REJECTED') || statusKey.includes('rejected') ? 'error' : 'default');

    if (statusKey === 'REJECTED_B03' || statusKey === 'REJECTED') {
         // Keep existing tooltip for B03 rejection if desireable
         return (
            <Tooltip title={r.rejection_reason ? `Lý do: ${r.rejection_reason}` : "Đã hủy"}>
                <Tag color="error">{label}</Tag>
            </Tooltip>
        );
    }

    return <Tag color={color}>{label}</Tag>;
  };



  const columns: ColumnsType<IRepair> = [
    {
      title: "#",
      dataIndex: "repair_id",
      key: "repair_id",
      width: 80,
      render: (id) => <span style={{ fontWeight: 'bold' }}>#{id}</span>,
      sorter: (a, b) => a.repair_id - b.repair_id,
      defaultSortOrder: 'descend', // Default newest first
    },
    {
      title: "Thiết bị",
      dataIndex: ["device", "name"],
      key: "device",
      width: 200,
      render: (text) => (
          <div style={{ fontWeight: 500 }}>{text}</div>
      ),
    },
    {
      title: "BS / Số máy",
      key: "code",
      width: 150,
      render: (_, record) => (
        <div style={{ fontSize: 13 }}>
            <div>{record.device?.reg_number ? `BS: ${record.device.reg_number}` : '-'}</div>
            {record.device?.serial_number && <div style={{ color: "#888", fontSize: "12px" }}>SN: {record.device.serial_number}</div>}
        </div>
      ),
    },
    {
      title: "Đơn vị",
      key: "department",
      render: (_, record) => {
        const deptName = record.created_department?.name || record.created_by?.department?.name || '-';
        return <span>{deptName}</span>;
      }
    },
    {
      title: "Người lập",
      key: "creator",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.created_by?.name}</div>
          <div style={{ fontSize: '11px', color: '#888' }}>
            {record.created_at ? new Date(record.created_at).toLocaleDateString('vi-VN') : ''}
          </div>
        </div>
      )
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 200,
      render: (_, record) => getStatusTag(record),
      filters: [
        { text: "Pending", value: "WAITING_TECH" },
        { text: "Approved", value: "COMPLETED" },
        { text: "Rejected", value: "REJECTED" },
      ],
      onFilter: (value, record) => {
        const status = JSON.stringify(record).toLowerCase();
        return status.includes((value as string).toLowerCase());
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 180,
      render: (_, record) => {
        const phase = getPhase(record);
        const locked = record.canceled || record.status_acceptance === "acceptance_admin_approved";
        const canEdit = canUpdate && !locked && (record.status_request === "WAITING_TECH" || record.status_request === "REJECTED_B03");

        // Approval Logic
        // This variable 'canApproveReq' was unused in previous code or I missed it.
        // It's just for logic. 
        
        /* 
           STRICT PERMISSION LOGIS IS NOW IN BACKEND.
           Frontend just shows buttons.
        */

        // Only TECHNICIAN (or ADMIN) in 'Tổ kỹ thuật' can create/start Inspection and Acceptance
        const role = userRole?.toLowerCase() || '';
        const isTechnician = role === "technician" || role === "admin" || role === "kỹ thuật";
        const deptName = currentUser?.department?.name?.toLowerCase() || "";
        const isTechnicalDepartment = deptName === 'tổ kỹ thuật' || role === "admin";

        const canCreateInsp = !locked && isTechnician && isTechnicalDepartment && record.status_request === "COMPLETED" && record.status_inspection === "inspection_pending";
        // Only show if NOT finished inspection?
        // Actually, "Create B04" means "Start Inspection" or "Edit Inspection".
        // If inspection_pending, we show "Inspection Form".

        const canCreateAcc = !locked && isTechnician && isTechnicalDepartment && record.status_inspection === "inspection_admin_approved" && record.status_acceptance === "acceptance_pending";

        const showDelete = canDelete && hasPermission("DELETE_REPAIR") && (!record.approved_by_manager_request && !record.approved_by_admin_request);
        const isCompleted = record.status_acceptance === 'acceptance_admin_approved';

        return (
          <Space size="small" wrap>
             <Tooltip title="Xem chi tiết">
                <Button icon={<EyeOutlined />} size="small" onClick={() => onView?.(record)} />
             </Tooltip>

             {canEdit && (userRole === "ADMIN" || (record.created_by?.user_id === currentUser?.user_id)) && (
               <Tooltip title="Chỉnh sửa">
                 <Button icon={<EditOutlined />} type="primary" ghost size="small" onClick={() => onEdit?.(record)} />
               </Tooltip>
             )}

            {/* Hidden approval actions as requested to simplify UI. Approval is now done via Detail Drawer. */}

            {phase === "inspection" && (
                <>
                    {(() => {
                        // Restore omitted variable definition
                        const hasInspectionData = record.inspection_created_at || (record.inspection_items && record.inspection_items.length > 0);
                        
                        // Hide "Approve Inspection" button here if it confuses user with "Updated Inspection".
                        // User request: "khi bấm vào và bấm phê duyệt thì bị báo là "Đã cập nhật kiểm nghiệm" sửa lại hoặc ẩn đi."
                        // It seems this button was calling onOpenInspection which might be opening the FORM not approval dialog? 
                        // onOpenInspection opens RepairInspectionForm.
                        // If user is Approver, they should likely use the Review/Approve flow (Detail Drawer or specific review modal).
                        // If this button opens the Edit Form, and they click Save, it says "Updated".
                        // Recommendation: Hide this button for Approvers in the TABLE to avoid confusion. Force them to open Drawer > Approve.
                        
                        // Only show "Create Inspection" for Technician (to start).
                        if (canCreateInsp && !hasInspectionData) {
                             return (
                                 <Tooltip title="Tạo kiểm nghiệm">
                                    <Button icon={<FileSearchOutlined />} color="default" variant="solid" style={{background: '#722ed1', color: 'white'}} size="small" onClick={() => onOpenInspection?.(record)} />
                                 </Tooltip>
                            );
                        }
                        
                        // If Rejected, allow Technician/Admin to Redo (Open Form)
                        if (record.status_inspection === 'REJECTED_B04' && (role === 'technician' || role === 'admin')) {
                            return (
                                 <Tooltip title="Tạo lại kiểm nghiệm">
                                    <Button icon={<FileSearchOutlined />} color="default" variant="solid" style={{background: '#722ed1', color: 'white'}} size="small" onClick={() => onOpenInspection?.(record)} />
                                 </Tooltip>
                            );
                        }

                        return null; 
                    })()}
                </>
            )}

            {phase === "acceptance" && (
                <>
                    {(() => {
                        const hasAcceptanceData = record.acceptance_created_at || record.acceptance_note;
                        const role = userRole?.toLowerCase() || '';
                        const canApproveAcc = hasAcceptanceData && (
                            (record.status_acceptance === 'acceptance_pending' && (role === 'team_lead' || role === 'tổ trưởng')) ||
                            (record.status_acceptance === 'acceptance_lead_approved' && (role === 'unit_head' || role === 'cán bộ đội')) ||
                            (record.status_acceptance === 'acceptance_manager_approved' && (role === 'admin' || role === 'director' || role === 'ban giám đốc'))
                        );

                        const showButton = (canCreateAcc && !hasAcceptanceData) || record.status_acceptance === 'REJECTED_B05' || canApproveAcc;

                        if (!showButton) return null;

                        if (canCreateAcc && !hasAcceptanceData) {
                             return (
                                 <Tooltip title="Tạo nghiệm thu">
                                    <Button icon={<FileDoneOutlined />} color="default" variant="solid" style={{background: '#13c2c2', color: 'white'}} size="small" onClick={() => onOpenAcceptance?.(record)} />
                                 </Tooltip>
                            );
                        }
                         
                        return null;
                    })()}
                </>
            )}

            {isCompleted && (
                 <Tooltip title="Lưu hồ sơ (PDF)">
                    <Button 
                        icon={<FilePdfOutlined />} 
                        style={{ background: '#52c41a', color: 'white', borderColor: '#52c41a' }} 
                        size="small" 
                    onClick={() => onExport?.(record, 'COMBINED')} 
                    />
                 </Tooltip>
            )}

             {(() => {
                 const items: MenuProps['items'] = [];
                 
                 // B03: Show only if Request is COMPLETED (fully approved)
                 if (record.status_request === 'COMPLETED') {
                     items.push({ key: 'B03', label: 'B03: Phiếu Yêu Cầu', onClick: () => onExport?.(record, 'B03') });
                 }

                 // B04: Show only if Inspection is Admin Approved
                 if (record.status_inspection === 'inspection_admin_approved') {
                     items.push({ key: 'B04', label: 'B04: Phiếu Kiểm Nghiệm', onClick: () => onExport?.(record, 'B04') });
                 }

                 // B05: Show only if Acceptance is Admin Approved
                 if (record.status_acceptance === 'acceptance_admin_approved') {
                     items.push({ key: 'B05', label: 'B05: Phiếu Nghiệm Thu', onClick: () => onExport?.(record, 'B05') });
                 }

                 if (items.length === 0) return null;

                 return (
                  <Dropdown menu={{ items }} trigger={['click']}>
                       <Button icon={<PrinterOutlined />}>
                          In phiếu <DownOutlined />
                       </Button>
                   </Dropdown>
                 );
             })()}

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
      />
    </>
  );
};

export default RepairsTable;
