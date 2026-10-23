import React from "react";
import styled from "styled-components";

export interface TypographyCustomProps extends React.HTMLAttributes<HTMLSpanElement> {
  customcolor?: string;
  variant?: string;
  children?: React.ReactNode;
}

export const TypographyCustom = styled.span<{ customcolor?: string }>`
  font-weight: 500;
  color: ${(props) => props.customcolor || "inherit"};
  font-size: 16px;
  line-height: 20px;

  @media (max-width: 1200px) {
    font-size: 14px;
    line-height: 18px;
  }

  @media (max-width: 600px) {
    font-size: 12px;
    line-height: 16px;
  }
`;
