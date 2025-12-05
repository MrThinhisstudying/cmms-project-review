import React, { useEffect, useState } from "react";
import { Modal, Table, Button, Empty, Tag } from "antd";
import { TableOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getToken } from "../../../utils/auth";

interface Props {
  open: boolean;
  onCancel: () => void;
}

const OriginalPlanModal: React.FC<Props> = ({ open, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const BASE = process.env.REACT_APP_BASE_URL;
      const res = await fetch(`${BASE}/maintenance/plan/original-view`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setData(json.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  // --- HÀM KIỂM TRA DẤU X ---
  const renderCheck = (cycles: string[], target: string) => {
    // cycles là mảng ['1M', '6M', ...] từ DB
    if (Array.isArray(cycles) && cycles.includes(target)) {
      return (
        <Tag color="green" style={{ margin: 0 }}>
          x
        </Tag>
      ); // Hoặc dùng dấu ✓
    }
    return "";
  };

  const columns: any[] = [
    {
      title: "STT",
      width: 50,
      align: "center" as const,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Tên Trang Thiết Bị",
      dataIndex: ["device", "name"],
      key: "name",
      width: 200,
      render: (text: string) => <b>{text}</b>,
    },
    {
      title: "Model / Biển số",
      dataIndex: ["device", "serial_number"],
      key: "model",
      width: 120,
    },
    {
      title: "Ngày BD Gần Nhất",
      dataIndex: "last_maintenance_date",
      key: "last_date",
      align: "center" as const,
      width: 140,
      render: (date: string) => (date ? dayjs(date).format("DD/MM/YYYY") : "-"),
    },
    // --- CÁC CỘT CHU KỲ (GIỐNG FILE EXCEL) ---
    {
      title: "1 Tháng",
      dataIndex: "cycle_config",
      align: "center" as const,
      width: 80,
      render: (cycles: string[]) => renderCheck(cycles, "1M"),
    },
    {
      title: "3 Tháng",
      dataIndex: "cycle_config",
      align: "center" as const,
      width: 80,
      render: (cycles: string[]) => renderCheck(cycles, "3M"),
    },
    {
      title: "6 Tháng",
      dataIndex: "cycle_config",
      align: "center" as const,
      width: 80,
      render: (cycles: string[]) => renderCheck(cycles, "6M"),
    },
    {
      title: "9 Tháng",
      dataIndex: "cycle_config",
      align: "center" as const,
      width: 80,
      render: (cycles: string[]) => renderCheck(cycles, "9M"),
    },
    {
      title: "1 Năm",
      dataIndex: "cycle_config",
      align: "center" as const,
      width: 80,
      render: (cycles: string[]) => renderCheck(cycles, "1Y"),
    },
    {
      title: "2 Năm",
      dataIndex: "cycle_config",
      align: "center" as const,
      width: 80,
      render: (cycles: string[]) => renderCheck(cycles, "2Y"),
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <TableOutlined />
          <span>DANH SÁCH KẾ HOẠCH BẢO DƯỠNG (VIEW GỐC)</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={1200}
      footer={[
        <Button key="close" onClick={onCancel}>
          Đóng
        </Button>,
      ]}
      style={{ top: 20 }}
    >
      <div style={{ marginBottom: 16, textAlign: "right" }}>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>
          Tải lại
        </Button>
      </div>

      <Table
        dataSource={data}
        columns={columns}
        rowKey={(record) => record.maintenance_id}
        loading={loading}
        pagination={false}
        scroll={{ x: 1000, y: 500 }}
        bordered
        size="small"
        locale={{ emptyText: <Empty description="Chưa có dữ liệu" /> }}
      />
    </Modal>
  );
};

export default OriginalPlanModal;
