import React, { useState, useMemo } from 'react';
import {
  Modal,
  Tabs,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Table,
  Space,
  Tag,
  Upload,
  Alert,
  message,
  Card,
  Row,
  Col,
  Typography,
  Tooltip,
} from 'antd';
import {
  TeamOutlined,
  TableOutlined,
  FileExcelOutlined,
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  DownloadOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined,
  WarningOutlined,
  SaveOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { IUser } from '../../../../types/user.types';
import { createBatchRewardDisciplines } from '../../../../apis/rewardDisciplines';

const { Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

export interface IBatchGridRow {
  key: string;
  userId?: number;
  recordType: 'REWARD' | 'DISCIPLINE';
  decisionNumber: string;
  effectiveDate: dayjs.Dayjs | null;
  content: string;
}

export interface IExcelParsedRow {
  key: string;
  employeeCode: string;
  employeeName: string;
  recordType: 'REWARD' | 'DISCIPLINE';
  decisionNumber: string;
  effectiveDateStr: string;
  content: string;
  isValid: boolean;
  errorReason?: string;
  matchedUserId?: number;
}

interface BatchRewardDisciplineModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  users: IUser[];
}

export const BatchRewardDisciplineModal: React.FC<BatchRewardDisciplineModalProps> = ({
  open,
  onClose,
  onSuccess,
  users,
}) => {
  const [activeTab, setActiveTab] = useState<'single_decision' | 'multi_grid' | 'excel_import'>('single_decision');
  const [submitting, setSubmitting] = useState(false);

  // ──────────────────────────── TAB 1: SINGLE DECISION MULTI-USERS ────────────────────────────
  const [singleForm] = Form.useForm();
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string | null>(null);

  // Departments list for quick filtering
  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.department?.name) set.add(u.department.name);
      if (u.user_departments) {
        u.user_departments.forEach((ud) => {
          if (ud.department?.name) set.add(ud.department.name);
        });
      }
    });
    return Array.from(set);
  }, [users]);

  // Handle select all users of a department
  const handleSelectByDepartment = (deptName: string) => {
    const deptUserIds = users
      .filter((u) => {
        const matchesPrimary = u.department?.name === deptName;
        const matchesSecondary = u.user_departments?.some((ud) => ud.department?.name === deptName);
        return matchesPrimary || matchesSecondary;
      })
      .map((u) => u.user_id);

    const merged = Array.from(new Set([...selectedUserIds, ...deptUserIds]));
    setSelectedUserIds(merged);
    message.success(`Đã thêm ${deptUserIds.length} nhân sự thuộc "${deptName}"`);
  };

  const handleSelectAllUsers = () => {
    setSelectedUserIds(users.map((u) => u.user_id));
    message.success(`Đã chọn toàn bộ ${users.length} nhân sự`);
  };

  const handleClearAllUsers = () => {
    setSelectedUserIds([]);
  };

  const handleRemoveUser = (userId: number) => {
    setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
  };

  // ──────────────────────────── TAB 2: MULTI-ROW GRID ────────────────────────────
  const [gridRows, setGridRows] = useState<IBatchGridRow[]>([
    {
      key: 'row_1',
      userId: undefined,
      recordType: 'REWARD',
      decisionNumber: '',
      effectiveDate: dayjs(),
      content: '',
    },
    {
      key: 'row_2',
      userId: undefined,
      recordType: 'REWARD',
      decisionNumber: '',
      effectiveDate: dayjs(),
      content: '',
    },
  ]);

  const handleAddGridRow = () => {
    const newKey = `row_${Date.now()}`;
    setGridRows((prev) => [
      ...prev,
      {
        key: newKey,
        userId: undefined,
        recordType: 'REWARD',
        decisionNumber: prev.length > 0 ? prev[0].decisionNumber : '',
        effectiveDate: prev.length > 0 ? prev[0].effectiveDate : dayjs(),
        content: prev.length > 0 ? prev[0].content : '',
      },
    ]);
  };

  const handleDeleteGridRow = (key: string) => {
    if (gridRows.length <= 1) {
      message.warning('Cần giữ lại ít nhất 1 dòng trong bảng');
      return;
    }
    setGridRows((prev) => prev.filter((r) => r.key !== key));
  };

  const handleDuplicateGridRow = (row: IBatchGridRow) => {
    const newKey = `row_${Date.now()}`;
    setGridRows((prev) => [
      ...prev,
      {
        ...row,
        key: newKey,
        userId: undefined,
      },
    ]);
    message.info('Đã nhân bản dòng dữ liệu');
  };

  const handleFillDownFromFirstRow = () => {
    if (gridRows.length === 0) return;
    const first = gridRows[0];
    setGridRows((prev) =>
      prev.map((row) => ({
        ...row,
        recordType: first.recordType,
        decisionNumber: first.decisionNumber,
        effectiveDate: first.effectiveDate,
        content: first.content,
      }))
    );
    message.success('Đã áp dụng thông tin của dòng 1 cho toàn bộ các dòng');
  };

  const updateGridRow = (key: string, field: keyof IBatchGridRow, value: any) => {
    setGridRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    );
  };

  // ──────────────────────────── TAB 3: EXCEL IMPORT ────────────────────────────
  const [excelRows, setExcelRows] = useState<IExcelParsedRow[]>([]);
  const [filterInvalidOnly, setFilterInvalidOnly] = useState(false);

  // Download Excel template
  const handleDownloadTemplate = () => {
    const sampleUsers = users.slice(0, 3);
    const headers = [
      'STT',
      'Mã nhân viên (MSNV) *',
      'Họ và tên (Tham khảo)',
      'Phân loại (KHEN_THUONG hoặc KY_LUAT) *',
      'Số quyết định *',
      'Ngày hiệu lực (DD/MM/YYYY) *',
      'Nội dung quyết định *',
    ];

    const dataRows = sampleUsers.map((u, i) => [
      i + 1,
      u.employee_code || `NV00${u.user_id}`,
      u.name,
      'KHEN_THUONG',
      `QĐKT-2026/0${i + 1}`,
      dayjs().format('DD/MM/YYYY'),
      'Khen thưởng hoàn thành xuất sắc nhiệm vụ công tác',
    ]);

    if (dataRows.length === 0) {
      dataRows.push([
        1,
        '404040',
        'Nguyễn Văn A',
        'KHEN_THUONG',
        'QĐKT-2026/01',
        dayjs().format('DD/MM/YYYY'),
        'Khen thưởng hoàn thành xuất sắc nhiệm vụ bảo dưỡng',
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 26 },
      { wch: 38 },
      { wch: 20 },
      { wch: 24 },
      { wch: 45 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Khen_Thuong_Ky_Luat');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `Mau_Khen_Thuong_Ky_Luat_${dayjs().format('YYYYMMDD')}.xlsx`);
    message.success('Đã tải xuống file Excel mẫu');
  };

  // Parse uploaded Excel file
  const handleExcelUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawJson || rawJson.length < 2) {
          message.error('File Excel không có dữ liệu hoặc sai định dạng');
          return;
        }

        // Header is row 0, data starts from row 1
        const rowsToProcess = rawJson.slice(1).filter((r) => r && r.length > 0 && r[1]);

        const parsed: IExcelParsedRow[] = rowsToProcess.map((r, idx) => {
          const empCodeRaw = String(r[1] || '').trim();
          const empNameRaw = String(r[2] || '').trim();
          const recordTypeRaw = String(r[3] || '').trim().toUpperCase();
          const decisionNumber = String(r[4] || '').trim();
          const effectiveDateRaw = String(r[5] || '').trim();
          const content = String(r[6] || '').trim();

          // Match user by employee_code or name
          const matched = users.find(
            (u) =>
              (u.employee_code && u.employee_code.toLowerCase() === empCodeRaw.toLowerCase()) ||
              (u.name && u.name.toLowerCase() === empNameRaw.toLowerCase()) ||
              String(u.user_id) === empCodeRaw
          );

          // Normalize record type
          let recordType: 'REWARD' | 'DISCIPLINE' = 'REWARD';
          if (
            recordTypeRaw.includes('KY_LUAT') ||
            recordTypeRaw.includes('KỶ LUẬT') ||
            recordTypeRaw.includes('DISCIPLINE') ||
            recordTypeRaw === 'KL'
          ) {
            recordType = 'DISCIPLINE';
          }

          // Validate date
          let dateFormatted = dayjs().format('YYYY-MM-DD');
          let dateValid = true;
          if (effectiveDateRaw) {
            const parsedD = dayjs(effectiveDateRaw, ['DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY']);
            if (parsedD.isValid()) {
              dateFormatted = parsedD.format('YYYY-MM-DD');
            } else {
              dateValid = false;
            }
          }

          // Error reasons
          const errors: string[] = [];
          if (!matched) errors.push(`Không tìm thấy NV với MSNV: "${empCodeRaw}"`);
          if (!decisionNumber) errors.push('Thiếu số quyết định');
          if (!content) errors.push('Thiếu nội dung');
          if (!dateValid) errors.push(`Ngày hiệu lực không hợp lệ: "${effectiveDateRaw}"`);

          const isValid = errors.length === 0;

          return {
            key: `excel_${idx}`,
            employeeCode: empCodeRaw,
            employeeName: matched ? matched.name : empNameRaw || 'Chưa xác định',
            recordType,
            decisionNumber,
            effectiveDateStr: dateFormatted,
            content,
            isValid,
            errorReason: errors.join(', '),
            matchedUserId: matched?.user_id,
          };
        });

        setExcelRows(parsed);
        const validCount = parsed.filter((p) => p.isValid).length;
        message.success(`Đã đọc ${parsed.length} dòng từ Excel (${validCount} dòng hợp lệ)`);
      } catch (err: any) {
        console.error(err);
        message.error(`Lỗi khi đọc file Excel: ${err.message || 'File hỏng hoặc không đúng chuẩn'}`);
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // prevent default upload
  };

  // ──────────────────────────── SUBMISSION ────────────────────────────
  const handleSaveAll = async () => {
    setSubmitting(true);
    try {
      if (activeTab === 'single_decision') {
        const values = await singleForm.validateFields();
        if (selectedUserIds.length === 0) {
          message.error('Vui lòng chọn ít nhất 1 nhân viên để áp dụng quyết định');
          setSubmitting(false);
          return;
        }

        const dateStr = values.effective_date ? values.effective_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');

        const records = selectedUserIds.map((uid) => ({
          user_id: uid,
          record_type: values.record_type as 'REWARD' | 'DISCIPLINE',
          decision_number: values.decision_number.trim(),
          content: values.content.trim(),
          effective_date: dateStr,
        }));

        await createBatchRewardDisciplines(records);
        message.success(`Thêm thành công ${records.length} quyết định khen thưởng / kỷ luật!`);
        handleCloseAndReset();
        onSuccess();
      } else if (activeTab === 'multi_grid') {
        // Validate rows
        const invalidRows = gridRows.filter((r) => !r.userId || !r.decisionNumber.trim() || !r.content.trim());
        if (invalidRows.length > 0) {
          message.error(`Có ${invalidRows.length} dòng chưa điền đủ Nhân viên, Số QĐ hoặc Nội dung`);
          setSubmitting(false);
          return;
        }

        const records = gridRows.map((r) => ({
          user_id: r.userId!,
          record_type: r.recordType,
          decision_number: r.decisionNumber.trim(),
          content: r.content.trim(),
          effective_date: r.effectiveDate ? r.effectiveDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        }));

        await createBatchRewardDisciplines(records);
        message.success(`Thêm thành công ${records.length} quyết định khen thưởng / kỷ luật!`);
        handleCloseAndReset();
        onSuccess();
      } else if (activeTab === 'excel_import') {
        const validRows = excelRows.filter((r) => r.isValid && r.matchedUserId);
        if (validRows.length === 0) {
          message.error('Không có dòng dữ liệu Excel nào hợp lệ để lưu');
          setSubmitting(false);
          return;
        }

        const records = validRows.map((r) => ({
          user_id: r.matchedUserId!,
          record_type: r.recordType,
          decision_number: r.decisionNumber,
          content: r.content,
          effective_date: r.effectiveDateStr,
        }));

        await createBatchRewardDisciplines(records);
        message.success(`Đã nhập thành công ${records.length} quyết định từ file Excel!`);
        handleCloseAndReset();
        onSuccess();
      }
    } catch (e: any) {
      if (e?.errorFields) {
        message.warning('Vui lòng kiểm tra lại các trường thông tin bắt buộc');
      } else {
        message.error(e.message || 'Lỗi khi lưu quyết định hàng loạt');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseAndReset = () => {
    singleForm.resetFields();
    setSelectedUserIds([]);
    setExcelRows([]);
    setGridRows([
      {
        key: 'row_1',
        userId: undefined,
        recordType: 'REWARD',
        decisionNumber: '',
        effectiveDate: dayjs(),
        content: '',
      },
    ]);
    onClose();
  };

  // User map for fast display
  const userMap = useMemo(() => {
    const map = new Map<number, IUser>();
    users.forEach((u) => map.set(u.user_id, u));
    return map;
  }, [users]);

  return (
    <Modal
      open={open}
      onCancel={handleCloseAndReset}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 4 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
              fontSize: 18,
            }}
          >
            <TrophyOutlined />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Thêm Hàng Loạt Khen Thưởng / Kỷ Luật
            </div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
              Gán quyết định cho nhiều nhân viên cùng lúc, bảng nhập liệu linh hoạt và nhập từ Excel
            </div>
          </div>
        </div>
      }
      width="min(1080px, 96vw)"
      footer={[
        <Button key="cancel" onClick={handleCloseAndReset} disabled={submitting}>
          Hủy bỏ
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<SaveOutlined />}
          loading={submitting}
          onClick={handleSaveAll}
          style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            border: 'none',
            borderRadius: 8,
            paddingLeft: 20,
            paddingRight: 20,
            fontWeight: 600,
          }}
        >
          {activeTab === 'single_decision' && `Lưu quyết định (${selectedUserIds.length} nhân sự)`}
          {activeTab === 'multi_grid' && `Lưu tất cả (${gridRows.length} dòng)`}
          {activeTab === 'excel_import' &&
            `Lưu danh sách hợp lệ (${excelRows.filter((r) => r.isValid).length} dòng)`}
        </Button>,
      ]}
      destroyOnClose
    >
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as any)}
        type="card"
        style={{ marginTop: 12 }}
        items={[
          // ──────────────── TAB 1 ────────────────
          {
            key: 'single_decision',
            label: (
              <span>
                <TeamOutlined /> Áp dụng chung 1 Quyết định
              </span>
            ),
            children: (
              <div>
                <Alert
                  type="info"
                  showIcon
                  message={
                    <span>
                      Áp dụng cùng một quyết định cho nhiều nhân sự (Ví dụ: Khen thưởng ban chuyên án, Khen thưởng tập
                      thể hoàn thành xuất sắc bảo dưỡng đợt lớn...).
                    </span>
                  }
                  style={{ marginBottom: 16, borderRadius: 8 }}
                />

                <Form form={singleForm} layout="vertical" initialValues={{ record_type: 'REWARD', effective_date: dayjs() }}>
                  <Card size="small" style={{ borderRadius: 10, marginBottom: 16, background: '#fafbfc' }}>
                    <Row gutter={[16, 8]}>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="record_type" label="Phân loại quyết định" rules={[{ required: true }]}>
                          <Select size="large">
                            <Select.Option value="REWARD">
                              <Tag color="success" icon={<TrophyOutlined />}>
                                🏆 Khen thưởng
                              </Tag>
                            </Select.Option>
                            <Select.Option value="DISCIPLINE">
                              <Tag color="error" icon={<WarningOutlined />}>
                                ⚠️ Kỷ luật
                              </Tag>
                            </Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>

                      <Col xs={24} sm={12} md={10}>
                        <Form.Item
                          name="decision_number"
                          label="Số quyết định"
                          rules={[{ required: true, message: 'Vui lòng nhập số quyết định' }]}
                        >
                          <Input size="large" placeholder="Ví dụ: QĐKT-2026/08" />
                        </Form.Item>
                      </Col>

                      <Col xs={24} sm={24} md={8}>
                        <Form.Item
                          name="effective_date"
                          label="Ngày hiệu lực"
                          rules={[{ required: true, message: 'Chọn ngày hiệu lực' }]}
                        >
                          <DatePicker size="large" style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>
                      </Col>

                      <Col xs={24}>
                        <Form.Item
                          name="content"
                          label="Nội dung quyết định khen thưởng / kỷ luật"
                          rules={[{ required: true, message: 'Vui lòng nhập nội dung quyết định' }]}
                        >
                          <TextArea
                            rows={3}
                            placeholder="Ví dụ: Khen thưởng hoàn thành xuất sắc đợt bảo dưỡng định kỳ trang thiết bị phương tiện mặt đất quý 3/2026..."
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>

                  {/* USER SELECTION SECTION */}
                  <Card
                    size="small"
                    style={{ borderRadius: 10 }}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <span>
                          <UserOutlined style={{ color: '#2563eb', marginRight: 6 }} />
                          Danh sách nhân sự áp dụng (
                          <strong style={{ color: '#2563eb' }}>{selectedUserIds.length}</strong> nhân sự đã chọn)
                        </span>

                        <Space wrap size="small">
                          {departmentsList.length > 0 && (
                            <Select
                              placeholder="Lọc theo phòng ban..."
                              style={{ width: 180 }}
                              allowClear
                              size="small"
                              value={selectedDeptFilter}
                              onChange={(val) => {
                                setSelectedDeptFilter(val);
                                if (val) handleSelectByDepartment(val);
                              }}
                            >
                              {departmentsList.map((dept) => (
                                <Select.Option key={dept} value={dept}>
                                  {dept}
                                </Select.Option>
                              ))}
                            </Select>
                          )}
                          <Button size="small" onClick={handleSelectAllUsers}>
                            Chọn tất cả ({users.length})
                          </Button>
                          {selectedUserIds.length > 0 && (
                            <Button size="small" danger onClick={handleClearAllUsers}>
                              Bỏ chọn tất cả
                            </Button>
                          )}
                        </Space>
                      </div>
                    }
                  >
                    <Select
                      mode="multiple"
                      showSearch
                      size="large"
                      style={{ width: '100%', marginBottom: 12 }}
                      placeholder="Tìm kiếm và chọn nhân viên (theo Tên hoặc Mã số nhân viên MSNV)..."
                      value={selectedUserIds}
                      onChange={setSelectedUserIds}
                      optionFilterProp="label"
                      filterOption={(input, option) =>
                        String(option?.label || '')
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      options={users.map((u) => {
                        const dept = u.department?.name || u.user_departments?.[0]?.department?.name || '';
                        return {
                          value: u.user_id,
                          label: `${u.name} - ${u.employee_code || u.user_id}${dept ? ` (${dept})` : ''}`,
                          dept,
                        };
                      })}
                    />

                    {/* Chips Preview */}
                    {selectedUserIds.length > 0 ? (
                      <div
                        style={{
                          maxHeight: 140,
                          overflowY: 'auto',
                          background: '#f8fafc',
                          padding: 10,
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                        }}
                      >
                        {selectedUserIds.map((uid) => {
                          const u = userMap.get(uid);
                          if (!u) return null;
                          return (
                            <Tag
                              key={uid}
                              closable
                              onClose={() => handleRemoveUser(uid)}
                              color="blue"
                              style={{
                                padding: '3px 8px',
                                fontSize: 12,
                                borderRadius: 14,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <strong>{u.name}</strong>
                              <span style={{ opacity: 0.75 }}>({u.employee_code || u.user_id})</span>
                            </Tag>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: 13 }}>
                        Chưa chọn nhân viên nào. Hãy chọn từ danh sách phía trên hoặc dùng nút &quot;Chọn tất cả&quot;.
                      </div>
                    )}
                  </Card>
                </Form>
              </div>
            ),
          },

          // ──────────────── TAB 2 ────────────────
          {
            key: 'multi_grid',
            label: (
              <span>
                <TableOutlined /> Bảng nhập liệu chi tiết
              </span>
            ),
            children: (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <Space wrap>
                    <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddGridRow}>
                      Thêm dòng mới
                    </Button>
                    <Button icon={<CopyOutlined />} onClick={handleFillDownFromFirstRow}>
                      Áp dụng dòng 1 cho toàn bộ dòng
                    </Button>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Tổng số dòng: <strong>{gridRows.length}</strong>
                  </Text>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <Table
                    dataSource={gridRows}
                    rowKey="key"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: '#',
                        width: 45,
                        align: 'center',
                        render: (_: any, __: any, index: number) => index + 1,
                      },
                      {
                        title: 'Nhân viên *',
                        width: 220,
                        render: (_: any, row: IBatchGridRow) => (
                          <Select
                            showSearch
                            placeholder="Chọn nhân viên"
                            value={row.userId}
                            onChange={(val) => updateGridRow(row.key, 'userId', val)}
                            style={{ width: '100%' }}
                            optionFilterProp="children"
                          >
                            {users.map((u) => (
                              <Select.Option key={u.user_id} value={u.user_id}>
                                {u.name} ({u.employee_code || u.user_id})
                              </Select.Option>
                            ))}
                          </Select>
                        ),
                      },
                      {
                        title: 'Phân loại',
                        width: 140,
                        render: (_: any, row: IBatchGridRow) => (
                          <Select
                            value={row.recordType}
                            onChange={(val) => updateGridRow(row.key, 'recordType', val)}
                            style={{ width: '100%' }}
                          >
                            <Select.Option value="REWARD">🏆 Khen thưởng</Select.Option>
                            <Select.Option value="DISCIPLINE">⚠️ Kỷ luật</Select.Option>
                          </Select>
                        ),
                      },
                      {
                        title: 'Số quyết định *',
                        width: 160,
                        render: (_: any, row: IBatchGridRow) => (
                          <Input
                            placeholder="Số QĐ"
                            value={row.decisionNumber}
                            onChange={(e) => updateGridRow(row.key, 'decisionNumber', e.target.value)}
                          />
                        ),
                      },
                      {
                        title: 'Ngày hiệu lực *',
                        width: 140,
                        render: (_: any, row: IBatchGridRow) => (
                          <DatePicker
                            format="DD/MM/YYYY"
                            value={row.effectiveDate}
                            onChange={(d) => updateGridRow(row.key, 'effectiveDate', d)}
                            style={{ width: '100%' }}
                          />
                        ),
                      },
                      {
                        title: 'Nội dung *',
                        render: (_: any, row: IBatchGridRow) => (
                          <Input
                            placeholder="Nội dung khen thưởng / kỷ luật..."
                            value={row.content}
                            onChange={(e) => updateGridRow(row.key, 'content', e.target.value)}
                          />
                        ),
                      },
                      {
                        title: '',
                        width: 80,
                        align: 'center',
                        render: (_: any, row: IBatchGridRow) => (
                          <Space size="small">
                            <Tooltip title="Nhân bản dòng này">
                              <Button
                                size="small"
                                type="text"
                                icon={<CopyOutlined />}
                                onClick={() => handleDuplicateGridRow(row)}
                              />
                            </Tooltip>
                            <Tooltip title="Xóa dòng">
                              <Button
                                size="small"
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleDeleteGridRow(row.key)}
                              />
                            </Tooltip>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </div>
              </div>
            ),
          },

          // ──────────────── TAB 3 ────────────────
          {
            key: 'excel_import',
            label: (
              <span>
                <FileExcelOutlined /> Nhập từ file Excel
              </span>
            ),
            children: (
              <div>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={10}>
                    <Card
                      size="small"
                      title={
                        <span>
                          <DownloadOutlined style={{ color: '#16a34a', marginRight: 6 }} />
                          Bước 1: Tải file Excel mẫu
                        </span>
                      }
                      style={{ borderRadius: 8, height: '100%' }}
                    >
                      <p style={{ fontSize: 13, color: '#475569' }}>
                        Tải file mẫu định dạng chuẩn đã chuẩn bị sẵn các cột: Mã nhân viên (MSNV), Phân loại, Số QĐ,
                        Ngày hiệu lực, Nội dung quyết định.
                      </p>
                      <Button
                        type="default"
                        icon={<DownloadOutlined />}
                        onClick={handleDownloadTemplate}
                        style={{ borderColor: '#16a34a', color: '#16a34a', fontWeight: 500 }}
                      >
                        Tải file mẫu Excel (.xlsx)
                      </Button>
                    </Card>
                  </Col>

                  <Col xs={24} md={14}>
                    <Card
                      size="small"
                      title={
                        <span>
                          <FileExcelOutlined style={{ color: '#2563eb', marginRight: 6 }} />
                          Bước 2: Tải lên file Excel đã điền
                        </span>
                      }
                      style={{ borderRadius: 8 }}
                    >
                      <Dragger
                        accept=".xlsx, .xls"
                        beforeUpload={handleExcelUpload}
                        showUploadList={false}
                        style={{ padding: '12px 0' }}
                      >
                        <p className="ant-upload-drag-icon" style={{ marginBottom: 4 }}>
                          <InboxOutlined style={{ color: '#2563eb', fontSize: 28 }} />
                        </p>
                        <p className="ant-upload-text" style={{ fontSize: 13, fontWeight: 600 }}>
                          Kéo thả hoặc nhấp để tải file Excel lên
                        </p>
                        <p className="ant-upload-hint" style={{ fontSize: 11, color: '#94a3b8' }}>
                          Hỗ trợ định dạng .xlsx, .xls
                        </p>
                      </Dragger>
                    </Card>
                  </Col>
                </Row>

                {/* Excel Preview Table */}
                {excelRows.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <Space>
                        <span style={{ fontWeight: 600 }}>Dữ liệu đọc từ Excel:</span>
                        <Tag color="blue">{excelRows.length} dòng</Tag>
                        <Tag color="success">
                          {excelRows.filter((r) => r.isValid).length} hợp lệ
                        </Tag>
                        {excelRows.some((r) => !r.isValid) && (
                          <Tag color="error">
                            {excelRows.filter((r) => !r.isValid).length} lỗi
                          </Tag>
                        )}
                      </Space>

                      {excelRows.some((r) => !r.isValid) && (
                        <Button
                          size="small"
                          type={filterInvalidOnly ? 'primary' : 'default'}
                          danger={filterInvalidOnly}
                          onClick={() => setFilterInvalidOnly(!filterInvalidOnly)}
                        >
                          {filterInvalidOnly ? 'Hiển thị tất cả' : 'Chỉ xem dòng lỗi'}
                        </Button>
                      )}
                    </div>

                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                      <Table
                        dataSource={filterInvalidOnly ? excelRows.filter((r) => !r.isValid) : excelRows}
                        rowKey="key"
                        size="small"
                        pagination={{ pageSize: 6 }}
                        columns={[
                          {
                            title: 'Trạng thái',
                            width: 140,
                            render: (_: any, r: IExcelParsedRow) =>
                              r.isValid ? (
                                <Tag color="success" icon={<CheckCircleOutlined />}>
                                  Hợp lệ
                                </Tag>
                              ) : (
                                <Tooltip title={r.errorReason}>
                                  <Tag color="error" icon={<ExclamationCircleOutlined />}>
                                    Lỗi
                                  </Tag>
                                </Tooltip>
                              ),
                          },
                          {
                            title: 'Nhân viên',
                            render: (_: any, r: IExcelParsedRow) => (
                              <div>
                                <span style={{ fontWeight: 600, color: r.matchedUserId ? '#0f172a' : '#ef4444' }}>
                                  {r.employeeName}
                                </span>
                                <div style={{ fontSize: 11, color: '#64748b' }}>
                                  MSNV: {r.employeeCode}
                                </div>
                              </div>
                            ),
                          },
                          {
                            title: 'Phân loại',
                            width: 120,
                            render: (_: any, r: IExcelParsedRow) =>
                              r.recordType === 'REWARD' ? (
                                <Tag color="success">Khen thưởng</Tag>
                              ) : (
                                <Tag color="error">Kỷ luật</Tag>
                              ),
                          },
                          {
                            title: 'Số QĐ',
                            dataIndex: 'decisionNumber',
                            width: 140,
                          },
                          {
                            title: 'Ngày hiệu lực',
                            dataIndex: 'effectiveDateStr',
                            width: 120,
                            render: (d: string) => (d ? dayjs(d).format('DD/MM/YYYY') : '-'),
                          },
                          {
                            title: 'Nội dung',
                            dataIndex: 'content',
                          },
                          {
                            title: 'Ghi chú kiểm tra',
                            dataIndex: 'errorReason',
                            render: (reason: string) =>
                              reason ? <span style={{ color: '#ef4444', fontSize: 12 }}>{reason}</span> : '-',
                          },
                        ]}
                      />
                    </div>
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
};

export default BatchRewardDisciplineModal;
