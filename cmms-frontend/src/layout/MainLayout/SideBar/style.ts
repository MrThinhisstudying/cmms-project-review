import styled from "styled-components";

export const DrawerContainer = styled.div<{ open: boolean }>`
  width: ${(props) => (props.open ? "300px" : "60px")};
  flex-shrink: 0;
  box-sizing: border-box;
  top: 70px;
  height: calc(100vh - 70px);
  background: #2d2d2d;
  transition: width 0.3s ease-in-out;
`;
