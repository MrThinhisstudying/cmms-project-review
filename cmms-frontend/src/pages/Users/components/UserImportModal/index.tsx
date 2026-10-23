import React, { useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  Table,
  Tag,
  Typography,
  Space,
  Row,
  Col,
  Select,
  Input,
  Progress,
  message,
} from 'antd';
import {
  InboxOutlined,
  DownloadOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import { IUser, ICreateUser, IDepartment } from '../../../../types/user.types';
import { createUser, updateUser } from '../../../../apis/users';
import { getToken } from '../../../../utils/auth';
import { parseExcelFile, ParsedRow, exportUserTemplate } from '../../../../utils/excelHelper';

const { Dragger } = Upload;
const { Text } = Typography;

interface UserImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingUsers: IUser[];
  departments: IDepartment[];
}

export default function UserImportModal({
  open,
  onClose,
  onSuccess,
  existingUsers,
  departments,
}: UserImportModalProps) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

  // Settings
  const [defaultRole, setDefaultRole] = useState<string>('OPERATOR');
  const [defaultPassword, setDefaultPassword] = useState<string>('Vcs@123456');

  const handleReset = () => {
    setParsedRows([]);
    setImporting(false);
    setImportProgress({ current: 0, total: 0 });
  };

  const handleModalClose = () => {
    if (importing) {
      message.warning('Quá trình import đang diễn ra, vui lòng đợi hoàn tất');
      return;
    }
    handleReset();
    onClose();
  };

  // Đọc file Excel khi người dùng kéo thả hoặc chọn file
  const handleFileChange = async (file: File) => {
    try {
      const rows = await parseExcelFile(file, existingUsers);
      if (rows.length === 0) {
        message.warning('File Excel không có dữ liệu hợp lệ');
        setParsedRows([]);
        return;
      }
      setParsedRows(rows);
      message.success(`Đã đọc ${rows.length} dòng dữ liệu từ file!`);
    } catch (err: any) {
      message.error(err.message || 'Lỗi đọc file Excel');
      setParsedRows([]);
    }
  };

  // Thống kê nhanh
  const stats = React.useMemo(() => {
    const total = parsedRows.length;
    const toCreate = parsedRows.filter((r) => !r.isExisting && r.name && r.email).length;
    const toUpdate = parsedRows.filter((r) => r.isExisting).length;
    const invalid = parsedRows.filter((r) => !r.isExisting && (!r.name || !r.email)).length;
    return { total, toCreate, toUpdate, invalid };
  }, [parsedRows]);

  // Thực thi Import tuần tự
  const handleStartImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setImportProgress({ current: 0, total: parsedRows.length });

    const token = getToken();
    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    // Map tên phòng ban sang dept_id
    const deptMap = new Map<string, number>();
    departments.forEach((d) => {
      deptMap.set(d.name.trim().toLowerCase(), d.dept_id);
    });

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      setImportProgress({ current: i + 1, total: parsedRows.length });

      try {
        // Tìm dept_id nếu cột bộ phận khớp tên
        let matchedDeptId: number | undefined = undefined;
        if (row.department_name) {
          const normName = row.department_name.trim().toLowerCase();
          matchedDeptId = deptMap.get(normName);
        }

        const payload: Partial<ICreateUser> = {
          name: row.name || undefined,
          employee_code: row.employee_code || undefined,
          position: row.position || undefined,
          email: row.email || undefined,
          phone_number: row.phone_number || undefined,
          citizen_identification_card: row.citizen_identification_card || undefined,
          date_of_birth: row.date_of_birth || undefined,
          place_of_birth: row.place_of_birth || undefined,
          cccd_issue_date: row.cccd_issue_date || undefined,
          permanent_address: row.permanent_address || undefined,
          temporary_address: row.temporary_address || undefined,
          hometown: row.hometown || undefined,
          gender: row.gender || undefined,
          ethnicity: row.ethnicity || undefined,
          dept_id: matchedDeptId,
        };

        if (row.isExisting && row.existingUserId) {
          // Cập nhật nhân viên hiện có
          await updateUser(row.existingUserId, payload as ICreateUser, token);
          updatedCount++;
        } else {
          // Bỏ qua dòng thiếu thông tin bắt buộc
          if (!row.name || !row.email) {
            failedCount++;
            continue;
          }
          await createUser(
            {
              ...payload,
              password: defaultPassword || 'Vcs@123456',
              role: defaultRole || 'OPERATOR',
              status: 'active',
              citizen_identification_card: row.citizen_identification_card || '000000000000',
            } as ICreateUser,
            token
          );
          createdCount++;
        }
      } catch (err) {
        console.error(`Lỗi import dòng ${row.rowIndex}:`, err);
        failedCount++;
      }
    }

    setImporting(false);
    message.success(
      `Hoàn tất Import: Tạo mới ${createdCount}, Cập nhật ${updatedCount}${
        failedCount > 0 ? `, Thất bại ${failedCount}` : ''
      }`
    );
    handleReset();
    onSuccess();
    onClose();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: '#ecfdf5',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            <FileExcelOutlined />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Nhập danh sách tài khoản & nhân sự từ Excel
            </div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
              Thêm mới hàng loạt hoặc cập nhật tự động dựa trên Mã số nhân viên (MSNV)
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={handleModalClose}
      width={1050}
      destroyOnClose
      footer={
        parsedRows.length === 0 ? (
          <Button onClick={handleModalClose}>Đóng</Button>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button onClick={handleReset} disabled={importing}>
              Chọn file khác
            </Button>
            <Space>
              <Button onClick={handleModalClose} disabled={importing}>
                Hủy bỏ
              </Button>
              <Button
                type="primary"
                loading={importing}
                onClick={handleStartImport}
                style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 600 }}
              >
                Tiến hành Import ({stats.toCreate + stats.toUpdate} tài khoản)
              </Button>
            </Space>
          </div>
        )
      }
    >
      <div style={{ margin: '14px 0' }}>
        {/* Bước 1: Khi chưa chọn file */}
        {parsedRows.length === 0 ? (
          <div>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '14px 18px',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                  Chưa có file mẫu chuẩn?
                </div>
                <div style={{ fontSize: 12.5, color: '#64748b' }}>
                  Tải file mẫu Excel (.xlsx) có sẵn tiêu đề cột và dữ liệu mẫu để điền thông tin
                </div>
              </div>

              <Button
                icon={<DownloadOutlined />}
                onClick={exportUserTemplate}
                style={{
                  background: '#eff6ff',
                  borderColor: '#bfdbfe',
                  color: '#2563eb',
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              >
                Tải file mẫu Excel
              </Button>
            </div>

            <Dragger
              accept=".xlsx,.xls,.csv"
              maxCount={1}
              showUploadList={false}
              beforeUpload={(file) => {
                handleFileChange(file);
                return false;
              }}
              style={{ padding: '24px 0', background: '#fafafa', borderRadius: 12 }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: '#10b981', fontSize: 44 }} />
              </p>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', margin: '8px 0 4px' }}>
                Nhấp hoặc kéo thả file Excel vào khu vực này để đọc dữ liệu
              </p>
              <p style={{ fontSize: 13, color: '#64748b' }}>
                Hỗ trợ định dạng .xlsx, .xls, .csv theo mẫu chuẩn hệ thống VCS CMMS
              </p>
            </Dragger>

            <div style={{ marginTop: 14, fontSize: 12.5, color: '#64748b' }}>
              <Text strong style={{ color: '#475569' }}>
                💡 Quy tắc xử lý:
              </Text>
              <ul style={{ paddingLeft: 18, marginTop: 4, marginBottom: 0 }}>
                <li>
                  Nếu <b>Mã số nhân viên (MSNV)</b> đã tồn tại trong hệ thống: Dữ liệu trong file sẽ{' '}
                  <b>cập nhật</b> hồ sơ cho nhân sự đó.
                </li>
                <li>
                  Nếu MSNV chưa tồn tại: Hệ thống sẽ <b>tạo mới tài khoản</b> đăng nhập.
                </li>
                <li>
                  Các trường thông tin bắt buộc: <b>Họ và tên</b>, <b>Email</b>.
                </li>
              </ul>
            </div>
          </div>
        ) : (
          /* Bước 2: Xem trước và cấu hình trước khi import */
          <div>
            {/* Thanh cấu hình mặc định */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '14px 18px',
                marginBottom: 16,
              }}
            >
              <Row gutter={16} align="middle">
                <Col xs={24} md={10}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Vai trò mặc định cho tài khoản mới:
                  </div>
                  <Select
                    value={defaultRole}
                    onChange={setDefaultRole}
                    style={{ width: '100%' }}
                    disabled={importing}
                  >
                    <Select.Option value="OPERATOR">Vận hành (Operator)</Select.Option>
                    <Select.Option value="TECHNICIAN">Kỹ thuật (Technician)</Select.Option>
                    <Select.Option value="TEAM_LEAD">Tổ trưởng (Team Lead)</Select.Option>
                    <Select.Option value="UNIT_HEAD">Cán bộ Đội (Unit Head)</Select.Option>
                  </Select>
                </Col>

                <Col xs={24} md={10}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Mật khẩu khởi tạo tài khoản mới:
                  </div>
                  <Input.Password
                    value={defaultPassword}
                    onChange={(e) => setDefaultPassword(e.target.value)}
                    disabled={importing}
                    placeholder="Mật khẩu mặc định"
                  />
                </Col>

                <Col xs={24} md={4} style={{ textAlign: 'right' }}>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={exportUserTemplate}
                    disabled={importing}
                    style={{ width: '100%', marginTop: 22 }}
                  >
                    File mẫu
                  </Button>
                </Col>
              </Row>
            </div>

            {/* Thống kê dòng */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <Space size={8}>
                <Tag color="default" style={{ fontSize: 13, padding: '3px 10px', borderRadius: 6 }}>
                  Tổng: <b>{stats.total}</b> dòng
                </Tag>
                <Tag color="green" style={{ fontSize: 13, padding: '3px 10px', borderRadius: 6 }}>
                  🟢 Tạo mới: <b>{stats.toCreate}</b>
                </Tag>
                <Tag color="blue" style={{ fontSize: 13, padding: '3px 10px', borderRadius: 6 }}>
                  🔵 Cập nhật: <b>{stats.toUpdate}</b>
                </Tag>
                {stats.invalid > 0 && (
                  <Tag color="error" style={{ fontSize: 13, padding: '3px 10px', borderRadius: 6 }}>
                    🔴 Thiếu Email/Tên: <b>{stats.invalid}</b> (sẽ bỏ qua)
                  </Tag>
                )}
              </Space>

              {importing && (
                <div style={{ minWidth: 260 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>
                    Đang import: {importProgress.current} / {importProgress.total} tài khoản...
                  </div>
                  <Progress
                    percent={Math.round((importProgress.current / (importProgress.total || 1)) * 100)}
                    status="active"
                    size="small"
                  />
                </div>
              )}
            </div>

            {/* Bảng xem trước */}
            <Table
              dataSource={parsedRows}
              rowKey="rowIndex"
              size="small"
              scroll={{ x: 1100, y: 380 }}
              pagination={{ pageSize: 8, size: 'small' }}
              columns={[
                {
                  title: '#',
                  dataIndex: 'rowIndex',
                  width: 50,
                  align: 'center',
                },
                {
                  title: 'Họ và tên',
                  dataIndex: 'name',
                  width: 160,
                  render: (val: string, r: ParsedRow) =>
                    val ? (
                      <Text strong style={{ color: '#0f172a' }}>
                        {val}
                      </Text>
                    ) : (
                      <Tag color="error">Thiếu tên (*)</Tag>
                    ),
                },
                {
                  title: 'MSNV',
                  dataIndex: 'employee_code',
                  width: 90,
                  render: (val: string) => val || <span style={{ color: '#94a3b8' }}>—</span>,
                },
                {
                  title: 'Email đăng nhập',
                  dataIndex: 'email',
                  width: 170,
                  render: (val: string) =>
                    val ? (
                      <span style={{ color: '#2563eb' }}>{val}</span>
                    ) : (
                      <Tag color="error">Thiếu email (*)</Tag>
                    ),
                },
                {
                  title: 'Chức vụ',
                  dataIndex: 'position',
                  width: 130,
                  render: (val: string) => val || '—',
                },
                {
                  title: 'Bộ phận',
                  dataIndex: 'department_name',
                  width: 140,
                  render: (val: string) =>
                    val ? (
                      <Tag color="purple">{val}</Tag>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Chưa có</span>
                    ),
                },
                {
                  title: 'CCCD',
                  dataIndex: 'citizen_identification_card',
                  width: 120,
                  render: (val: string) => val || '—',
                },
                {
                  title: 'Số ĐT',
                  dataIndex: 'phone_number',
                  width: 110,
                  render: (val: string) => val || '—',
                },
                {
                  title: 'Thao tác dự kiến',
                  key: 'action',
                  width: 120,
                  align: 'center',
                  fixed: 'right',
                  render: (_: any, r: ParsedRow) => {
                    if (r.isExisting) {
                      return <Tag color="blue">🔵 Cập nhật</Tag>;
                    }
                    if (!r.name || !r.email) {
                      return <Tag color="error">🔴 Lỗi dữ liệu</Tag>;
                    }
                    return <Tag color="green">🟢 Tạo mới</Tag>;
                  },
                },
              ]}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
