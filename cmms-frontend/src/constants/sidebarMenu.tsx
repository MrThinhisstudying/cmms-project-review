import React from "react";
import {
    HomeOutlined,
    TeamOutlined,
    BookOutlined,
    ToolOutlined,
    SettingOutlined,
    BarChartOutlined,
    HistoryOutlined,
    InboxOutlined,
    ExportOutlined,
    CarOutlined,
    FileTextOutlined,
    FormOutlined,
    TrophyOutlined,
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
    // --- Nhân sự & Đào tạo ---
    {
        name: "Nhân sự & Đào tạo",
        icon: <TeamOutlined />,
        textColor: "#fff",
        color: "#FFC900",
        path: "/hr-training-group",
        groupKey: "hr-training",
        roles: ["ADMIN", "HR_MANAGER"],
        children: [
            {
                name: "Tổng quan Nhân sự",
                icon: <BarChartOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/hr-dashboard",
                roles: ["ADMIN", "HR_MANAGER"],
            },
            {
                name: "Quản lý nhân viên",
                icon: <TeamOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/quan_ly_nhan_vien",
                roles: ["ADMIN", "HR_MANAGER"],
            },
            {
                name: "Quản lý tài khoản (Admin IT)",
                icon: <SettingOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/quan_ly_nguoi_dung",
                roles: ["ADMIN", "HR_MANAGER"],
            },
            {
                name: "Phê duyệt hồ sơ",
                icon: <FormOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/phe_duyet_ho_so",
                roles: ["ADMIN", "HR_MANAGER"],
            },
            {
                name: "Hợp đồng lao động",
                icon: <FileTextOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/hop-dong-lao-dong",
                roles: ["ADMIN", "HR_MANAGER"],
            },
            {
                name: "Khen thưởng / Kỷ luật",
                icon: <TrophyOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/khen-thuong-ky-luat",
                roles: ["ADMIN", "HR_MANAGER"],
            },
            {
                name: "Quản lý CTĐT / CCCM",
                icon: <BookOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/training-programs",
                roles: ["ADMIN", "HR_MANAGER"],
            },
            {
                name: "Quản lý phép năm",
                icon: <BarChartOutlined />,
                textColor: "#fff",
                color: "#FFC900",
                path: "/quan_ly_phep",
                roles: ["ADMIN", "HR_MANAGER"],
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
        roles: ["ADMIN", "STAFF", "MANAGER", "OPERATOR", "TECHNICIAN", "TEAM_LEAD", "UNIT_HEAD", "DIRECTOR"],
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
