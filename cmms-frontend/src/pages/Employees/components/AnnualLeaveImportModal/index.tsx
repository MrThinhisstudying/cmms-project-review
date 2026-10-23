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
  exportAnnualLeaveTemplate,
  parseAnnualLeaveExcel,
  ParsedAnnualLeaveRow,
} from '../../../../utils/excelHelper';
import { importAnnualLeaves } from '../../../../apis/annualLeaves';
import { getBackendImageUrl } from '../../../../utils/imageUrl';

const { Dragger } = Upload;
const { Text } = Typography;

interface AnnualLeaveImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  users: IUser[];
  year: number;
}

const AnnualLeaveImportModal: React.FC<AnnualLeaveImportModalProps> = ({
  open,
  onClose,
  onSuccess,
  users,
  year,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedAnnualLeaveRow[]>([]);
  const [filterView, setFilterView] = useState<'ALL' | 'VALID' | 'ERROR'>('ALL');
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);

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
      await exportAnnualLeaveTemplate(users, year);
      message.success(`Đã tải xuống file mẫu phép năm ${year}!`);
    } catch {
      message.error('Lỗi khi tải file mẫu');
    }
  };

  const handleFileProcess = async (file: File) => {
    setLoading(true);
    try {
      const rows = await parseAnnualLeaveExcel(file, users, year);
      if (rows.length === 0) {
        message.warning('File Excel không có dữ liệu phép năm nào!');
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
        leave_balance_n2: r.leave_balance_n2,
        leave_balance_n1: r.leave_balance_n1,
        current_year_leave: r.current_year_leave,
        m1_taken: r.m1_taken,
        m2_taken: r.m2_taken,
        m3_taken: r.m3_taken,
        m4_taken: r.m4_taken,
        m5_taken: r.m5_taken,
        m6_taken: r.m6_taken,
        m7_taken: r.m7_taken,
        m8_taken: r.m8_taken,
        m9_taken: r.m9_taken,
        m10_taken: r.m10_taken,
        m11_taken: r.m11_taken,
        m12_taken: r.m12_taken,
      }));

      const result = await importAnnualLeaves(dtos);
      setImportResult(result);
      setCurrentStep(2);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi trong quá trình nhập phép năm';
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
      render: (_: unknown, r: ParsedAnnualLeaveRow) =>
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
      title: 'Nhân viên',
      key: 'employee',
      width: 200,
      render: (_: unknown, r: ParsedAnnualLeaveRow) => (
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
      title: `Tồn ${year - 2}`,
      dataIndex: 'leave_balance_n2',
      key: 'n2',
      width: 90,
      align: 'center' as const,
      render: (v: number) => <span>+{v}</span>,
    },
    {
      title: `Phép ${year - 1}`,
      dataIndex: 'leave_balance_n1',
      key: 'n1',
      width: 90,
      align: 'center' as const,
      render: (v: number) => <span>+{v}</span>,
    },
    {
      title: `Phép ${year}`,
      dataIndex: 'current_year_leave',
      key: 'cur',
      width: 95,
      align: 'center' as const,
      render: (v: number) => <strong style={{ color: '#003a8c' }}>{v} ngày</strong>,
    },
    {
      title: 'Tổng quỹ phép',
      dataIndex: 'total_entitlement',
      key: 'total',
      width: 110,
      align: 'center' as const,
      render: (v: number) => <Tag color="blue">{v} ngày</Tag>,
    },
    {
      title: 'Đã nghỉ (T1-T12)',
      dataIndex: 'total_taken',
      key: 'taken',
      width: 110,
      align: 'center' as const,
      render: (v: number) => <Tag color={v > 0 ? 'orange' : 'default'}>{v} ngày</Tag>,
    },
    {
      title: 'Còn tồn',
      dataIndex: 'remaining',
      key: 'rem',
      width: 100,
      align: 'center' as const,
      render: (v: number) => <Tag color="green"><strong>{v} ngày</strong></Tag>,
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
          <span>Nhập dữ liệu Phép năm CBCNV từ file Excel ({year})</span>
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
            message="Biểu mẫu thống kê ngày nghỉ của CBCNV - Cảng hàng không Côn Đảo"
            description={
              <div>
                <div>• Hỗ trợ nhập số dư phép 3 năm liên tiếp: <b>Tồn phép {year - 2}</b>, <b>Phép {year - 1}</b>, và <b>Phép {year}</b>.</div>
                <div>• Nhập số ngày nghỉ thực tế lũy tiến theo từng tháng (Tháng 1 đến Tháng 12).</div>
                <div>• Hệ thống tự động đối soát Mã nhân viên (hỗ trợ cả trường hợp mất số 0 ở đầu) và tính toán lại quỹ phép còn tồn.</div>
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
                  Chưa có file mẫu Excel phép năm?
                </strong>
                <div style={{ color: '#555', fontSize: 13, marginTop: 2 }}>
                  Tải file mẫu chuẩn có sẵn cấu trúc các cột và danh sách nhân viên để điền nhanh.
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
              Kéo thả file Excel thống kê ngày nghỉ vào đây hoặc nhấp để chọn file
            </p>
            <p className="ant-upload-hint" style={{ color: '#8c8c8c' }}>
              Hỗ trợ định dạng .xlsx, .xls theo mẫu Thống kê ngày nghỉ của Cảng hàng không Côn Đảo.
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
                Xác nhận nhập ({validCount} nhân viên)
              </Button>
            </Space>
          </div>

          {invalidCount > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message={`Phát hiện ${invalidCount} dòng có dữ liệu chưa hợp lệ.`}
              description="Các dòng hợp lệ vẫn sẽ được cập nhật bình thường. Vui lòng kiểm tra mã nhân viên ở cột Chi tiết lỗi."
            />
          )}

          <Table
            columns={columns}
            dataSource={displayedRows}
            rowKey="rawRow"
            pagination={{ pageSize: 8, showTotal: (total) => `Tổng cộng ${total} nhân viên` }}
            size="small"
            scroll={{ x: 1000 }}
            bordered
          />
        </div>
      )}

      {/* BƯỚC 3: KẾT QUẢ */}
      {currentStep === 2 && importResult && (
        <Result
          status={importResult.errors.length === 0 ? 'success' : 'warning'}
          title={
            importResult.errors.length === 0
              ? 'Cập nhật dữ liệu phép năm thành công!'
              : 'Đã hoàn tất cập nhật phép năm (có cảnh báo)'
          }
          subTitle={
            <div style={{ fontSize: 15, marginTop: 8 }}>
              <div>• Cập nhật thành công: <strong style={{ color: '#52c41a' }}>{importResult.success}</strong> nhân viên</div>
              {importResult.errors.length > 0 && (
                <div style={{ marginTop: 6, color: '#ff4d4f' }}>
                  • Có {importResult.errors.length} cảnh báo: {importResult.errors.join('; ')}
                </div>
              )}
            </div>
          }
          extra={[
            <Button type="primary" key="view" onClick={handleClose}>
              Xem danh sách phép năm
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

export default AnnualLeaveImportModal;
