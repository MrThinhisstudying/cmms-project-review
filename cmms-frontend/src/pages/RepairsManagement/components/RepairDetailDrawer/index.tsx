import React from "react";
import {
  Drawer,
  Typography,
  Button,
  Tag,
  Table,
  Space,
  Input,
  Modal,
  Steps,
  Collapse,
  Empty,
  Alert,
  Dropdown,
} from "antd";
import {
  PrinterOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
  DownOutlined,
  FileTextOutlined,
  FileSearchOutlined,
  FileDoneOutlined,
  ToolOutlined,
  UserOutlined,
  CalendarOutlined,
  CarOutlined,
  EditOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useRepairsContext } from "../../../../context/RepairsContext/RepairsContext";
import { IRepair } from "../../../../types/repairs.types";
import WarehouseItemBadge from "../WarehouseItemBadge";

const { Title } = Typography;
const { TextArea } = Input;

interface RepairDetailDrawerProps {
  open: boolean;
  data: IRepair | null;
  onClose: () => void;
  onExport?: (type: "B03" | "B04" | "B05") => void;
  canExport?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  onEdit?: () => void;
  onEditInspection?: () => void;
  onEditAcceptance?: () => void;
  currentUser?: any;
  onReview?: (
    action: "approve" | "reject",
    reason?: string,
    phase?: "request" | "inspection" | "acceptance"
  ) => void;
}

export default function RepairDetailDrawer({
  open,
  data,
  onClose,
  onExport,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  onEdit,
  onEditInspection,
  onEditAcceptance,
  currentUser,
  onReview,
}: RepairDetailDrawerProps) {
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");

  // Logic Phase
  const currentPhase = React.useMemo(() => {
    if (!data) return "request";
    if (data.status_request === "REJECTED_B03" || data.status_request === "REJECTED") {
      return "request";
    }
    if (data.status_request !== "COMPLETED") return "request";
    if (
      data.status_inspection === "REJECTED_B04" ||
      data.status_inspection === "inspection_rejected"
    ) {
      return "inspection";
    }
    if (data.status_inspection !== "inspection_admin_approved") return "inspection";
    if (
      data.status_acceptance === "REJECTED_B05" ||
      data.status_acceptance === "acceptance_rejected"
    ) {
      return "acceptance";
    }
    if (data.status_acceptance !== "acceptance_admin_approved") return "acceptance";
    return "completed";
  }, [data]);

  const currentStep = React.useMemo(() => {
    switch (currentPhase) {
      case "request":
        return 0;
      case "inspection":
        return 1;
      case "acceptance":
        return 2;
      case "completed":
        return 3;
      default:
        return 0;
    }
  }, [currentPhase]);

  const stepStatus = React.useMemo(() => {
    if (
      currentPhase === "request" &&
      (data?.status_request === "REJECTED_B03" || data?.status_request === "REJECTED")
    ) {
      return "error";
    }
    if (
      currentPhase === "inspection" &&
      (data?.status_inspection === "REJECTED_B04" ||
        data?.status_inspection === "inspection_rejected")
    ) {
      return "error";
    }
    if (
      currentPhase === "acceptance" &&
      (data?.status_acceptance === "REJECTED_B05" ||
        data?.status_acceptance === "acceptance_rejected")
    ) {
      return "error";
    }
    return "process";
  }, [currentPhase, data]);

  const submitReject = () => {
    onReview && onReview("reject", rejectReason, currentPhase as any);
    setRejectModalOpen(false);
    setRejectReason("");
  };

  const renderStatusTag = (status: string) => {
    const labelMap: Record<string, string> = {
      WAITING_TECH: "Yêu cầu: Chờ KT tiếp nhận",
      WAITING_TEAM_LEAD: "Yêu cầu: Chờ Tổ trưởng duyệt",
      WAITING_MANAGER: "Yêu cầu: Chờ CB Đội duyệt",
      WAITING_DIRECTOR: "Yêu cầu: Chờ Ban GĐ duyệt",
      REJECTED_B03: "B03: Đã từ chối",
      REJECTED: "Đã hủy",
      COMPLETED: "Hoàn tất yêu cầu",

      inspection_pending: data?.inspection_created_at
        ? "Kiểm nghiệm: Chờ Tổ duyệt"
        : "Chờ kiểm nghiệm",
      inspection_lead_approved: "Kiểm nghiệm: Chờ Đội duyệt",
      inspection_manager_approved: "Kiểm nghiệm: Chờ Ban GĐ duyệt",
      inspection_admin_approved: "Hoàn tất kiểm nghiệm",
      REJECTED_B04: "B04: Đã từ chối",
      inspection_rejected: "B04: Đã từ chối",

      acceptance_pending: data?.acceptance_created_at
        ? "Nghiệm thu: Chờ Tổ duyệt"
        : "Chờ nghiệm thu",
      acceptance_lead_approved: "Nghiệm thu: Chờ Đội duyệt",
      acceptance_manager_approved: "Nghiệm thu: Chờ Ban GĐ duyệt",
      acceptance_admin_approved: "Hoàn tất nghiệm thu",
      REJECTED_B05: "B05: Đã từ chối",
      acceptance_rejected: "B05: Đã từ chối",
    };

    let bg = "#f1f5f9";
    let color = "#475569";
    let dotColor = "#94a3b8";

    if (
      status.includes("REJECTED") ||
      status.includes("rejected") ||
      status === "REJECTED"
    ) {
      bg = "#fef2f2";
      color = "#dc2626";
      dotColor = "#ef4444";
    } else if (
      status === "COMPLETED" ||
      status === "acceptance_admin_approved" ||
      status === "inspection_admin_approved"
    ) {
      bg = "#ecfdf5";
      color = "#059669";
      dotColor = "#10b981";
    } else if (status.startsWith("WAITING_")) {
      bg = "#eff6ff";
      color = "#2563eb";
      dotColor = "#3b82f6";
    } else if (status.includes("lead_approved")) {
      bg = "#fffbeb";
      color = "#d97706";
      dotColor = "#f59e0b";
    } else {
      bg = "#f5f3ff";
      color = "#7c3aed";
      dotColor = "#8b5cf6";
    }

    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 10px",
          borderRadius: 14,
          fontSize: 12,
          fontWeight: 600,
          background: bg,
          color: color,
          border: `1px solid ${color}33`,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: dotColor,
          }}
        />
        {labelMap[status] || status}
      </div>
    );
  };

  const role = currentUser?.role;
  const canReviewAction = React.useMemo(() => {
    if (!data) return false;
    if (currentPhase === "request") {
      return (
        role === "ADMIN" ||
        (role === "TECHNICIAN" && data.status_request === "WAITING_TECH") ||
        (role === "UNIT_HEAD" && data.status_request === "WAITING_MANAGER") ||
        (role === "DIRECTOR" && data.status_request === "WAITING_DIRECTOR")
      );
    }
    if (currentPhase === "inspection") {
      return (
        (data.status_inspection === "inspection_pending" &&
          role === "TEAM_LEAD" &&
          !!data.inspection_created_at) ||
        (data.status_inspection === "inspection_lead_approved" &&
          role === "UNIT_HEAD") ||
        (data.status_inspection === "inspection_manager_approved" &&
          (role === "ADMIN" || role === "DIRECTOR"))
      );
    }
    if (currentPhase === "acceptance") {
      return (
        (data.status_acceptance === "acceptance_pending" &&
          role === "TEAM_LEAD" &&
          !!data.acceptance_created_at) ||
        (data.status_acceptance === "acceptance_lead_approved" &&
          role === "UNIT_HEAD") ||
        (data.status_acceptance === "acceptance_manager_approved" &&
          (role === "ADMIN" || role === "DIRECTOR"))
      );
    }
    return false;
  }, [data, role, currentPhase]);

  // Redo Actions (khi phiếu bị từ chối)
  const showRedoB03 =
    (data?.status_request === "REJECTED_B03" || data?.status_request === "REJECTED") &&
    role === "OPERATOR";
  const showRedoB04 =
    (data?.status_inspection === "REJECTED_B04" ||
      data?.status_inspection === "inspection_rejected") &&
    (role === "TECHNICIAN" || role === "ADMIN");
  const showRedoB05 =
    (data?.status_acceptance === "REJECTED_B05" ||
      data?.status_acceptance === "acceptance_rejected") &&
    (role === "TECHNICIAN" || role === "ADMIN");

  // ADMIN: Chỉnh sửa nội dung phiếu bất kỳ lúc nào
  const isAdmin = role === "ADMIN";
  const showAdminEditB03 =
    isAdmin && data && data.status_request === "COMPLETED" && !showRedoB03;
  const showAdminEditB04 =
    isAdmin && data && !!data.inspection_created_at && !showRedoB04;
  const showAdminEditB05 =
    isAdmin && data && !!data.acceptance_created_at && !showRedoB05;

  // --- Limited Use Logic ---
  const { requestLimitedUseItem } = useRepairsContext();
  const [limitedUseReason, setLimitedUseReason] = React.useState("");
  const [limitedUseModalOpen, setLimitedUseModalOpen] = React.useState(false);

  const showRequestLimitedUse =
    data &&
    !data.canceled &&
    (!data.limited_use_status || data.limited_use_status === "REJECTED") &&
    data.status_request === "COMPLETED" &&
    data.status_inspection !== "inspection_admin_approved" &&
    role === "OPERATOR";

  const handleRequestLimitedUse = async () => {
    if (!limitedUseReason.trim()) return;
    try {
      if (data) await requestLimitedUseItem(data.repair_id, limitedUseReason);
      setLimitedUseModalOpen(false);
      setLimitedUseReason("");
    } catch (e) {
      console.error(e);
    }
  };

  const renderLimitedUseTag = () => {
    if (!data) return null;
    if (data.limited_use_status === "APPROVED")
      return (
        <Tag color="success" style={{ fontWeight: 600, borderRadius: 6 }}>
          SDHC: Đã duyệt
        </Tag>
      );
    if (data.limited_use_status === "REJECTED")
      return (
        <Tag color="error" style={{ fontWeight: 600, borderRadius: 6 }}>
          SDHC: Từ chối
        </Tag>
      );
    return null;
  };

  if (!data) return null;

  // --- Card Render Helpers ---
  const renderB03 = () => (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        padding: "18px 20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 8, border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
            <CarOutlined style={{ marginRight: 6, color: "#1677ff" }} />
            Thiết bị hư hỏng
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
            {data.device?.name || "Chưa xác định"}
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span>
              Biển số:{" "}
              {data.device?.reg_number ? (
                <Tag color="blue" style={{ fontWeight: 600, margin: 0 }}>
                  {data.device.reg_number}
                </Tag>
              ) : (
                <span style={{ color: "#94a3b8" }}>Chưa có biển số</span>
              )}
            </span>
            {data.device?.brand && (
              <span>
                Nhãn hiệu:{" "}
                <Tag color="geekblue" style={{ fontWeight: 600, margin: 0 }}>
                  {data.device.brand}
                </Tag>
              </span>
            )}
          </div>
        </div>

        <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 8, border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
            <UserOutlined style={{ marginRight: 6, color: "#1677ff" }} />
            Người lập yêu cầu
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
            {data.created_by?.name || "N/A"}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            <CalendarOutlined style={{ marginRight: 4 }} />
            {dayjs(data.created_at).format("HH:mm DD/MM/YYYY")}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
          <ToolOutlined style={{ marginRight: 6, color: "#fa8c16" }} />
          Tình trạng hư hỏng mô tả:
        </div>
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fef3c7",
            borderRadius: 8,
            padding: "12px 16px",
            color: "#92400e",
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {data.location_issue || "Không có mô tả chi tiết."}
        </div>
      </div>

      {data.recommendation && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
            Kiến nghị / Giải pháp đề xuất:
          </div>
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #dcfce7",
              borderRadius: 8,
              padding: "12px 16px",
              color: "#166534",
              fontSize: 13,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}
          >
            {data.recommendation}
          </div>
        </div>
      )}
    </div>
  );

  const renderB04 = () => {
    if (
      !data.inspection_created_at &&
      !data.inspection_items?.length &&
      data.status_inspection !== "REJECTED_B04" &&
      data.status_inspection !== "inspection_rejected"
    ) {
      return (
        <div style={{ padding: "30px 0" }}>
          <Empty
            description={
              <span style={{ color: "#64748b" }}>
                Chưa có biên bản kiểm nghiệm (B04) cho phiếu này
              </span>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      );
    }

    const inspectionItems = data.inspection_items || [];
    const mergeConfig = (data.extra_config as any)?.merge_cells !== false;

    const inspectionCols: any[] = [
      {
        title: "STT",
        width: 55,
        align: "center" as const,
        render: (_: any, __: any, index: number) => (
          <span style={{ fontWeight: 600, color: "#64748b" }}>{index + 1}</span>
        ),
      },
      {
        title: "Mô tả hạng mục kiểm tra",
        dataIndex: "description",
        key: "desc",
        render: (text: string) => <span style={{ fontWeight: 600, color: "#0f172a" }}>{text}</span>,
      },
      {
        title: "Nguyên nhân hỏng hóc",
        dataIndex: "cause",
        key: "cause",
        onCell: (record: any) => {
          if (!mergeConfig) return {};
          return { rowSpan: record.causeRowSpan };
        },
      },
      {
        title: "Biện pháp khắc phục",
        dataIndex: "solution",
        key: "sol",
        onCell: (record: any) => {
          if (!mergeConfig) return {};
          return { rowSpan: record.solutionRowSpan };
        },
      },
    ];

    if (mergeConfig && inspectionItems.length > 0) {
      inspectionItems.forEach((item: any) => {
        item.causeRowSpan = 1;
        item.solutionRowSpan = 1;
      });

      for (let i = 0; i < inspectionItems.length; i++) {
        let item = inspectionItems[i] as any;
        if (item.causeRowSpan === 0) continue;
        let span = 1;
        for (let j = i + 1; j < inspectionItems.length; j++) {
          const next = inspectionItems[j] as any;
          const currText = (item.cause || "").trim();
          const nextText = (next.cause || "").trim();
          if (nextText === currText || nextText === "") {
            span++;
            next.causeRowSpan = 0;
          } else {
            break;
          }
        }
        item.causeRowSpan = span;
      }

      for (let i = 0; i < inspectionItems.length; i++) {
        let item = inspectionItems[i] as any;
        if (item.solutionRowSpan === 0) continue;
        let span = 1;
        for (let j = i + 1; j < inspectionItems.length; j++) {
          const next = inspectionItems[j] as any;
          const currText = (item.solution || "").trim();
          const nextText = (next.solution || "").trim();
          if (nextText === currText || nextText === "") {
            span++;
            next.solutionRowSpan = 0;
          } else {
            break;
          }
        }
        item.solutionRowSpan = span;
      }
    }

    const dataSource = (data.inspection_materials || [])
      .filter((m: any) => m.phase !== "acceptance")
      .map((m: any, index: number) => ({
        ...m,
        key: m.item_id || index,
        formatted_specs:
          m.specifications ||
          m.code ||
          m.item_code ||
          (m.item_id ? `MA-${m.item_id}` : ""),
        formatted_qty: `${m.quantity} ${m.unit || ""}`,
      }));

    const materialCols = [
      {
        title: "STT",
        width: 55,
        align: "center" as const,
        render: (_: any, __: any, index: number) => (
          <span style={{ fontWeight: 600, color: "#64748b" }}>{index + 1}</span>
        ),
      },
      {
        title: "Tên vật tư / phụ tùng",
        dataIndex: "item_name",
        key: "name",
        render: (text: string, record: any) => (
          <WarehouseItemBadge
            itemId={record.item_id}
            itemName={record.item_name || record.name || text}
            itemCode={record.item_code || record.code}
            requestedQty={record.quantity}
            requestedUnit={record.unit}
            repairId={data?.repair_id}
            showName={true}
          />
        ),
      },
      { title: "Quy cách, mã số", dataIndex: "formatted_specs", key: "specifications" },
      {
        title: "Số lượng dự kiến",
        dataIndex: "formatted_qty",
        key: "qty",
        align: "center" as const,
        render: (text: string) => <Tag color="blue">{text}</Tag>,
      },
      { title: "Ghi chú", dataIndex: "notes", key: "notes" },
    ];

    return (
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {/* Info Header */}
        <div
          style={{
            background: "#f8fafc",
            borderRadius: 8,
            padding: "14px 18px",
            border: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
              Thành phần kiểm nghiệm:
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginTop: 4 }}>
              {data.inspection_committee?.map((u) => {
                let position = u.role || "";
                if (position === "OPERATOR") position = "Nhân viên vận hành";
                else if (position === "TECHNICIAN") position = "Nhân viên kỹ thuật";
                else if (position === "TEAM_LEAD") position = "Tổ trưởng";
                else if (position === "UNIT_HEAD") position = "Cán bộ đội";
                else if (position === "DIRECTOR") position = "Ban Giám đốc";
                else if (position === "ADMIN") position = "Quản trị viên";
                return `${u.name}${position ? ` (${position})` : ""}`;
              }).join(", ") || "Chưa thiết lập"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Ngày kiểm:{" "}
              <b style={{ color: "#0f172a" }}>
                {data.inspection_created_at
                  ? dayjs(data.inspection_created_at).format("DD/MM/YYYY")
                  : "-"}
              </b>
            </div>
            <div style={{ marginTop: 4 }}>
              {renderStatusTag(data.status_inspection || "")}
            </div>
          </div>
        </div>

        {/* Bảng 1: Hạng mục kiểm tra */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", marginBottom: 8 }}>
            📋 Chi tiết nội dung kiểm tra kỹ thuật
          </div>
          <Table
            dataSource={data.inspection_items || []}
            columns={inspectionCols}
            pagination={false}
            size="small"
            bordered
            rowKey="id"
          />
        </div>

        {/* Bảng 2: Vật tư dự kiến */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", marginBottom: 8 }}>
            📦 Danh mục vật tư & phụ tùng đề xuất thay thế
          </div>
          <Table
            dataSource={dataSource}
            columns={materialCols}
            pagination={false}
            size="small"
            bordered
            rowKey="key"
          />
        </div>
      </Space>
    );
  };

  const renderB05 = () => {
    if (
      !data.acceptance_created_at &&
      data.status_acceptance !== "REJECTED_B05" &&
      data.status_acceptance !== "acceptance_rejected"
    ) {
      return (
        <div style={{ padding: "30px 0" }}>
          <Empty
            description={
              <span style={{ color: "#64748b" }}>
                Chưa có biên bản nghiệm thu (B05) cho phiếu này
              </span>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      );
    }

    const mergedMap = new Map<string, any>();

    data.inspection_materials?.forEach((m: any, i: number) => {
      const name = m.item_name || m.name || "Unknown";
      if (!mergedMap.has(name)) {
        mergedMap.set(name, {
          key: `mat_${i}`,
          item_id: m.item_id,
          item_code: m.item_code || m.code,
          item_name: name,
          unit: m.unit,
          specifications: m.specifications || m.code || m.item_code,
          quantity: m.quantity,
          recover_qty: "-",
          scrap_qty: "-",
          recover_damage: "-",
          scrap_damage: "-",
        });
      } else {
        const ex = mergedMap.get(name);
        if (!ex.item_id && m.item_id) ex.item_id = m.item_id;
        ex.quantity = (ex.quantity || 0) + (m.quantity || 0);
      }
    });

    data.recovered_materials?.forEach((m: any) => {
      const name = m.name || "Unknown";
      if (mergedMap.has(name)) {
        const ex = mergedMap.get(name);
        ex.recover_qty = m.quantity;
        ex.recover_damage =
          m.damage_percentage !== undefined ? `${m.damage_percentage}%` : "-";
      } else {
        mergedMap.set(name, {
          key: `rec_${name}`,
          item_name: name,
          unit: m.unit,
          quantity: "-",
          recover_qty: m.quantity,
          recover_damage:
            m.damage_percentage !== undefined ? `${m.damage_percentage}%` : "-",
          scrap_qty: "-",
          scrap_damage: "-",
        });
      }
    });

    data.materials_to_scrap?.forEach((m: any) => {
      const name = m.name || "Unknown";
      if (mergedMap.has(name)) {
        const ex = mergedMap.get(name);
        ex.scrap_qty = m.quantity;
        ex.scrap_damage =
          m.damage_percentage !== undefined ? `${m.damage_percentage}%` : "-";
      } else {
        mergedMap.set(name, {
          key: `scr_${name}`,
          item_name: name,
          unit: m.unit,
          quantity: "-",
          recover_qty: "-",
          recover_damage: "-",
          scrap_qty: m.quantity,
          scrap_damage:
            m.damage_percentage !== undefined ? `${m.damage_percentage}%` : "-",
        });
      }
    });

    const finalMats = Array.from(mergedMap.values());

    return (
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {/* Info Header */}
        <div
          style={{
            background: "#f8fafc",
            borderRadius: 8,
            padding: "14px 18px",
            border: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
              Hội đồng nghiệm thu:
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginTop: 4 }}>
              {data.acceptance_committee
                ?.map((u) => `${u.name}${u.position ? ` (${u.position})` : ""}`)
                .join(", ") || "Chưa thiết lập"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Ngày nghiệm thu:{" "}
              <b style={{ color: "#0f172a" }}>
                {data.acceptance_created_at
                  ? dayjs(data.acceptance_created_at).format("DD/MM/YYYY")
                  : "-"}
              </b>
            </div>
            <div style={{ marginTop: 4 }}>
              {renderStatusTag(data.status_acceptance || "")}
            </div>
          </div>
        </div>

        {/* Nội dung kết luận */}
        <div style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", padding: "14px 18px" }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Mô tả sự cố thực tế:</div>
            <div style={{ fontSize: 13, color: "#1e293b", marginTop: 2 }}>{data.failure_description || "N/A"}</div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Nguyên nhân hư hỏng xác định:</div>
            <div style={{ fontSize: 13, color: "#1e293b", marginTop: 2 }}>{data.failure_cause || "N/A"}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Kết luận & Đánh giá vận hành:</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#059669", marginTop: 2 }}>
              {data.acceptance_note || "Đạt yêu cầu kỹ thuật, đưa thiết bị vào sử dụng bình thường."}
            </div>
          </div>
        </div>

        {/* Bảng quyết toán vật tư */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", marginBottom: 8 }}>
            📊 Quyết toán vật tư thực tế (Thay thế / Thu hồi / Xin hủy)
          </div>
          <Table
            dataSource={finalMats}
            pagination={false}
            size="small"
            bordered
            rowKey="key"
            columns={[
              {
                title: "STT",
                width: 50,
                align: "center",
                render: (_, __, index) => index + 1,
              },
              {
                title: "Vật tư thay thế",
                children: [
                  {
                    title: "Tên vật tư",
                    dataIndex: "item_name",
                    minWidth: 160,
                    render: (text: string, record: any) => (
                      <WarehouseItemBadge
                        itemId={record.item_id}
                        itemName={record.item_name || text}
                        itemCode={record.item_code}
                        requestedQty={typeof record.quantity === "number" ? record.quantity : undefined}
                        requestedUnit={record.unit}
                        repairId={data?.repair_id}
                        showName={true}
                      />
                    ),
                  },
                  { title: "ĐVT", dataIndex: "unit", width: 60, align: "center" },
                  { title: "SL", dataIndex: "quantity", width: 60, align: "center" },
                ],
              },
              {
                title: (
                  <div style={{ textAlign: "center" }}>
                    Vật tư thu hồi
                    <br />
                    <i style={{ fontSize: 11, color: "#64748b" }}>Recovered</i>
                  </div>
                ),
                children: [
                  { title: "SL", dataIndex: "recover_qty", width: 60, align: "center" },
                  { title: "% hỏng", dataIndex: "recover_damage", width: 80, align: "center" },
                ],
              },
              {
                title: (
                  <div style={{ textAlign: "center" }}>
                    Vật tư xin hủy
                    <br />
                    <i style={{ fontSize: 11, color: "#64748b" }}>For Disposal</i>
                  </div>
                ),
                children: [
                  { title: "SL", dataIndex: "scrap_qty", width: 60, align: "center" },
                  { title: "% hỏng", dataIndex: "scrap_damage", width: 80, align: "center" },
                ],
              },
            ]}
          />
        </div>
      </Space>
    );
  };

  const collapseItems = [
    {
      key: "1",
      label: (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileTextOutlined style={{ color: "#1677ff", fontSize: 16 }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
            I. PHIẾU YÊU CẦU SỬA CHỮA (B03)
          </span>
          {(data.status_request === "REJECTED_B03" || data.status_request === "REJECTED") && (
            <Tag color="red" style={{ margin: 0, fontWeight: 600 }}>Từ chối</Tag>
          )}
        </div>
      ),
      children: renderB03(),
    },
    (data.status_request === "COMPLETED" ||
      data.inspection_created_at ||
      data.status_inspection === "REJECTED_B04" ||
      data.status_inspection === "inspection_rejected") && {
      key: "2",
      label: (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileSearchOutlined style={{ color: "#722ed1", fontSize: 16 }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
            II. BIÊN BẢN KIỂM NGHIỆM KỸ THUẬT (B04)
          </span>
          {(data.status_inspection === "REJECTED_B04" ||
            data.status_inspection === "inspection_rejected") && (
            <Tag color="red" style={{ margin: 0, fontWeight: 600 }}>Từ chối</Tag>
          )}
        </div>
      ),
      children: renderB04(),
    },
    (data.acceptance_created_at ||
      data.status_inspection === "inspection_admin_approved" ||
      data.status_acceptance === "REJECTED_B05" ||
      data.status_acceptance === "acceptance_rejected") && {
      key: "3",
      label: (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileDoneOutlined style={{ color: "#10b981", fontSize: 16 }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
            III. BIÊN BẢN NGHIỆM THU HOÀN THÀNH (B05)
          </span>
          {(data.status_acceptance === "REJECTED_B05" ||
            data.status_acceptance === "acceptance_rejected") && (
            <Tag color="red" style={{ margin: 0, fontWeight: 600 }}>Từ chối</Tag>
          )}
        </div>
      ),
      children: renderB05(),
    },
  ].filter(Boolean);

  const rejectedStatus =
    data.status_request === "REJECTED_B03" || data.status_request === "REJECTED"
      ? "REJECTED_B03"
      : data.status_inspection === "REJECTED_B04" ||
        data.status_inspection === "inspection_rejected"
      ? "REJECTED_B04"
      : data.status_acceptance === "REJECTED_B05" ||
        data.status_acceptance === "acceptance_rejected"
      ? "REJECTED_B05"
      : null;

  return (
    <>
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 18,
                  boxShadow: "0 2px 8px rgba(22, 119, 255, 0.25)",
                }}
              >
                <ToolOutlined />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Title level={4} style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                    Phiếu sửa chữa #{data.repair_id}
                  </Title>
                  {renderLimitedUseTag()}
                </div>
                <div style={{ marginTop: 4 }}>
                  {renderStatusTag(
                    currentPhase === "completed"
                      ? "COMPLETED"
                      : currentPhase === "acceptance" ||
                        data.status_acceptance === "REJECTED_B05" ||
                        data.status_acceptance === "acceptance_rejected"
                      ? data.status_acceptance!
                      : currentPhase === "inspection" ||
                        data.status_inspection === "REJECTED_B04" ||
                        data.status_inspection === "inspection_rejected"
                      ? data.status_inspection!
                      : data.status_request
                  )}
                </div>
              </div>
            </div>

            <Space size={8}>
              {(hasPrev || hasNext) && (
                <Button.Group>
                  <Button icon={<LeftOutlined />} onClick={onPrev} disabled={!hasPrev}>
                    Trước
                  </Button>
                  <Button icon={<RightOutlined />} onClick={onNext} disabled={!hasNext}>
                    Sau
                  </Button>
                </Button.Group>
              )}
            </Space>
          </div>
        }
        placement="right"
        onClose={onClose}
        open={open}
        width={940}
        extra={
          <Space>
            {showRequestLimitedUse && (
              <Button onClick={() => setLimitedUseModalOpen(true)}>Xin SDHC</Button>
            )}
            {(() => {
              const printItems: any[] = [];
              if (data.status_request === "COMPLETED") {
                printItems.push({
                  key: "B03",
                  label: "B03: Phiếu Yêu Cầu",
                  onClick: () => onExport && onExport("B03"),
                });
              }
              if (data.status_inspection === "inspection_admin_approved") {
                printItems.push({
                  key: "B04",
                  label: "B04: Phiếu Kiểm Nghiệm",
                  onClick: () => onExport && onExport("B04"),
                });
              }
              if (data.status_acceptance === "acceptance_admin_approved") {
                printItems.push({
                  key: "B05",
                  label: "B05: Phiếu Nghiệm Thu",
                  onClick: () => onExport && onExport("B05"),
                });
              }

              if (printItems.length === 0) return null;

              return (
                <Dropdown menu={{ items: printItems }} trigger={["click"]}>
                  <Button icon={<PrinterOutlined />}>
                    In biểu mẫu <DownOutlined />
                  </Button>
                </Dropdown>
              );
            })()}
          </Space>
        }
        footer={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "4px 0",
            }}
          >
            <div>
              <Button onClick={onClose} style={{ borderRadius: 6 }}>
                Đóng
              </Button>
            </div>

            <Space size={10}>
              {/* Sửa lại phiếu khi bị từ chối */}
              {showRedoB03 && (
                <Button type="primary" danger ghost onClick={onEdit} icon={<EditOutlined />} style={{ borderRadius: 6 }}>
                  Sửa lại phiếu B03
                </Button>
              )}
              {showRedoB04 && (
                <Button type="primary" danger ghost onClick={onEditInspection} icon={<EditOutlined />} style={{ borderRadius: 6 }}>
                  Sửa lại kiểm nghiệm (B04)
                </Button>
              )}
              {showRedoB05 && (
                <Button type="primary" danger ghost onClick={onEditAcceptance} icon={<EditOutlined />} style={{ borderRadius: 6 }}>
                  Sửa lại nghiệm thu (B05)
                </Button>
              )}

              {/* Admin Edit */}
              {showAdminEditB03 && (
                <Button type="primary" ghost onClick={onEdit} icon={<EditOutlined />} style={{ borderRadius: 6 }}>
                  Sửa B03
                </Button>
              )}
              {showAdminEditB04 && (
                <Button type="primary" ghost onClick={onEditInspection} icon={<EditOutlined />} style={{ borderRadius: 6 }}>
                  Sửa B04
                </Button>
              )}
              {showAdminEditB05 && (
                <Button type="primary" ghost onClick={onEditAcceptance} icon={<EditOutlined />} style={{ borderRadius: 6 }}>
                  Sửa B05
                </Button>
              )}

              {/* Duyệt / Từ chối phiếu */}
              {canReviewAction && (
                <>
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => setRejectModalOpen(true)}
                    style={{ borderRadius: 6, fontWeight: 600 }}
                  >
                    Từ chối phiếu
                  </Button>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => onReview && onReview("approve", undefined, currentPhase as any)}
                    style={{
                      borderRadius: 6,
                      fontWeight: 600,
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      border: "none",
                      boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    Phê duyệt phiếu
                  </Button>
                </>
              )}
            </Space>
          </div>
        }
      >
        <div style={{ paddingBottom: 24 }}>
          {rejectedStatus && (
            <Alert
              message={`Phiếu bị từ chối bởi: ${data.rejected_by?.name || "Người kiểm duyệt"}${
                data.rejected_by?.position ? ` (${data.rejected_by.position})` : ""
              }`}
              description={`Lý do: ${data.rejection_reason || "Không có lý do chi tiết"}`}
              type="error"
              showIcon
              style={{ marginBottom: 20, borderRadius: 8 }}
            />
          )}

          {/* Thanh Steps tiến trình */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 20,
            }}
          >
            <Steps
              current={currentStep}
              status={stepStatus}
              items={[
                {
                  title: "1. Yêu cầu (B03)",
                  description: "Tiếp nhận sự cố",
                },
                {
                  title: "2. Kiểm nghiệm (B04)",
                  description: "Khảo sát kỹ thuật",
                },
                {
                  title: "3. Nghiệm thu (B05)",
                  description: "Quyết toán hoàn thành",
                },
                {
                  title: "4. Hoàn tất",
                  description: "Lưu trữ hồ sơ",
                },
              ]}
              size="small"
            />
          </div>

          {/* Các khối Collapse B03 / B04 / B05 */}
          <Collapse
            defaultActiveKey={["1", "2", "3"]}
            items={collapseItems as any}
            style={{ borderRadius: 10, background: "#fafafa" }}
          />
        </div>
      </Drawer>

      <Modal
        title="Từ chối phê duyệt phiếu"
        open={rejectModalOpen}
        onOk={submitReject}
        onCancel={() => setRejectModalOpen(false)}
        okText="Xác nhận từ chối"
        okButtonProps={{ danger: true }}
        cancelText="Hủy bỏ"
      >
        <p style={{ color: "#475569", marginBottom: 8 }}>
          Vui lòng nhập lý do từ chối để thông báo cho người lập phiếu:
        </p>
        <TextArea
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Nhập lý do chi tiết..."
          style={{ borderRadius: 8 }}
        />
      </Modal>

      <Modal
        title="Đề xuất sử dụng hạn chế (SDHC)"
        open={limitedUseModalOpen}
        onOk={handleRequestLimitedUse}
        onCancel={() => setLimitedUseModalOpen(false)}
        okText="Gửi đề xuất"
        cancelText="Hủy bỏ"
      >
        <p style={{ color: "#475569", marginBottom: 8 }}>
          Nhập lý do và điều kiện áp dụng sử dụng hạn chế thiết bị:
        </p>
        <TextArea
          rows={4}
          value={limitedUseReason}
          onChange={(e) => setLimitedUseReason(e.target.value)}
          placeholder="Nhập lý do sử dụng hạn chế..."
          style={{ borderRadius: 8 }}
        />
      </Modal>
    </>
  );
}
