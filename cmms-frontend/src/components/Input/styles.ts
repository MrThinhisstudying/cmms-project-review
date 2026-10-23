import styled from "styled-components";
import { Input as AntdInput } from "antd";

export const CustomInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  width: 100%;
  margin-bottom: 16px;
`;

export const CustomLabel = styled.label`
  color: #344054;
  font-weight: 500;
  font-size: 14px;
`;

export const StyledAntdInput = styled(AntdInput)<{ $hasError?: boolean }>`
  border-radius: 8px;
  padding: 8px 14px;
  border-color: ${(props) => (props.$hasError ? "#B42318" : "#D0D5DD")};

  &:focus,
  &.ant-input-focused {
    border-color: #115eaf;
    box-shadow: 0 0 0 2px rgba(17, 94, 175, 0.2);
  }

  &::placeholder {
    color: #98a2b3;
  }
`;

export const StyledAntdPasswordInput = styled(AntdInput.Password)<{ $hasError?: boolean }>`
  border-radius: 8px;
  padding: 8px 14px;
  border-color: ${(props) => (props.$hasError ? "#B42318" : "#D0D5DD")};

  &:focus,
  &.ant-input-focused {
    border-color: #115eaf;
    box-shadow: 0 0 0 2px rgba(17, 94, 175, 0.2);
  }

  &::placeholder {
    color: #98a2b3;
  }
`;

export const HelperText = styled.span`
  color: var(--Error-700, #B42318);
  font-size: 12px;
  position: absolute;
  bottom: -18px;
  left: 0;
`;
