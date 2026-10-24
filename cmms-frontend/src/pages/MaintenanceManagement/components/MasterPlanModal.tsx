import React, { useEffect, useState, useCallback } from "react";
import { Modal, Table, Tag, DatePicker, Button, Empty, Space, Tooltip, Divider } from "antd";
import {
  CalendarOutlined,
  ReloadOutlined,
  CarOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getToken } from "../../../utils/auth";

interface Props {
  open: boolean;
  onCancel: () => void;
}

const CYCLE_COLORS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  Tuần: { label: "Tuần", color: "#0958d9", bg: "#e6f4ff", border: "#91caff" },
  Weekly: { label: "Tuần", color: "#0958d9", bg: "#e6f4ff", border: "#91caff" },
  "1M": { label: "01 Tháng", color: "#006d75", bg: "#e6fffb", border: "#87e8de" },
  "1 Tháng": { label: "01 Tháng", color: "#006d75", bg: "#e6fffb", border: "#87e8de" },
  "3M": { label: "03 Tháng", color: "#1d39c4", bg: "#f0f5ff", border: "#adc6ff" },
  "3 Tháng": { label: "03 Tháng", color: "#1d39c4", bg: "#f0f5ff", border: "#adc6ff" },
  "6M": { label: "06 Tháng", color: "#d46b08", bg: "#fff7e6", border: "#ffd591" },
  "6 Tháng": { label: "06 Tháng", color: "#d46b08", bg: "#fff7e6", border: "#ffd591" },
  "9M": { label: "09 Tháng", color: "#c41d7f", bg: "#fff0f6", border: "#ffadd2" },
  "9 Tháng": { label: "09 Tháng", color: "#c41d7f", bg: "#fff0f6", border: "#ffadd2" },
  "1Y": { label: "01 Năm", color: "#531dab", bg: "#f9f0ff", border: "#d3adf7" },
  "1 Năm": { label: "01 Năm", color: "#531dab", bg: "#f9f0ff", border: "#d3adf7" },
  "2Y": { label: "02 Năm", color: "#cf1322", bg: "#fff1f0", border: "#ffa39e" },
  "2 Năm": { label: "02 Năm", color: "#cf1322", bg: "#fff1f0", border: "#ffa39e" },
};

const MasterPlanModal: React.FC<Props> = ({ open, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [year, setYear] = useState(dayjs()); // Mặc định năm hiện tại

  const fetchMasterPlan = useCallback(async () => {
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
  }, [year]);

  useEffect(() => {
    if (open) fetchMasterPlan();
  }, [open, fetchMasterPlan]);

  // --- CẤU HÌNH CỘT ---
  const columns: any[] = [
    {
      title: "Thiết Bị / Xe",
      dataIndex: ["device", "name"],
      key: "device",
      width: 220,
      fixed: "left",
      render: (text: string, record: any) => (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#e6f4ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            <CarOutlined style={{ color: "#1677ff", fontSize: 16 }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>
              {text}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              {record.device?.reg_number && (
                <Tag
                  color="cyan"
                  style={{
                    fontSize: 11,
                    padding: "0 5px",
                    lineHeight: "18px",
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  {record.device.reg_number}
                </Tag>
              )}
              {record.device?.serial_number && (
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  SN: {record.device.serial_number}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Tạo động 12 cột cho 12 tháng
  for (let i = 1; i <= 12; i++) {
    columns.push({
      title: `Tháng ${i}`,
      dataIndex: ["monthlyData", i],
      key: `month_${i}`,
      align: "center",
      width: 88,
      render: (plans: any[]) => {
        if (!plans || plans.length === 0) {
          return <span style={{ color: "#e2e8f0" }}>—</span>;
        }

        // Deduplicate levels
        const uniqueLevels = Array.from(new Set(plans.map((p) => p.level)));

        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              alignItems: "center",
            }}
          >
            {uniqueLevels.map((level) => {
              const conf = CYCLE_COLORS[level] || {
                label: level,
                color: "#1677ff",
                bg: "#e6f4ff",
                border: "#91caff",
              };

              // Check if completed
              const plan = plans.find((p) => p.level === level);
              const isDone =
                plan?.status === "inactive" && plan?.last_maintenance_date;

              if (isDone) {
                return (
                  <Tooltip
                    key={level}
                    title={`Đã hoàn thành ngày ${dayjs(plan.last_maintenance_date).format(
                      "DD/MM/YYYY"
                    )}`}
                  >
                    <div
                      style={{
                        width: "100%",
                        padding: "2px 4px",
                        borderRadius: 4,
                        background: "#f6ffed",
                        border: "1px solid #b7eb8f",
                        color: "#389e0d",
                        fontSize: 11,
                        fontWeight: 600,
                        textAlign: "center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 2,
                      }}
                    >
                      <CheckCircleOutlined style={{ fontSize: 10 }} />
                      <span>{conf.label}</span>
                    </div>
                  </Tooltip>
                );
              }

              return (
                <div
                  key={level}
                  style={{
                    width: "100%",
                    padding: "2px 4px",
                    borderRadius: 4,
                    background: conf.bg,
                    border: `1px solid ${conf.border}`,
                    color: conf.color,
                    fontSize: 11,
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  {conf.label}
                </div>
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
            <CalendarOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a" }}>
              Kế Hoạch Bảo Dưỡng Tổng Thể Năm {year.year()}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>
              Bản đồ phân bổ các chu kỳ bảo dưỡng định kỳ trong năm theo từng phương tiện
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={1320}
      footer={null}
      centered
      style={{ top: 20 }}
    >
      <Divider style={{ margin: "14px 0" }} />

      {/* Thanh công cụ và chú thích */}
      <div
        style={{
          marginBottom: 16,
          padding: "12px 16px",
          background: "#f8fafc",
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {/* Legend các chu kỳ */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
            <InfoCircleOutlined style={{ marginRight: 4 }} />
            Chu kỳ:
          </span>
          <Tag color="cyan" style={{ margin: 0 }}>Tuần</Tag>
          <Tag color="blue" style={{ margin: 0 }}>01 Tháng</Tag>
          <Tag color="geekblue" style={{ margin: 0 }}>03 Tháng</Tag>
          <Tag color="orange" style={{ margin: 0 }}>06 Tháng</Tag>
          <Tag color="purple" style={{ margin: 0 }}>01 Năm</Tag>
          <Tag color="red" style={{ margin: 0 }}>02 Năm</Tag>
          <Tag
            color="success"
            icon={<CheckCircleOutlined />}
            style={{ margin: 0, fontWeight: 600 }}
          >
            Đã hoàn thành
          </Tag>
        </div>

        {/* Bộ chọn năm & nút làm mới */}
        <Space size={8}>
          <DatePicker
            picker="year"
            value={year}
            onChange={(val) => val && setYear(val)}
            allowClear={false}
            style={{ borderRadius: 8 }}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchMasterPlan}
            loading={loading}
            style={{ borderRadius: 8 }}
          >
            Tải lại
          </Button>
        </Space>
      </div>

      <Table
        dataSource={data}
        columns={columns}
        rowKey={(record) => record.device?.device_id || Math.random()}
        loading={loading}
        pagination={false}
        scroll={{ x: 1280, y: 520 }}
        bordered
        size="small"
        style={{ borderRadius: 8, overflow: "hidden" }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={`Không có kế hoạch bảo dưỡng nào trong năm ${year.year()}`}
            />
          ),
        }}
      />

      <div
        style={{
          marginTop: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
          color: "#64748b",
        }}
      >
        <span>
          * Ghi chú: Các thẻ màu xanh lá kèm dấu tích{" "}
          <CheckCircleOutlined style={{ color: "#52c41a" }} /> biểu thị kỳ bảo dưỡng đã hoàn thành thực tế.
        </span>
        <Button onClick={onCancel} style={{ borderRadius: 8 }}>
          Đóng
        </Button>
      </div>
    </Modal>
  );
};

export default MasterPlanModal;
