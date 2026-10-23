import React from 'react';
import { Card, Avatar, Tag, Button, Typography, Dropdown, Popconfirm } from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  IdcardOutlined,
  ApartmentOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { IUser } from '../../../types/user.types';
import { ILaborContract } from '../../../apis/laborContracts';
import { getBackendImageUrl } from '../../../utils/imageUrl';

const { Text } = Typography;

interface EmployeeCardProps {
  user: IUser;
  activeContract?: ILaborContract;
  canWrite: boolean;
  canDelete: boolean;
  onView: (user: IUser) => void;
  onEdit: (user: IUser) => void;
  onDelete: (user: IUser) => void;
}

const ROLE_COLOR_MAP: Record<string, string> = {
  ADMIN: '#ff4d4f',
  OPERATOR: '#13c2c2',
  TECHNICIAN: '#2f54eb',
  TEAM_LEAD: '#722ed1',
  UNIT_HEAD: '#fa541c',
  DIRECTOR: '#faad14',
  HR_MANAGER: '#eb2f96',
};

const ROLE_NAME_MAP: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  OPERATOR: 'Vận hành',
  TECHNICIAN: 'Kỹ thuật',
  TEAM_LEAD: 'Tổ trưởng',
  UNIT_HEAD: 'Cán bộ đội',
  DIRECTOR: 'Ban giám đốc',
  HR_MANAGER: 'Quản lý NS',
};

const CONTRACT_TYPE_MAP: Record<string, { label: string; color: string }> = {
  '1_MONTH': { label: 'Học việc', color: 'orange' },
  'APPRENTICESHIP': { label: 'Học việc', color: 'orange' },
  'PROBATION': { label: 'Thử việc', color: 'purple' },
  '12_MONTHS': { label: 'HĐ 12T', color: 'blue' },
  '24_MONTHS': { label: 'HĐ 24T', color: 'cyan' },
  '36_MONTHS': { label: 'HĐ 36T', color: 'geekblue' },
  'INDEFINITE': { label: 'Vô thời hạn', color: 'green' },
};

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  user,
  activeContract,
  canWrite,
  canDelete,
  onView,
  onEdit,
  onDelete,
}) => {
  const roleColor = ROLE_COLOR_MAP[user.role || ''] || '#8c8c8c';
  const roleName = ROLE_NAME_MAP[user.role || ''] || user.role || 'Nhân viên';

  // Calculate contract display
  const contractInfo = activeContract?.contract_type
    ? CONTRACT_TYPE_MAP[activeContract.contract_type] || { label: activeContract.contract_type, color: 'blue' }
    : null;

  // Department name
  const deptName =
    user.user_departments && user.user_departments.length > 0
      ? user.user_departments.map((ud) => ud.department?.name).filter(Boolean).join(', ')
      : user.department?.name || 'Chưa gán đơn vị';

  const menuItems: MenuProps['items'] = [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: 'Xem hồ sơ 360°',
      onClick: () => onView(user),
    },
    ...(canWrite
      ? [
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Chỉnh sửa thông tin',
            onClick: () => onEdit(user),
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            type: 'divider' as const,
          },
          {
            key: 'delete',
            danger: true,
            icon: <DeleteOutlined />,
            label: (
              <Popconfirm
                title={`Xoá nhân viên "${user.name}"?`}
                description="Hành động này không thể hoàn tác."
                onConfirm={() => onDelete(user)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <span>Xoá nhân viên</span>
              </Popconfirm>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card
      hoverable
      style={{
        borderRadius: 12,
        border: '1px solid #e8e8e8',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.25s ease',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      styles={{
        body: {
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'space-between',
        },
      }}
      onClick={() => onView(user)}
    >
      <div>
        {/* Top Header: Avatar + Name + Status */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Avatar
            size={52}
            src={user.avatar ? getBackendImageUrl(user.avatar) : undefined}
            icon={<UserOutlined />}
            style={{
              backgroundColor: '#1890ff',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(24, 144, 255, 0.2)',
            }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: '#1f1f1f',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user.name}
              </div>

              <div onClick={(e) => e.stopPropagation()}>
                <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                  <Button type="text" size="small" icon={<MoreOutlined style={{ fontSize: 16 }} />} />
                </Dropdown>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              <Tag color={roleColor} style={{ margin: 0, fontSize: 11, borderRadius: 4 }}>
                {roleName}
              </Tag>
            </div>
          </div>
        </div>

        {/* Middle: Details */}
        <div style={{ marginTop: 14, fontSize: 12, color: '#555', lineHeight: 1.6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IdcardOutlined style={{ color: '#8c8c8c', width: 14 }} />
            <span style={{ color: '#8c8c8c' }}>MSNV:</span>
            <Text strong style={{ color: '#1f1f1f' }}>
              {user.employee_code || `NV-${user.user_id}`}
            </Text>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <ApartmentOutlined style={{ color: '#8c8c8c', width: 14, flexShrink: 0 }} />
            <span style={{ color: '#8c8c8c', flexShrink: 0 }}>Đơn vị:</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{deptName}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileTextOutlined style={{ color: '#8c8c8c', width: 14 }} />
            <span style={{ color: '#8c8c8c' }}>Hợp đồng:</span>
            {contractInfo ? (
              <Tag color={contractInfo.color} style={{ margin: 0, fontSize: 11 }}>
                {contractInfo.label}
              </Tag>
            ) : (
              <Tag color="warning" style={{ margin: 0, fontSize: 11 }}>
                Chưa có HĐ
              </Tag>
            )}
          </div>
        </div>
      </div>

      {/* Footer: Quick Actions */}
      <div
        style={{
          borderTop: '1px solid #f0f0f0',
          paddingTop: 10,
          marginTop: 14,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          style={{ paddingInline: 0, fontWeight: 600 }}
          onClick={() => onView(user)}
        >
          Chi tiết
        </Button>
      </div>
    </Card>
  );
};

export default EmployeeCard;
