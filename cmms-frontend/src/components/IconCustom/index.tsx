import React from "react";
import styled from "styled-components";

export interface IconCustomProps extends React.HTMLAttributes<HTMLSpanElement> {
  component?: React.ElementType;
  sx?: any;
}

const StyledSpan = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;

  @media (max-width: 1200px) {
    font-size: 16px;
  }

  @media (max-width: 600px) {
    font-size: 14px;
  }
`;

export const IconCustom: React.FC<IconCustomProps> = ({ component: Component, sx, children, ...props }) => {
  return (
    <StyledSpan {...props}>
      {Component ? <Component /> : children}
    </StyledSpan>
  );
};
