import React from "react";
import { Badge } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import {
    HomeOutlined,
    CheckSquareOutlined,
    CalendarOutlined,
    ToolOutlined,
    TeamOutlined,
    CarOutlined,
    MenuOutlined,
} from "@ant-design/icons";
import { useAuthContext } from "../../../context/AuthContext/AuthContext";
import { useRepairsContext } from "../../../context/RepairsContext/RepairsContext";

interface MobileBottomNavProps {
    onOpenMenu: () => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMenu }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuthContext();
    const { pendingCount = 0 } = useRepairsContext() || {};

    const role = (user?.role || "").toUpperCase();
    const isTechnical =
        role === "ADMIN" ||
        role === "DIRECTOR" ||
        Boolean(user?.department?.is_technical) ||
        Boolean(user?.user_departments?.some((ud) => ud.department?.is_technical));

    const fourthItem =
        role === "HR_MANAGER"
            ? {
                  key: "/quan_ly_nhan_vien",
                  label: "Nhân sự",
                  icon: <TeamOutlined />,
                  badge: 0,
              }
            : isTechnical
            ? {
                  key: "/quan_ly_sua_chua",
                  label: "Sửa chữa",
                  icon: <ToolOutlined />,
                  badge: pendingCount,
              }
            : {
                  key: "/quan_ly_ttb_pt",
                  label: "Thiết bị",
                  icon: <CarOutlined />,
                  badge: 0,
              };

    const navItems = [
        {
            key: "/trang_chu",
            label: "Trang chủ",
            icon: <HomeOutlined />,
            badge: 0,
        },
        {
            key: "/quan_ly_cong_viec",
            label: "Công việc",
            icon: <CheckSquareOutlined />,
            badge: 0,
        },
        {
            key: "/lich_cong_viec",
            label: "Lịch",
            icon: <CalendarOutlined />,
            badge: 0,
        },
        fourthItem,
    ];

    return (
        <div
            style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                height: 62,
                background: "rgba(255, 255, 255, 0.96)",
                backdropFilter: "blur(10px)",
                borderTop: "1px solid #e2e8f0",
                boxShadow: "0 -2px 12px rgba(15, 23, 42, 0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-around",
                zIndex: 990,
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
        >
            {navItems.map((item) => {
                const isActive =
                    location.pathname === item.key ||
                    location.pathname.startsWith(`${item.key}/`);
                return (
                    <div
                        key={item.key}
                        onClick={() => navigate(item.key)}
                        style={{
                            flex: 1,
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: isActive ? "#2563eb" : "#64748b",
                            position: "relative",
                            userSelect: "none",
                        }}
                    >
                        {isActive && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    width: 28,
                                    height: 3,
                                    borderRadius: "0 0 4px 4px",
                                    background: "#2563eb",
                                }}
                            />
                        )}
                        <Badge count={item.badge} size="small" offset={[6, -2]}>
                            <span
                                style={{
                                    fontSize: 19,
                                    color: isActive ? "#2563eb" : "#64748b",
                                    lineHeight: 1,
                                }}
                            >
                                {item.icon}
                            </span>
                        </Badge>
                        <span
                            style={{
                                fontSize: 11,
                                fontWeight: isActive ? 700 : 500,
                                marginTop: 4,
                                lineHeight: 1.1,
                            }}
                        >
                            {item.label}
                        </span>
                    </div>
                );
            })}

            {/* Nút mở toàn bộ Menu Sidebar */}
            <div
                onClick={onOpenMenu}
                style={{
                    flex: 1,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#64748b",
                    userSelect: "none",
                }}
            >
                <span style={{ fontSize: 19, lineHeight: 1 }}>
                    <MenuOutlined />
                </span>
                <span
                    style={{
                        fontSize: 11,
                        fontWeight: 500,
                        marginTop: 4,
                        lineHeight: 1.1,
                    }}
                >
                    Danh mục
                </span>
            </div>
        </div>
    );
};

export default MobileBottomNav;

