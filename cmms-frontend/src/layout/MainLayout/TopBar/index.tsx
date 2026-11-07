import React, { useState, useMemo } from "react";
import { Layout, Dropdown, MenuProps, Avatar, Badge, Space, Breadcrumb, Button, Input, Typography, AutoComplete, Tag, Grid, Popover } from "antd";
import { 
    UserOutlined, 
    LogoutOutlined, 
    BellOutlined, 
    MenuFoldOutlined, 
    MenuUnfoldOutlined, 
    HomeOutlined,
    SearchOutlined
} from "@ant-design/icons";
import { useAuthContext } from "../../../context/AuthContext/AuthContext";
import { useNotificationContext } from "../../../context/NotificationContext/NotificationContext";
import { useUsersContext } from "../../../context/UsersContext/UsersContext";
import { Link, useLocation } from "react-router-dom";
import ProfileModal from "../../../pages/Users/components/ProfileModal";
import { getBackendImageUrl } from "../../../utils/imageUrl";

const { Header } = Layout;
const { Text } = Typography;

interface TopBarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ collapsed = false, onToggle }) => {
  const { user, logoutUser, setUser } = useAuthContext();
  const { notifications, unreadCount, readAll, readOne } = useNotificationContext();
  const { users } = useUsersContext();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = Boolean(screens.md && !screens.lg);
  
  const [openProfile, setOpenProfile] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  
  // 360 Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [openSearchProfile, setOpenSearchProfile] = useState(false);
  const [searchedUser, setSearchedUser] = useState<any>(null);

  const searchOptions = useMemo(() => {
        if (!searchTerm) return [];
        const lowerSearch = searchTerm.toLowerCase();
        return users
            .filter(u => u.name.toLowerCase().includes(lowerSearch) || String(u.user_id).toLowerCase().includes(lowerSearch) || u.employee_code?.toLowerCase().includes(lowerSearch))
            .slice(0, 8)
            .map(u => ({
                value: String(u.user_id),
                label: (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600, color: '#1890ff', fontSize: 14 }}>{u.name}</span>
                                <span style={{ fontSize: 12, color: '#888' }}>Mã NV: {u.employee_code || u.user_id} - PB: {u.department?.name || 'Không có'}</span>
                            </div>
                        </div>
                        <Tag color={u.status === 'ACTIVE' ? 'success' : 'error'} style={{ margin: 0 }}>{u.status}</Tag>
                    </div>
                ),
                user: u
            }));
  }, [users, searchTerm]);

  const handleSelectUser = (value: string, option: any) => {
        setSearchTerm('');
        setSearchedUser(option.user);
        setOpenSearchProfile(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchOptions.length > 0) {
            // AutoSelect cái kết quả hợp lý nhất (người đầu tiên)
            handleSelectUser(searchOptions[0].value, searchOptions[0]);
            // Làm mất focus của ô input (đóng list xổ xuống)
            (document.activeElement as HTMLElement)?.blur?.();
        }
  };

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
      'profile': 'HỒ SƠ CÁ NHÂN',
      // HR Module
      'hr-dashboard': 'TỔNG QUAN NHÂN SỰ',
      'phe_duyet_ho_so': 'PHÊ DUYỆT HỒ SƠ',
      'quan_ly_phep': 'QUẢN LÝ PHÉP NĂM',
      'lay_vat_tu': 'XUẤT VẬT TƯ',
      // Tasks & Field Incident Module
      'quan_ly_cong_viec': 'QUẢN LÝ CÔNG VIỆC',
      'lich_cong_viec': 'LỊCH CÔNG VIỆC',
      'dashboard_lanh_dao': 'DASHBOARD LÃNH ĐẠO',
      'kpi_thi_dua': 'BÌNH XÉT KPI & THI ĐUA',
      'bao_cao_tinh_trang_xe': 'BÁO CÁO TÌNH TRẠNG XE',
      'quan_ly_nhan_vien': 'QUẢN LÝ NHÂN SỰ 360°',
      'quy_che_quy_dinh': 'QUY CHẾ & QUY ĐỊNH NỘI BỘ',
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

  // Role translation map
  const ROLE_MAP: Record<string, string> = {
      'UNIT_HEAD': 'Cán bộ đội',
      'OPERATOR': 'Nhân viên vận hành',
      'TEAM_LEAD': 'Tổ trưởng',
      'TECHNICIAN': 'Nhân viên kỹ thuật',
      'ADMIN': 'Quản trị viên',
      'DIRECTOR': 'Ban giám đốc',
      'MANAGER': 'Quản lý',
      'HR_MANAGER': 'Quản lý Nhân sự'
  };

  const currentPageTitle = useMemo(() => {
      const lastSnippet = pathSnippets[pathSnippets.length - 1] || 'trang_chu';
      return PATH_MAP[lastSnippet] || lastSnippet.replace(/_/g, ' ').toUpperCase();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathSnippets]);

  const userMenu: MenuProps['items'] = [
      ...(isMobile
          ? [
                {
                    key: 'user-info',
                    label: (
                        <div style={{ padding: '4px 0', maxWidth: 200 }}>
                            <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
                                {user?.name || 'Administrator'}
                            </div>
                            <div style={{ fontSize: 11.5, color: '#64748b' }}>
                                {user?.position || ROLE_MAP[user?.role || ''] || user?.role}
                            </div>
                        </div>
                    ),
                    disabled: true,
                },
                { type: 'divider' as const },
            ]
          : []),
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

  const canSearchEmployees = user && ['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'UNIT_HEAD'].includes(user.role);

  return (
    <>
        <Header style={{ 
            padding: isMobile ? '0 10px' : '0 24px', 
            background: '#fff', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            borderBottom: '1px solid #f0f0f0',
            zIndex: 100,
            height: isMobile ? 56 : 64, 
            lineHeight: isMobile ? '56px' : '64px',
            position: 'sticky',
            top: 0,
            boxShadow: '0 2px 8px #f0f1f2' 
        }}>
            <Space size={isMobile ? 6 : 16} style={{ minWidth: 0, flex: 1 }}>
                {onToggle && (
                    <Button 
                        type="text" 
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} 
                        onClick={onToggle}
                        style={{ fontSize: '18px', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    />
                )}
                
                {/* Custom Breadcrumb on Desktop/Tablet, Compact Title on Mobile */}
                {isMobile ? (
                    <div
                        style={{
                            fontWeight: 700,
                            fontSize: 14,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {currentPageTitle}
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                        <Breadcrumb items={breadcrumbItems} separator={<span style={{ color: '#bfbfbf' }}>/</span>} style={{ fontSize: 13 }} />
                    </div>
                )}
            </Space>

            <Space size={isMobile ? 8 : 20} style={{ flexShrink: 0 }}>
                {/* 360 Search Input: Full on Desktop/Tablet, Popover Icon on Mobile */}
                {canSearchEmployees && (
                    isMobile ? (
                        <Popover
                            open={mobileSearchOpen}
                            onOpenChange={setMobileSearchOpen}
                            trigger="click"
                            placement="bottomRight"
                            content={
                                <div style={{ width: 'calc(100vw - 48px)', maxWidth: 320 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                                        Tra cứu nhanh Hồ sơ 360° Nhân sự
                                    </div>
                                    <AutoComplete
                                        style={{ width: '100%' }}
                                        popupMatchSelectWidth={false}
                                        options={searchOptions}
                                        onSelect={(val, opt) => {
                                            setMobileSearchOpen(false);
                                            handleSelectUser(val, opt);
                                        }}
                                        onSearch={setSearchTerm}
                                        value={searchTerm}
                                        allowClear
                                    >
                                        <Input
                                            placeholder="Nhập tên hoặc mã nhân viên..."
                                            suffix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                                            onKeyDown={handleKeyDown}
                                        />
                                    </AutoComplete>
                                </div>
                            }
                        >
                            <Button
                                type="text"
                                shape="circle"
                                icon={<SearchOutlined style={{ fontSize: 18, color: '#595959' }} />}
                            />
                        </Popover>
                    ) : (
                        <div style={{ lineHeight: 'normal', display: 'flex', alignItems: 'center' }}>
                            <AutoComplete
                                style={{ width: isTablet ? 200 : 280 }}
                                dropdownMatchSelectWidth={340}
                                options={searchOptions}
                                onSelect={handleSelectUser}
                                onSearch={setSearchTerm}
                                value={searchTerm}
                                allowClear
                            >
                                <Input 
                                    placeholder="Tìm kiếm NV (Tên / Mã)..." 
                                    suffix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                                    style={{ borderRadius: 6 }}
                                    onKeyDown={handleKeyDown}
                                />
                            </AutoComplete>
                        </div>
                    )
                )}

                {/* Notification */}
                <Dropdown 
                    dropdownRender={() => (
                        <div style={{ 
                            width: isMobile ? 'calc(100vw - 24px)' : 350, 
                            maxWidth: 360,
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

                {/* Unified Profile: Avatar + Name (Name hidden on Mobile to prevent overflow) */}
                <Dropdown menu={{ items: userMenu }} trigger={['click']} placement="bottomRight">
                    <Space style={{ cursor: 'pointer' }} size={8}>
                        <Avatar 
                            size={isMobile ? 34 : 38}
                            src={user?.avatar ? getBackendImageUrl(user?.avatar) : undefined} 
                            icon={<UserOutlined />} 
                            style={{ backgroundColor: '#1890ff', flexShrink: 0 }} 
                        />
                        {!isMobile && (
                            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                                 <Text strong style={{ fontSize: 14 }}>{user?.name || 'Administrator'}</Text>
                                 <Text type="secondary" style={{ fontSize: 11 }}>{user?.position || ROLE_MAP[user?.role || ''] || user?.role}</Text>
                            </div>
                        )}
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
                            ? "ADMIN" 
                            : updatedUser.role?.toUpperCase();

                         return { 
                             ...prevUser, 
                             ...updatedUser,
                             role: normalizedRole || prevUser.role 
                         };
                    });
                }
            }}
        />

        {/* 360 Search Profile Modal */}
        <ProfileModal 
            open={openSearchProfile} 
            onCancel={() => setOpenSearchProfile(false)} 
            user={searchedUser} 
            onUpdateSuccess={() => {}}
        />
    </>
  );
};

export default TopBar;
