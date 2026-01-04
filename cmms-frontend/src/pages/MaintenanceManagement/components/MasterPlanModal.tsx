import React, { useEffect, useState } from "react";
import { Modal, Table, Tag, DatePicker, Button, Tooltip, Empty } from "antd";
import { CalendarOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getToken } from "../../../utils/auth";

interface Props {
  open: boolean;
  onCancel: () => void;
}

const MasterPlanModal: React.FC<Props> = ({ open, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [year, setYear] = useState(dayjs()); // Mặc định năm hiện tại

  const fetchMasterPlan = async () => {
    setLoading(true);
    try {
      const selectedYear = year.year();
      const token = getToken();
      const BASE = process.env.REACT_APP_BASE_URL;

      const res = await fetch(
        `${BASE}/maintenance/plan/yearly?year=${selectedYear}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const json = await res.json();
      setData(json.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchMasterPlan();
  }, [open, year]);

  // --- CẤU HÌNH CỘT ---
  const columns: any[] = [
    {
      title: "Thiết bị",
      dataIndex: ["device", "name"],
      key: "device",
      width: 180,
      fixed: "left",
      render: (text: string, record: any) => (
        <div>
          <div style={{ fontWeight: "bold", color: "#1890ff" }}>{text}</div>
          <div style={{ fontSize: 11, color: "#888" }}>
            {record.device?.serial_number}
          </div>
        </div>
      ),
    },
  ];

  // Tạo động 12 cột cho 12 tháng
  for (let i = 1; i <= 12; i++) {
    columns.push({
      title: `T${i}`,
      dataIndex: ["monthlyData", i],
      key: `month_${i}`,
      align: "center",
      width: 80,
      render: (plans: any[]) => {
        if (!plans || plans.length === 0) return null;

        // Deduplicate levels
        const uniqueLevels = Array.from(new Set(plans.map((p) => p.level)));
        
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
            {uniqueLevels.map((level) => {
              let color = "blue";
              if (level === "Weekly" || level === "Tuần") color = "cyan"; 
              if (level === "1M" || level === "1 Tháng") color = "blue";
              if (level === "3M" || level === "3 Tháng") color = "green";
              if (level === "6M" || level === "6 Tháng") color = "orange";
              if (level === "9M" || level === "9 Tháng") color = "geekblue";
              if (level === "1Y" || level === "1 Năm") color = "purple";
              if (level === "2Y" || level === "2 Năm") color = "red";

              // Find first plan with this level to check status (optional logic)
              const plan = plans.find(p => p.level === level);
              const isDone = plan?.status === "inactive" && plan?.last_maintenance_date;
              const style = isDone ? { opacity: 0.5, textDecoration: "line-through" } : {};

              return (
                <Tag key={level} color={color} style={{ ...style, width: '100%', textAlign: 'center', margin: 0 }}>
                  {level === 'Weekly' ? 'Tuần' : level}
                </Tag>
              );
            })}
          </div>
        );
      },
    });
  }

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CalendarOutlined />
          <span>KẾ HOẠCH BẢO DƯỠNG TỔNG THỂ NĂM {year.year()}</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={1300} // Modal rộng
      footer={null}
      style={{ top: 20 }}
    >
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          gap: 10,
          justifyContent: "flex-end",
        }}
      >
        <DatePicker
          picker="year"
          value={year}
          onChange={(val) => val && setYear(val)}
          allowClear={false}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchMasterPlan}>
          Tải lại
        </Button>
      </div>

      <Table
        dataSource={data}
        columns={columns}
        rowKey={(record) => record.device.device_id}
        loading={loading}
        pagination={false}
        scroll={{ x: 1200, y: 500 }} // Cho phép cuộn ngang và dọc
        bordered
        size="small"
        locale={{ emptyText: <Empty description="Chưa có dữ liệu năm này" /> }}
      />

      <div
        style={{
          marginTop: 10,
          fontSize: 12,
          color: "#666",
          fontStyle: "italic",
        }}
      >
        * Ghi chú: Các ô bị gạch ngang là đã hoàn thành.
      </div>
    </Modal>
  );
};

export default MasterPlanModal;
