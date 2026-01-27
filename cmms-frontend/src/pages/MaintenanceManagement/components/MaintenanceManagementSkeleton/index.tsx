import React from "react";
import { Card, Skeleton, Space } from "antd";

const MaintenanceManagementSkeleton: React.FC = () => {
  return (
    <div style={{ padding: 24 }}>
      {/* Header Skeleton */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <Space direction="vertical">
          <Skeleton.Input active size="small" style={{ width: 200 }} />
          <Skeleton.Input active size="small" style={{ width: 300 }} />
        </Space>
        <Space>
          <Skeleton.Button active size="default" />
          <Skeleton.Button active size="default" />
        </Space>
      </div>

      {/* Table Skeleton */}
      <Card variant="borderless" style={{ borderRadius: 8 }}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </Card>
    </div>
  );
};

export default MaintenanceManagementSkeleton;
