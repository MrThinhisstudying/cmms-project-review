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


const { Header } = Layout;

interface TopBarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ collapsed = false, onToggle }) => {
  const { user, logoutUser, setUser } = useAuthContext();
  const { notifications, unreadCount, readAll, readOne } = useNotificationContext();
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
                <Dropdown 
                    dropdownRender={() => (
                        <div style={{ 
                            width: 400, 
                            backgroundColor: '#fff', 
                            boxShadow: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05)', 
                            borderRadius: 8,
                            padding: 0
                        }}>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                padding: '12px 16px',
                                borderBottom: '1px solid #f0f0f0'
                            }}>
                                <span style={{ fontWeight: 600, fontSize: 16 }}>Thông báo</span>
                                {notifications.length > 0 && (
                                    <Button type="link" size="small" onClick={(e) => {
                                        e.preventDefault();
                                        readAll();
                                    }} style={{ padding: 0 }}>
                                        Đánh dấu tất cả đã đọc
                                    </Button>
                                )}
                            </div>
                            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: '24px 0', textAlign: 'center', color: '#999' }}>
                                        <BellOutlined style={{ fontSize: 24, marginBottom: 8, opacity: 0.5 }} />
                                        <div>Không có thông báo mới</div>
                                    </div>
                                ) : (
                                    notifications.map((n: any) => (
                                        <div 
                                            key={n.id}
                                            onClick={() => readOne(n.id)}
                                            style={{ 
                                                padding: '12px 16px', 
                                                cursor: 'pointer',
                                                backgroundColor: n.is_read ? '#fff' : '#e6f7ff',
                                                borderBottom: '1px solid #f0f0f0',
                                                transition: 'background 0.3s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = n.is_read ? '#fafafa' : '#d6e4ff'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = n.is_read ? '#fff' : '#e6f7ff'}
                                        >
                                            <div style={{ display: 'flex', gap: 12 }}>
                                                <div style={{ marginTop: 4 }}>
                                                    {n.is_read ? (
                                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d9d9d9' }} />
                                                    ) : (
                                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1890ff' }} />
                                                    )}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ color: n.is_read ? '#666' : '#000', fontWeight: n.is_read ? 400 : 500, marginBottom: 4 }}>
                                                        {n.message}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: '#999' }}>
                                                        {new Date(n.created_at).toLocaleString('vi-VN')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                    trigger={['click']} 
                    placement="bottomRight"
                >
                    <Badge count={unreadCount} size="small" style={{ boxShadow: 'none' }}>
                        <div style={{ 
                            width: 40, 
                            height: 40, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            borderRadius: '50%', 
                            cursor: 'pointer',
                            transition: 'background 0.3s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.025)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <BellOutlined style={{ fontSize: 20, color: '#000' }} />
                        </div>
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
