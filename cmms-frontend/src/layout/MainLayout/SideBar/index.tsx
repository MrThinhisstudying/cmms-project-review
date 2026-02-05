import React, { useEffect, useState } from "react";
import { Layout, Menu, Drawer, Badge } from "antd";
import { Link, useLocation } from "react-router-dom";
import { LogoutOutlined, RightOutlined, LeftOutlined } from "@ant-design/icons";
import { useAuthContext } from "../../../context/AuthContext/AuthContext";
import { useRepairsContext } from "../../../context/RepairsContext/RepairsContext";
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

  const { pendingCount } = useRepairsContext() || {};

  const menuItems = filteredMenu.map((item) => {
    const isRepair = item.path === '/quan_ly_sua_chua';
    
    // Simple render: Link text + Badge
    const label = (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Link to={item.path} style={{ color: item.textColor, flex: 1 }}>{item.name}</Link>
             {isRepair && pendingCount > 0 && (
                <Badge count={pendingCount} size="small" style={{ backgroundColor: '#ff4d4f', marginLeft: 8 }} />
            )}
        </div>
    );

    return {
    key: item.path,
    icon: item.icon,
    label: label,
    style: {
        marginBottom: 12, // More breathable spacing
        color: item.textColor,
        fontSize: 14,
        fontWeight: 500
    }
  }});

  const sidebarContent = (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Zenoc Style Logo Header */}
        <div style={{ 
            height: 80, 
            display: 'flex', 
            alignItems: 'center', 
            padding: collapsed ? '0' : '0 24px', 
            justifyContent: collapsed ? 'center' : 'flex-start',
            margin: '0', 
            background: 'transparent',
            flexShrink: 0,
            overflow: 'hidden' 
        }}>
             {/* Logo Image */}
             <div style={{ 
                 width: 40, 
                 height: 40, 
                 borderRadius: '50%', 
                 overflow: 'hidden', 
                 display: 'flex', 
                 alignItems: 'center', 
                 justifyContent: 'center',
                 background: '#fff', // White bg for logo contrasting
                 flexShrink: 0
             }}>
                 <img src={LOGO_ACV} alt="Logo" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
             </div>
             
             {/* Logo Text (Hidden if collapsed) */}
             {!collapsed && (
                 <div style={{ marginLeft: 12, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                     <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>CMMS VCS</div>
                     <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: -2 }}>CON DAO AIRPORT</div>
                 </div>
             )}
        </div>
        
        {/* Menu Scrollable Area */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <Menu
                theme="dark"
                mode="inline"
                selectedKeys={selectedKeys}
                items={menuItems}
                style={{ background: 'transparent', borderRight: 0 }}
                onClick={isMobile ? () => onCollapse(true) : undefined}
                inlineCollapsed={collapsed} 
            />
        </div>

        {/* Footer Actions: Logout */}
        <div style={{ 
            padding: '12px', 
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            marginTop: 'auto',
            background: 'rgba(0,0,0,0.2)',
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
        background: "#001529", 
        minHeight: "100vh",
        position: 'sticky',
        top: 0,
        left: 0,
        height: '100vh',
        overflow: 'visible', // Allow button to float outside
        zIndex: 100
      }}
    >
      {sidebarContent}

      {/* Floating Collapse Button (Zenoc Style) */}
      {!isMobile && (
          <div 
            onClick={() => onCollapse(!collapsed)}
            style={{
                position: 'absolute',
                top: '50%', // Vertically centered
                marginTop: -12, // Offset by half height to center perfectly
                right: -12, // Hanging off edge
                width: 24,
                height: 24,
                background: '#fff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                border: '1px solid #f0f0f0',
                zIndex: 101,
                color: '#595959',
                fontSize: 12,
                transition: 'all 0.3s' // Smooth transition for hover
            }}
             onMouseEnter={(e) => {
                 e.currentTarget.style.transform = 'scale(1.1)';
                 e.currentTarget.style.color = '#1890ff';
             }}
             onMouseLeave={(e) => {
                 e.currentTarget.style.transform = 'scale(1)';
                 e.currentTarget.style.color = '#595959';
             }}
          >
              {collapsed ? <RightOutlined /> : <LeftOutlined />}
          </div>
      )}
    </Sider>
  );
};

export default Sidebar;
