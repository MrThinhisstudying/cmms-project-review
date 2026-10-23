import React, { useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  Steps,
  Result,
  Table,
  Typography,
  Card,
  Tag,
  Space,
  message,
  Alert,
  Avatar,
  Badge,
  Radio,
} from 'antd';
import {
  InboxOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { IUser } from '../../../../types/user.types';
import {
  exportContractTemplate,
  parseContractExcel,
  ParsedContractRow,
} from '../../../../utils/excelHelper';
import { createBulkLaborContracts } from '../../../../apis/laborContracts';
import { getBackendImageUrl } from '../../../../utils/imageUrl';

const { Dragger } = Upload;
const { Text } = Typography;

interface ContractImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  users: IUser[];
}

const CONTRACT_TYPE_COLORS: Record<string, string> = {
  '1_MONTH': 'orange',
  'APPRENTICESHIP': 'orange',
  'PROBATION': 'purple',
  '12_MONTHS': 'blue',
  '24_MONTHS': 'cyan',
  '36_MONTHS': 'geekblue',
  'INDEFINITE': 'green',
};

const ContractImportModal: React.FC<ContractImportModalProps> = ({
  open,
  onClose,
  onSuccess,
  users,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedContractRow[]>([]);
  const [filterView, setFilterView] = useState<'ALL' | 'VALID' | 'ERROR'>('ALL');
  const [importResult, setImportResult] = useState<{ created: number; updated: number; failed: number } | null>(null);

  const handleReset = () => {
    setCurrentStep(0);
    setParsedRows([]);
    setFilterView('ALL');
    setImportResult(null);
    setLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // 1. Tải file mẫu
  const handleDownloadTemplate = async () => {
    try {
      await exportContractTemplate(users);
      message.success('Đã tải xuống file mẫu hợp đồng lao động!');
    } catch {
      message.error('Lỗi khi tải file mẫu');
    }
  };

  // 2. Xử lý đọc file
  const handleFileProcess = async (file: File) => {
    setLoading(true);
    try {
      const rows = await parseContractExcel(file, users);
      if (rows.length === 0) {
        message.warning('File Excel không có dữ liệu hợp đồng nào!');
        return false;
      }
      setParsedRows(rows);
      setCurrentStep(1);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Lỗi khi đọc file Excel');
    } finally {
      setLoading(false);
    }
    return false; // Chặn upload mặc định của AntD
  };

  // 3. Thực hiện nhập dữ liệu
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid && r.user_id);
    if (validRows.length === 0) {
      message.error('Không có dòng hợp đồng nào hợp lệ để nhập!');
      return;
    }

    setLoading(true);
    try {
      const dtos = validRows.map((r) => ({
        user_id: r.user_id!,
        contract_number: r.contract_number,
        contract_type: r.contract_type,
        start_date: r.start_date,
        end_date: r.end_date,
        status: r.status,
        job_title: r.job_title,
      }));

      const result = await createBulkLaborContracts(dtos);
      setImportResult(result);
      setCurrentStep(2);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Lỗi trong quá trình nhập hợp đồng');
    } finally {
      setLoading(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  const displayedRows = parsedRows.filter((r) => {
    if (filterView === 'VALID') return r.isValid;
    if (filterView === 'ERROR') return !r.isValid;
    return true;
  });

  const columns = [
    {
      title: 'Dòng',
      dataIndex: 'rawRow',
      key: 'rawRow',
      width: 60,
      align: 'center' as const,
      render: (val: number) => <span style={{ color: '#8c8c8c' }}>{val}</span>,
    },
    {
      title: 'Nhân viên',
      key: 'employee',
      width: 190,
      render: (_: any, r: ParsedContractRow) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar
            size={28}
            src={r.avatar ? getBackendImageUrl(r.avatar) : undefined}
            icon={<UserOutlined />}
            style={{ backgroundColor: '#1890ff', flexShrink: 0 }}
          />
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontWeight: 600, fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {r.userName}
            </div>
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>
              {r.employee_code || '-'}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Số HĐ',
      dataIndex: 'contract_number',
      key: 'contract_number',
      width: 140,
      render: (val: string) => <span style={{ fontWeight: 600, color: '#1890ff' }}>{val}</span>,
    },
    {
      title: 'Loại HĐ',
      dataIndex: 'contractTypeLabel',
      key: 'contractTypeLabel',
      width: 110,
      render: (label: string, r: ParsedContractRow) => (
        <Tag color={CONTRACT_TYPE_COLORS[r.contract_type] || 'default'} style={{ margin: 0, borderRadius: 4 }}>
          {label}
        </Tag>
      ),
    },
    {
      title: 'Chức danh',
      dataIndex: 'job_title',
      key: 'job_title',
      width: 140,
      render: (val: string) => val || '-',
    },
    {
      title: 'Thời hạn HĐ',
      key: 'period',
      width: 180,
      render: (_: any, r: ParsedContractRow) => (
        <div style={{ fontSize: 12 }}>
          <span>{r.start_date ? dayjs(r.start_date).format('DD/MM/YYYY') : '-'}</span>
          <span style={{ margin: '0 4px', color: '#8c8c8c' }}>➔</span>
          <span style={{ color: r.end_date ? 'inherit' : '#52c41a', fontWeight: r.end_date ? 400 : 500 }}>
            {r.end_date ? dayjs(r.end_date).format('DD/MM/YYYY') : 'Vô thời hạn'}
          </span>
        </div>
      ),
    },
    {
      title: 'Kiểm tra',
      key: 'status',
      width: 170,
      render: (_: any, r: ParsedContractRow) =>
        r.isValid ? (
          <Tag icon={<CheckCircleOutlined />} color="success" style={{ margin: 0, borderRadius: 4 }}>
            Hợp lệ
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error" style={{ margin: 0, borderRadius: 4 }}>
            {r.error}
          </Tag>
        ),
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileExcelOutlined style={{ color: '#52c41a', fontSize: 20 }} />
          <span>Nhập hợp đồng lao động từ file Excel</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      width={980}
      footer={null}
      destroyOnClose
      style={{ top: 24 }}
    >
      <Steps
        current={currentStep}
        items={[
          { title: 'Tải file' },
          { title: 'Kiểm tra dữ liệu' },
          { title: 'Kết quả' },
        ]}
        style={{ marginBottom: 20, marginTop: 10 }}
      />

      {/* STEP 0: TẢI FILE */}
      {currentStep === 0 && (
        <div>
          <Card
            size="small"
            style={{
              marginBottom: 16,
              background: '#f6ffed',
              borderColor: '#b7eb8f',
              borderRadius: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <Text strong style={{ color: '#389e0d' }}>Bước 1: Chuẩn bị file dữ liệu</Text>
                <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
                  Tải file mẫu Excel chuẩn có sẵn danh sách mã nhân viên để điền thông tin hợp đồng dễ dàng.
                </div>
              </div>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
                style={{ borderColor: '#52c41a', color: '#52c41a' }}
              >
                Tải file mẫu (.xlsx)
              </Button>
            </div>
          </Card>

          <Dragger
            name="file"
            multiple={false}
            accept=".xlsx, .xls"
            beforeUpload={handleFileProcess}
            showUploadList={false}
            style={{ padding: '28px 16px', background: '#fafafa', borderRadius: 10 }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: '#1890ff', fontSize: 44 }} />
            </p>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#262626', marginBottom: 4 }}>
              Kéo thả file Excel vào đây hoặc bấm để chọn file
            </p>
            <p style={{ fontSize: 12, color: '#8c8c8c', margin: 0 }}>
              Hỗ trợ định dạng .xlsx, .xls. Hệ thống tự động so khớp Mã nhân viên hoặc Họ tên.
            </p>
          </Dragger>

          <Alert
            message="Lưu ý khi nhập hợp đồng:"
            description={
              <ul style={{ paddingLeft: 18, margin: '4px 0 0', fontSize: 12, lineHeight: 1.6 }}>
                <li>Cột bắt buộc: <strong>Mã nhân viên</strong>, <strong>Số hợp đồng</strong>, <strong>Loại hợp đồng</strong>, <strong>Ngày bắt đầu</strong>.</li>
                <li>Loại hợp đồng hỗ trợ: <em>Thử việc, Học việc, 12 Tháng, 24 Tháng, 36 Tháng, Vô thời hạn</em>.</li>
                <li>Nếu số hợp đồng đã có trong hệ thống, dữ liệu mới sẽ tự động cập nhật đè lên để tránh trùng lặp.</li>
              </ul>
            }
            type="info"
            showIcon
            style={{ marginTop: 16, borderRadius: 8 }}
          />
        </div>
      )}

      {/* STEP 1: XÁC NHẬN & KIỂM TRA DỮ LIỆU */}
      {currentStep === 1 && (
        <div>
          {/* Summary stats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <Space size={10} wrap>
              <Radio.Group value={filterView} onChange={(e) => setFilterView(e.target.value)} size="small" buttonStyle="solid">
                <Radio.Button value="ALL">
                  Tất cả ({parsedRows.length})
                </Radio.Button>
                <Radio.Button value="VALID">
                  <Badge status="success" text={`Hợp lệ (${validCount})`} />
                </Radio.Button>
                <Radio.Button value="ERROR" disabled={invalidCount === 0}>
                  <Badge status="error" text={`Có lỗi (${invalidCount})`} />
                </Radio.Button>
              </Radio.Group>
            </Space>

            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(0)} disabled={loading}>
                Chọn file khác
              </Button>
              <Button
                type="primary"
                onClick={handleConfirmImport}
                loading={loading}
                disabled={validCount === 0}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                Xác nhận nhập ({validCount} hợp đồng)
              </Button>
            </Space>
          </div>

          {invalidCount > 0 && (
            <Alert
              message={`Phát hiện ${invalidCount} dòng có dữ liệu chưa hợp lệ. Các dòng này sẽ tự động bị bỏ qua khi bạn bấm "Xác nhận nhập".`}
              type="warning"
              showIcon
              style={{ marginBottom: 12, borderRadius: 6 }}
            />
          )}

          <Table
            dataSource={displayedRows}
            columns={columns}
            rowKey="rawRow"
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 800 }}
            bordered
          />
        </div>
      )}

      {/* STEP 2: KẾT QUẢ NHẬP */}
      {currentStep === 2 && importResult && (
        <Result
          status="success"
          title="Nhập hợp đồng lao động thành công!"
          subTitle={
            <div style={{ fontSize: 14 }}>
              <div>Đã tạo mới: <strong style={{ color: '#52c41a' }}>{importResult.created}</strong> hợp đồng</div>
              <div>Đã cập nhật: <strong style={{ color: '#1890ff' }}>{importResult.updated}</strong> hợp đồng</div>
              {importResult.failed > 0 && (
                <div>Thất bại: <strong style={{ color: '#ff4d4f' }}>{importResult.failed}</strong> hợp đồng</div>
              )}
            </div>
          }
          extra={[
            <Button type="primary" key="done" onClick={handleClose}>
              Hoàn tất & Đóng
            </Button>,
          ]}
        />
      )}
    </Modal>
  );
};

export default ContractImportModal;
