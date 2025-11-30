import styled from "styled-components";

export const StatusTag = styled.span<{ status: string }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background-color: ${({ status }) => {
    switch (status) {
      case "active":
        return "#e6f7ff";
      case "overdue":
        return "#fff1f0";
      case "warning":
        return "#fffbe6";
      default:
        return "#f5f5f5";
    }
  }};
  color: ${({ status }) => {
    switch (status) {
      case "active":
        return "#1890ff";
      case "overdue":
        return "#f5222d";
      case "warning":
        return "#faad14";
      default:
        return "#8c8c8c";
    }
  }};
  border: 1px solid
    ${({ status }) => {
      switch (status) {
        case "active":
          return "#91d5ff";
        case "overdue":
          return "#ffa39e";
        case "warning":
          return "#ffe58f";
        default:
          return "#d9d9d9";
      }
    }};
`;
