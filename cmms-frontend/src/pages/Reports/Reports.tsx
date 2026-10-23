import React, { useState } from "react";
import { Tabs, Typography } from "antd";
import {
  BookOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { RepairTrackingReport } from "./components/RepairTrackingReport";
import { QuarterlyReport } from "./components/QuarterlyReport";

const { Title, Text } = Typography;

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("repair-tracking");

  const tabItems = [
    {
      key: "repair-tracking",
      label: (
        <span style={{ fontSize: 15, fontWeight: 600, padding: "4px 8px" }}>
          <BookOutlined style={{ marginRight: 8, fontSize: 16 }} />
          Sổ theo dõi sửa chữa TTB (Mẫu Côn Đảo)
        </span>
      ),
      children: <RepairTrackingReport />,
    },
    {
      key: "quarterly-report",
      label: (
        <span style={{ fontSize: 15, fontWeight: 500, padding: "4px 8px" }}>
          <BarChartOutlined style={{ marginRight: 8, fontSize: 16 }} />
          Báo cáo kỹ thuật quý (BCKT-1/BM1)
        </span>
      ),
      children: <QuarterlyReport />,
    },
  ];

  return (
    <div
      style={{
        padding: "16px 24px 28px 24px",
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Page Header */}
      <div style={{ marginBottom: 4 }}>
        <Title level={4} style={{ margin: 0, color: "#0f172a", fontWeight: 700 }}>
          Báo cáo & Thống kê Kỹ thuật TTB
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Xem sổ theo dõi sửa chữa trang thiết bị, thống kê định kỳ và xuất báo cáo chuẩn quy cách hành chính
        </Text>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
        style={{ flex: 1 }}
      />
    </div>
  );
};

export default Reports;
