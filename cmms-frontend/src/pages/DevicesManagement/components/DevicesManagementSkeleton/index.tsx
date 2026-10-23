import React from "react";
import { Skeleton, Card, Space } from "antd";

const DevicesManagementSkeleton: React.FC = () => {
  return (
    <div style={{ display: "flex", gap: 16, height: "calc(100vh - 120px)", padding: 16 }}>
      <div style={{ width: 220, borderRight: "1px solid #e0e0e0", paddingRight: 16 }}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Skeleton.Input active size="large" style={{ width: 250 }} />
          <Space>
            <Skeleton.Button active size="large" style={{ width: 90 }} />
            <Skeleton.Button active size="large" style={{ width: 110 }} />
            <Skeleton.Button active size="large" style={{ width: 150 }} />
          </Space>
        </Space>

        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Skeleton.Input active size="large" style={{ width: "100%" }} />
          <Skeleton.Button active size="large" style={{ width: 100 }} />
        </Space>

        <Card>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </div>
    </div>
  );
};

export default DevicesManagementSkeleton;
