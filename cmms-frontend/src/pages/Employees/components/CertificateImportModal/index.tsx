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
import { ITrainingProgram } from '../../../../types/certificates.types';
import {
  exportCertificateTemplate,
  parseCertificateExcel,
  ParsedCertificateRow,
} from '../../../../utils/excelHelper';
import certificatesApi from '../../../../apis/certificates';
import { getBackendImageUrl } from '../../../../utils/imageUrl';

const { Dragger } = Upload;
const { Text } = Typography;

interface CertificateImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  users: IUser[];
  programs: ITrainingProgram[];
}

const CATEGORY_COLORS: Record<string, string> = {
  CCCM: 'blue',
  BANG_CAP: 'purple',
  GPLX: 'green',
};

const CertificateImportModal: React.FC<CertificateImportModalProps> = ({
  open,
  onClose,
  onSuccess,
  users,
  programs,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedCertificateRow[]>([]);
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
      await exportCertificateTemplate(users, programs);
      message.success('Đã tải xuống file mẫu chứng chỉ & bằng cấp!');
    } catch {
      message.error('Lỗi khi tải file mẫu');
    }
  };

  // 2. Xử lý đọc file
  const handleFileProcess = async (file: File) => {
    setLoading(true);
    try {
      const rows = await parseCertificateExcel(file, users, programs);
      if (rows.length === 0) {
        message.warning('File Excel không có dữ liệu chứng chỉ/bằng cấp nào!');
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
    return false; // Chặn upload mặc định của AntD
  };

  // 3. Thực hiện nhập dữ liệu
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
        type: r.type,
        qualification_type: r.qualification_type,
        program_id: r.program_id,
        degree_type: r.degree_type,
        major: r.major,
        license_class: r.license_class,
        certificate_number: r.certificate_number,
        school_name: r.issuing_authority,
        issuing_place: r.issuing_authority,
        issue_date: r.issue_date,
        expiry_date: r.expiry_date,
        next_training_date: r.expiry_date,
        is_permanent: r.is_permanent,
        grading: r.grading,
      }));

      const result = await certificatesApi.createBulkCertificates(dtos);
      setImportResult(result);
      setCurrentStep(2);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi trong quá trình nhập chứng chỉ';
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
      width: 130,
      render: (_: unknown, r: ParsedCertificateRow) =>
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
      width: 220,
      render: (_: unknown, r: ParsedCertificateRow) => (
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
      title: 'Phân loại',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      render: (cat: string, r: ParsedCertificateRow) => (
        <Tag color={CATEGORY_COLORS[cat] || 'default'}>
          {r.categoryLabel}
        </Tag>
      ),
    },
    {
      title: 'Tên chứng chỉ / Bằng cấp / GPLX',
      key: 'cert_info',
      render: (_: unknown, r: ParsedCertificateRow) => (
        <div>
          <strong style={{ color: '#003a8c' }}>
            {r.category === 'GPLX' && r.license_class
              ? `GPLX Hạng ${r.license_class}`
              : r.name}
          </strong>
          {r.certificate_number && (
            <div style={{ fontSize: 11, color: '#888' }}>
              Số hiệu: {r.certificate_number}
            </div>
          )}
          {r.grading && (
            <div style={{ fontSize: 11, color: '#52c41a' }}>
              Xếp loại/Điểm: {r.grading}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Cơ quan cấp',
      dataIndex: 'issuing_authority',
      key: 'issuing_authority',
      width: 180,
      render: (val: string) => val || '-',
    },
    {
      title: 'Thời hạn',
      key: 'duration',
      width: 190,
      render: (_: unknown, r: ParsedCertificateRow) => {
        const start = r.issue_date ? dayjs(r.issue_date).format('DD/MM/YYYY') : '-';
        const end = r.expiry_date ? dayjs(r.expiry_date).format('DD/MM/YYYY') : 'Vô thời hạn';
        return (
          <div>
            <span>{start} - {end}</span>
          </div>
        );
      },
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
          <span>Nhập Chứng chỉ / Bằng cấp / GPLX từ file Excel</span>
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

      {/* BƯỚC 1: UPLOAD FILE */}
      {currentStep === 0 && (
        <div>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Quy chuẩn 3 nhóm phân loại chứng chỉ"
            description={
              <div>
                <div>• <b>CCCM / Đào tạo</b>: Chứng chỉ chuyên môn kỹ thuật, quy trình an toàn sân đỗ, đào tạo nội bộ.</div>
                <div>• <b>Bằng cấp</b>: Bằng Đại học, Cao đẳng, Trung cấp, THPT, Chứng chỉ Ngoại ngữ (TOEIC, IELTS...), Tin học (MOS, CNTT cơ bản...).</div>
                <div>• <b>GPLX</b>: Giấy phép lái xe đường bộ hoặc sân đỗ (Ghi rõ hạng: A1, B2, C, D, E, FC...).</div>
                <div style={{ marginTop: 4, color: '#fa8c16' }}>
                  * Lưu ý: Nếu bằng cấp/chứng chỉ <b>Vô thời hạn</b>, vui lòng để trống cột Ngày hết hạn.
                </div>
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
                  Chưa có file mẫu Excel?
                </strong>
                <div style={{ color: '#555', fontSize: 13, marginTop: 2 }}>
                  Tải file mẫu chuẩn có sẵn ví dụ minh họa và danh sách nhân viên để tra cứu nhanh.
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
              Kéo thả file Excel vào đây hoặc nhấp để chọn file
            </p>
            <p className="ant-upload-hint" style={{ color: '#8c8c8c' }}>
              Hỗ trợ định dạng .xlsx, .xls. Hệ thống sẽ tự động đối soát mã nhân viên và phân loại.
            </p>
          </Dragger>
        </div>
      )}

      {/* BƯỚC 2: XEM TRƯỚC & XÁC NHẬN */}
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
                Xác nhận nhập ({validCount} chứng chỉ)
              </Button>
            </Space>
          </div>

          {invalidCount > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message={`Phát hiện ${invalidCount} dòng có dữ liệu chưa hợp lệ.`}
              description="Các dòng hợp lệ vẫn sẽ được nhập vào hệ thống bình thường. Vui lòng kiểm tra cột Chi tiết lỗi để bổ sung sau."
            />
          )}

          <Table
            columns={columns}
            dataSource={displayedRows}
            rowKey="rawRow"
            pagination={{ pageSize: 8, showTotal: (total) => `Tổng cộng ${total} dòng` }}
            size="small"
            scroll={{ x: 1000 }}
            bordered
          />
        </div>
      )}

      {/* BƯỚC 3: KẾT QUẢ IMPORT */}
      {currentStep === 2 && importResult && (
        <Result
          status={importResult.failed === 0 ? 'success' : 'warning'}
          title={
            importResult.failed === 0
              ? 'Nhập dữ liệu chứng chỉ / bằng cấp thành công!'
              : 'Đã hoàn tất nhập dữ liệu (có một số lỗi)'
          }
          subTitle={
            <div style={{ fontSize: 15, marginTop: 8 }}>
              <div>• Thêm mới thành công: <strong style={{ color: '#52c41a' }}>{importResult.created}</strong> chứng chỉ/bằng cấp</div>
              <div>• Cập nhật bản ghi cũ: <strong style={{ color: '#1890ff' }}>{importResult.updated}</strong> chứng chỉ/bằng cấp</div>
              {importResult.failed > 0 && (
                <div>• Thất bại: <strong style={{ color: '#ff4d4f' }}>{importResult.failed}</strong> dòng</div>
              )}
            </div>
          }
          extra={[
            <Button type="primary" key="view" onClick={handleClose}>
              Xem danh sách chứng chỉ
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

export default CertificateImportModal;
