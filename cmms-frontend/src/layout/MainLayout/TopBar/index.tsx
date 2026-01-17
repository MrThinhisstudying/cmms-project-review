import React, { useState } from "react";
import { Layout, Dropdown, MenuProps, Avatar, Badge, Space, Breadcrumb, Button } from "antd";
import { 
    UserOutlined, 
    LogoutOutlined, 
    BellOutlined, 
    MenuFoldOutlined, 
    MenuUnfoldOutlined, 
    HomeOutlined 
} from "@ant-design/icons";
import { useAuthContext } from "../../../context/AuthContext/AuthContext";
import { useNotificationContext } from "../../../context/NotificationContext/NotificationContext";
import { Link, useLocation } from "react-router-dom";
import ProfileModal from "../../../pages/Users/components/ProfileModal";
import { IUser } from "../../../types/user.types";

const { Header } = Layout;

interface TopBarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ collapsed = false, onToggle }) => {
  const { user, logoutUser, setUser } = useAuthContext();
  const { notifications, unreadCount } = useNotificationContext(); // Assume readAll available if needed
  const [openProfile, setOpenProfile] = useState(false);
  const location = useLocation();

  // Generate breadcrumbs from path
  const pathSnippets = location.pathname.split('/').filter(i => i);
  const breadcrumbItems = [
      {
          key: 'home',
          title: <Link to="/trang_chu"><HomeOutlined /></Link>
      },
      ...pathSnippets.map((_, index) => {
          const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
          // Ensure meaningful names map. For now capitalize.
          // Maps can be added in constants/routes.
          const title = pathSnippets[index].replace(/_/g, ' ').toUpperCase(); 
          return {
              key: url,
              title: <Link to={url}>{title}</Link>
          };
      })
  ];

  const userMenu: MenuProps['items'] = [
      {
          key: 'profile',
          label: 'Cập nhật thông tin',
          icon: <UserOutlined />,
          onClick: () => setOpenProfile(true)
      },
      {
          type: 'divider'
      },
      {
          key: 'logout',
          label: 'Đăng xuất',
          icon: <LogoutOutlined />,
          danger: true,
          onClick: () => logoutUser()
      }
  ];

  const notificationItems: MenuProps['items'] = notifications.length > 0 ? 
      notifications.map((n, idx) => ({
          key: n.id || idx,
          label: (
              <div style={{ maxWidth: 300, whiteSpace: 'normal' }}>
                  <div style={{ fontWeight: 500 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{new Date(n.created_at).toLocaleString()}</div>
              </div>
          )
      })) : [{ key: 'empty', label: 'Không có thông báo' }];


  return (
    <>
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,21,41,.08)', zIndex: 1 }}>
            <Space>
                {onToggle && (
                    <Button 
                        type="text" 
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} 
                        onClick={onToggle}
                        style={{ fontSize: '16px', width: 64, height: 64 }}
                    />
                )}
                <Breadcrumb items={breadcrumbItems} />
            </Space>

            <Space size={24}>
                <Dropdown menu={{ items: notificationItems }} trigger={['click']} placement="bottomRight">
                    <Badge count={unreadCount} size="small">
                        <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
                    </Badge>
                </Dropdown>

                <Dropdown menu={{ items: userMenu }} trigger={['click']}>
                    <Space style={{ cursor: 'pointer' }}>
                        <Avatar src={user?.avatar} icon={<UserOutlined />} />
                        <span style={{ fontWeight: 500 }}>{user?.name}</span>
                    </Space>
                </Dropdown>
            </Space>
        </Header>

        <ProfileModal 
            open={openProfile} 
            onCancel={() => setOpenProfile(false)} 
            user={user as any} // Cast user types match mostly
            onUpdateSuccess={(updatedUser) => {
                // Update global context by merging, preserving relations like department/role if missing in response
                if (setUser) {
                    setUser((prevUser) => {
                         if (!prevUser) return updatedUser as any;
                         
                         // Normalize role similar to AuthContext logic
                         const normalizedRole = updatedUser.role === "Administrator" 
                            ? "admin" 
                            : updatedUser.role?.toLowerCase();

                         return { 
                             ...prevUser, 
                             ...updatedUser,
                             role: normalizedRole || prevUser.role 
                         };
                    });
                }
            }}
        />
    </>
  );
};

export default TopBar;
