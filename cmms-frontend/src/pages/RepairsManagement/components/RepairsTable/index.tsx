import React from "react";
import { Table, Button, Tag, Space, Tooltip, Popconfirm, Dropdown } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import {
  EyeOutlined,
  EditOutlined,
  FileSearchOutlined,
  FileDoneOutlined,
  DeleteOutlined,
  PrinterOutlined,
  FilePdfOutlined,
  ThunderboltOutlined,
  CarOutlined,
  MoreOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
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
    type: "request" | "inspection" | "acceptance" | "B03" | "B04" | "B05" | "COMBINED",
    options?: { hideNames?: boolean; hideDates?: boolean }
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
  onEdit,
  onView,
  onOpenInspection,
  onOpenAcceptance,
  onDelete,
  onExport,
  canUpdate,
  userRole,
  currentUser,
}) => {
  const getPhase = (r: IRepair) => {
    if (r.status_acceptance === "acceptance_admin_approved") return "done";
    if (r.canceled) return "done";
    if (r.status_request === "REJECTED_B03") return "request";
    if (r.status_inspection === "REJECTED_B04") return "inspection";
    if (r.status_acceptance === "REJECTED_B05") return "acceptance";
    if (r.status_request !== "COMPLETED") return "request";
    if (r.status_inspection !== "inspection_admin_approved") return "inspection";
    return "acceptance";
  };

  const getStatusBadge = (r: IRepair) => {
    let currentPhase = "request";
    if (r.status_request === "REJECTED_B03" || r.status_request === "REJECTED") {
      currentPhase = "request";
    } else if (r.status_request !== "COMPLETED") {
      currentPhase = "request";
    } else if (
      r.status_inspection === "REJECTED_B04" ||
      r.status_inspection === "inspection_rejected"
    ) {
      currentPhase = "inspection";
    } else if (r.status_inspection !== "inspection_admin_approved") {
      currentPhase = "inspection";
    } else if (
      r.status_acceptance === "REJECTED_B05" ||
      r.status_acceptance === "acceptance_rejected"
    ) {
      currentPhase = "acceptance";
    } else if (r.status_acceptance !== "acceptance_admin_approved") {
      currentPhase = "acceptance";
    } else {
      currentPhase = "completed";
    }

    let statusKey: string = r.status_request || "WAITING_TECH";
    if (currentPhase === "completed") {
      statusKey = "COMPLETED";
    } else if (
      currentPhase === "acceptance" ||
      r.status_acceptance === "REJECTED_B05" ||
      r.status_acceptance === "acceptance_rejected"
    ) {
      statusKey = r.status_acceptance || "acceptance_pending";
    } else if (
      currentPhase === "inspection" ||
      r.status_inspection === "REJECTED_B04" ||
      r.status_inspection === "inspection_rejected"
    ) {
      statusKey = r.status_inspection || "inspection_pending";
    }

    const labelMap: Record<string, string> = {
      WAITING_TECH: "Yêu cầu: Chờ KT tiếp nhận",
      WAITING_TEAM_LEAD: "Yêu cầu: Chờ Tổ trưởng duyệt",
      WAITING_MANAGER: "Yêu cầu: Chờ CB Đội duyệt",
      WAITING_DIRECTOR: "Yêu cầu: Chờ Ban GĐ duyệt",
      REJECTED_B03: "B03: Đã từ chối",
      REJECTED: "Đã hủy",
      COMPLETED: "Hoàn tất toàn bộ",

      inspection_pending: r.inspection_created_at
        ? "Kiểm nghiệm: Chờ Tổ duyệt"
        : "Chờ kiểm nghiệm",
      inspection_lead_approved: "Kiểm nghiệm: Chờ Đội duyệt",
      inspection_manager_approved: "Kiểm nghiệm: Chờ Ban GĐ duyệt",
      inspection_admin_approved: "Hoàn tất kiểm nghiệm",
      REJECTED_B04: "B04: Đã từ chối",
      inspection_rejected: "B04: Đã từ chối",

      acceptance_pending: r.acceptance_created_at
        ? "Nghiệm thu: Chờ Tổ duyệt"
        : "Chờ nghiệm thu",
      acceptance_lead_approved: "Nghiệm thu: Chờ Đội duyệt",
      acceptance_manager_approved: "Nghiệm thu: Chờ Ban GĐ duyệt",
      acceptance_admin_approved: "Hoàn tất toàn bộ",
      REJECTED_B05: "B05: Đã từ chối",
      acceptance_rejected: "B05: Đã từ chối",
    };

    const label = labelMap[statusKey] || statusKey;

    // Soft badge styles with modern color tokens
    let bg = "#f1f5f9";
    let color = "#475569";
    let dotColor = "#94a3b8";
    let borderColor = "#e2e8f0";

    if (
      statusKey.includes("REJECTED") ||
      statusKey.includes("rejected") ||
      statusKey === "REJECTED" ||
      r.canceled
    ) {
      bg = "#fef2f2";
      color = "#dc2626";
      dotColor = "#ef4444";
      borderColor = "#fecaca";
    } else if (
      statusKey === "COMPLETED" ||
      statusKey === "acceptance_admin_approved"
    ) {
      bg = "#ecfdf5";
      color = "#059669";
      dotColor = "#10b981";
      borderColor = "#a7f3d0";
    } else if (statusKey === "WAITING_TECH" || statusKey === "WAITING_TEAM_LEAD") {
      bg = "#eff6ff";
      color = "#2563eb";
      dotColor = "#3b82f6";
      borderColor = "#bfdbfe";
    } else if (
      statusKey === "WAITING_MANAGER" ||
      statusKey === "inspection_lead_approved" ||
      statusKey === "acceptance_lead_approved"
    ) {
      bg = "#fffbeb";
      color = "#d97706";
      dotColor = "#f59e0b";
      borderColor = "#fde68a";
    } else if (
      statusKey === "WAITING_DIRECTOR" ||
      statusKey === "inspection_pending"
    ) {
      bg = "#f5f3ff";
      color = "#7c3aed";
      dotColor = "#8b5cf6";
      borderColor = "#ddd6fe";
    } else if (
      statusKey === "inspection_manager_approved" ||
      statusKey === "acceptance_pending" ||
      statusKey === "acceptance_manager_approved" ||
      statusKey === "inspection_admin_approved"
    ) {
      bg = "#ecfeff";
      color = "#0891b2";
      dotColor = "#06b6d4";
      borderColor = "#a5f3fc";
    }

    const badgeContent = (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 10px",
          borderRadius: 16,
          fontSize: 12,
          fontWeight: 600,
          background: bg,
          color: color,
          border: `1px solid ${borderColor}`,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: dotColor,
            boxShadow: `0 0 0 2px ${bg}`,
          }}
        />
        {label}
      </div>
    );

    if (
      statusKey === "REJECTED_B03" ||
      statusKey === "REJECTED_B04" ||
      statusKey === "REJECTED_B05" ||
      statusKey === "REJECTED"
    ) {
      return (
        <Tooltip title={r.rejection_reason ? `Lý do từ chối: ${r.rejection_reason}` : "Phiếu bị từ chối/hủy"}>
          {badgeContent}
        </Tooltip>
      );
    }

    return badgeContent;
  };

  const columns: ColumnsType<IRepair> = [
    {
      title: "Mã #",
      dataIndex: "repair_id",
      key: "repair_id",
      width: 85,
      align: "center",
      render: (id) => (
        <Tag
          style={{
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 13,
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            color: "#1e293b",
            margin: 0,
            padding: "2px 8px",
          }}
        >
          #{id}
        </Tag>
      ),
      sorter: (a, b) => a.repair_id - b.repair_id,
      defaultSortOrder: "descend",
    },
    {
      title: "Thiết bị",
      dataIndex: ["device", "name"],
      key: "device",
      minWidth: 220,
      render: (text, record) => {
        const brand = record.device?.brand;
        const typeName =
          record.device?.deviceType?.name ||
          (record.device as any)?.device_type?.name;

        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                border: "1px solid #bfdbfe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#1d4ed8",
                fontSize: 17,
                flexShrink: 0,
              }}
            >
              <CarOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13, lineHeight: 1.4 }}>
                {text || "Chưa xác định"}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 3,
                  flexWrap: "wrap",
                }}
              >
                {brand ? (
                  <Tag
                    style={{
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      margin: 0,
                      padding: "0 6px",
                      background: "#f1f5f9",
                      borderColor: "#cbd5e1",
                      color: "#334155",
                      lineHeight: "18px",
                    }}
                  >
                    <span style={{ color: "#64748b", fontWeight: 400, marginRight: 3 }}>
                      Nhãn hiệu:
                    </span>
                    {brand}
                  </Tag>
                ) : (
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>
                    Nhãn hiệu: —
                  </span>
                )}
                {typeName && (
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    • {typeName}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Biển số / Mã QL",
      key: "code",
      width: 160,
      render: (_, record) => (
        <div>
          {record.device?.reg_number ? (
            <Tag
              color="blue"
              style={{
                fontWeight: 700,
                fontSize: 12,
                borderRadius: 6,
                padding: "2px 8px",
                letterSpacing: "0.5px",
                margin: 0,
              }}
            >
              {record.device.reg_number}
            </Tag>
          ) : (
            <Tag color="warning" style={{ borderRadius: 6, margin: 0, fontSize: 11 }}>
              Chưa gán biển số
            </Tag>
          )}
          {record.device?.serial_number && (
            <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>
              Số máy: <span style={{ fontWeight: 500, color: "#334155" }}>{record.device.serial_number}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Đơn vị quản lý",
      key: "department",
      width: 170,
      render: (_, record) => {
        const deptName =
          record.created_department?.name ||
          record.created_by?.department?.name ||
          "-";
        return (
          <Tag
            style={{
              borderRadius: 6,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#334155",
              fontWeight: 500,
              fontSize: 12,
              padding: "2px 8px",
            }}
          >
            {deptName}
          </Tag>
        );
      },
    },
    {
      title: "Người lập & Thời gian",
      key: "creator",
      width: 180,
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
              border: "1px solid #cbd5e1",
              color: "#334155",
              fontWeight: 700,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {(record.created_by?.name || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>
              {record.created_by?.name || "Không rõ"}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
              <CalendarOutlined style={{ fontSize: 10 }} />
              {record.created_at ? dayjs(record.created_at).format("DD/MM/YYYY HH:mm") : "-"}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Trạng thái quy trình",
      key: "status",
      width: 220,
      render: (_, record) => getStatusBadge(record),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 160,
      align: "center",
      fixed: "right",
      render: (_, record) => {
        const phase = getPhase(record);
        const locked =
          record.canceled ||
          record.status_acceptance === "acceptance_admin_approved";
        const canEdit =
          canUpdate &&
          !locked &&
          (record.status_request === "WAITING_TECH" ||
            record.status_request === "REJECTED_B03");

        const role = userRole?.toLowerCase() || "";
        const isTechnician = role === "technician" || role === "admin";
        const primaryDeptName = (currentUser?.department?.name || "").toLowerCase();
        const secondaryDeptNames: string[] = (currentUser?.user_departments || []).map(
          (ud: any) => (ud?.department?.name || "").toLowerCase()
        );
        const allDepts = [primaryDeptName, ...secondaryDeptNames];
        const isInToKyThuat =
          role === "admin" || allDepts.some((d: string) => d === "tổ kỹ thuật");

        const canCreateInsp =
          !locked &&
          isTechnician &&
          isInToKyThuat &&
          record.status_request === "COMPLETED" &&
          record.status_inspection === "inspection_pending";

        const canCreateAcc =
          !locked &&
          isTechnician &&
          isInToKyThuat &&
          record.status_inspection === "inspection_admin_approved" &&
          record.status_acceptance === "acceptance_pending";

        const isCompleted =
          record.status_acceptance === "acceptance_admin_approved";

        // Tạo danh sách menu hành động phụ gọn gàng trong Dropdown
        const menuItems: MenuProps["items"] = [];

        // 1. Chỉnh sửa
        if (
          canEdit &&
          (userRole === "ADMIN" ||
            record.created_by?.user_id === currentUser?.user_id)
        ) {
          menuItems.push({
            key: "edit",
            icon: <EditOutlined />,
            label: "Chỉnh sửa phiếu",
            onClick: () => onEdit?.(record),
          });
        }

        // 2. In ấn chính thức
        if (record.status_request === "COMPLETED") {
          menuItems.push({
            key: "print_b03",
            icon: <PrinterOutlined />,
            label: "In phiếu B03 (Yêu cầu)",
            onClick: () => onExport?.(record, "B03", { hideDates: true }),
          });
        }
        if (record.status_inspection === "inspection_admin_approved") {
          menuItems.push({
            key: "print_b04",
            icon: <PrinterOutlined />,
            label: "In phiếu B04 (Kiểm nghiệm)",
            onClick: () => onExport?.(record, "B04", { hideDates: true }),
          });
        }
        if (record.status_acceptance === "acceptance_admin_approved") {
          menuItems.push({
            key: "print_b05",
            icon: <PrinterOutlined />,
            label: "In phiếu B05 (Nghiệm thu)",
            onClick: () => onExport?.(record, "B05", { hideDates: true }),
          });
        }

        // 3. In gấp (khi chưa hoàn thành)
        if (!isCompleted && !record.canceled) {
          menuItems.push({
            type: "divider",
          });
          menuItems.push({
            key: "print_urgent_b03",
            icon: <ThunderboltOutlined style={{ color: "#faad14" }} />,
            label: "In gấp B03 (Ẩn tên)",
            onClick: () =>
              onExport?.(record, "B03", { hideNames: true, hideDates: true }),
          });
          if (
            record.inspection_created_at ||
            (record.inspection_items && record.inspection_items.length > 0)
          ) {
            menuItems.push({
              key: "print_urgent_b04",
              icon: <ThunderboltOutlined style={{ color: "#faad14" }} />,
              label: "In gấp B04 (Ẩn tên)",
              onClick: () =>
                onExport?.(record, "B04", { hideNames: true, hideDates: true }),
            });
          }
          if (record.acceptance_created_at) {
            menuItems.push({
              key: "print_urgent_b05",
              icon: <ThunderboltOutlined style={{ color: "#faad14" }} />,
              label: "In gấp B05 (Ẩn tên)",
              onClick: () =>
                onExport?.(record, "B05", { hideNames: true, hideDates: true }),
            });
          }
        }

        // 4. Lưu hồ sơ PDF tổng hợp
        if (isCompleted) {
          menuItems.push({
            type: "divider",
          });
          menuItems.push({
            key: "export_pdf",
            icon: <FilePdfOutlined style={{ color: "#1677ff" }} />,
            label: "Xuất hồ sơ PDF tổng hợp",
            onClick: () => onExport?.(record, "COMBINED"),
          });
        }

        // 5. Xóa phiếu (Admin)
        if (userRole === "ADMIN") {
          menuItems.push({
            type: "divider",
          });
          menuItems.push({
            key: "delete",
            icon: <DeleteOutlined style={{ color: "#ff4d4f" }} />,
            danger: true,
            label: (
              <Popconfirm
                title="Xác nhận xóa phiếu"
                description="Bạn có chắc chắn muốn xóa vĩnh viễn phiếu sửa chữa này?"
                onConfirm={() => onDelete?.(record.repair_id)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <span>Xóa phiếu</span>
              </Popconfirm>
            ),
          });
        }

        return (
          <Space size={6}>
            {/* Nút hành động chính: Luôn là Xem chi tiết */}
            <Tooltip title="Xem chi tiết phiếu">
              <Button
                type="primary"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => onView?.(record)}
                style={{
                  borderRadius: 6,
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
                  border: "none",
                  boxShadow: "0 2px 6px rgba(22, 119, 255, 0.2)",
                }}
              >
                Chi tiết
              </Button>
            </Tooltip>

            {/* Nút tắt tạo kiểm nghiệm cho thợ kỹ thuật */}
            {phase === "inspection" && canCreateInsp && (
              <Tooltip title="Lập biên bản kiểm nghiệm (B04)">
                <Button
                  size="small"
                  icon={<FileSearchOutlined />}
                  onClick={() => onOpenInspection?.(record)}
                  style={{
                    borderRadius: 6,
                    background: "#722ed1",
                    borderColor: "#722ed1",
                    color: "#fff",
                  }}
                />
              </Tooltip>
            )}

            {/* Nút tắt tạo nghiệm thu cho thợ kỹ thuật */}
            {phase === "acceptance" && canCreateAcc && (
              <Tooltip title="Lập biên bản nghiệm thu (B05)">
                <Button
                  size="small"
                  icon={<FileDoneOutlined />}
                  onClick={() => onOpenAcceptance?.(record)}
                  style={{
                    borderRadius: 6,
                    background: "#13c2c2",
                    borderColor: "#13c2c2",
                    color: "#fff",
                  }}
                />
              </Tooltip>
            )}

            {/* Menu Dropdown gom toàn bộ hành động phụ */}
            {menuItems.length > 0 && (
              <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
                <Button
                  size="small"
                  icon={<MoreOutlined />}
                  style={{ borderRadius: 6, color: "#64748b" }}
                />
              </Dropdown>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}>
      <Table
        columns={columns}
        dataSource={rows}
        rowKey="repair_id"
        scroll={{ x: 1100 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
          showTotal: (total, range) => (
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Hiển thị <b>{range[0]}-{range[1]}</b> trên tổng <b>{total}</b> phiếu sửa chữa
            </span>
          ),
        }}
        rowClassName={(_, index) =>
          index % 2 === 0 ? "table-row-light" : "table-row-zebra"
        }
      />
    </div>
  );
};

export default RepairsTable;
