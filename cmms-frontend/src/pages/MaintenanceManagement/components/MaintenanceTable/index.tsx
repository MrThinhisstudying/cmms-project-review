import React, { useEffect, useState } from "react";
import { Table, message, Tooltip, Button } from "antd";
import { CalendarOutlined, FileSearchOutlined } from "@ant-design/icons";
import { getAllMaintenances } from "../../../../apis/maintenance";
import { IMaintenance } from "../../../../types/maintenance.types";
import { StatusTag } from "./style";
import moment from "moment";
import { useNavigate } from "react-router-dom";
interface Props {
  refreshKey: number; // Dùng để trigger reload bảng từ bên ngoài
}

const MaintenanceTable: React.FC<Props> = ({ refreshKey }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<IMaintenance[]>([]);
  const navigate = useNavigate();
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getAllMaintenances();
      setData(res);
    } catch (error) {
      message.error("Không thể tải danh sách bảo dưỡng");
    } finally {
      setLoading(false);
    }
  };

  // Reload khi component mount hoặc khi refreshKey thay đổi
  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const columns = [
    {
      title: "Thiết bị",
      key: "device",
      render: (_, record: IMaintenance) => (
        <div>
          <div style={{ fontWeight: "bold" }}>
            {record.device?.name || "N/A"}
          </div>
          <div style={{ fontSize: "12px", color: "#888" }}>
            {record.device?.brand}
          </div>
        </div>
      ),
    },
    {
      title: "Cấp bảo dưỡng",
      dataIndex: "level",
      key: "level",
      render: (level: string) => (
        <span style={{ fontWeight: 500 }}>
          {level?.replace("_", " ").toUpperCase()}
        </span>
      ),
    },
    {
      title: "Ngày dự kiến",
      dataIndex: "scheduled_date",
      key: "scheduled_date",
      render: (date: string) => (
        <div>
          <CalendarOutlined style={{ marginRight: 5, color: "#1890ff" }} />
          {date ? moment(date).format("DD/MM/YYYY") : "-"}
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        let label = status;
        if (status === "active") label = "Đang hoạt động";
        if (status === "overdue") label = "Quá hạn";
        if (status === "warning") label = "Sắp đến hạn";
        return <StatusTag status={status}>{label}</StatusTag>;
      },
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_, record: IMaintenance) => (
        <Tooltip title="Xem lịch sử phiếu">
          <Button
            type="text"
            icon={<FileSearchOutlined />}
            onClick={() => {
              // Chuyển hướng sang trang chi tiết thiết bị (giả sử route là /devices/:id)
              // Hoặc mở một Modal danh sách phiếu ngay tại đây (nếu bạn muốn)
              navigate(`/devices/${record.device?.device_id}?tab=history`);
            }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="maintenance_id"
      loading={loading}
      pagination={{ pageSize: 10 }}
      style={{ marginTop: 16, background: "#fff", borderRadius: 8 }}
    />
  );
};

export default MaintenanceTable;
