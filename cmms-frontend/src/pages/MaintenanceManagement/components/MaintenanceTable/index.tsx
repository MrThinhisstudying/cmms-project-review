import React, { useState } from "react";
import { Table, Tooltip, Button, Tag, Space, message } from "antd";
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
      title: "Thiết bị",
      key: "device",
      render: (_, record: IMaintenance) => (
        <div>
          <div style={{ fontWeight: "bold", color: "#1890ff" }}>
            {record.device?.name || "N/A"}
          </div>
          <div style={{ fontSize: "12px", color: "#888" }}>
            {record.device?.brand}
          </div>
        </div>
      ),
    },
    {
      title: "Lịch BD",
      key: "timeline",
      align: "center" as const,
      width: 90,
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
        let color = "blue";
        if (level === "6M") color = "orange";
        if (level === "1Y") color = "purple";

        return <Tag color={color}>{map[level] || level}</Tag>;
      },
    },
    {
      title: "Ngày BD gần nhất",
      dataIndex: "last_maintenance_date",
      align: "center" as const,
      render: (date: string) => (
        <span style={{ color: "#888" }}>
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
        if (!date) return "-";
        const isLate = dayjs()
          .startOf("day")
          .isAfter(dayjs(date).startOf("day"));
        return (
          <div
            style={{
              fontWeight: isLate ? "bold" : "normal",
              color: isLate ? "red" : "black",
            }}
          >
            <CalendarOutlined style={{ marginRight: 5 }} />
            {dayjs(date).format("DD/MM/YYYY")}
          </div>
        );
      },
    },
    {
      title: "Trạng thái",
      key: "status_display",
      align: "center" as const,
      render: (_, record: IMaintenance) => {
        if (record.status !== "active")
          return <Tag color="default">{record.status?.toUpperCase()}</Tag>;
        if (!record.next_maintenance_date) return <Tag>Chưa có lịch</Tag>;

        const today = dayjs().startOf("day");
        const nextDate = dayjs(record.next_maintenance_date).startOf("day");
        const diffDays = nextDate.diff(today, "days");

        const GRACE_DAYS = 3;

        if (diffDays < -GRACE_DAYS) {
          // QUÁ HẠN (Trễ hơn 3 ngày ân hạn)
          return (
            <Tag color="error" style={{ fontWeight: "bold" }}>
              QUÁ HẠN {Math.abs(diffDays)} NGÀY
            </Tag>
          );
        }
        if (diffDays <= GRACE_DAYS) {
          // ĐANG DIỄN RA (Từ [Ngày đến hạn - 3 ngày] đến [Ngày đến hạn + 3 ngày])
          return (
            <Tag color="volcano" style={{ fontWeight: "bold" }}>
              ĐANG DIỄN RA
            </Tag>
          );
        }
        if (diffDays <= 7) {
          // SẮP ĐẾN HẠN (4 đến 7 ngày)
          return (
            <Tag color="warning" style={{ fontWeight: "bold" }}>
              SẮP ĐẾN HẠN ({diffDays} ngày)
            </Tag>
          );
        }

        // CÒN XA
        return <Tag color="processing">ĐANG THEO DÕI</Tag>;
      },
    },
    {
      title: "Thao tác",
      key: "action",
      align: "center" as const,
      width: 150,
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
                    record.device?.brand || ""
                  )}`
                )
              }
            />
          </Tooltip>
          {/* --- NÚT HỦY KẾ HOẠCH (MỚI) --- */}
          <Tooltip title="Dừng theo dõi / Hủy kế hoạch">
            <Button
              danger
              size="small"
              icon={<StopOutlined />}
              onClick={() => handleCancelPlan(record.maintenance_id)}
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
        dataSource={dataSource} // Sử dụng dữ liệu từ props
        rowKey="maintenance_id"
        loading={loading} // Sử dụng loading từ props
        pagination={{
          pageSize: 10,
          showTotal: (total) => `Tổng ${total} kế hoạch`,
        }}
        style={{ marginTop: 16, background: "#fff", borderRadius: 8 }}
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
