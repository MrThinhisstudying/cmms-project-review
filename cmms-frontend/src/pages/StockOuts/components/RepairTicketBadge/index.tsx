import React, { useState } from "react";
import { Popover, Tag, Button, Typography } from "antd";
import {
  ToolOutlined,
  EyeOutlined,
  CarOutlined,
  UserOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { IRepair } from "../../../../types/repairs.types";

const { Text } = Typography;

interface RepairTicketBadgeProps {
  repair: IRepair;
  onClick: (repairId: number) => void;
}

export default function RepairTicketBadge({
  repair,
  onClick,
}: RepairTicketBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (!repair || !repair.repair_id) return null;

  // Xử lý trạng thái tiến trình phiếu SC
  const getStatusInfo = () => {
    if (repair.status_acceptance === "acceptance_admin_approved") {
      return {
        label: "Đã nghiệm thu (B05)",
        color: "success",
        tagBg: "#ecfdf5",
        tagText: "#059669",
        tagBorder: "#a7f3d0",
      };
    }
    if (repair.status_acceptance) {
      if (
        repair.status_acceptance === "REJECTED_B05" ||
        repair.status_acceptance === "acceptance_rejected"
      ) {
        return {
          label: "Bị từ chối (B05)",
          color: "error",
          tagBg: "#fef2f2",
          tagText: "#dc2626",
          tagBorder: "#fecaca",
        };
      }
      return {
        label: "Đang nghiệm thu (B05)",
        color: "processing",
        tagBg: "#f0f9ff",
        tagText: "#0284c7",
        tagBorder: "#bae6fd",
      };
    }
    if (repair.status_inspection === "inspection_admin_approved") {
      return {
        label: "Đã kiểm nghiệm (B04)",
        color: "cyan",
        tagBg: "#ecfeff",
        tagText: "#0891b2",
        tagBorder: "#a5f3fc",
      };
    }
    if (repair.status_inspection) {
      if (
        repair.status_inspection === "REJECTED_B04" ||
        repair.status_inspection === "inspection_rejected"
      ) {
        return {
          label: "Bị từ chối (B04)",
          color: "error",
          tagBg: "#fef2f2",
          tagText: "#dc2626",
          tagBorder: "#fecaca",
        };
      }
      return {
        label: "Đang kiểm nghiệm (B04)",
        color: "warning",
        tagBg: "#fffbeb",
        tagText: "#d97706",
        tagBorder: "#fde68a",
      };
    }
    if (repair.status_request === "COMPLETED") {
      return {
        label: "Đã duyệt yêu cầu (B03)",
        color: "purple",
        tagBg: "#faf5ff",
        tagText: "#7e22ce",
        tagBorder: "#e9d5ff",
      };
    }
    if (
      repair.status_request === "REJECTED_B03" ||
      repair.status_request === "REJECTED"
    ) {
      return {
        label: "Bị từ chối (B03)",
        color: "error",
        tagBg: "#fef2f2",
        tagText: "#dc2626",
        tagBorder: "#fecaca",
      };
    }
    return {
      label: "Chờ duyệt yêu cầu (B03)",
      color: "gold",
      tagBg: "#fffdf0",
      tagText: "#ca8a04",
      tagBorder: "#fef08a",
    };
  };

  const status = getStatusInfo();
  const device = repair.device;
  const deviceName = device?.name || "Thiết bị chưa định danh";
  const deviceSub = [device?.reg_number, device?.brand, device?.device_code]
    .filter(Boolean)
    .join(" • ");
  const defectDesc =
    repair.location_issue ||
    repair.recommendation ||
    repair.note ||
    "Không có thông tin mô tả hư hỏng";
  const creatorName =
    typeof repair.created_by === "object" && repair.created_by?.name
      ? repair.created_by.name
      : "—";
  const createdAtStr = repair.created_at
    ? dayjs(repair.created_at).format("DD/MM/YYYY HH:mm")
    : "—";

  // Nội dung Popover tóm tắt nhanh
  const popoverContent = (
    <div style={{ width: 330, padding: "2px 2px" }}>
      {/* Header Popover */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          paddingBottom: 8,
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "#f3e8ff",
              color: "#7e22ce",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            <ToolOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", lineHeight: 1.2 }}>
              Phiếu SC #{repair.repair_id}
            </div>
            <div style={{ fontSize: 10, color: "#64748b" }}>Hồ sơ sửa chữa CMMS</div>
          </div>
        </div>
        <Tag
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 4,
            background: status.tagBg,
            color: status.tagText,
            border: `1px solid ${status.tagBorder}`,
          }}
        >
          {status.label}
        </Tag>
      </div>

      {/* Thông tin chi tiết */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
        {/* Khối Xe / Thiết bị */}
        <div
          style={{
            background: "#f8fafc",
            borderRadius: 6,
            padding: "8px 10px",
            border: "1px solid #e2e8f0",
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <CarOutlined style={{ color: "#2563eb", marginTop: 2, fontSize: 14 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                color: "#0f172a",
                fontSize: 12,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {deviceName}
            </div>
            {deviceSub && (
              <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
                {deviceSub}
              </div>
            )}
          </div>
        </div>

        {/* Nội dung hư hỏng */}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <FileTextOutlined style={{ color: "#d97706", marginTop: 2, fontSize: 13 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ color: "#64748b", fontSize: 11 }}>Nội dung hỏng: </span>
            <Text
              style={{
                color: "#1e293b",
                fontWeight: 500,
                fontSize: 11,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {defectDesc}
            </Text>
          </div>
        </div>

        {/* Người tạo & Thời gian */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#64748b",
            fontSize: 11,
            marginTop: 2,
            paddingTop: 6,
            borderTop: "1px dashed #f1f5f9",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <UserOutlined style={{ fontSize: 11 }} />
            {creatorName}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ClockCircleOutlined style={{ fontSize: 11 }} />
            {createdAtStr}
          </span>
        </div>
      </div>

      {/* Nút xem toàn bộ hồ sơ */}
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
        <Button
          type="primary"
          size="small"
          block
          icon={<EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onClick(repair.repair_id);
          }}
          style={{
            borderRadius: 6,
            fontWeight: 600,
            background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
            border: "none",
            boxShadow: "0 2px 6px rgba(124, 58, 237, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <span>Xem toàn bộ hồ sơ (B03, B04, B05)</span>
          <ArrowRightOutlined style={{ fontSize: 10 }} />
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      content={popoverContent}
      trigger="hover"
      mouseEnterDelay={0.2}
      mouseLeaveDelay={0.15}
      placement="rightTop"
      overlayInnerStyle={{ borderRadius: 8, padding: 12, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)" }}
    >
      <Tag
        color="purple"
        onClick={(e) => {
          e.stopPropagation();
          onClick(repair.repair_id);
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          fontSize: 10,
          lineHeight: "18px",
          padding: "1px 7px",
          borderRadius: 4,
          margin: 0,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          border: isHovered ? "1px solid #a855f7" : "1px solid #d8b4fe",
          backgroundColor: isHovered ? "#f3e8ff" : "#faf5ff",
          color: isHovered ? "#6b21a8" : "#7e22ce",
          transform: isHovered ? "translateY(-1px)" : "none",
          boxShadow: isHovered ? "0 2px 4px rgba(126, 34, 206, 0.2)" : "none",
          transition: "all 0.18s ease-in-out",
        }}
        title="Rê chuột xem tóm tắt hoặc bấm để mở toàn bộ hồ sơ"
      >
        <ToolOutlined style={{ fontSize: 11 }} />
        <span>Phiếu SC #{repair.repair_id}</span>
        <EyeOutlined style={{ fontSize: 9, opacity: 0.75, marginLeft: 1 }} />
      </Tag>
    </Popover>
  );
}
