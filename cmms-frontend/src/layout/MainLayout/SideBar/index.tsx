import React, { useEffect, useState } from "react";
import { Layout, Menu, Drawer } from "antd";
import { Link, useLocation } from "react-router-dom";
import { LogoutOutlined } from "@ant-design/icons";
import { useAuthContext } from "../../../context/AuthContext/AuthContext";
import { SIDEBAR_MENU } from "../../../constants/sidebarMenu";
import LOGO_ACV from "../../../assets/images/acv-logo.png";

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  isMobile?: boolean; 
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse, isMobile = false }) => {
  const { user, logoutUser } = useAuthContext();
  const location = useLocation();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  useEffect(() => {
    const currentPath = location.pathname;
    const activeMenu = SIDEBAR_MENU.find((item) => item.path === currentPath);
    if (activeMenu) {
        setSelectedKeys([activeMenu.path]);
    }
  }, [location]);

  // Filter out Logout from main menu, we'll place it manually at bottom
  const filteredMenu = SIDEBAR_MENU.filter(
    (item) => 
      !item.logout && 
      (item.roles?.includes(user?.role ?? "") || (user?.role === "ADMIN" && item.roles?.includes("ADMIN")))
  );

  const menuItems = filteredMenu.map((item) => ({
    key: item.path,
    icon: item.icon,
    label: <Link to={item.path} style={{ color: item.textColor }}>{item.name}</Link>,
    style: {
        marginBottom: 12, // More breathable spacing
        color: item.textColor,
        fontSize: 14,
        fontWeight: 500
    }
  }));

  const sidebarContent = (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Logo Container */}
        <div style={{ 
            height: 80, // Increased height
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '16px', 
            background: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: 8,
            overflow: 'hidden',
            flexShrink: 0,
            backdropFilter: 'blur(10px)'
        }}>
            {(!isMobile && collapsed) ? (
                 <img src={LOGO_ACV} alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
            ) : (
                 <img src={LOGO_ACV} alt="Logo" style={{ maxWidth: '85%', maxHeight: 50, objectFit: 'contain' }} />
            )}
        </div>
        
        {/* Menu Scrollable Area */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
            <Menu
                theme="dark"
                mode="inline"
                selectedKeys={selectedKeys}
                items={menuItems}
                style={{ background: 'transparent', borderRight: 0 }}
                onClick={isMobile ? () => onCollapse(true) : undefined}
            />
        </div>

        {/* Fixed Logout Button */}
        <div style={{ 
            padding: '16px', 
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            marginTop: 'auto',
            background: 'rgba(0,0,0,0.1)'
        }}>
            <div 
                onClick={() => logoutUser()}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    color: '#ff7875', 
                    borderRadius: 8,
                    transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 77, 79, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
            >
                <Link to="/login" onClick={(e) => e.preventDefault()} style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: collapsed && !isMobile ? 'center' : 'flex-start' }}>
                   <LogoutOutlined style={{ fontSize: 18, color: '#ff7875' }} />
                   {(!collapsed || isMobile) && (
                       <span style={{ marginLeft: 12, fontWeight: 500, color: '#ff7875', fontSize: 14 }}>Đăng xuất</span>
                   )}
                </Link>
            </div>
        </div>
      </div>
  );

  if (isMobile) {
      return (
          <Drawer
            placement="left"
            closable={false}
            onClose={() => onCollapse(true)}
            open={!collapsed}
            styles={{ body: { padding: 0, background: '#001529' } }}
            width={260}
          >
              {sidebarContent}
          </Drawer>
      );
  }

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={260}
      style={{
        background: "#001529", // Deep Navy
        minHeight: "100vh",
        position: 'sticky',
        top: 0,
        left: 0,
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      {sidebarContent}
    </Sider>
  );
};

export default Sidebar;
