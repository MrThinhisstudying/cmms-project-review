import { styled } from "@mui/material/styles";
import {
  Table,
  TableCell,
  TableCellProps,
  TableProps,
  TableRow,
  TableRowProps,
} from "@mui/material";

interface TableRowBodyProps extends TableRowProps {
  index: number;
}

export const CustomTable = styled(Table)<TableProps>(({ theme }) => ({
  border: "1px solid #ccc",
}));

export const TableCellHeader = styled(TableCell)<TableCellProps>(
  ({ theme }) => ({
    borderTop: "1px solid #ccc",
  })
);

export const TableRowContainer = styled(TableRow)<TableRowProps>(
  ({ theme }) => ({
    backgroundColor: "#f5f5f5",
    fontWeight: "bold",
  })
);

export const TableRowBody = styled(TableRow)<TableRowBodyProps>(
  ({ theme, index }) => ({
    borderBottom: "1px solid #f9fafb",
    "&:last-child td, &:last-child th": { borderBottom: 0 },
    fontWeight: "bold",
    backgroundColor: index % 2 === 0 ? "#EAECF0" : "#fff",
  })
);
