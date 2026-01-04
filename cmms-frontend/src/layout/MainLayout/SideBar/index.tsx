import React, { useEffect, useMemo, useState } from "react";
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Drawer,
} from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { useAuthContext } from "../../../context/AuthContext/AuthContext";
import { SIDEBAR_MENU } from "../../../constants/sidebarMenu";

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onClose, isMobile }) => {
  const { logoutUser, user } = useAuthContext();
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname;
    const activeMenu = SIDEBAR_MENU.find((item) => item.path === currentPath);
    if (activeMenu) {
      setActiveItem(activeMenu.name);
    }
  }, [location]);

  const filteredMenu = useMemo(() => {
    return SIDEBAR_MENU.filter(
      (item) =>
        item.roles?.includes(user?.role ?? "") ||
        (user?.role === "Administrator" && item.roles?.includes("admin"))
    );
  }, [user?.role]);

  const drawerContent = (
    <List>
      {filteredMenu.map((item, index) => (
        <ListItem
          key={index}
          button
          component={item.logout ? "button" : Link}
          to={!item.logout ? item.path : undefined}
          onClick={() => {
            if (item.logout) {
              logoutUser();
            } else {
              setActiveItem(item.name);
            }
            if (isMobile) onClose();
          }}
          sx={{
            gap: "16px",
            backgroundColor:
              activeItem === item.name ? "#3f3f3f" : "transparent",
            borderLeft:
              activeItem === item.name
                ? `4px solid ${item.color || "#FFC900"}`
                : "none",
            "&:hover": {
              backgroundColor: "#444",
            },
          }}
        >
          <ListItemIcon sx={{ color: item.color || "#FFC900", minWidth: "" }}>
            {item.icon}
          </ListItemIcon>
          <ListItemText
            primary={item.name}
            sx={{ color: item.textColor || "#fff" }}
          />
        </ListItem>
      ))}
    </List>
  );

  return isMobile ? (
    <Drawer
      anchor="left"
      open={mobileOpen}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        "& .MuiDrawer-paper": {
          width: 240,
          background: "#2d2d2d",
          top: "70px",
          height: "calc(100vh - 70px)",
        },
      }}
    >
      {drawerContent}
    </Drawer>
  ) : (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 240,
          background: "#2d2d2d",
          top: "70px",
          height: "calc(100vh - 70px)",
        },
      }}
      open
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
