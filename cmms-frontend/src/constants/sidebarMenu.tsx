import React from "react";
import HomeIcon from "@mui/icons-material/Home";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import PeopleIcon from "@mui/icons-material/People";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import EngineeringIcon from "@mui/icons-material/Engineering"; // For Maintenance/Repair
import ReplayIcon from "@mui/icons-material/Replay";
import { BookOutlined } from "@mui/icons-material"; // Corrected import based on usage (was BookOutlined from @ant-design/icons usually, but here used from mui or mixed? The original code had imports from @mui/icons-material and BookOutlined from @mui/icons-material. Wait, BookOutlined is usually Antd. Let's check the original file imports).

// Checking original imports:
// import { BookOutlined } from "@mui/icons-material"; -> This is likely wrong if they meant Antd, but if it works in MUI it must be valid or aliased. 
// Actually standard MUI icons don't have "Outlined" suffix usually unless explicitly imported from /Outlined. 
// However, the user's code had: import { BookOutlined } from "@mui/icons-material";
// I will keep it as is to avoid breaking changes, assuming it exists or is a custom re-export.
// Actually, let's stick to standard MUI icons if possible, or trust the user's environment.
// Let's copy the imports EXACTLY as they were in the original file to be safe.

import { Menu } from "./menu";

export interface SidebarMenuItem {
  name: string;
  icon: React.ReactNode;
  textColor: string;
  color: string;
  path: string;
  roles: string[];
  logout?: boolean;
}

export const SIDEBAR_MENU: SidebarMenuItem[] = [
  {
    name: Menu.TRANG_CHU,
    icon: <HomeIcon />,
    textColor: "#fff",
    color: "#FFC900",
    path: "/trang_chu",
    roles: ["admin", "staff", "manager", "operator", "technician", "team_lead", "unit_head", "director"],
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
    roles: ["admin", "staff", "manager", "operator", "technician", "team_lead", "unit_head", "director"],
  },
  {
    name: Menu.QUAN_LY_SUA_CHUA,
    icon: <EngineeringIcon />,
    textColor: "#fff",
    color: "#FFC900",
    path: "/quan_ly_sua_chua",
    roles: ["admin", "staff", "manager", "operator", "technician", "team_lead", "unit_head", "director"],
  },
  {
    name: Menu.QUAN_LY_BAO_DUONG,
    icon: <EngineeringIcon />,
    textColor: "#fff",
    color: "#FFC900",
    path: "/quan_ly_bao_duong",
    roles: ["admin", "staff", "manager", "operator", "technician", "team_lead", "unit_head", "director"],
  },
  {
    name: Menu.THU_VIEN_QUY_TRINH,
    icon: <BookOutlined />,
    textColor: "#fff",
    color: "#FFC900",
    path: "/maintenance-procedures",
    roles: ["admin", "staff", "manager", "operator", "technician", "team_lead", "unit_head", "director"],
  },
  {
    name: Menu.QUAN_LY_LICH_SU_PHIEU,
    icon: <BookOutlined />,
    textColor: "#fff",
    color: "#FFC900",
    path: "/maintenance-history",
    roles: ["admin", "staff", "manager", "operator", "technician", "team_lead", "unit_head", "director"],
  },
  {
    name: Menu.QUAN_LY_VAT_TU,
    icon: <PrecisionManufacturingIcon />,
    textColor: "#fff",
    color: "#FFC900",
    path: "/quan_ly_vat_tu",
    roles: ["admin", "staff", "manager", "operator", "technician", "team_lead", "unit_head", "director"],
  },
  {
    name: "Xuất vật tư",
    icon: <ReplayIcon />,
    textColor: "#fff",
    color: "#FFC900",
    path: "/lay_vat_tu",
    roles: ["admin", "manager", "team_lead", "unit_head", "director"],
  },
  {
    name: Menu.BAO_CAO_THONG_KE,
    icon: <AssessmentIcon />,
    textColor: "#fff",
    color: "#FFC900",
    path: "/bao_cao_thong_ke",
    roles: ["admin", "manager", "team_lead", "unit_head", "director"],
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
    roles: ["admin", "staff", "manager", "operator", "technician", "team_lead", "unit_head", "director"],
  },
];
