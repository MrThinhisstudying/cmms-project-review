import React from "react";
import { Collapse, List } from "antd";
import { PlusOutlined, MinusOutlined, CompassOutlined, SendOutlined } from "@ant-design/icons";

interface StatusFilterProps {
  status: { value: string; label: string }[];
  selectedStatus: string;
  onChangeStatus: (status: string) => void;
}

const StatusFilter: React.FC<StatusFilterProps> = ({
  status,
  selectedStatus,
  onChangeStatus,
}) => {
  const items = [
    {
      key: "status",
      label: (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6512c2", fontWeight: 600 }}>
          <CompassOutlined style={{ fontSize: 16 }} />
          <span>Trạng thái</span>
        </div>
      ),
      children: (
        <List
          dataSource={status}
          renderItem={(statusItem) => (
            <List.Item
              onClick={() => onChangeStatus(statusItem.value)}
              style={{
                cursor: "pointer",
                padding: "8px 12px",
                backgroundColor: selectedStatus === statusItem.value ? "#f0f0f0" : "transparent",
                color: "#6512c2",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <SendOutlined style={{ fontSize: 14 }} />
              <span>{statusItem.label}</span>
            </List.Item>
          )}
        />
      ),
    },
  ];

  return (
    <Collapse
      items={items}
      expandIcon={({ isActive }) =>
        isActive ? <MinusOutlined style={{ color: "#6512c2" }} /> : <PlusOutlined style={{ color: "#6512c2" }} />
      }
    />
  );
};

export default StatusFilter;
