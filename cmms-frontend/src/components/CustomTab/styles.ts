import styled from "styled-components";

export const TabBox = styled.div<{ $isActive?: boolean }>`
  display: flex;
  border-radius: 6px;
  padding: 10px 14px;
  align-items: center;
  gap: 8px;
  background-color: ${(props) => (props.$isActive ? "rgba(242, 251, 243, 1)" : "transparent")};
  cursor: pointer;
`;

export const BadgeBox = styled.div`
  display: flex;
  padding: 2px 10px;
  align-items: center;
  border-radius: 16px;
  background-color: #EAECF0;
`;
