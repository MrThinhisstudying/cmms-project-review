import React from 'react';
import { Table, Button, Space, Tag, Popconfirm, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined, WarningOutlined } from '@ant-design/icons';
import { IDevice, DeviceStatus } from '../../../../types/devicesManagement.types';
import dayjs from 'dayjs';

interface DevicesTableProps {
  dataSource: IDevice[];
  loading: boolean;
  onEdit: (device: IDevice) => void;
  onDelete: (id?: number) => void;
  onView: (device: IDevice) => void;
  canEdit: boolean;
  canDelete: boolean;
}

const DevicesTable: React.FC<DevicesTableProps> = ({
  dataSource,
  loading,
  onEdit,
  onDelete,
  onView,
  canEdit,
  canDelete
}) => {
  // Helpers
  const isExpiringSoon = (dateStr?: string) => {
    if (!dateStr) return false;
    const date = dayjs(dateStr);
    const diff = date.diff(dayjs(), 'days');
    return diff >= 0 && diff <= 30;
  };

  const isExpired = (dateStr?: string) => {
    if (!dateStr) return false;
    return dayjs(dateStr).isBefore(dayjs());
  };

  const columns = [
    {
      title: '#',
      dataIndex: 'device_id',
      key: 'device_id',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Tên thiết bị',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text || '-'}</span>,
    },
    {
      title: 'Biển số',
      dataIndex: 'reg_number',
      key: 'reg_number',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: 'Nhãn hiệu',
      dataIndex: 'brand',
      key: 'brand',
      width: 120,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: DeviceStatus) => {
        let color = 'default';
        let text: string = status;
        switch (status) {
          case 'MOI': color = 'blue'; text = 'Mới'; break;
          case 'DANG_SU_DUNG': color = 'green'; text = 'Đang sử dụng'; break;
          case 'SU_DUNG_HAN_CHE': color = 'orange'; text = 'Sử dụng hạn chế'; break;
          case 'DANG_SUA_CHUA': color = 'red'; text = 'Đang sửa chữa'; break;
          case 'THANH_LY': color = 'gray'; text = 'Thanh lý'; break;
          case 'HUY_BO': color = 'red'; text = 'Hủy bỏ'; break;
        }
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
       title: 'Hạn đăng kiểm',
       dataIndex: 'inspection_expiry',
       key: 'inspection_expiry',
       width: 140,
       render: (date: string) => {
           if (!date) return '-';
           const expiring = isExpiringSoon(date);
           const expired = isExpired(date);
           return (
               <Space>
                   <span style={{ color: expired ? 'red' : expiring ? 'orange' : 'inherit' }}>
                       {dayjs(date).format('DD/MM/YYYY')}
                   </span>
                   {(expired || expiring) && (
                       <Tooltip title={expired ? "Đã hết hạn" : "Sắp hết hạn (<30 ngày)"}>
                           <WarningOutlined style={{ color: expired ? 'red' : 'orange' }} />
                       </Tooltip>
                   )}
               </Space>
           );
       }
    },
    {
        title: 'Hành động',
        key: 'action',
        width: 100,
        align: 'center' as const,
        render: (_: any, record: IDevice) => (
            <Space size="small">
                <Button 
                    icon={<EyeOutlined />} 
                    size="small" 
                    onClick={() => onView(record)} 
                />
                {canEdit && (
                    <Button 
                        icon={<EditOutlined />} 
                        type="primary" 
                        ghost 
                        size="small" 
                        onClick={() => onEdit(record)} 
                    />
                )}
                {canDelete && (
                    <Popconfirm 
                        title="Bạn có chắc chắn muốn xóa?" 
                        onConfirm={() => onDelete(record.device_id)}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Button 
                            icon={<DeleteOutlined />} 
                            danger 
                            size="small" 
                        />
                    </Popconfirm>
                )}
            </Space>
        )
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      rowKey="device_id"
      pagination={{ pageSize: 10 }}
      scroll={{ x: 'max-content' }}
    />
  );
};

export default DevicesTable;

