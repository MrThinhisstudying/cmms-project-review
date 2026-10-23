import styled from "styled-components";
import { Checkbox as AntdCheckbox } from "antd";

export const StyledAntdCheckbox = styled(AntdCheckbox)`
  .ant-checkbox-checked .ant-checkbox-inner {
    background-color: #115eaf;
    border-color: #115eaf;
  }

  .ant-checkbox-inner {
    border-radius: 4px;
    width: 18px;
    height: 18px;
  }

  span {
    color: #344054;
    font-size: 14px;
  }
`;
