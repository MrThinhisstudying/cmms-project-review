import React from 'react';
import { Table, Avatar, Tag, Space, Button, Tooltip, Popconfirm, Typography } from 'antd';
import {
  UserOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { IUser } from '../../../types/user.types';
import { ILaborContract } from '../../../apis/laborContracts';
import { getBackendImageUrl } from '../../../utils/imageUrl';

const { Text } = Typography;

interface EmployeeTableProps {
  dataSource: IUser[];
  contracts: Record<number, ILaborContract>;
  loading: boolean;
  canWrite: boolean;
  canDelete: boolean;
  selectedRowKeys: React.Key[];
  onSelectChange: (keys: React.Key[]) => void;
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
  '12_MONTHS': { label: '12 Tháng', color: 'blue' },
  '24_MONTHS': { label: '24 Tháng', color: 'cyan' },
  '36_MONTHS': { label: '36 Tháng', color: 'geekblue' },
  'INDEFINITE': { label: 'Vô thời hạn', color: 'green' },
};

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  dataSource,
  contracts,
  loading,
  canWrite,
  canDelete,
  selectedRowKeys,
  onSelectChange,
  onView,
  onEdit,
  onDelete,
}) => {
  const columns = [
    {
      title: 'Nhân viên',
      key: 'user',
      render: (_: any, record: IUser) => {
        return (
          <Space size={12}>
            <Avatar
              size={40}
              src={record.avatar ? getBackendImageUrl(record.avatar) : undefined}
              icon={<UserOutlined />}
              style={{ backgroundColor: '#1890ff', flexShrink: 0 }}
            />
            <div>
              <div style={{ fontWeight: 600, color: '#1f1f1f', fontSize: 13.5 }}>
                {record.name}
              </div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                MSNV: {record.employee_code || `NV-${record.user_id}`}
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Đơn vị / Phòng ban',
      key: 'department',
      render: (_: any, record: IUser) => {
        const depts = record.user_departments;
        if (depts && depts.length > 0) {
          return (
            <Space wrap size={4}>
              {depts.map((d) => (
                <Tag key={d.id} color="blue" style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>
                  {d.department?.name}
                </Tag>
              ))}
            </Space>
          );
        }
        return record.department?.name || <Text type="secondary">Chưa gán</Text>;
      },
    },
    {
      title: 'Chức vụ & Vai trò',
      key: 'role',
      width: 170,
      render: (_: any, record: IUser) => {
        const roleColor = ROLE_COLOR_MAP[record.role || ''] || 'default';
        const roleName = ROLE_NAME_MAP[record.role || ''] || record.role || 'Nhân viên';
        return (
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>{record.position || 'Nhân viên'}</div>
            <Tag color={roleColor} style={{ marginTop: 2, fontSize: 11, borderRadius: 4 }}>
              {roleName}
            </Tag>
          </div>
        );
      },
    },
    {
      title: 'Hợp đồng lao động',
      key: 'contract',
      width: 150,
      render: (_: any, record: IUser) => {
        const contract = contracts[record.user_id];
        if (!contract) {
          return <Tag color="warning">Chưa có HĐ</Tag>;
        }
        const typeInfo = CONTRACT_TYPE_MAP[contract.contract_type] || {
          label: contract.contract_type,
          color: 'blue',
        };
        return (
          <div>
            <Tag color={typeInfo.color} style={{ borderRadius: 4, margin: 0 }}>
              {typeInfo.label}
            </Tag>
            {contract.end_date && (
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                Đến: {new Date(contract.end_date).toLocaleDateString('vi-VN')}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 170,
      render: (email: string) =>
        email ? (
          <div style={{ fontSize: 12 }}>
            <MailOutlined style={{ color: '#1890ff', marginRight: 4 }} />
            <a href={`mailto:${email}`}>{email}</a>
          </div>
        ) : (
          <span style={{ color: '#bbb', fontSize: 12 }}>-</span>
        ),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone_number',
      key: 'phone_number',
      width: 140,
      render: (phone: string) =>
        phone ? (
          <div style={{ fontSize: 12 }}>
            <PhoneOutlined style={{ color: '#52c41a', marginRight: 4 }} />
            <a href={`tel:${phone}`}>{phone}</a>
          </div>
        ) : (
          <span style={{ color: '#bbb', fontSize: 12 }}>-</span>
        ),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 120,
      align: 'center' as const,
      render: (_: any, record: IUser) => (
        <Space size={4} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Xem hồ sơ 360°">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined style={{ color: '#1890ff' }} />}
              onClick={() => onView(record)}
            />
          </Tooltip>
          {canWrite && (
            <Tooltip title="Chỉnh sửa">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined style={{ color: '#52c41a' }} />}
                onClick={() => onEdit(record)}
              />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title={`Xoá nhân viên "${record.name}"?`}
              description="Hành động này không thể hoàn tác."
              onConfirm={() => onDelete(record)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      rowKey="user_id"
      loading={loading}
      rowSelection={{
        selectedRowKeys,
        onChange: onSelectChange,
      }}
      onRow={(record) => ({
        onClick: () => onView(record),
        style: { cursor: 'pointer' },
      })}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50'],
        showTotal: (total) => `Tổng số ${total} nhân viên`,
      }}
      scroll={{ x: 900 }}
    />
  );
};

export default EmployeeTable;
