import {
  Drawer,
  DrawerProps,
  styled,
} from "@mui/material";

interface DrawerContainerProps extends DrawerProps {
  open: boolean;
}

export const DrawerContainer = styled(Drawer)<DrawerContainerProps>(
  ({ theme, open }) => ({
    width: open ? 300 : 60,
    flexShrink: 0,
    [`& .MuiDrawer-paper`]: {
      width: open ? 300 : 60,
      boxSizing: "border-box",
      top: "70px",
      height: "calc(100vh - 70px)",
      background: "#2d2d2d",
      transition: "width 0.3s ease-in-out",
    },
  })
);
