import React from "react";
import { Tabs as AntdTabs } from "antd";
import CustomTab from "../CustomTab/CustomTab";
import { CustomTabProps } from "../../types/index.types";

function TabHeader(props: {
  tabs: CustomTabProps[];
  handleChange: (newValue: number) => void;
  value: number;
}) {
  const items = props.tabs.map((tab) => ({
    key: String(tab.id),
    label: (
      <CustomTab
        label={tab.label}
        total={tab.total}
        id={tab.id}
        value={props.value}
      />
    ),
  }));

  return (
    <AntdTabs
      activeKey={String(props.value)}
      onChange={(key) => props.handleChange(Number(key))}
      items={items}
    />
  );
}

export default TabHeader;
