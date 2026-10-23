import React from "react";
import { Skeleton, Row, Col, Card, Space } from "antd";

const UserManagementSkeleton: React.FC = () => {
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Skeleton.Input active size="large" style={{ width: 200 }} />
        <Skeleton.Button active size="large" style={{ width: 150 }} />
      </div>

      <Row gutter={[16, 16]}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Skeleton.Input active size="large" style={{ width: 300 }} />
        <Skeleton.Button active size="large" style={{ width: 100 }} />
      </Space>

      <Card>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    </div>
  );
};

export default UserManagementSkeleton;
