import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Space, Typography, Alert, Spin } from 'antd';
import { CameraOutlined, ReloadOutlined } from '@ant-design/icons';
import { Html5Qrcode } from 'html5-qrcode';

const { Text } = Typography;

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScanned: (decodedText: string, deviceId?: number) => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ open, onClose, onScanned }) => {
  const [scanning, setScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerElementId = 'cmms-qr-reader-viewport';

  const startScanning = async () => {
    setErrorMessage(null);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerElementId);
      }

      const qrScanner = scannerRef.current;
      if (qrScanner.isScanning) {
        await qrScanner.stop();
      }

      await qrScanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Play a small beep feedback if browser audio context allows
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
          } catch (e) {
            // Ignore audio context errors
          }

          // Extract device ID if it matches /device-passport/:id or plain number
          let extractedId: number | undefined;
          const match = decodedText.match(/\/device-passport\/(\d+)/);
          if (match && match[1]) {
            extractedId = Number(match[1]);
          } else if (/^\d+$/.test(decodedText.trim())) {
            extractedId = Number(decodedText.trim());
          }

          // Stop scanning and trigger callback
          stopScanning().finally(() => {
            onScanned(decodedText, extractedId);
            onClose();
          });
        },
        () => {
          // Ignore transient scan frame errors
        }
      );

      setScanning(true);
    } catch (err: any) {
      console.error('Camera QR start error:', err);
      setErrorMessage(
        err?.message || 'Không thể truy cập camera. Vui lòng cấp quyền truy cập máy ảnh cho trình duyệt.'
      );
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
    } catch (e) {
      console.error('Error stopping scanner:', e);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (open) {
      // Delay slightly to ensure modal DOM is mounted
      const timer = setTimeout(() => {
        startScanning();
      }, 350);
      return () => clearTimeout(timer);
    } else {
      stopScanning();
    }
    // Cleanup on unmount
    return () => {
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal
      open={open}
      onCancel={() => {
        stopScanning().then(onClose);
      }}
      width={500}
      centered
      maskClosable={false}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 18,
              boxShadow: '0 2px 8px rgba(22, 119, 255, 0.3)',
            }}
          >
            <CameraOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
              Quét Mã QR Thiết Bị (Camera)
            </div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
              Hướng camera về phía mã QR dán trên xe để nhận diện tự động
            </div>
          </div>
        </div>
      }
      footer={[
        <Button
          key="retry"
          icon={<ReloadOutlined />}
          onClick={startScanning}
          disabled={scanning}
          style={{ borderRadius: 8 }}
        >
          Khởi động lại Camera
        </Button>,
        <Button
          key="close"
          style={{ borderRadius: 8 }}
          onClick={() => {
            stopScanning().then(onClose);
          }}
        >
          Đóng
        </Button>,
      ]}
      destroyOnClose
    >
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Hướng camera về phía mã QR dán trên xe để nhận diện tự động
        </Text>
      </div>

      {errorMessage && (
        <Alert
          type="error"
          message="Lỗi truy cập máy ảnh"
          description={errorMessage}
          showIcon
          style={{ marginBottom: 12 }}
        />
      )}

      {/* Viewport container */}
      <div
        style={{
          width: '100%',
          minHeight: 280,
          background: '#000',
          borderRadius: 8,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div id={scannerElementId} style={{ width: '100%', height: '100%' }} />

        {!scanning && !errorMessage && (
          <div style={{ position: 'absolute', color: '#fff', textAlign: 'center' }}>
            <Spin size="large" tip="Đang khởi tạo Camera..." />
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: '#888' }}>
        💡 Hỗ trợ: Mã QR in từ hệ thống CMMS, URL hồ sơ phương tiện hoặc mã số thiết bị.
      </div>
    </Modal>
  );
};

export default QRScannerModal;
