import React, { useState } from "react";
import { Table, Tooltip, Button, Tag, message } from "antd";
import {
  CalendarOutlined,
  FileSearchOutlined,
  ToolOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { IMaintenance } from "../../../../types/maintenance.types";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
// Import Modal xem chi tiết
import MaintenanceDetailModal from "../MaintenanceDetailModal";
import { Modal } from "antd";
import { StopOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { cancelMaintenancePlan } from "../../../../apis/maintenance";
import { getToken } from "../../../../utils/auth";
import { renderMaintenanceStatusTag } from "../../../../utils/maintenanceDue";
const { confirm } = Modal;
// --- QUAN TRỌNG: CẬP NHẬT INTERFACE ĐỂ KHỚP VỚI TRANG CHA ---
interface Props {
  loading: boolean; // Nhận loading từ cha (để fix lỗi Property 'loading' does not exist)
  dataSource: IMaintenance[]; // Nhận dữ liệu từ cha
  onCreateTicket?: (record: IMaintenance) => void;
  onEdit?: (record: IMaintenance) => void;
  onRefresh?: () => void;
}

const MaintenanceTable: React.FC<Props> = ({
  loading,
  dataSource,
  onCreateTicket,
  onEdit,
  onRefresh,
}) => {
  const navigate = useNavigate();

  // State quản lý Modal xem lịch 12 tháng
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const handleCancelPlan = (id: number) => {
    confirm({
      title: "Dừng theo dõi thiết bị này?",
      icon: <ExclamationCircleOutlined />,
      content:
        "Kế hoạch sẽ bị hủy và không còn hiện trong danh sách theo dõi. Bạn có chắc không?",
      okText: "Dừng theo dõi",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await cancelMaintenancePlan(id, getToken());
          message.success("Đã hủy kế hoạch thành công");
          if (onRefresh) onRefresh(); // Reload bảng
        } catch (e) {
          message.error("Lỗi khi hủy kế hoạch");
        }
      },
    });
  };
  const columns = [
    {
      title: "STT",
      key: "index",
      align: "center" as const,
      width: 55,
      render: (_: any, __: any, index: number) => (
        <span style={{ fontWeight: 600, color: "#94a3b8" }}>{index + 1}</span>
      ),
    },
    {
      title: "Thiết bị / Xe",
      key: "device",
      render: (_, record: IMaintenance) => (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "#e6f4ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1677ff",
              fontSize: 16,
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            🚚
          </div>
          <div>
            <div
              style={{
                fontWeight: 600,
                color: "#0f172a",
                fontSize: 14,
                cursor: "pointer",
              }}
              onClick={() => {
                setSelectedDevice(record.device);
                setIsDetailOpen(true);
              }}
            >
              {record.device?.name || "N/A"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              {record.device?.reg_number ? (
                <Tag color="cyan" style={{ borderRadius: 4, margin: 0, fontWeight: 500, fontSize: 11 }}>
                  {record.device.reg_number}
                </Tag>
              ) : (
                <span style={{ fontStyle: "italic", color: "#94a3b8", fontSize: 11 }}>Chưa có biển số</span>
              )}
              {record.device?.brand && (
                <span style={{ fontSize: 11, color: "#64748b" }}>• {record.device.brand}</span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Lịch 12T",
      key: "timeline",
      align: "center" as const,
      width: 100,
      render: (_, record: IMaintenance) => (
        <Tooltip title="Xem chi tiết kế hoạch năm">
          <Button
            type="primary"
            ghost
            size="small"
            icon={<CalendarOutlined />}
            onClick={() => {
              setSelectedDevice(record.device);
              setIsDetailOpen(true);
            }}
            style={{ borderRadius: 6, fontWeight: 500, fontSize: 12 }}
          >
            Chi tiết
          </Button>
        </Tooltip>
      ),
    },
    {
      title: "Cấp độ tiếp theo",
      dataIndex: "level",
      align: "center" as const,
      width: 130,
      render: (level: string) => {
        const map: any = {
          "1W": "Tuần",
          "Tuần": "Tuần",
          "1M": "01 Tháng",
          "3M": "03 Tháng",
          "6M": "06 Tháng",
          "9M": "09 Tháng",
          "1Y": "01 Năm",
          "2Y": "02 Năm",
        };
        const colorMap: Record<string, string> = {
          "Tuần": "blue",
          "1W": "blue",
          "1M": "cyan",
          "3M": "geekblue",
          "6M": "purple",
          "9M": "magenta",
          "1Y": "magenta",
          "2Y": "volcano",
        };
        return (
          <Tag color={colorMap[level] || "blue"} style={{ fontWeight: 600, borderRadius: 4, minWidth: 70, textAlign: "center" }}>
            {map[level] || level}
          </Tag>
        );
      },
    },
    {
      title: "Ngày BD gần nhất",
      dataIndex: "last_maintenance_date",
      align: "center" as const,
      width: 140,
      render: (date: string) => (
        <span style={{ color: date && dayjs(date).isValid() ? "#334155" : "#94a3b8", fontSize: 13 }}>
          {date && dayjs(date).isValid()
            ? dayjs(date).format("DD/MM/YYYY")
            : "(Chưa làm)"}
        </span>
      ),
    },
    {
      title: "Ngày đến hạn (Dự kiến)",
      dataIndex: "next_maintenance_date",
      align: "center" as const,
      width: 160,
      sorter: (a: any, b: any) => {
        const dateA = a.next_maintenance_date
          ? dayjs(a.next_maintenance_date).unix()
          : 0;
        const dateB = b.next_maintenance_date
          ? dayjs(b.next_maintenance_date).unix()
          : 0;
        return dateA - dateB;
      },
      render: (date: string) => {
        if (!date) return <span style={{ color: "#94a3b8" }}>-</span>;
        const today = dayjs().startOf("day");
        const nextD = dayjs(date).startOf("day");
        const diff = nextD.diff(today, "day");

        if (diff < 0) {
          return (
            <div>
              <div style={{ fontWeight: 700, color: "#cf1322", fontSize: 13 }}>
                <CalendarOutlined style={{ marginRight: 5 }} />
                {dayjs(date).format("DD/MM/YYYY")}
              </div>
              <Tag color="error" style={{ fontSize: 10, borderRadius: 4, marginTop: 2 }}>
                Trễ {Math.abs(diff)} ngày
              </Tag>
            </div>
          );
        }
        if (diff <= 5) {
          return (
            <div>
              <div style={{ fontWeight: 600, color: "#d46b08", fontSize: 13 }}>
                <CalendarOutlined style={{ marginRight: 5 }} />
                {dayjs(date).format("DD/MM/YYYY")}
              </div>
              <Tag color="warning" style={{ fontSize: 10, borderRadius: 4, marginTop: 2 }}>
                Còn {diff === 0 ? "Hôm nay" : `${diff} ngày`}
              </Tag>
            </div>
          );
        }
        return (
          <div style={{ color: "#1e293b", fontSize: 13 }}>
            <CalendarOutlined style={{ marginRight: 5, color: "#94a3b8" }} />
            {dayjs(date).format("DD/MM/YYYY")}
          </div>
        );
      },
    },
    {
      title: "Trạng thái",
      key: "status_display",
      align: "center" as const,
      width: 130,
      render: (_, record: IMaintenance) => renderMaintenanceStatusTag(record),
    },
    {
      title: "Thao tác",
      key: "action",
      align: "center" as const,
      width: 160,
      render: (_, record: IMaintenance) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          {/* 1. Nút Thực hiện (Chỉ hiện khi Active) */}
          {record.status === "active" && (
            <Tooltip title="Thực hiện bảo dưỡng ngay">
              <Button
                type="primary"
                size="small"
                icon={<ToolOutlined />}
                onClick={() => onCreateTicket && onCreateTicket(record)}
                style={{
                  borderRadius: 6,
                  background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
                }}
              />
            </Tooltip>
          )}

          {/* 2. Nút Sửa Kế Hoạch */}
          <Tooltip title="Chỉnh sửa kế hoạch">
            <Button
              type="default"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit && onEdit(record)}
              style={{ borderRadius: 6 }}
            />
          </Tooltip>

          {/* 3. Nút Xem Lịch Sử */}
          <Tooltip title="Xem lịch sử phiếu">
            <Button
              type="default"
              size="small"
              icon={<FileSearchOutlined />}
              onClick={() =>
                navigate(
                  `/maintenance-history?search=${encodeURIComponent(
                    record.device?.brand || record.device?.name || ""
                  )}`
                )
              }
              style={{ borderRadius: 6 }}
            />
          </Tooltip>

          {/* 4. Nút Hủy Kế Hoạch */}
          <Tooltip title="Dừng theo dõi / Hủy kế hoạch">
            <Button
              danger
              size="small"
              icon={<StopOutlined />}
              onClick={() => handleCancelPlan(record.maintenance_id)}
              style={{ borderRadius: 6 }}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey="maintenance_id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showTotal: (total) => `Tổng ${total} kế hoạch thiết bị`,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
        }}
        style={{
          marginTop: 16,
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
          overflow: "hidden",
        }}
      />

      <MaintenanceDetailModal
        open={isDetailOpen}
        deviceId={selectedDevice?.device_id}
        deviceName={selectedDevice?.name}
        onClose={() => {
            setIsDetailOpen(false);
            setSelectedDevice(null);
        }}
        onPerformMaintenance={(record) => {
             // Pass callback to parent if needed, or handle directly
             if (onCreateTicket) onCreateTicket(record);
        }}
      />
    </>
  );
};

export default MaintenanceTable;
