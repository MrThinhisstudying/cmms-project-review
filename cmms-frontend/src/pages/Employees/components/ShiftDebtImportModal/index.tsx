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
import { IUser } from '../../../../types/user.types';
import {
  exportShiftDebtTemplate,
  parseShiftDebtExcel,
  ParsedShiftDebtRow,
} from '../../../../utils/excelHelper';
import { createBulkShiftDebts } from '../../../../apis/shiftDebts';
import { getBackendImageUrl } from '../../../../utils/imageUrl';

const { Dragger } = Upload;
const { Text } = Typography;

interface ShiftDebtImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  users: IUser[];
  year: number;
  month: number;
}

const ShiftDebtImportModal: React.FC<ShiftDebtImportModalProps> = ({
  open,
  onClose,
  onSuccess,
  users,
  year,
  month,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedShiftDebtRow[]>([]);
  const [filterView, setFilterView] = useState<'ALL' | 'VALID' | 'ERROR'>('ALL');
  const [importResult, setImportResult] = useState<{ created: number; updated: number; failed: number; errors: string[] } | null>(null);

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

  const handleDownloadTemplate = async () => {
    try {
      await exportShiftDebtTemplate(users, year, month);
      message.success(`Đã tải xuống file mẫu nợ/trả ca Tháng ${month}/${year}!`);
    } catch {
      message.error('Lỗi khi tải file mẫu');
    }
  };

  const handleFileProcess = async (file: File) => {
    setLoading(true);
    try {
      const rows = await parseShiftDebtExcel(file, users, year, month);
      if (rows.length === 0) {
        message.warning('File Excel không có dữ liệu nợ/trả ca nào!');
        return false;
      }
      setParsedRows(rows);
      setCurrentStep(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi đọc file Excel';
      message.error(msg);
    } finally {
      setLoading(false);
    }
    return false;
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid && r.user_id);
    if (validRows.length === 0) {
      message.error('Không có dòng dữ liệu nào hợp lệ để nhập!');
      return;
    }

    setLoading(true);
    try {
      const dtos = validRows.map((r) => ({
        user_id: r.user_id!,
        employee_code: r.employee_code,
        year: r.year,
        month: r.month,
        opening_debt: r.opening_debt,
        taken_days: r.taken_days,
        accrued_days: r.accrued_days,
        closing_debt: r.closing_debt,
        reason: r.reason,
      }));

      const result = await createBulkShiftDebts(dtos);
      setImportResult(result);
      setCurrentStep(2);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi trong quá trình nhập nợ ca';
      message.error(msg);
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
      render: (val: number) => <Text type="secondary">#{val}</Text>,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 110,
      render: (_: unknown, r: ParsedShiftDebtRow) =>
        r.isValid ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Hợp lệ
          </Tag>
        ) : (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            Lỗi
          </Tag>
        ),
    },
    {
      title: 'Họ tên & MSNV',
      key: 'employee',
      width: 220,
      render: (_: unknown, r: ParsedShiftDebtRow) => (
        <Space orientation="horizontal" size={8}>
          <Avatar
            size="small"
            src={getBackendImageUrl(r.avatar)}
            icon={<UserOutlined />}
            style={{ backgroundColor: '#1890ff' }}
          />
          <div>
            <div style={{ fontWeight: 600, color: r.user_id ? '#262626' : '#ff4d4f' }}>
              {r.userName}
            </div>
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>
              MSNV: {r.employee_code || 'Chưa xác định'}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Nợ ca tồn trước',
      dataIndex: 'opening_debt',
      key: 'opening',
      width: 130,
      align: 'center' as const,
      render: (v: number) => <span>{v} ngày</span>,
    },
    {
      title: 'Nghỉ bù trong tháng',
      dataIndex: 'taken_days',
      key: 'taken',
      width: 140,
      align: 'center' as const,
      render: (v: number) => (
        <span style={{ color: v > 0 ? '#52c41a' : '#888' }}>
          {v > 0 ? `-${v} ngày` : '0'}
        </span>
      ),
    },
    {
      title: 'Phát sinh nợ ca',
      dataIndex: 'accrued_days',
      key: 'accrued',
      width: 130,
      align: 'center' as const,
      render: (v: number) => (
        <span style={{ color: v > 0 ? '#fa8c16' : '#888' }}>
          {v > 0 ? `+${v} ngày` : '0'}
        </span>
      ),
    },
    {
      title: 'Tồn hết tháng',
      dataIndex: 'closing_debt',
      key: 'closing',
      width: 130,
      align: 'center' as const,
      render: (v: number) => (
        <Tag color="blue" style={{ fontSize: 13, fontWeight: 700 }}>
          {v} ngày
        </Tag>
      ),
    },
    {
      title: 'Lý do nợ ca trong tháng',
      dataIndex: 'reason',
      key: 'reason',
      render: (val: string) => val || <Text type="secondary">-</Text>,
    },
    {
      title: 'Chi tiết lỗi',
      dataIndex: 'error',
      key: 'error',
      render: (err: string) =>
        err ? (
          <Text type="danger" style={{ fontSize: 12 }}>
            {err}
          </Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            -
          </Text>
        ),
    },
  ];

  return (
    <Modal
      title={
        <Space orientation="horizontal" size={8}>
          <FileExcelOutlined style={{ color: '#52c41a', fontSize: 20 }} />
          <span>Nhập Bảng theo dõi Nợ/Trả ca từ file Excel (Tháng {month}/{year})</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={1100}
      footer={null}
      destroyOnClose
    >
      <Steps
        current={currentStep}
        style={{ marginBottom: 24, marginTop: 8 }}
        items={[
          { title: 'Tải file lên' },
          { title: 'Kiểm tra & Xác nhận' },
          { title: 'Hoàn tất' },
        ]}
      />

      {/* BƯỚC 1: UPLOAD */}
      {currentStep === 0 && (
        <div>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={`Biểu mẫu Bảng theo dõi Nợ/Trả ca Tháng ${month}/${year}`}
            description={
              <div>
                <div>• Công thức tính chuẩn: <b>Tồn hết tháng = (Tồn tháng trước) - (Nghỉ bù trong tháng) + (Nợ phát sinh)</b>.</div>
                <div>• Hỗ trợ nhập số ngày thập phân (0.5 ngày = 1 buổi, 1.5 ngày, 2.5 ngày...).</div>
                <div>• Cột ghi chú lưu các lý do trực tăng cường: <i>Trực lễ 30/4, thay băng tải máy soi, xua đuổi chim, xe khách sân đỗ...</i></div>
              </div>
            }
          />

          <Card
            style={{
              marginBottom: 20,
              background: '#f6ffed',
              borderColor: '#b7eb8f',
              borderRadius: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <strong style={{ fontSize: 15, color: '#389e0d' }}>
                  Chưa có file mẫu Excel nợ/trả ca Tháng {month}/{year}?
                </strong>
                <div style={{ color: '#555', fontSize: 13, marginTop: 2 }}>
                  Tải file mẫu chuẩn khớp 100% với form theo dõi nợ ca của Đội Kỹ thuật Côn Đảo.
                </div>
              </div>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                onClick={handleDownloadTemplate}
              >
                Tải file mẫu Excel (.xlsx)
              </Button>
            </div>
          </Card>

          <Dragger
            accept=".xlsx, .xls"
            showUploadList={false}
            beforeUpload={handleFileProcess}
            disabled={loading}
            style={{ padding: '24px 0', borderRadius: 8 }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: '#1890ff', fontSize: 48 }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 16, fontWeight: 500 }}>
              Kéo thả file Bảng theo dõi nợ/trả ca vào đây hoặc nhấp để chọn file
            </p>
            <p className="ant-upload-hint" style={{ color: '#8c8c8c' }}>
              Hỗ trợ định dạng .xlsx, .xls theo form BẢNG THEO DÕI NỢ/TRẢ CA THÁNG.
            </p>
          </Dragger>
        </div>
      )}

      {/* BƯỚC 2: XEM TRƯỚC */}
      {currentStep === 1 && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <Space wrap>
              <Radio.Group
                value={filterView}
                onChange={(e) => setFilterView(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="ALL">
                  Tất cả <Badge count={parsedRows.length} overflowCount={999} style={{ backgroundColor: '#1890ff', marginLeft: 4 }} />
                </Radio.Button>
                <Radio.Button value="VALID">
                  Hợp lệ <Badge count={validCount} overflowCount={999} style={{ backgroundColor: '#52c41a', marginLeft: 4 }} />
                </Radio.Button>
                <Radio.Button value="ERROR">
                  Có lỗi <Badge count={invalidCount} overflowCount={999} style={{ backgroundColor: '#ff4d4f', marginLeft: 4 }} />
                </Radio.Button>
              </Radio.Group>
            </Space>

            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(0)}>
                Chọn lại file
              </Button>
              <Button
                type="primary"
                onClick={handleConfirmImport}
                loading={loading}
                disabled={validCount === 0}
              >
                Xác nhận nhập ({validCount} dòng hợp lệ)
              </Button>
            </Space>
          </div>

          {invalidCount > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message={`Phát hiện ${invalidCount} dòng có dữ liệu chưa hợp lệ.`}
              description="Các dòng hợp lệ vẫn sẽ được nhập bình thường. Vui lòng kiểm tra mã số nhân viên ở cột Chi tiết lỗi."
            />
          )}

          <Table
            columns={columns}
            dataSource={displayedRows}
            rowKey="rawRow"
            pagination={{ pageSize: 8, showTotal: (total) => `Tổng cộng ${total} dòng` }}
            size="small"
            scroll={{ x: 1100 }}
            bordered
          />
        </div>
      )}

      {/* BƯỚC 3: KẾT QUẢ */}
      {currentStep === 2 && importResult && (
        <Result
          status={importResult.failed === 0 ? 'success' : 'warning'}
          title={
            importResult.failed === 0
              ? 'Cập nhật bảng nợ/trả ca thành công!'
              : 'Đã hoàn tất cập nhật nợ/trả ca (có một số cảnh báo)'
          }
          subTitle={
            <div style={{ fontSize: 15, marginTop: 8 }}>
              <div>• Thêm mới thành công: <strong style={{ color: '#52c41a' }}>{importResult.created}</strong> bản ghi</div>
              <div>• Cập nhật bản ghi cũ: <strong style={{ color: '#1890ff' }}>{importResult.updated}</strong> bản ghi</div>
              {importResult.failed > 0 && (
                <div style={{ marginTop: 4, color: '#ff4d4f' }}>• Thất bại: {importResult.failed} dòng</div>
              )}
            </div>
          }
          extra={[
            <Button type="primary" key="view" onClick={handleClose}>
              Xem bảng theo dõi nợ/trả ca
            </Button>,
            <Button key="again" onClick={handleReset}>
              Tiếp tục nhập file khác
            </Button>,
          ]}
        />
      )}
    </Modal>
  );
};

export default ShiftDebtImportModal;
