import {
  AppBar,
  AppBarProps,
  styled,
  Toolbar,
  ToolbarProps,
} from "@mui/material";

export const AppBarContainer = styled(AppBar)<AppBarProps>(({ theme }) => ({
  background: "#fff",
  height: "70px",
  position: "fixed",
}));

export const ToolbarContainer = styled(Toolbar)<ToolbarProps>(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  height: "100%",
}));
