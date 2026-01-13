import React, { useEffect, useState } from "react";
import { Layout, Menu } from "antd";
import { Link, useLocation } from "react-router-dom";
import { useAuthContext } from "../../../context/AuthContext/AuthContext";
import { SIDEBAR_MENU } from "../../../constants/sidebarMenu";
import LOGO_ACV from "../../../assets/images/acv-logo.png";

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  isMobile?: boolean; // Keep for compatibility if we want drawer on mobile later, but mostly Desktop focus now
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const { user, logoutUser } = useAuthContext();
  const location = useLocation();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  useEffect(() => {
    const currentPath = location.pathname;
    const activeMenu = SIDEBAR_MENU.find((item) => item.path === currentPath);
    if (activeMenu) {
        // We use path as key if name is not unique or just cleaner
        // But original code used name. Let's stick to path for uniqueness or index.
        // Actually name is fine if unique.
        // Let's use path if avail, else name.
        setSelectedKeys([activeMenu.path]);
    }
  }, [location]);

  const filteredMenu = SIDEBAR_MENU.filter(
    (item) =>
      item.roles?.includes(user?.role ?? "") ||
      (user?.role === "Administrator" && item.roles?.includes("admin"))
  );

  const menuItems = filteredMenu.map((item) => ({
    key: item.path,
    icon: item.icon, // Needs to be compatible. If it's MUI icon, it renders fine in ReactNode.
    label: item.logout ? (
        <span onClick={() => logoutUser()} style={{ color: item.textColor }}>{item.name}</span>
    ) : (
        <Link to={item.path} style={{ color: item.textColor }}>{item.name}</Link>
    ),
    // Antd Menu Item style overrides if needed
    style: {
        color: item.textColor
    }
  }));

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={260}
      style={{
        background: "#001529", // Dark theme standard or keeping #2d2d2d
        // Original was #2d2d2d. Antd dark is #001529. Let's use #001529 for "Antd feel" or stick to user preference.
        // User asked to "convert to Antd", assuming standard Antd look is acceptable or preferred.
        // Let's stick to a clean dark theme.
        minHeight: "100vh",
      }}
    >
      <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.1)', margin: 16, borderRadius: 6 }}>
           {collapsed ? (
                <img src={LOGO_ACV} alt="Logo" style={{ width: 30, height: 30, objectFit: 'contain' }} />
           ) : (
                <img src={LOGO_ACV} alt="Logo" style={{ width: '80%', height: 40, objectFit: 'contain' }} />
           )}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={selectedKeys}
        items={menuItems}
        style={{ background: 'transparent' }} // Let Sider bg show
      />
    </Sider>
  );
};

export default Sidebar;
