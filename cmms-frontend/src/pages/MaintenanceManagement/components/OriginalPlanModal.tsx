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
      const uniqueData = Object.values(
        (json.data || []).reduce((acc: any, cur: any) => {
          if (cur.device && cur.device.device_id) {
            // Logic deduplicate: Gộp cycle_config của các dòng trùng thiết bị
            if (!acc[cur.device.device_id]) {
              // Nếu chưa có, clone object ra để không sửa trực tiếp vào cur
              acc[cur.device.device_id] = { ...cur, cycle_config: [...(cur.cycle_config || [])] };
            } else {
              // Nếu đã có, gộp cycle_config vào
              if (cur.cycle_config && Array.isArray(cur.cycle_config)) {
                const existingConfig = new Set(acc[cur.device.device_id].cycle_config || []);
                cur.cycle_config.forEach((c: string) => existingConfig.add(c));
                acc[cur.device.device_id].cycle_config = Array.from(existingConfig);
              }
            }
          }
          return acc;
        }, {})
      );
      setData(uniqueData as any[]);
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
    // cycles là mảng gộp ['1M', '6M', ...]
    if (Array.isArray(cycles) && cycles.includes(target)) {
      return (
        <Tag color="green" style={{ margin: 0 }}>
          x
        </Tag>
      );
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
      title: "Nước sản xuất",
      dataIndex: ["device", "country_of_origin"],
      key: "country",
      width: 120,
    },
    {
      title: "Biển số xe",
      dataIndex: ["device", "reg_number"],
      key: "reg_number",
      width: 150,
      render: (text: string) => text ? <Tag color="blue">{text}</Tag> : <span style={{color: '#ccc', fontStyle: 'italic'}}>N/A</span>
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
      title: "Tuần",
      dataIndex: "cycle_config",
      align: "center" as const,
      width: 80,
      render: (cycles: string[]) => renderCheck(cycles, "Tuần"),
    },
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
