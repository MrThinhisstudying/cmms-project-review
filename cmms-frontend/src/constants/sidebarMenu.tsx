import React from "react";
import { IUserDepartment } from "../types/user.types";
import {
    HomeOutlined,
    TeamOutlined,
    ToolOutlined,
    SettingOutlined,
    BarChartOutlined,
    HistoryOutlined,
    InboxOutlined,
    ExportOutlined,
    CarOutlined,
    FileTextOutlined,
    WarningOutlined,
    CheckSquareOutlined,
    CalendarOutlined,
    TrophyOutlined,
    BookOutlined,
} from "@ant-design/icons";

export interface SidebarMenuItem {
    name: string;
    icon: React.ReactNode;
    textColor: string;
    color: string;
    path: string;
    roles: string[];
    logout?: boolean;
    // Group support
    groupKey?: string;
    children?: SidebarMenuItem[];
    // Filter dựa trên department (user_departments)
    departmentFilter?: (userDepts: IUserDepartment[]) => boolean;
}

// Grouped sidebar structure
export const SIDEBAR_MENU: SidebarMenuItem[] = [
    {
        name: "Trang chủ",
        icon: <HomeOutlined />,
        textColor: "#fff",
        color: "#FFC900",
        path: "/trang_chu",
        roles: ["ADMIN", "STAFF", "MANAGER", "OPERATOR", "TECHNICIAN", "TEAM_LEAD", "UNIT_HEAD", "DIRECTOR", "HR_MANAGER"],
    },
    // --- Quản lý công việc ---
    {
        name: "Quản lý công việc",
        icon: <CheckSquareOutlined />,
        textColor: "#fff",
        color: "#FFC900",
        path: "/tasks-group",
        groupKey: "tasks",
        roles: ["ADMIN", "STAFF", "MANAGER", "OPERATOR", "TECHNICIAN", "TEAM_LEAD", "UNIT_HEAD", "DIRECTOR", "HR_MANAGER"],
        children: [
            {
                name: "Danh sách công việc",
                icon: <CheckSquareOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/quan_ly_cong_viec",
                roles: ["ADMIN", "STAFF", "MANAGER", "OPERATOR", "TECHNICIAN", "TEAM_LEAD", "UNIT_HEAD", "DIRECTOR", "HR_MANAGER"],
            },
            {
                name: "Lịch công việc",
                icon: <CalendarOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/lich_cong_viec",
                roles: ["ADMIN", "STAFF", "MANAGER", "OPERATOR", "TECHNICIAN", "TEAM_LEAD", "UNIT_HEAD", "DIRECTOR", "HR_MANAGER"],
            },
            {
                name: "Bình xét KPI & Thi đua",
                icon: <TrophyOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/kpi_thi_dua",
                roles: ["ADMIN", "STAFF", "MANAGER", "OPERATOR", "TECHNICIAN", "TEAM_LEAD", "UNIT_HEAD", "DIRECTOR", "HR_MANAGER"],
            },
        ],
    },
    // --- Cổng thông tin nội bộ (Toàn thể người lao động) ---
    {
        name: "Quy chế & Quy định",
        icon: <BookOutlined />,
        textColor: "#fff",
        color: "#FFC900",
        path: "/quy_che_quy_dinh",
        roles: ["ADMIN", "STAFF", "MANAGER", "OPERATOR", "TECHNICIAN", "TEAM_LEAD", "UNIT_HEAD", "DIRECTOR", "HR_MANAGER"],
    },
    // --- Nhân sự & Đào tạo ---
    {
        name: "Nhân sự & Đào tạo",
        icon: <TeamOutlined />,
        textColor: "#fff",
        color: "#FFC900",
        path: "/hr-training-group",
        groupKey: "hr-training",
        roles: ["ADMIN", "HR_MANAGER", "DIRECTOR", "UNIT_HEAD"],
        children: [
            {
                name: "Trung tâm Nhân sự 360°",
                icon: <TeamOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/quan_ly_nhan_vien",
                roles: ["ADMIN", "HR_MANAGER", "DIRECTOR", "UNIT_HEAD"],
            },
            {
                name: "Tài khoản & Phân quyền",
                icon: <SettingOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/quan_ly_nguoi_dung",
                roles: ["ADMIN"],
            },
        ],
    },
    // --- Thiết bị & Vật tư ---
    {
        name: "Thiết bị & Vật tư",
        icon: <SettingOutlined />,
        textColor: "#fff",
        color: "#FFC900",
        path: "/device-group",
        groupKey: "devices",
        roles: ["ADMIN", "STAFF", "MANAGER", "OPERATOR", "TECHNICIAN", "TEAM_LEAD", "UNIT_HEAD", "DIRECTOR"],
        children: [
            {
                name: "Quản lý TTB_PT",
                icon: <CarOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/quan_ly_ttb_pt",
                roles: ["ADMIN", "STAFF", "MANAGER", "OPERATOR", "TECHNICIAN", "TEAM_LEAD", "UNIT_HEAD", "DIRECTOR"],
            },
            {
                name: "Quản lý vật tư",
                icon: <InboxOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/quan_ly_vat_tu",
                roles: ["ADMIN", "STAFF", "MANAGER", "OPERATOR", "TECHNICIAN", "TEAM_LEAD", "UNIT_HEAD", "DIRECTOR"],
            },
            {
                name: "Xuất vật tư",
                icon: <ExportOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/lay_vat_tu",
                roles: ["ADMIN", "MANAGER", "TEAM_LEAD", "UNIT_HEAD", "DIRECTOR"],
            },
        ],
    },
    // --- Sửa chữa & Bảo dưỡng ---
    {
        name: "Sửa chữa & Bảo dưỡng",
        icon: <ToolOutlined />,
        textColor: "#fff",
        color: "#FFC900",
        path: "/repair-group",
        groupKey: "repairs",
        roles: ["ADMIN", "DIRECTOR", "UNIT_HEAD", "TEAM_LEAD"],
        // Hiện cho Ban giám đốc, Đội trưởng, Tổ trưởng/Tổ phó VHTTBMĐ và nhân sự thuộc Đội kỹ thuật (is_technical)
        departmentFilter: (userDepts) =>
            userDepts?.some(
                (ud) =>
                    ud.department?.is_technical ||
                    ud.department?.name?.toLowerCase().includes("vhttbmđ") ||
                    ud.department?.name?.toLowerCase().includes("vhttbmd") ||
                    ud.department?.name?.toLowerCase().includes("vận hành")
            ) || false,
        children: [
            {
                name: "Quản lý sửa chữa",
                icon: <ToolOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/quan_ly_sua_chua",
                roles: ["ADMIN", "STAFF", "MANAGER", "OPERATOR", "TECHNICIAN", "TEAM_LEAD", "UNIT_HEAD", "DIRECTOR"],
            },
            {
                name: "Báo cáo tình trạng xe",
                icon: <WarningOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/bao_cao_tinh_trang_xe",
                roles: ["ADMIN", "STAFF", "MANAGER", "OPERATOR", "TECHNICIAN", "TEAM_LEAD", "UNIT_HEAD", "DIRECTOR"],
            },
            {
                name: "Quản lý bảo dưỡng",
                icon: <SettingOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/quan_ly_bao_duong",
                roles: ["ADMIN", "STAFF", "MANAGER", "OPERATOR", "TECHNICIAN", "TEAM_LEAD", "UNIT_HEAD", "DIRECTOR"],
            },
            {
                name: "Lịch sử phiếu",
                icon: <FileTextOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/maintenance-history",
                roles: ["ADMIN", "STAFF", "MANAGER", "OPERATOR", "TECHNICIAN", "TEAM_LEAD", "UNIT_HEAD", "DIRECTOR"],
            },
        ],
    },
    // --- Hệ thống ---
    {
        name: "Báo cáo và thống kê",
        icon: <BarChartOutlined />,
        textColor: "#fff",
        color: "#FFC900",
        path: "/bao_cao_thong_ke",
        roles: ["ADMIN", "MANAGER", "TEAM_LEAD", "UNIT_HEAD", "DIRECTOR"],
    },
    {
        name: "Lịch sử thay đổi",
        icon: <HistoryOutlined />,
        textColor: "#fff",
        color: "#FFC900",
        path: "/lich_su",
        roles: ["ADMIN"],
    },
];
