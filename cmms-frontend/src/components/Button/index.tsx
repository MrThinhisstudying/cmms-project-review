import React from "react";
import { Button as AntdButton, ButtonProps as AntdButtonProps } from "antd";
import styled from "styled-components";

export interface CustomButtonProps extends Omit<AntdButtonProps, "type" | "color" | "variant"> {
  padding?: string;
  bgrColor?: string;
  variant?: "outlined" | "contained" | "text" | "primary" | "default";
  component?: React.ElementType;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset" | "link" | "default" | "text" | "primary" | "dashed";
  color?: string;
  sx?: any;
}

const StyledAntdButton = styled(AntdButton)<{
  $padding?: string;
  $bgrColor?: string;
  $customVariant?: string;
  $fullWidth?: boolean;
}>`
  min-width: ${(props) => (props.$fullWidth ? "100%" : "fit-content")};
  width: ${(props) => (props.$fullWidth ? "100%" : "auto")};
  padding: ${(props) => props.$padding || "10px 16px"};
  font-size: 15px;
  border-radius: 8px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  height: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  ${(props) => {
    const mainColor = props.$bgrColor || "#1976d2";
    const isOutlined = props.$customVariant === "outlined";

    if (isOutlined) {
      return `
        border: 1px solid ${mainColor};
        background-color: transparent;
        color: ${mainColor};

        &:hover:not(:disabled) {
          background-color: ${mainColor}11 !important;
          border-color: ${mainColor} !important;
          color: ${mainColor} !important;
        }
      `;
    }

    return `
      border: none;
      background-color: ${mainColor};
      color: #fff;

      &:hover:not(:disabled) {
        background-color: ${mainColor} !important;
        color: #fff !important;
        opacity: 0.9;
      }
    `;
  }}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const CustomButton: React.FC<CustomButtonProps> = ({
  padding,
  bgrColor,
  variant = "contained",
  startIcon,
  endIcon,
  fullWidth,
  type,
  color,
  sx,
  style,
  children,
  ...props
}) => {
  const isHtmlType = type === "submit" || type === "button" || type === "reset";
  const buttonHtmlType = isHtmlType ? (type as "submit" | "button" | "reset") : undefined;

  return (
    <StyledAntdButton
      $padding={padding}
      $bgrColor={bgrColor}
      $customVariant={variant}
      $fullWidth={fullWidth}
      icon={startIcon}
      htmlType={buttonHtmlType}
      style={{ ...style }}
      {...props}
    >
      {children}
      {endIcon && <span style={{ marginLeft: 8 }}>{endIcon}</span>}
    </StyledAntdButton>
  );
};
