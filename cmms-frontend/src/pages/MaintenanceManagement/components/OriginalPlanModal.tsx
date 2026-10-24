import React, { useEffect, useState, useCallback } from "react";
import { Modal, Table, Button, Empty, Tag, Space, Divider, Tooltip } from "antd";
import {
  TableOutlined,
  ReloadOutlined,
  CarOutlined,
  CheckOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getToken } from "../../../utils/auth";

interface Props {
  open: boolean;
  onCancel: () => void;
}

const OriginalPlanModal: React.FC<Props> = ({ open, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
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
            // Deduplicate: merge cycle_config for same device
            if (!acc[cur.device.device_id]) {
              acc[cur.device.device_id] = {
                ...cur,
                cycle_config: [...(cur.cycle_config || [])],
              };
            } else {
              if (cur.cycle_config && Array.isArray(cur.cycle_config)) {
                const existingConfig = new Set(
                  acc[cur.device.device_id].cycle_config || []
                );
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
  }, []);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  // Render Checkmark Badge
  const renderCheck = (cycles: string[], target: string, color: string = "#52c41a") => {
    if (Array.isArray(cycles) && cycles.includes(target)) {
      return (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: 6,
            background: "#f6ffed",
            border: "1px solid #b7eb8f",
            color: color,
            fontWeight: 700,
            fontSize: 12,
            boxShadow: "0 1px 3px rgba(82, 196, 26, 0.15)",
          }}
        >
          <CheckOutlined />
        </div>
      );
    }
    return <span style={{ color: "#e2e8f0" }}>—</span>;
  };

  const columns: any[] = [
    {
      title: "STT",
      width: 55,
      align: "center" as const,
      render: (_: any, __: any, index: number) => (
        <span style={{ color: "#64748b", fontWeight: 500 }}>{index + 1}</span>
      ),
    },
    {
      title: "Thiết Bị / Xe",
      dataIndex: ["device", "name"],
      key: "name",
      width: 220,
      render: (text: string, record: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#e6f4ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1677ff",
              flexShrink: 0,
            }}
          >
            <CarOutlined style={{ fontSize: 16 }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>
              {text}
            </div>
            {record.device?.serial_number && (
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                SN: {record.device.serial_number}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Biển Số Xe",
      dataIndex: ["device", "reg_number"],
      key: "reg_number",
      width: 130,
      render: (text: string) =>
        text ? (
          <Tag color="cyan" style={{ fontWeight: 600, margin: 0 }}>
            {text}
          </Tag>
        ) : (
          <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Chưa có</span>
        ),
    },
    {
      title: "Nước Sản Xuất",
      dataIndex: ["device", "country_of_origin"],
      key: "country",
      width: 120,
      render: (text: string) => text || <span style={{ color: "#94a3b8" }}>—</span>,
    },
    {
      title: "BD Gần Nhất",
      dataIndex: "last_maintenance_date",
      key: "last_date",
      align: "center" as const,
      width: 130,
      render: (date: string) =>
        date ? (
          <span style={{ fontWeight: 500, color: "#334155" }}>
            <CalendarOutlined style={{ marginRight: 4, color: "#1677ff" }} />
            {dayjs(date).format("DD/MM/YYYY")}
          </span>
        ) : (
          <span style={{ color: "#cbd5e1" }}>—</span>
        ),
    },
    // Chu kỳ
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
      width: 85,
      render: (cycles: string[]) => renderCheck(cycles, "1M"),
    },
    {
      title: "3 Tháng",
      dataIndex: "cycle_config",
      align: "center" as const,
      width: 85,
      render: (cycles: string[]) => renderCheck(cycles, "3M"),
    },
    {
      title: "6 Tháng",
      dataIndex: "cycle_config",
      align: "center" as const,
      width: 85,
      render: (cycles: string[]) => renderCheck(cycles, "6M"),
    },
    {
      title: "1 Năm",
      dataIndex: "cycle_config",
      align: "center" as const,
      width: 85,
      render: (cycles: string[]) => renderCheck(cycles, "1Y"),
    },
    {
      title: "2 Năm",
      dataIndex: "cycle_config",
      align: "center" as const,
      width: 85,
      render: (cycles: string[]) => renderCheck(cycles, "2Y"),
    },
  ];

  return (
    <Modal
      title={
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
              boxShadow: "0 4px 12px rgba(22, 119, 255, 0.3)",
            }}
          >
            <TableOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a" }}>
              Bảng Tổng Hợp Kế Hoạch Bảo Dưỡng (View Gốc)
            </div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>
              Cấu hình các chu kỳ áp dụng định kỳ cho từng thiết bị theo định dạng kế hoạch chuẩn
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={1200}
      footer={[
        <Button key="close" onClick={onCancel} style={{ borderRadius: 8 }}>
          Đóng
        </Button>,
      ]}
      centered
      style={{ top: 20 }}
    >
      <Divider style={{ margin: "14px 0" }} />

      <div
        style={{
          marginBottom: 16,
          padding: "10px 16px",
          background: "#f8fafc",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>
          Hiển thị tổng số <b>{data.length}</b> thiết bị có kế hoạch bảo dưỡng
        </span>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchData}
          loading={loading}
          style={{ borderRadius: 8 }}
        >
          Tải lại
        </Button>
      </div>

      <Table
        dataSource={data}
        columns={columns}
        rowKey={(record) => record.maintenance_id || record.device?.device_id || Math.random()}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true, size: "small" }}
        scroll={{ x: 1000, y: 480 }}
        bordered
        size="small"
        style={{ borderRadius: 8, overflow: "hidden" }}
        locale={{ emptyText: <Empty description="Chưa có dữ liệu kế hoạch" /> }}
      />
    </Modal>
  );
};

export default OriginalPlanModal;
