import React from "react";
import { Collapse, List } from "antd";
import { PlusOutlined, MinusOutlined, AppstoreOutlined, SendOutlined } from "@ant-design/icons";

interface UsagePurposeFilterProps {
  usagePurposes: string[];
  selectedUsagePurpose: string;
  onSelectUsagePurpose: (category: string) => void;
}

const UsagePurposeFilter: React.FC<UsagePurposeFilterProps> = ({
  usagePurposes,
  selectedUsagePurpose,
  onSelectUsagePurpose,
}) => {
  const items = [
    {
      key: "usagePurpose",
      label: (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6512c2", fontWeight: 600 }}>
          <AppstoreOutlined style={{ fontSize: 16 }} />
          <span>Mục đích sử dụng</span>
        </div>
      ),
      children: (
        <List
          dataSource={usagePurposes}
          renderItem={(usagePurpose) => (
            <List.Item
              onClick={() => onSelectUsagePurpose(usagePurpose)}
              style={{
                cursor: "pointer",
                padding: "8px 12px",
                backgroundColor: selectedUsagePurpose === usagePurpose ? "#f0f0f0" : "transparent",
                color: "#6512c2",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <SendOutlined style={{ fontSize: 14 }} />
              <span>{usagePurpose}</span>
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

export default UsagePurposeFilter;
