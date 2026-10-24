import React from 'react';
import { Table, Button, Space, Tag, Popconfirm, Tooltip, Typography } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  WarningOutlined,
  QrcodeOutlined,
  CarOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { IDevice, DeviceStatus } from '../../../../types/devicesManagement.types';
import dayjs from 'dayjs';

const { Text } = Typography;

interface DevicesTableProps {
  dataSource: IDevice[];
  loading: boolean;
  onEdit: (device: IDevice) => void;
  onDelete: (id?: number) => void;
  onView: (device: IDevice) => void;
  onShowQR: (device: IDevice) => void;
  canEdit: boolean;
  canDelete: boolean;
  selectedRowKeys?: React.Key[];
  onSelectChange?: (selectedRowKeys: React.Key[], selectedRows: IDevice[]) => void;
}

const DevicesTable: React.FC<DevicesTableProps> = ({
  dataSource,
  loading,
  onEdit,
  onDelete,
  onView,
  onShowQR,
  canEdit,
  canDelete,
  selectedRowKeys,
  onSelectChange,
}) => {
  // Helpers tính hạn đăng kiểm
  const getInspectionStatus = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = dayjs(dateStr).startOf('day');
    const today = dayjs().startOf('day');
    const diff = date.diff(today, 'days');

    if (diff < 0) {
      return {
        status: 'expired',
        text: `Hết hạn ${Math.abs(diff)} ngày`,
        color: '#cf1322',
        bg: '#fff1f0',
        border: '#ffa39e',
        icon: <CloseCircleOutlined />,
      };
    }
    if (diff <= 30) {
      return {
        status: 'critical',
        text: `Còn ${diff} ngày`,
        color: '#cf1322',
        bg: '#fff1f0',
        border: '#ffa39e',
        icon: <WarningOutlined />,
      };
    }
    if (diff <= 90) {
      return {
        status: 'warning',
        text: `Còn ${diff} ngày`,
        color: '#d46b08',
        bg: '#fffbe6',
        border: '#ffe58f',
        icon: <ClockCircleOutlined />,
      };
    }
    return {
      status: 'normal',
      text: date.format('DD/MM/YYYY'),
      color: '#334155',
      bg: '#f8fafc',
      border: '#e2e8f0',
      icon: <CalendarOutlined style={{ color: '#1677ff' }} />,
    };
  };

  const columns = [
    {
      title: 'STT',
      dataIndex: 'device_id',
      key: 'device_id',
      width: 55,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <span style={{ color: '#64748b', fontWeight: 500 }}>{index + 1}</span>
      ),
    },
    {
      title: 'Tên Trang Thiết Bị / Xe',
      dataIndex: 'name',
      key: 'name',
      width: 240,
      render: (text: string, record: IDevice) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#e6f4ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1677ff',
              fontSize: 18,
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            <CarOutlined />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                color: '#0f172a',
                fontSize: 14,
                cursor: 'pointer',
              }}
              onClick={() => onView(record)}
            >
              <span className="hover-link" style={{ transition: 'color 0.2s' }}>
                {text || 'Thiết bị chưa đặt tên'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
              {record.device_code && (
                <span style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>
                  Mã: {record.device_code}
                </span>
              )}
              {record.serial_number && (
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  SN: {record.serial_number}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Biển Số Xe',
      dataIndex: 'reg_number',
      key: 'reg_number',
      width: 140,
      render: (text: string) =>
        text ? (
          <div
            style={{
              display: 'inline-block',
              background: '#e6fffb',
              border: '1px solid #87e8de',
              borderRadius: 6,
              padding: '2px 8px',
              fontWeight: 700,
              color: '#006d75',
              fontSize: 13,
              letterSpacing: '0.3px',
              boxShadow: '0 1px 2px rgba(0, 109, 117, 0.08)',
            }}
          >
            {text}
          </div>
        ) : (
          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>Chưa có biển</span>
        ),
    },
    {
      title: 'Loại Thiết Bị',
      dataIndex: 'deviceType',
      key: 'deviceType',
      width: 150,
      render: (type: any, record: IDevice) => (
        <div>
          <div style={{ fontWeight: 500, color: '#1e293b', fontSize: 13 }}>
            {type?.name || record.brand || <span style={{ color: '#cbd5e1' }}>—</span>}
          </div>
          {record.device_group?.name && (
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
              {record.device_group.name}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      align: 'center' as const,
      render: (status: DeviceStatus) => {
        let label = 'Mới';
        let color = '#0958d9';
        let bg = '#e6f4ff';
        let border = '#91caff';
        let dotColor = '#1677ff';

        switch (status) {
          case 'MOI':
            label = 'Mới';
            color = '#0958d9';
            bg = '#e6f4ff';
            border = '#91caff';
            dotColor = '#1677ff';
            break;
          case 'DANG_SU_DUNG':
            label = 'Đang sử dụng';
            color = '#237804';
            bg = '#f6ffed';
            border = '#b7eb8f';
            dotColor = '#52c41a';
            break;
          case 'SU_DUNG_HAN_CHE':
            label = 'Sử dụng hạn chế';
            color = '#d46b08';
            bg = '#fffbe6';
            border = '#ffe58f';
            dotColor = '#faad14';
            break;
          case 'DANG_SUA_CHUA':
            label = 'Đang sửa chữa';
            color = '#cf1322';
            bg = '#fff1f0';
            border = '#ffa39e';
            dotColor = '#ff4d4f';
            break;
          case 'THANH_LY':
            label = 'Thanh lý';
            color = '#475569';
            bg = '#f1f5f9';
            border = '#cbd5e1';
            dotColor = '#94a3b8';
            break;
          case 'HUY_BO':
            label = 'Hủy bỏ';
            color = '#cf1322';
            bg = '#fff1f0';
            border = '#ffa39e';
            dotColor = '#ff4d4f';
            break;
          default:
            label = status || 'N/A';
        }

        return (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: bg,
              border: `1px solid ${border}`,
              color: color,
              borderRadius: 20,
              padding: '2px 10px',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: dotColor,
                display: 'inline-block',
              }}
            />
            <span>{label}</span>
          </div>
        );
      },
    },
    {
      title: 'Hạn Đăng Kiểm',
      dataIndex: 'inspection_expiry',
      key: 'inspection_expiry',
      width: 160,
      align: 'center' as const,
      render: (date: string) => {
        const info = getInspectionStatus(date);
        if (!info) return <span style={{ color: '#cbd5e1' }}>—</span>;

        return (
          <Tooltip title={date ? `Ngày hết hạn: ${dayjs(date).format('DD/MM/YYYY')}` : undefined}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: info.bg,
                border: `1px solid ${info.border}`,
                color: info.color,
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {info.icon}
              <span>{info.text}</span>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Tem QR',
      key: 'qr_code',
      width: 90,
      align: 'center' as const,
      render: (_: any, record: IDevice) => (
        <Tooltip title="Xem & In tem mã QR phương tiện">
          <Button
            icon={<QrcodeOutlined />}
            size="small"
            style={{
              borderRadius: 6,
              color: '#0958d9',
              borderColor: '#91caff',
              background: '#e6f4ff',
              fontWeight: 600,
              fontSize: 12,
            }}
            onClick={() => onShowQR(record)}
          >
            QR
          </Button>
        </Tooltip>
      ),
    },
    {
      title: 'Thao Tác',
      key: 'action',
      width: 120,
      align: 'center' as const,
      render: (_: any, record: IDevice) => (
        <Space size={4}>
          <Tooltip title="Xem hồ sơ chi tiết">
            <Button
              icon={<EyeOutlined />}
              size="small"
              style={{ borderRadius: 6, color: '#1677ff', borderColor: '#bae0ff' }}
              onClick={() => onView(record)}
            />
          </Tooltip>

          {canEdit && (
            <Tooltip title="Chỉnh sửa thông tin">
              <Button
                icon={<EditOutlined />}
                size="small"
                style={{ borderRadius: 6, color: '#fa8c16', borderColor: '#ffd591' }}
                onClick={() => onEdit(record)}
              />
            </Tooltip>
          )}

          {canDelete && (
            <Popconfirm
              title="Xóa thiết bị này?"
              description="Hành động này sẽ xóa phương tiện khỏi danh mục quản lý."
              onConfirm={() => onDelete(record.device_id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Xóa thiết bị">
                <Button
                  icon={<DeleteOutlined />}
                  danger
                  size="small"
                  style={{ borderRadius: 6 }}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const rowSelection = onSelectChange
    ? {
        selectedRowKeys,
        onChange: onSelectChange,
      }
    : undefined;

  return (
    <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        rowKey="device_id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} thiết bị`,
          style: { padding: '12px 16px', margin: 0 },
        }}
        scroll={{ x: 1050 }}
        size="middle"
      />
    </div>
  );
};

export default DevicesTable;
