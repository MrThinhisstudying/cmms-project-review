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
import HomeIcon from "@mui/icons-material/Home";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import PeopleIcon from "@mui/icons-material/People";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import EngineeringIcon from "@mui/icons-material/Engineering";
import ConstructionIcon from "@mui/icons-material/Construction";
import ReplayIcon from "@mui/icons-material/Replay";
import { Menu } from "../../../constants/menu";
import { BookOutlined } from "@mui/icons-material";

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const menuItems = [
  {
    name: Menu.TRANG_CHU,
    icon: <HomeIcon />,
    textColor: "#fff",
    color: "#FFC900",
    path: "/trang_chu",
    roles: ["admin", "staff", "manager"],
  },
  {
    name: Menu.QUAN_LY_NGUOI_DUNG,
    icon: <PeopleIcon />,
    color: "#FFC900",
    textColor: "#fff",
    path: "/quan_ly_nguoi_dung",
    roles: ["admin"],
  },
  {
    name: Menu.QUAN_LY_TTB_PT,
    icon: <PrecisionManufacturingIcon />,
    textColor: "#fff",
    color: "#FFC900",
    path: "/quan_ly_ttb_pt",
    roles: ["admin", "staff", "manager"],
  },
  {
    name: Menu.QUAN_LY_SUA_CHUA,
    icon: <EngineeringIcon />,
    textColor: "#fff",
    color: "#FFC900",
    path: "/quan_ly_sua_chua",
    roles: ["admin", "staff", "manager"],
  },
  {
    name: Menu.QUAN_LY_BAO_DUONG,
    icon: <EngineeringIcon />,
    textColor: "#fff",
    color: "#FFC900",
    path: "/quan_ly_bao_duong",
    roles: ["admin", "staff", "manager"],
  },

  {
    name: Menu.THU_VIEN_QUY_TRINH,
    icon: <BookOutlined />, // Import icon từ antd
    textColor: "#fff",
    color: "#FFC900",
    path: "/maintenance-procedures",
    roles: ["admin", "staff", "manager"],
  },
  {
    name: Menu.QUAN_LY_LICH_SU_PHIEU,
    icon: <BookOutlined />, // Import icon từ antd
    textColor: "#fff",
    color: "#FFC900",
    path: "/maintenance-history",
    roles: ["admin", "staff", "manager"],
  },
  {
    name: Menu.QUAN_LY_VAT_TU,
    icon: <PrecisionManufacturingIcon />,
    textColor: "#fff",
    color: "#FFC900",
    path: "/quan_ly_vat_tu",
    roles: ["admin", "staff", "manager"],
  },
  {
    name: "Xuất vật tư",
    icon: <ReplayIcon />,
    textColor: "#fff",
    color: "#FFC900",
    path: "/lay_vat_tu",
    roles: ["admin", "manager"],
  },
  {
    name: Menu.BAO_CAO_THONG_KE,
    icon: <AssessmentIcon />,
    textColor: "#fff",
    color: "#FFC900",
    path: "/bao_cao_thong_ke",
    roles: ["admin", "manager"],
  },
  {
    name: Menu.ROLLBACK,
    icon: <ReplayIcon />,
    textColor: "#fff",
    color: "#FFC900",
    path: "/lich_su",
    roles: ["admin"],
  },
  {
    name: Menu.DANG_XUAT,
    icon: <ExitToAppIcon />,
    textColor: "#fd0505",
    color: "#fd0505",
    path: "/logout",
    logout: true,
    roles: ["admin", "staff", "manager"],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onClose, isMobile }) => {
  const { logoutUser, user } = useAuthContext();
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname;
    const activeMenu = menuItems.find((item) => item.path === currentPath);
    if (activeMenu) {
      setActiveItem(activeMenu.name);
    }
  }, [location]);

  const filteredMenu = useMemo(() => {
    return menuItems.filter((item) => item.roles?.includes(user?.role ?? ""));
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
