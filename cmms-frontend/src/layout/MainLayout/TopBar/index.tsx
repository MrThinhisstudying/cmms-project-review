import React, { useState } from "react";
import { Layout, Dropdown, MenuProps, Avatar, Badge, Space, Breadcrumb, Button, Input, Typography } from "antd";
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
const { Text } = Typography;

interface TopBarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ collapsed = false, onToggle }) => {
  const { user, logoutUser, setUser } = useAuthContext();
  const { notifications, unreadCount, readAll, readOne } = useNotificationContext();
  const [openProfile, setOpenProfile] = useState(false);
  const location = useLocation();

  // Path translation map
  const PATH_MAP: Record<string, string> = {
      'trang_chu': 'TRANG CHỦ',
      'users': 'QUẢN LÝ NGƯỜI DÙNG',
      'devices': 'QUẢN LÝ THIẾT BỊ',
      'device-groups': 'NHÓM THIẾT BỊ',
      'device-types': 'LOẠI THIẾT BỊ',
      'repairs': 'QUẢN LÝ SỬA CHỮA',
      'maintenance': 'QUẢN LÝ BẢO DƯỠNG',
      'inventory': 'QUẢN LÝ VẬT TƯ',
      'procedures': 'THƯ VIỆN QUY TRÌNH',
      'schedules': 'LỊCH BẢO DƯỠNG',
      'stock-out': 'XUẤT KHO VẬT TƯ',
      'stock-outs': 'XUẤT KHO VẬT TƯ',
      'reports': 'BÁO CÁO THỐNG KÊ',
      'logs': 'LỊCH SỬ THAY ĐỔI',
      'audit-log': 'LỊCH SỬ THAY ĐỔI',
      'maintenance-procedures': 'THƯ VIỆN QUY TRÌNH',
      'maintenance-history': 'LỊCH SỬ PHIẾU BẢO DƯỠNG',
      'bao_cao_thong_ke': 'BÁO CÁO THỐNG KÊ',
      'quan_ly_nguoi_dung': 'QUẢN LÝ NGƯỜI DÙNG',
      'quan_ly_ttb_pt': 'QUẢN LÝ THIẾT BỊ',
      'quan_ly_sua_chua': 'QUẢN LÝ SỬA CHỮA',
      'quan_ly_bao_duong': 'QUẢN LÝ BẢO DƯỠNG',
      'quan_ly_vat_tu': 'QUẢN LÝ VẬT TƯ',
      'lich_su': 'LỊCH SỬ HỆ THỐNG',
      'login': 'ĐĂNG NHẬP',
      'profile': 'HỒ SƠ CÁ NHÂN'
  };

  // Generate breadcrumbs from path
  const pathSnippets = location.pathname.split('/').filter(i => i);
  const breadcrumbItems = [
      {
          key: 'home',
          title: <Link to="/"><HomeOutlined style={{ fontSize: 16, color: '#1890ff' }} /></Link>
      },
      ...pathSnippets.map((_, index) => {
          const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
          const snippet = pathSnippets[index];
          
          // Use map or fallback to formatting
          let title = PATH_MAP[snippet] || snippet.replace(/_/g, ' ').toUpperCase(); 
          if (snippet === 'trang_chu') title = 'TRANG CHỦ';
          
          const isLast = index === pathSnippets.length - 1;

          return {
              key: url,
              title: isLast ? (
                  <span style={{ fontWeight: 600, color: '#262626' }}>{title}</span>
              ) : (
                  <Link to={url} style={{ color: '#8c8c8c' }}>{title}</Link>
              )
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
      { type: 'divider' },
      {
          key: 'logout',
          label: 'Đăng xuất',
          icon: <LogoutOutlined />,
          danger: true,
          onClick: () => logoutUser()
      }
  ];

  return (
    <>
        <Header style={{ 
            padding: '0 24px', 
            background: '#fff', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            borderBottom: '1px solid #f0f0f0',
            zIndex: 1,
            height: 64, 
            lineHeight: '64px',
            position: 'sticky',
            top: 0,
            boxShadow: '0 2px 8px #f0f1f2' 
        }}>
            <Space size={16}>
                {onToggle && (
                    <Button 
                        type="text" 
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} 
                        onClick={onToggle}
                        style={{ fontSize: '18px', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    />
                )}
                
                {/* Custom Breadcrumb View */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Breadcrumb items={breadcrumbItems} separator={<span style={{ color: '#bfbfbf' }}>/</span>} style={{ fontSize: 13 }} />
                </div>
            </Space>

            <Space size={24}>
                {/* Search Input */}
                <Input.Search 
                    placeholder="Tìm kiếm..." 
                    allowClear 
                    style={{ width: 200 }} 
                />

                {/* Notification */}
                <Dropdown 
                    dropdownRender={() => (
                        <div style={{ 
                            width: 350, 
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
                                <span style={{ fontWeight: 600, fontSize: 14 }}>Thông báo</span>
                                {notifications.length > 0 && (
                                    <Button type="link" size="small" onClick={(e) => {
                                        e.preventDefault();
                                        readAll();
                                    }} style={{ padding: 0, fontSize: 12 }}>
                                        Đánh dấu tất cả đã đọc
                                    </Button>
                                )}
                            </div>
                            <div style={{ maxHeight: 350, overflowY: 'auto' }}>
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
                                                borderBottom: '1px solid #f0f0f0'
                                            }}
                                        >
                                           <div style={{ display: 'flex', gap: 12 }}>
                                                <div style={{ marginTop: 6 }}>
                                                    {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1890ff' }} />}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ color: n.is_read ? '#666' : '#262626', fontWeight: n.is_read ? 400 : 500, fontSize: 13, marginBottom: 4 }}>
                                                        {n.message}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>
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
                        <Button type="text" shape="circle" icon={<BellOutlined style={{ fontSize: 18, color: '#595959' }} />} />
                    </Badge>
                </Dropdown>

                {/* Unified Profile: Avatar + Name */}
                <Dropdown menu={{ items: userMenu }} trigger={['click']} placement="bottomRight">
                    <Space style={{ cursor: 'pointer' }}>
                        <Avatar 
                            src={user?.avatar} 
                            icon={<UserOutlined />} 
                            style={{ backgroundColor: '#1890ff' }} 
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                             <Text strong style={{ fontSize: 14 }}>{user?.name || 'Administrator'}</Text>
                             <Text type="secondary" style={{ fontSize: 11 }}>{user?.role}</Text>
                        </div>
                    </Space>
                </Dropdown>
            </Space>
        </Header>

        <ProfileModal 
            open={openProfile} 
            onCancel={() => setOpenProfile(false)} 
            user={user as any} 
            onUpdateSuccess={(updatedUser) => {
                if (setUser) {
                    setUser((prevUser) => {
                         if (!prevUser) return updatedUser as any;
                         // ... same logic
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
