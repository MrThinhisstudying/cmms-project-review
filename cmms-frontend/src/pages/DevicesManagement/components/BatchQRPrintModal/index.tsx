import React, { useState } from 'react';
import { Modal, Button, Space, Typography, Table, Checkbox, Tag, notification } from 'antd';
import { PrinterOutlined, CheckSquareOutlined, ClearOutlined } from '@ant-design/icons';
import { IDevice } from '../../../../types/devicesManagement.types';

const { Text } = Typography;

interface BatchQRPrintModalProps {
  open: boolean;
  onClose: () => void;
  devices: IDevice[];
}

const BatchQRPrintModal: React.FC<BatchQRPrintModalProps> = ({ open, onClose, devices }) => {
  const [selectedIds, setSelectedIds] = useState<number[]>(devices.map((d) => d.device_id));

  // Sync selectedIds when devices prop changes or modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedIds(devices.map((d) => d.device_id));
    }
  }, [open, devices]);

  const selectedDevices = devices.filter((d) => selectedIds.includes(d.device_id));

  const handleSelectAll = () => {
    setSelectedIds(devices.map((d) => d.device_id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleToggle = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    if (selectedDevices.length === 0) {
      notification.warning({ message: 'Vui lòng chọn ít nhất 1 thiết bị để in tem', title: 'Thông báo' });
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      notification.warning({ message: 'Trình duyệt đang chặn pop-up. Vui lòng cho phép để in tem.', title: 'Thông báo' });
      return;
    }

    const origin = window.location.origin;

    // Render HTML for each sticker
    const stickersHtml = selectedDevices
      .map((dev) => {
        const passportUrl = `${origin}/device-passport/${dev.device_id}`;
        // Generate QR code data url using canvas on-the-fly or render canvas element in print window
        return `
        <div class="sticker-card">
          <div class="sticker-header">
            <div class="sticker-header-title">CẢNG HÀNG KHÔNG - HỒ SƠ PHƯƠNG TIỆN</div>
            <div class="sticker-header-sub">HỆ THỐNG CMMS</div>
          </div>
          <div class="sticker-body">
            <div class="sticker-qr" id="qr-${dev.device_id}">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(passportUrl)}" width="80" height="80" alt="QR" />
            </div>
            <div class="sticker-info">
              <div class="sticker-name">${dev.name}</div>
              <div class="sticker-plate">${dev.reg_number || 'NIL'}</div>
              <div class="sticker-meta">
                <div>Mã: ${dev.device_code || `TTB-${dev.device_id}`}</div>
                <div>Loại: ${dev.deviceType?.name || 'NIL'}</div>
                <div>Đơn vị: ${dev.using_department || dev.device_group?.name || 'Chưa gán'}</div>
              </div>
            </div>
          </div>
          <div class="sticker-footer">
            <span>📱 Quét để tra cứu & báo hỏng</span>
            <span>#${dev.device_id}</span>
          </div>
        </div>
      `;
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>In_Tem_Hang_Loat_${selectedDevices.length}_Xe</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .grid-container {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8mm;
            }
            .sticker-card {
              border: 1.5px solid #003a8c;
              border-radius: 6px;
              padding: 6px 8px;
              box-sizing: border-box;
              height: 52mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: #fff;
              page-break-inside: avoid;
            }
            .sticker-header {
              text-align: center;
              border-bottom: 1.2px solid #003a8c;
              padding-bottom: 3px;
              margin-bottom: 4px;
            }
            .sticker-header-title {
              font-size: 10px;
              font-weight: 800;
              color: #003a8c;
              text-transform: uppercase;
            }
            .sticker-header-sub {
              font-size: 7.5px;
              color: #555;
            }
            .sticker-body {
              display: flex;
              align-items: center;
              gap: 8px;
              flex: 1;
            }
            .sticker-qr {
              flex-shrink: 0;
              border: 1px solid #ddd;
              padding: 2px;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .sticker-info {
              flex: 1;
              min-width: 0;
            }
            .sticker-name {
              font-size: 10.5px;
              font-weight: bold;
              color: #111;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              margin-bottom: 2px;
            }
            .sticker-plate {
              display: inline-block;
              border: 1.2px solid #1890ff;
              border-radius: 3px;
              padding: 1px 5px;
              font-size: 11.5px;
              font-weight: 800;
              color: #003a8c;
              background: #e6f7ff;
              margin-bottom: 2px;
            }
            .sticker-meta {
              font-size: 8px;
              color: #333;
              line-height: 1.3;
            }
            .sticker-footer {
              border-top: 1px dashed #ccc;
              padding-top: 2px;
              display: flex;
              justify-content: space-between;
              font-size: 7.5px;
              color: #777;
            }
          </style>
        </head>
        <body>
          <div class="grid-container">
            ${stickersHtml}
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const columns = [
    {
      title: (
        <Checkbox
          checked={selectedIds.length === devices.length && devices.length > 0}
          indeterminate={selectedIds.length > 0 && selectedIds.length < devices.length}
          onChange={(e) => (e.target.checked ? handleSelectAll() : handleDeselectAll())}
        />
      ),
      key: 'select',
      width: 50,
      render: (_: any, record: IDevice) => (
        <Checkbox
          checked={selectedIds.includes(record.device_id)}
          onChange={() => handleToggle(record.device_id)}
        />
      ),
    },
    {
      title: 'Tên phương tiện',
      dataIndex: 'name',
      key: 'name',
      render: (t: string) => <span style={{ fontWeight: 600 }}>{t}</span>,
    },
    {
      title: 'Biển số',
      dataIndex: 'reg_number',
      key: 'reg_number',
      width: 130,
      render: (t: string) => (t ? <Tag color="blue">{t}</Tag> : '-'),
    },
    {
      title: 'Mã TTB',
      dataIndex: 'device_code',
      key: 'device_code',
      width: 130,
      render: (t: string, r: IDevice) => t || `TTB-${r.device_id}`,
    },
    {
      title: 'Đơn vị / Nhóm',
      key: 'group',
      width: 180,
      render: (_: any, r: IDevice) => r.using_department || r.device_group?.name || 'Chưa gán',
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={780}
      title={
        <Space>
          <PrinterOutlined style={{ color: '#1890ff', fontSize: 20 }} />
          <span>In Tem Nhãn QR Hàng Loạt (Khổ A4)</span>
        </Space>
      }
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handlePrint}
          disabled={selectedDevices.length === 0}
        >
          In {selectedDevices.length} tem nhãn đã chọn
        </Button>,
      ]}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text>
          Đã chọn: <strong style={{ color: '#1890ff' }}>{selectedDevices.length}</strong> / {devices.length} phương tiện
        </Text>
        <Space size="small">
          <Button size="small" icon={<CheckSquareOutlined />} onClick={handleSelectAll}>
            Chọn tất cả
          </Button>
          <Button size="small" icon={<ClearOutlined />} onClick={handleDeselectAll}>
            Bỏ chọn
          </Button>
        </Space>
      </div>

      <Table
        dataSource={devices}
        columns={columns}
        rowKey="device_id"
        size="small"
        pagination={{ pageSize: 8 }}
      />

      <div style={{ background: '#f0f7ff', border: '1px solid #bae0ff', borderRadius: 6, padding: '8px 12px', marginTop: 12, fontSize: 12 }}>
        💡 Định dạng in: Hệ thống sẽ xếp mỗi trang A4 thành lưới 2 cột tem nhãn tiêu chuẩn. Thích hợp in trên giấy Decal A4 đã bế sẵn hoặc giấy decal dán thường.
      </div>
    </Modal>
  );
};

export default BatchQRPrintModal;
