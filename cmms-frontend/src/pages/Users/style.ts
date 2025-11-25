import { styled } from "@mui/material/styles";
import { Box, Paper } from "@mui/material";

export const PageContainer = styled(Box)({
  padding: "20px",
});

export const Header = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px",
  backgroundColor: "#fff",
  boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.1)",
  borderRadius: "8px",
});

export const SearchBar = styled(Box)({
  display: "flex",
  gap: "10px",
  marginTop: "16px",
});

export const StyledTableContainer = styled(Paper)({
  padding: "16px",
  marginTop: "16px",
});
