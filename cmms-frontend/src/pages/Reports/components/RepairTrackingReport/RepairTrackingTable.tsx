import React from "react";
import { Table, Tag, Typography, Card, Empty } from "antd";
import type { ColumnsType } from "antd/es/table";
import { IRepairTrackingRow } from "./types";

const { Text } = Typography;

interface RepairTrackingTableProps {
  rows: IRepairTrackingRow[];
  loading: boolean;
  groupLabel: string;
  periodText: string;
}

export const RepairTrackingTable: React.FC<RepairTrackingTableProps> = ({
  rows,
  loading,
  groupLabel,
  periodText,
}) => {
  const columns: ColumnsType<IRepairTrackingRow> = [
    {
      title: (
        <div style={{ textAlign: "center" }}>
          <div>STT</div>
          <div style={{ fontSize: 11, fontWeight: "normal", color: "#64748b" }}>(1)</div>
        </div>
      ),
      dataIndex: "stt",
      key: "stt",
      width: 65,
      align: "center",
      render: (val) => <Text strong>{val}</Text>,
    },
    {
      title: (
        <div>
          <div>Tên Thiết Bị</div>
          <div style={{ fontSize: 11, fontWeight: "normal", color: "#64748b" }}>(2)</div>
        </div>
      ),
      dataIndex: "deviceName",
      key: "deviceName",
      width: 220,
      render: (text) => (
        <Text strong style={{ color: "#0f172a" }}>
          {text}
        </Text>
      ),
    },
    {
      title: (
        <div style={{ textAlign: "center" }}>
          <div>Biển Số</div>
          <div style={{ fontSize: 11, fontWeight: "normal", color: "#64748b" }}>(3)</div>
        </div>
      ),
      dataIndex: "regNumber",
      key: "regNumber",
      width: 140,
      align: "center",
      render: (val) => (
        <Tag
          color="blue"
          style={{
            fontWeight: 700,
            fontSize: 13,
            padding: "2px 10px",
            borderRadius: 4,
            letterSpacing: "0.5px",
          }}
        >
          {val}
        </Tag>
      ),
    },
    {
      title: (
        <div style={{ textAlign: "center" }}>
          <div>Ngày Hư Hỏng</div>
          <div style={{ fontSize: 11, fontWeight: "normal", color: "#64748b" }}>(4)</div>
        </div>
      ),
      dataIndex: "breakdownDate",
      key: "breakdownDate",
      width: 130,
      align: "center",
      render: (val) => <Text style={{ color: "#475569" }}>{val}</Text>,
    },
    {
      title: (
        <div>
          <div>Nội Dung Sửa Chữa</div>
          <div style={{ fontSize: 11, fontWeight: "normal", color: "#64748b" }}>(5)</div>
        </div>
      ),
      dataIndex: "repairContent",
      key: "repairContent",
      render: (text) => (
        <div style={{ lineHeight: 1.5, color: "#1e293b", wordBreak: "break-word" }}>
          {text}
        </div>
      ),
    },
    {
      title: (
        <div style={{ textAlign: "center" }}>
          <div>Ngày Hoàn Thành</div>
          <div style={{ fontSize: 11, fontWeight: "normal", color: "#64748b" }}>(6)</div>
        </div>
      ),
      dataIndex: "completionDate",
      key: "completionDate",
      width: 140,
      align: "center",
      render: (val) =>
        val ? (
          <Text strong style={{ color: "#15803d" }}>
            {val}
          </Text>
        ) : (
          <Tag color="default">—</Tag>
        ),
    },
    {
      title: (
        <div style={{ textAlign: "center" }}>
          <div>Đơn Vị Sửa Chữa</div>
          <div style={{ fontSize: 11, fontWeight: "normal", color: "#64748b" }}>(7)</div>
        </div>
      ),
      dataIndex: "repairUnit",
      key: "repairUnit",
      width: 130,
      align: "center",
      render: (val) => <Tag color="geekblue">{val}</Tag>,
    },
    {
      title: (
        <div style={{ textAlign: "center" }}>
          <div>Đơn Vị Khai Thác</div>
          <div style={{ fontSize: 11, fontWeight: "normal", color: "#64748b" }}>(8)</div>
        </div>
      ),
      dataIndex: "operatingUnit",
      key: "operatingUnit",
      width: 150,
      align: "center",
      render: (val) => <Text style={{ fontSize: 13 }}>{val}</Text>,
    },
    {
      title: (
        <div style={{ textAlign: "center" }}>
          <div>Kết Quả</div>
          <div style={{ fontSize: 11, fontWeight: "normal", color: "#64748b" }}>(9)</div>
        </div>
      ),
      dataIndex: "result",
      key: "result",
      width: 130,
      align: "center",
      render: (val) => {
        if (val === "Đạt" || val === "Hoàn thành") {
          return (
            <Tag color="success" style={{ fontWeight: 600, padding: "2px 10px" }}>
              {val}
            </Tag>
          );
        }
        if (val === "Tiếp nhận") {
          return (
            <Tag color="processing" style={{ fontWeight: 600, padding: "2px 8px" }}>
              Tiếp nhận
            </Tag>
          );
        }
        return (
          <Tag color="warning" style={{ fontWeight: 600, padding: "2px 8px" }}>
            {val || "Đang sửa chữa"}
          </Tag>
        );
      },
    },
  ];

  return (
    <Card
      styles={{ body: { padding: "16px 20px" } }}
      style={{
        borderRadius: 12,
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        border: "1px solid #e2e8f0",
      }}
    >
      {/* Table Title Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: "1px solid #f1f5f9",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", textTransform: "uppercase" }}>
            SỔ THEO DÕI SỬA CHỮA TTB ({groupLabel})
          </div>
          <Text type="secondary" style={{ fontSize: 13, fontStyle: "italic" }}>
            {periodText} — Tổng số: {rows.length} lượt sửa chữa
          </Text>
        </div>
      </div>

      <Table<IRepairTrackingRow>
        rowKey="repairId"
        columns={columns}
        dataSource={rows}
        loading={loading}
        bordered
        locale={{
          emptyText: (
            <Empty
              description="Không có dữ liệu sửa chữa nào phù hợp với bộ lọc hiện tại"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
        pagination={{
          defaultPageSize: 15,
          pageSizeOptions: ["10", "15", "25", "50", "100"],
          showSizeChanger: true,
          showTotal: (total, range) =>
            `Hiển thị ${range[0]} - ${range[1]} trên tổng số ${total} bản ghi`,
        }}
        scroll={{ x: 1200 }}
        size="middle"
      />
    </Card>
  );
};
