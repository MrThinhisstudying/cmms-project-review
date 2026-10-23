import React, { useRef } from 'react';
import { Modal, Button, Space, Typography, Tag, Divider, notification } from 'antd';
import {
  DownloadOutlined,
  PrinterOutlined,
  ExportOutlined,
  QrcodeOutlined,
} from '@ant-design/icons';
import { QRCodeCanvas } from 'qrcode.react';
import { IDevice } from '../../../../types/devicesManagement.types';

const { Text } = Typography;

interface DeviceQRModalProps {
  open: boolean;
  onClose: () => void;
  device: IDevice | null;
}

const DeviceQRModal: React.FC<DeviceQRModalProps> = ({ open, onClose, device }) => {
  const qrRef = useRef<HTMLDivElement>(null);

  if (!device) return null;

  const passportUrl = `${window.location.origin}/device-passport/${device.device_id}`;

  // Download QR as PNG
  const handleDownload = () => {
    try {
      const canvas = qrRef.current?.querySelector('canvas');
      if (!canvas) {
        notification.error({ message: 'Không thể xuất mã QR', title: 'Lỗi' });
        return;
      }
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      const fileName = `QR_${device.device_code || device.reg_number || device.device_id}.png`;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      notification.success({ message: `Đã tải về file: ${fileName}`, title: 'Thành công' });
    } catch (err) {
      notification.error({ message: 'Tải QR thất bại', title: 'Lỗi' });
    }
  };

  // Print decal label directly
  const handlePrint = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    const qrDataUrl = canvas ? canvas.toDataURL('image/png') : '';
    if (!qrDataUrl) {
      notification.error({ message: 'Đang khởi tạo mã QR, vui lòng bấm in lại sau 1 giây', title: 'Thông báo' });
      return;
    }

    const printWindow = window.open('', '_blank', 'width=700,height=500');
    if (!printWindow) {
      notification.warning({ message: 'Trình duyệt đang chặn cửa sổ in (pop-up). Vui lòng cho phép để in tem.', title: 'Thông báo' });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tem_Nhan_${device.reg_number || device.device_code || device.device_id}</title>
          <style>
            @page {
              size: 90mm 55mm;
              margin: 0 !important;
            }
            @media print {
              html, body {
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
              }
            }
            * {
              box-sizing: border-box !important;
            }
            body {
              margin: 0 !important;
              padding: 2.5mm !important;
              font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
              background: #fff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .decal-sticker {
              width: 85mm;
              height: 49mm;
              max-height: 49mm;
              border: 2px solid #003a8c;
              border-radius: 6px;
              padding: 4px 6px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: #ffffff;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              page-break-after: avoid !important;
              overflow: hidden;
            }
            .decal-header {
              text-align: center;
              border-bottom: 1.2px solid #003a8c;
              padding-bottom: 2px;
              margin-bottom: 2px;
            }
            .decal-header-title {
              font-size: 9.5px;
              font-weight: 800;
              color: #003a8c;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              margin: 0;
              padding: 0;
            }
            .decal-header-sub {
              font-size: 7px;
              color: #555;
              text-transform: uppercase;
              margin-top: 1px;
            }
            .decal-body {
              display: flex;
              flex: 1;
              align-items: center;
              gap: 8px;
              overflow: hidden;
            }
            .decal-qr {
              flex-shrink: 0;
              border: 1px solid #d9d9d9;
              padding: 2px;
              border-radius: 4px;
              background: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .decal-info {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              min-width: 0;
            }
            .decal-device-name {
              font-size: 10.5px;
              font-weight: 700;
              color: #111;
              line-height: 1.2;
              margin-bottom: 2px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .decal-plate-box {
              display: inline-block;
              border: 1.5px solid #1890ff;
              border-radius: 3px;
              padding: 1px 6px;
              font-size: 12px;
              font-weight: 800;
              color: #003a8c;
              background: #e6f7ff !important;
              margin-bottom: 2px;
              align-self: flex-start;
            }
            .decal-meta {
              font-size: 7.8px;
              color: #333;
              line-height: 1.35;
            }
            .decal-footer {
              border-top: 1px dashed #bbb;
              padding-top: 2px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 7px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="decal-sticker">
            <div class="decal-header">
              <div class="decal-header-title">CẢNG HÀNG KHÔNG - HỒ SƠ SỐ PHƯƠNG TIỆN</div>
              <div class="decal-header-sub">HỆ THỐNG QUẢN LÝ BẢO DƯỠNG & SỬA CHỮA CMMS</div>
            </div>

            <div class="decal-body">
              <div class="decal-qr">
                <img src="${qrDataUrl}" width="82" height="82" alt="QR Code" style="display: block;" />
              </div>

              <div class="decal-info">
                <div class="decal-device-name">${device.name || ''}</div>
                ${
                  device.reg_number
                    ? `<div class="decal-plate-box">${device.reg_number}</div>`
                    : `<div style="font-size: 9px; color: #888; margin-bottom: 2px;">Chưa có biển số</div>`
                }
                <div class="decal-meta">
                  <div><strong>Mã TTB:</strong> ${device.device_code || `TTB-${device.device_id}`}</div>
                  <div><strong>Loại xe:</strong> ${device.deviceType?.name || 'NIL'}</div>
                  <div><strong>Đơn vị QL:</strong> ${device.using_department || device.device_group?.name || 'Chưa gán'}</div>
                </div>
              </div>
            </div>

            <div class="decal-footer">
              <span>📱 Quét mã để xem lý lịch, bảo dưỡng & báo hỏng</span>
              <span>ID: #${device.device_id}</span>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const openPassportDirectly = () => {
    window.open(passportUrl, '_blank');
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={560}
      title={
        <Space>
          <QrcodeOutlined style={{ color: '#1890ff', fontSize: 20 }} />
          <span>Mã QR & Tem Nhãn Phương Tiện</span>
        </Space>
      }
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
        <Button key="open" icon={<ExportOutlined />} onClick={openPassportDirectly}>
          Mở hồ sơ số
        </Button>,
        <Button key="download" icon={<DownloadOutlined />} onClick={handleDownload}>
          Tải ảnh QR
        </Button>,
        <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
          In tem nhãn decal
        </Button>,
      ]}
      styles={{ body: { padding: '16px 20px' } }}
    >
      {/* Printable Decal Container (Also serves as Live Preview) */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Mẫu tem dán chuẩn nhận diện trang thiết bị phương tiện:
        </Text>
      </div>

      <div
        id="printable-decal-label"
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <div
          className="decal-sticker"
          style={{
            width: '100%',
            maxWidth: 420,
            background: '#ffffff',
            border: '2px solid #003a8c',
            borderRadius: 8,
            padding: '12px 14px',
            boxShadow: '0 4px 12px rgba(0, 58, 140, 0.1)',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div
            className="decal-header"
            style={{
              textAlign: 'center',
              borderBottom: '1.5px solid #003a8c',
              paddingBottom: 6,
              marginBottom: 8,
            }}
          >
            <div
              className="decal-header-title"
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: '#003a8c',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              CẢNG HÀNG KHÔNG - HỒ SƠ SỐ PHƯƠNG TIỆN
            </div>
            <div
              className="decal-header-sub"
              style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', marginTop: 1 }}
            >
              HỆ THỐNG QUẢN LÝ BẢO DƯỠNG & SỬA CHỮA CMMS
            </div>
          </div>

          {/* Body */}
          <div
            className="decal-body"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {/* QR Code Canvas */}
            <div
              ref={qrRef}
              className="decal-qr"
              style={{
                flexShrink: 0,
                background: '#fff',
                padding: 4,
                border: '1px solid #e8e8e8',
                borderRadius: 6,
                display: 'inline-flex',
              }}
            >
              <QRCodeCanvas
                value={passportUrl}
                size={110}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Info Column */}
            <div
              className="decal-info"
              style={{
                flex: 1,
                textAlign: 'left',
              }}
            >
              <div
                className="decal-device-name"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#1f1f1f',
                  marginBottom: 4,
                  lineHeight: 1.25,
                }}
              >
                {device.name}
              </div>

              {device.reg_number ? (
                <div
                  className="decal-plate-box"
                  style={{
                    display: 'inline-block',
                    border: '1.5px solid #1890ff',
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: 14,
                    fontWeight: 800,
                    color: '#003a8c',
                    background: '#e6f7ff',
                    marginBottom: 4,
                    letterSpacing: '0.5px',
                  }}
                >
                  {device.reg_number}
                </div>
              ) : (
                <Tag color="blue" style={{ marginBottom: 4 }}>Chưa có biển số</Tag>
              )}

              <div className="decal-meta" style={{ fontSize: 11, color: '#444', lineHeight: 1.4 }}>
                <div><strong>Mã TTB:</strong> {device.device_code || `TTB-${device.device_id}`}</div>
                <div><strong>Loại xe:</strong> {device.deviceType?.name || 'NIL'}</div>
                <div><strong>Đơn vị QL:</strong> {device.using_department || device.device_group?.name || 'Chưa gán'}</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="decal-footer"
            style={{
              borderTop: '1px dashed #d9d9d9',
              marginTop: 8,
              paddingTop: 4,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 9.5,
              color: '#888',
            }}
          >
            <span>📱 Quét mã để xem lý lịch, bảo dưỡng & báo hỏng</span>
            <span>ID: #{device.device_id}</span>
          </div>
        </div>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <div style={{ background: '#f5f5f5', borderRadius: 6, padding: '10px 14px', fontSize: 12 }}>
        <Space orientation="vertical" style={{ width: '100%' }} size={4}>
          <div>
            <Text strong>Đường dẫn tra cứu trực tiếp:</Text>{' '}
            <a href={passportUrl} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
              {passportUrl}
            </a>
          </div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            💡 Gợi ý: Dán tem nhãn này tại góc kính chắn gió hoặc gần vị trí bảng điều khiển phương tiện để kỹ thuật viên và tài xế quét nhanh bằng camera điện thoại.
          </Text>
        </Space>
      </div>
    </Modal>
  );
};

export default DeviceQRModal;
