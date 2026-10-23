import styled from "styled-components";

export const CustomTable = styled.div`
  border: 1px solid #ccc;
`;

export const TableCellHeader = styled.div`
  border-top: 1px solid #ccc;
`;

export const TableRowContainer = styled.div`
  background-color: #f5f5f5;
  font-weight: bold;
`;

export const TableRowBody = styled.div<{ index?: number }>`
  border-bottom: 1px solid #f9fafb;
  font-weight: bold;
  background-color: ${(props) => (props.index && props.index % 2 === 0 ? "#EAECF0" : "#fff")};
`;
