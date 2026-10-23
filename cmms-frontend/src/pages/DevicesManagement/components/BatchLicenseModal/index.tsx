import React, { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Card,
  Row,
  Col,
  Select,
  Input,
  DatePicker,
  Button,
  Table,
  Space,
  Tag,
  Upload,
  Empty,
  notification,
  Popconfirm,
  Progress,
  Tooltip,
} from 'antd';
import {
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  DownloadOutlined,
  DeleteOutlined,
  PlusOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { IDevice } from '../../../../types/devicesManagement.types';
import { updateDevice } from '../../../../apis/devices';
import { getToken } from '../../../../utils/auth';

const { Option } = Select;
const { Dragger } = Upload;

export interface IBatchLicenseRow {
  key: string;
  deviceId: number;
  deviceName: string;
  regNumber?: string;
  deviceCode?: string;
  type: string;
  number: string;
  issuer: string;
  expiry: string | null; // 'YYYY-MM-DD'
  note?: string;
}

interface BatchLicenseModalProps {
  open: boolean;
  onClose: () => void;
  devices: IDevice[];
  selectedDeviceIds?: number[];
  onSuccess: () => void;
}

const LICENSE_TYPE_OPTIONS = [
  'Đăng kiểm',
  'Bảo hiểm',
  'Kiểm định an toàn',
  'Giấy phép lưu hành sân đỗ',
  'Chứng nhận khí thải',
  'Khác',
];

const BatchLicenseModal: React.FC<BatchLicenseModalProps> = ({
  open,
  onClose,
  devices,
  selectedDeviceIds = [],
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'grid' | 'excel'>('grid');

  // Form chung (Áp dụng hàng loạt cho danh sách)
  const [bulkType, setBulkType] = useState<string>('Đăng kiểm');
  const [bulkIssuer, setBulkIssuer] = useState<string>('Trung tâm Đăng kiểm');
  const [bulkExpiry, setBulkExpiry] = useState<dayjs.Dayjs | null>(dayjs().add(1, 'year'));
  const [bulkNote, setBulkNote] = useState<string>('');

  // Danh sách dòng chỉnh sửa ma trận
  const [rows, setRows] = useState<IBatchLicenseRow[]>([]);

  // State thêm thiết bị vào đợt
  const [deviceToAdd, setDeviceToAdd] = useState<number | undefined>(undefined);

  // Tiến trình lưu
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);

  // Khi modal mở, khởi tạo rows dựa trên selectedDeviceIds hoặc danh sách xe sắp hết hạn
  useEffect(() => {
    if (open) {
      let targetDevices: IDevice[] = [];

      if (selectedDeviceIds.length > 0) {
        targetDevices = devices.filter((d) => selectedDeviceIds.includes(d.device_id));
      } else {
        // Mặc định gợi ý các xe sắp hết hạn hoặc hết hạn đăng kiểm trong 90 ngày
        const soon = devices.filter((d) => {
          if (!d.inspection_expiry) return false;
          const diff = dayjs(d.inspection_expiry).diff(dayjs(), 'day');
          return diff <= 90;
        });
        targetDevices = soon.length > 0 ? soon : devices.slice(0, 10);
      }

      const initialRows: IBatchLicenseRow[] = targetDevices.map((d) => ({
        key: `dev-${d.device_id}-${Date.now()}-${Math.random()}`,
        deviceId: d.device_id,
        deviceName: d.name,
        regNumber: d.reg_number,
        deviceCode: d.device_code,
        type: 'Đăng kiểm',
        number: '',
        issuer: 'Trung tâm Đăng kiểm',
        expiry: dayjs().add(1, 'year').format('YYYY-MM-DD'),
        note: '',
      }));

      setRows(initialRows);
      setActiveTab('grid');
      setSaving(false);
      setSaveProgress(0);
    }
  }, [open, selectedDeviceIds, devices]);

  // Áp dụng thông số chung cho tất cả các xe trong bảng
  const handleApplyAll = () => {
    if (rows.length === 0) {
      notification.warning({ message: 'Danh sách thiết bị trống', title: 'Thông báo' });
      return;
    }

    const expiryStr = bulkExpiry ? bulkExpiry.format('YYYY-MM-DD') : null;
    const updated = rows.map((r) => ({
      ...r,
      type: bulkType,
      issuer: bulkIssuer || r.issuer,
      expiry: expiryStr || r.expiry,
      note: bulkNote ? (r.note ? `${r.note} - ${bulkNote}` : bulkNote) : r.note,
    }));

    setRows(updated);
    notification.success({
      message: 'Đã áp dụng thông số chung',
      title: 'Thành công',
      description: `Đã cập nhật Loại giấy tờ, Đơn vị cấp và Ngày hết hạn cho ${rows.length} thiết bị.`,
    });
  };

  // Cập nhật giá trị 1 ô trong bảng ma trận
  const handleUpdateRow = (key: string, field: keyof IBatchLicenseRow, val: any) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.key === key) {
          return { ...row, [field]: val };
        }
        return row;
      })
    );
  };

  // Xóa 1 xe khỏi bảng
  const handleRemoveRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  // Thêm 1 xe vào bảng
  const handleAddDevice = () => {
    if (!deviceToAdd) return;
    const dev = devices.find((d) => d.device_id === deviceToAdd);
    if (!dev) return;

    if (rows.some((r) => r.deviceId === dev.device_id)) {
      notification.warning({ message: 'Thiết bị này đã có trong danh sách', title: 'Cảnh báo' });
      return;
    }

    const newRow: IBatchLicenseRow = {
      key: `dev-${dev.device_id}-${Date.now()}`,
      deviceId: dev.device_id,
      deviceName: dev.name,
      regNumber: dev.reg_number,
      deviceCode: dev.device_code,
      type: bulkType,
      number: '',
      issuer: bulkIssuer || 'Trung tâm Đăng kiểm',
      expiry: bulkExpiry ? bulkExpiry.format('YYYY-MM-DD') : dayjs().add(1, 'year').format('YYYY-MM-DD'),
      note: '',
    };

    setRows((prev) => [...prev, newRow]);
    setDeviceToAdd(undefined);
  };

  // Tải file Excel mẫu
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Mã thiết bị': 'TTB-501',
        'Biển số': 'VCS-11201',
        'Tên thiết bị': 'Xe đầu kéo Toyota 01',
        'Loại giấy tờ': 'Đăng kiểm',
        'Số Giấy phép / Tem': 'KD-2024-001',
        'Đơn vị cấp': 'Trung tâm Đăng kiểm 50-03S',
        'Ngày hết hạn (DD/MM/YYYY)': dayjs().add(1, 'year').format('DD/MM/YYYY'),
        'Ghi chú': 'Kiểm định định kỳ năm 2024',
      },
      {
        'Mã thiết bị': 'TTB-502',
        'Biển số': 'VCS-11202',
        'Tên thiết bị': 'Xe đầu kéo Toyota 02',
        'Loại giấy tờ': 'Bảo hiểm',
        'Số Giấy phép / Tem': 'BH-PJICO-9981',
        'Đơn vị cấp': 'Bảo hiểm PJICO Sài Gòn',
        'Ngày hết hạn (DD/MM/YYYY)': dayjs().add(1, 'year').format('DD/MM/YYYY'),
        'Ghi chú': 'Gia hạn gói bảo hiểm thân vỏ',
      },
      ...devices.slice(0, 15).map((d, idx) => ({
        'Mã thiết bị': d.device_code || `TTB-${d.device_id}`,
        'Biển số': d.reg_number || '---',
        'Tên thiết bị': d.name,
        'Loại giấy tờ': 'Đăng kiểm',
        'Số Giấy phép / Tem': `KD-2024-${String(idx + 10).padStart(3, '0')}`,
        'Đơn vị cấp': 'Trung tâm Đăng kiểm',
        'Ngày hết hạn (DD/MM/YYYY)': dayjs().add(1, 'year').format('DD/MM/YYYY'),
        'Ghi chú': '',
      })),
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'CapNhatDangKiem');

    // Căn chỉnh độ rộng cột
    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 15 },
      { wch: 30 },
      { wch: 18 },
      { wch: 22 },
      { wch: 28 },
      { wch: 25 },
      { wch: 30 },
    ];

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `Mau_Cap_Nhat_Dang_Kiem_Giay_Phep_${dayjs().format('YYYYMMDD')}.xlsx`);
  };

  // Xử lý upload file Excel
  const handleExcelUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(sheet);

        if (!json || json.length === 0) {
          notification.error({ message: 'File Excel không có dữ liệu', title: 'Lỗi' });
          return;
        }

        const newParsedRows: IBatchLicenseRow[] = [];
        let matchedCount = 0;

        json.forEach((item, index) => {
          const deviceCode = item['Mã thiết bị'] || item['Mã số'] || item['device_code'];
          const regNumber = item['Biển số'] || item['Biển đăng ký'] || item['reg_number'];
          const name = item['Tên thiết bị'] || item['Tên phương tiện'] || item['name'];

          // Tìm thiết bị trong hệ thống
          const matchedDevice = devices.find((d) => {
            if (regNumber && d.reg_number && d.reg_number.trim().toLowerCase() === String(regNumber).trim().toLowerCase()) {
              return true;
            }
            if (deviceCode && d.device_code && d.device_code.trim().toLowerCase() === String(deviceCode).trim().toLowerCase()) {
              return true;
            }
            if (name && d.name && d.name.trim().toLowerCase() === String(name).trim().toLowerCase()) {
              return true;
            }
            return false;
          });

          if (matchedDevice) {
            matchedCount++;
            // Parse ngày hết hạn
            const rawDate = item['Ngày hết hạn (DD/MM/YYYY)'] || item['Ngày hết hạn'] || item['Thời hạn'] || item['expiry'];
            let parsedExpiry: string | null = null;
            if (rawDate) {
              if (typeof rawDate === 'number') {
                // Excel serial date format
                const excelEpoch = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
                parsedExpiry = dayjs(excelEpoch).format('YYYY-MM-DD');
              } else {
                const d = dayjs(rawDate, ['DD/MM/YYYY', 'YYYY-MM-DD', 'D/M/YYYY', 'DD-MM-YYYY']);
                if (d.isValid()) parsedExpiry = d.format('YYYY-MM-DD');
              }
            }

            newParsedRows.push({
              key: `excel-${matchedDevice.device_id}-${index}-${Date.now()}`,
              deviceId: matchedDevice.device_id,
              deviceName: matchedDevice.name,
              regNumber: matchedDevice.reg_number,
              deviceCode: matchedDevice.device_code,
              type: item['Loại giấy tờ'] || item['Loại'] || 'Đăng kiểm',
              number: item['Số Giấy phép / Tem'] || item['Số giấy phép'] || item['Số tem'] || '',
              issuer: item['Đơn vị cấp'] || 'Trung tâm Đăng kiểm',
              expiry: parsedExpiry || dayjs().add(1, 'year').format('YYYY-MM-DD'),
              note: item['Ghi chú'] || '',
            });
          }
        });

        if (newParsedRows.length === 0) {
          notification.warning({
            message: 'Không tìm thấy thiết bị nào khớp trong hệ thống',
            title: 'Cảnh báo',
            description: 'Vui lòng kiểm tra lại cột "Biển số" hoặc "Mã thiết bị" trong file Excel.',
          });
          return;
        }

        setRows(newParsedRows);
        setActiveTab('grid');
        notification.success({
          message: 'Nhập file Excel thành công',
          title: 'Thành công',
          description: `Đã nạp ${matchedCount} thiết bị từ file Excel. Bạn có thể kiểm tra và bấm "Lưu cập nhật".`,
        });
      } catch (err: any) {
        notification.error({
          message: 'Lỗi đọc file Excel',
          title: 'Lỗi',
          description: err.message || 'File Excel không đúng định dạng.',
        });
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // Prevent default upload
  };

  // Lưu toàn bộ cập nhật vào database
  const handleSaveAll = async () => {
    if (rows.length === 0) {
      notification.warning({ message: 'Danh sách rỗng, không có gì để lưu', title: 'Thông báo' });
      return;
    }

    // Kiểm tra tính hợp lệ
    const invalidExpiry = rows.some((r) => !r.expiry);
    if (invalidExpiry) {
      notification.error({
        message: 'Dữ liệu chưa hoàn thiện',
        title: 'Lỗi',
        description: 'Vui lòng nhập Ngày hết hạn cho tất cả các thiết bị trong danh sách.',
      });
      return;
    }

    setSaving(true);
    setSaveProgress(0);
    const token = getToken();

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const targetDev = devices.find((d) => d.device_id === row.deviceId);
        const currentLicenses = Array.isArray(targetDev?.license_info) ? targetDev!.license_info : [];

        const newLicense = {
          type: row.type || 'Đăng kiểm',
          number: row.number || '',
          issuer: row.issuer || '',
          expiry: row.expiry,
          note: row.note || '',
          created_at: new Date().toISOString(),
        };

        const updatedLicenses = [...currentLicenses, newLicense];
        const isInspection = row.type.toLowerCase().includes('đăng kiểm') || row.type.toLowerCase().includes('kiểm định');
        const isInsurance = row.type.toLowerCase().includes('bảo hiểm');

        const payload: any = {
          license_info: updatedLicenses,
          ...(isInspection && row.expiry ? { inspection_expiry: row.expiry } : {}),
          ...(isInsurance && row.expiry ? { insurance_expiry: row.expiry } : {}),
        };

        await updateDevice(row.deviceId, token, payload);
        successCount++;
      } catch (e) {
        console.error(`Failed to update device ${row.deviceId}:`, e);
        failCount++;
      }

      setSaveProgress(Math.round(((i + 1) / rows.length) * 100));
    }

    setSaving(false);

    if (successCount > 0) {
      notification.success({
        message: 'Cập nhật hàng loạt hoàn tất',
        title: 'Thành công',
        description: `Đã cập nhật thành công hồ sơ pháp lý cho ${successCount} thiết bị.${
          failCount > 0 ? ` Thất bại: ${failCount} thiết bị.` : ''
        }`,
      });
      onSuccess();
      onClose();
    } else {
      notification.error({
        message: 'Cập nhật thất bại',
        title: 'Lỗi',
        description: 'Không thể cập nhật thiết bị nào. Vui lòng thử lại.',
      });
    }
  };

  // Cột cho bảng ma trận
  const gridColumns = [
    {
      title: '#',
      key: 'idx',
      width: 45,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Thiết bị & Biển số',
      key: 'device',
      width: 220,
      render: (_: any, r: IBatchLicenseRow) => (
        <div>
          <div style={{ fontWeight: 600, color: '#002766' }}>{r.deviceName}</div>
          <Space size={4} style={{ marginTop: 2 }}>
            {r.regNumber ? (
              <Tag color="blue" style={{ margin: 0, fontWeight: 600 }}>
                {r.regNumber}
              </Tag>
            ) : (
              <span style={{ fontSize: 11, color: '#999' }}>Không biển số</span>
            )}
            {r.deviceCode && <span style={{ fontSize: 11, color: '#888' }}>({r.deviceCode})</span>}
          </Space>
        </div>
      ),
    },
    {
      title: 'Loại giấy tờ',
      key: 'type',
      width: 160,
      render: (_: any, r: IBatchLicenseRow) => (
        <Select
          size="small"
          style={{ width: '100%' }}
          value={r.type}
          onChange={(val) => handleUpdateRow(r.key, 'type', val)}
        >
          {LICENSE_TYPE_OPTIONS.map((opt) => (
            <Option key={opt} value={opt}>
              {opt}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: (
        <span>
          Số Tem / Giấy phép <Tooltip title="Gõ trực tiếp số tem hoặc số giấy phép riêng cho từng xe"><InfoCircleOutlined /></Tooltip>
        </span>
      ),
      key: 'number',
      width: 170,
      render: (_: any, r: IBatchLicenseRow) => (
        <Input
          size="small"
          placeholder="VD: KD-2024-01..."
          value={r.number}
          onChange={(e) => handleUpdateRow(r.key, 'number', e.target.value)}
        />
      ),
    },
    {
      title: 'Đơn vị cấp',
      key: 'issuer',
      width: 180,
      render: (_: any, r: IBatchLicenseRow) => (
        <Input
          size="small"
          placeholder="Trung tâm đăng kiểm..."
          value={r.issuer}
          onChange={(e) => handleUpdateRow(r.key, 'issuer', e.target.value)}
        />
      ),
    },
    {
      title: (
        <span style={{ color: '#cf1322' }}>
          * Ngày hết hạn
        </span>
      ),
      key: 'expiry',
      width: 140,
      render: (_: any, r: IBatchLicenseRow) => (
        <DatePicker
          size="small"
          format="DD/MM/YYYY"
          style={{ width: '100%' }}
          value={r.expiry ? dayjs(r.expiry) : null}
          onChange={(d) => handleUpdateRow(r.key, 'expiry', d ? d.format('YYYY-MM-DD') : null)}
          allowClear={false}
        />
      ),
    },
    {
      title: 'Ghi chú',
      key: 'note',
      width: 160,
      render: (_: any, r: IBatchLicenseRow) => (
        <Input
          size="small"
          placeholder="Ghi chú đợt cấp..."
          value={r.note}
          onChange={(e) => handleUpdateRow(r.key, 'note', e.target.value)}
        />
      ),
    },
    {
      title: '',
      key: 'action',
      width: 50,
      align: 'center' as const,
      render: (_: any, r: IBatchLicenseRow) => (
        <Popconfirm title="Bỏ xe này ra khỏi đợt cập nhật?" onConfirm={() => handleRemoveRow(r.key)} okText="Bỏ" cancelText="Hủy">
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SafetyCertificateOutlined style={{ color: '#52c41a', fontSize: 20 }} />
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#002766' }}>
              Cập nhật Giấy phép & Đăng kiểm hàng loạt
            </span>
            <div style={{ fontSize: 12, fontWeight: 400, color: '#888' }}>
              Hỗ trợ nhập ma trận trực tiếp hoặc tải file Excel để gia hạn cho nhiều phương tiện
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={1200}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#595959' }}>
            Tổng số thiết bị trong đợt này:{' '}
            <strong style={{ color: '#1890ff', fontSize: 14 }}>{rows.length}</strong> thiết bị
          </div>
          <Space>
            <Button onClick={onClose} disabled={saving}>
              Đóng
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleSaveAll}
              loading={saving}
              disabled={rows.length === 0}
              style={{ background: '#52c41a', borderColor: '#52c41a', fontWeight: 600 }}
            >
              Lưu cập nhật ({rows.length} xe)
            </Button>
          </Space>
        </div>
      }
      destroyOnClose
    >
      {saving && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span>Đang cập nhật hồ sơ các thiết bị vào cơ sở dữ liệu...</span>
            <strong>{saveProgress}%</strong>
          </div>
          <Progress percent={saveProgress} status="active" strokeColor="#52c41a" />
        </div>
      )}

      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as any)}
        items={[
          {
            key: 'grid',
            label: (
              <span>
                <ThunderboltOutlined /> Ma trận nhập nhanh ({rows.length})
              </span>
            ),
            children: (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {/* 1. KHUNG THIẾT LẬP NHANH ÁP DỤNG HÀNG LOẠT */}
                <Card
                  size="small"
                  style={{
                    background: '#f0f5ff',
                    borderColor: '#adc6ff',
                    borderRadius: 8,
                  }}
                  title={
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1d39c4' }}>
                      ⚡ Thiết lập nhanh — Áp dụng hàng loạt cho danh sách bên dưới
                    </span>
                  }
                >
                  <Row gutter={[12, 12]} align="bottom">
                    <Col xs={24} sm={5}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#595959', marginBottom: 4 }}>
                        Loại giấy tờ áp dụng:
                      </div>
                      <Select
                        style={{ width: '100%' }}
                        value={bulkType}
                        onChange={setBulkType}
                      >
                        {LICENSE_TYPE_OPTIONS.map((opt) => (
                          <Option key={opt} value={opt}>
                            {opt}
                          </Option>
                        ))}
                      </Select>
                    </Col>
                    <Col xs={24} sm={5}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#595959', marginBottom: 4 }}>
                        Đơn vị cấp:
                      </div>
                      <Input
                        placeholder="VD: Trung tâm Đăng kiểm..."
                        value={bulkIssuer}
                        onChange={(e) => setBulkIssuer(e.target.value)}
                      />
                    </Col>
                    <Col xs={24} sm={5}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#595959', marginBottom: 4 }}>
                        Ngày hết hạn mới:
                      </div>
                      <DatePicker
                        format="DD/MM/YYYY"
                        style={{ width: '100%' }}
                        value={bulkExpiry}
                        onChange={setBulkExpiry}
                        allowClear={false}
                      />
                    </Col>
                    <Col xs={24} sm={5}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#595959', marginBottom: 4 }}>
                        Ghi chú chung:
                      </div>
                      <Input
                        placeholder="Ghi chú đợt cấp..."
                        value={bulkNote}
                        onChange={(e) => setBulkNote(e.target.value)}
                      />
                    </Col>
                    <Col xs={24} sm={4}>
                      <Button
                        type="primary"
                        icon={<ThunderboltOutlined />}
                        block
                        onClick={handleApplyAll}
                        style={{ background: '#1d39c4', borderColor: '#1d39c4', fontWeight: 600 }}
                      >
                        Áp dụng
                      </Button>
                    </Col>
                  </Row>
                </Card>

                {/* 2. TOOLBAR QUẢN LÝ XE TRONG ĐỢT */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <Space>
                    <span style={{ fontWeight: 600, color: '#262626' }}>Thêm xe vào đợt:</span>
                    <Select
                      showSearch
                      placeholder="Chọn thêm thiết bị/biển số..."
                      style={{ width: 260 }}
                      value={deviceToAdd}
                      onChange={setDeviceToAdd}
                      filterOption={(input, option) =>
                        String(option?.children || '')
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                    >
                      {devices.map((d) => (
                        <Option key={d.device_id} value={d.device_id}>
                          {d.name} {d.reg_number ? `(${d.reg_number})` : ''}
                        </Option>
                      ))}
                    </Select>
                    <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddDevice} disabled={!deviceToAdd}>
                      Thêm vào bảng
                    </Button>
                  </Space>

                  <Space>
                    <Button
                      size="small"
                      onClick={() => {
                        const allRows: IBatchLicenseRow[] = devices.map((d) => ({
                          key: `dev-${d.device_id}-${Date.now()}`,
                          deviceId: d.device_id,
                          deviceName: d.name,
                          regNumber: d.reg_number,
                          deviceCode: d.device_code,
                          type: bulkType,
                          number: '',
                          issuer: bulkIssuer || 'Trung tâm Đăng kiểm',
                          expiry: bulkExpiry ? bulkExpiry.format('YYYY-MM-DD') : dayjs().add(1, 'year').format('YYYY-MM-DD'),
                          note: '',
                        }));
                        setRows(allRows);
                      }}
                    >
                      Chọn toàn bộ {devices.length} xe
                    </Button>
                    <Button size="small" danger onClick={() => setRows([])} disabled={rows.length === 0}>
                      Xóa trắng bảng
                    </Button>
                  </Space>
                </div>

                {/* 3. BẢNG MA TRẬN NHẬP LIỆU */}
                <Table
                  columns={gridColumns}
                  dataSource={rows}
                  rowKey="key"
                  size="small"
                  pagination={{ pageSize: 8, showSizeChanger: true, pageSizeOptions: ['8', '15', '30', '50'] }}
                  bordered
                  locale={{
                    emptyText: (
                      <Empty
                        description="Chưa có thiết bị nào trong danh sách đợt cập nhật này"
                        children={
                          <Button type="primary" size="small" onClick={() => setActiveTab('excel')}>
                            Nhập danh sách từ Excel
                          </Button>
                        }
                      />
                    ),
                  }}
                  scroll={{ x: 'max-content' }}
                />
              </Space>
            ),
          },
          {
            key: 'excel',
            label: (
              <span>
                <FileExcelOutlined style={{ color: '#52c41a' }} /> Nhập từ file Excel
              </span>
            ),
            children: (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {/* 1. Hướng dẫn & Tải file mẫu */}
                <Card
                  size="small"
                  style={{ borderRadius: 8, background: '#fafafa', borderColor: '#d9d9d9' }}
                  title="Bước 1: Tải file mẫu & điền danh sách"
                  extra={
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadTemplate}
                      style={{ background: '#52c41a', borderColor: '#52c41a' }}
                    >
                      Tải file Excel mẫu (.xlsx)
                    </Button>
                  }
                >
                  <div style={{ fontSize: 13, color: '#595959', lineHeight: 1.6 }}>
                    <div>
                      • Hệ thống đã điền sẵn danh sách các phương tiện hiện có kèm mã và biển số xe để bạn dễ dàng nhập liệu.
                    </div>
                    <div>
                      • Các cột trong file Excel: <strong>Mã thiết bị</strong>, <strong>Biển số</strong>,{' '}
                      <strong>Tên thiết bị</strong>, <strong>Loại giấy tờ</strong>,{' '}
                      <strong>Số Giấy phép / Tem</strong>, <strong>Đơn vị cấp</strong>,{' '}
                      <strong>Ngày hết hạn (DD/MM/YYYY)</strong>.
                    </div>
                  </div>
                </Card>

                {/* 2. Upload file */}
                <Card size="small" style={{ borderRadius: 8 }} title="Bước 2: Tải lên file Excel đã điền">
                  <Dragger
                    accept=".xlsx,.xls"
                    showUploadList={false}
                    beforeUpload={handleExcelUpload}
                    style={{ padding: '24px 0' }}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined style={{ color: '#52c41a', fontSize: 48 }} />
                    </p>
                    <p className="ant-upload-text" style={{ fontSize: 15, fontWeight: 600 }}>
                      Nhấp hoặc kéo thả file Excel vào khu vực này để nạp dữ liệu
                    </p>
                    <p className="ant-upload-hint" style={{ color: '#888' }}>
                      Hỗ trợ định dạng .xlsx, .xls. Dữ liệu sau khi nạp sẽ được chuyển sang tab "Ma trận nhập nhanh" để bạn kiểm tra trước khi lưu.
                    </p>
                  </Dragger>
                </Card>
              </Space>
            ),
          },
        ]}
      />
    </Modal>
  );
};

export default BatchLicenseModal;
