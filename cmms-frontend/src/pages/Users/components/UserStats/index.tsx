import React from "react";
import { Row, Col, Card } from "antd";
import { RiseOutlined, FallOutlined } from "@ant-design/icons";

interface IUserStat {
  label: string;
  value: number;
  change: string;
}

interface UserStatsProps {
  stats: IUserStat[];
}

const getStatStyles = (change: string) => {
  const changeValue = parseFloat(change);
  if (changeValue > 0) {
    return {
      backgroundColor: "#dbf6fd",
      color: "#096c86",
      icon: <RiseOutlined style={{ color: "#096c86" }} />,
    };
  } else if (changeValue < 0) {
    return {
      backgroundColor: "#fee4cb",
      color: "#ff942e",
      icon: <FallOutlined style={{ color: "#ff942e" }} />,
    };
  }
  return { backgroundColor: "transparent", color: "#667085", icon: null };
};

const UserStats: React.FC<UserStatsProps> = ({ stats }) => {
  return (
    <Row gutter={[16, 16]} style={{ padding: "16px 0" }}>
      {stats.map((stat, index) => {
        const { backgroundColor, color, icon } = getStatStyles(stat.change);
        return (
          <Col xs={24} sm={12} md={8} lg={6} key={index}>
            <Card style={{ borderRadius: 8, height: "100%" }}>
              <div style={{ color: "#667085", fontSize: 14, marginBottom: 8 }}>
                {stat.label}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 24, fontWeight: "bold" }}>{stat.value}</span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "2px 8px",
                    borderRadius: 4,
                    backgroundColor,
                  }}
                >
                  {icon}
                  <span style={{ color, marginLeft: 4, fontSize: 13, fontWeight: 500 }}>
                    {stat.change}
                  </span>
                </div>
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

export default UserStats;
