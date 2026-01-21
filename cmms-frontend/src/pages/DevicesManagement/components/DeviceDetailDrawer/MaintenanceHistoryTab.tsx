import React from "react";
import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { IMaintenance } from "../../../../types/maintenance.types";
import dayjs from "dayjs";

interface Props {
  loading: boolean;
  maintenances: IMaintenance[];
}

export default function MaintenanceHistoryTab({
  loading,
  maintenances,
}: Props) {
  
  const columns: ColumnsType<IMaintenance> = [
    {
      title: "#",
      key: "index",
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: "Ngày dự kiến",
      dataIndex: "scheduled_date",
      key: "scheduled_date",
      render: (val) => (val ? dayjs(val).format("DD/MM/YYYY") : "—"),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const s = (status || "").toUpperCase();
        let color = "default";
        let text = s;

        if (s === "ACTIVE") {
            color = "processing";
            text = "Đang hiệu lực";
        }
        else if (s === "COMPLETED") {
            color = "success";
            text = "Đã hoàn thành";
        }
        else if (s === "OVERDUE") {
            color = "error";
            text = "Quá hạn";
        }
        else if (s === "CANCELED") {
             color = "default";
             text = "Đã hủy";
        }
        
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "Chu kỳ",
      dataIndex: "level",
      key: "level",
      render: (val: string) => {
          const map: Record<string, string> = {
            '1_week': '1 Tuần',
            '1_month': '1 Tháng',
            '2_month': '2 Tháng',
            '3_month': '3 Tháng',
            '6_month': '6 Tháng',
            '9_month': '9 Tháng',
            '12_month': '12 Tháng',
            '24_month': '24 Tháng',
            '1M': '1 Tháng', 
            '3M': '3 Tháng',
            '6M': '6 Tháng',
            '1Y': '1 Năm',
          };
          return map[val] || val || "—";
      },
    },
    {
      title: "Người/Phòng ban",
      key: "assignee",
      render: (_, record) => record.user?.name || record.department?.name || "—",
    },
  ];

  return (
    <div>
      {maintenances.length > 0 && (
        <div style={{ marginBottom: 16, color: 'rgba(0, 0, 0, 0.45)' }}>
          Tổng số: <strong>{maintenances.length}</strong> lịch bảo trì
        </div>
      )}
      <Table
        loading={loading}
        columns={columns}
        dataSource={maintenances}
        rowKey="maintenance_id"
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        locale={{ emptyText: "Không có lịch sử bảo trì" }}
      />
    </div>
  );
}
