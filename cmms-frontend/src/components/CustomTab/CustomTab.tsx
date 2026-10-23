import React from "react";
import { TabBox, BadgeBox } from "./styles";
import { CustomTabProps } from "../../types/index.types";

function CustomTab(props: CustomTabProps) {
  const isActive = props.id === props.value;

  return (
    <TabBox $isActive={isActive}>
      <span
        style={{
          color: isActive ? "#296C32" : "#667085",
          fontSize: 16,
          fontWeight: 600,
          lineHeight: "24px",
        }}
      >
        {props.label}
      </span>
      {props.id !== 0 && (
        <BadgeBox>
          <span
            style={{
              fontWeight: 500,
              textAlign: "center",
              fontSize: 14,
              lineHeight: "20px",
            }}
          >
            {props.total}
          </span>
        </BadgeBox>
      )}
    </TabBox>
  );
}

export default CustomTab;
