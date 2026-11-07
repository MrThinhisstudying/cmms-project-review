import React, { useEffect, useState, useMemo } from 'react';
import { Table, Card, Button, Input, Space, Row, Col, Typography, InputNumber, message, Upload, Empty, Modal, Form, Select, DatePicker } from 'antd';
import { SearchOutlined, UploadOutlined, DownloadOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { getAnnualLeaves, updateAnnualLeave, importAnnualLeaves, recordLeave, uploadLeaveAttachments, IAnnualLeave } from '../../apis/annualLeaves';
import { getAllUsers } from '../../apis/users';
import { getToken } from '../../utils/auth';
import dayjs from 'dayjs';
import ProfileModal from '../Users/components/ProfileModal';
import { useAuthContext } from '../../context/AuthContext/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

const LeaveManagement: React.FC = () => {
    const { user: currentAuthUser } = useAuthContext();
    const canWrite = ['ADMIN', 'HR_MANAGER'].includes(currentAuthUser?.role || '');

    const [records, setRecords] = useState<IAnnualLeave[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedYear, setSelectedYear] = useState<number>(dayjs().year());
    
    // Modal states
    const [users, setUsers] = useState<any[]>([]);
    const activeUsers = useMemo(() => {
        return (users || []).filter(u => !u.status || u.status.trim().toLowerCase() === 'active');
    }, [users]);
    const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
    const [recordForm] = Form.useForm();
    const [recordLoading, setRecordLoading] = useState(false);
    const [selectedProfileUser, setSelectedProfileUser] = useState<any>(null);
    
    useEffect(() => {
        fetchRecords();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedYear]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const data = await getAllUsers(getToken());
            setUsers(data);
        } catch (error) {
            message.error('Lỗi tải danh sách nhân viên');
        }
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const data = await getAnnualLeaves(selectedYear);
            setRecords(data);
        } catch (error: any) {
            message.error(error.message || 'Lỗi tải danh sách phép');
        } finally {
            setLoading(false);
        }
    };

    const [fileList, setFileList] = useState<any[]>([]);

    const handleOpenRecordModal = () => {
        recordForm.resetFields();
        recordForm.setFieldsValue({
            leave_type: 'ANNUAL',
            days_taken: 1,
            date_range: [dayjs(), dayjs()],
        });
        setFileList([]);
        setIsRecordModalOpen(true);
    };

    const handleRecordSubmit = async () => {
        try {
            const values = await recordForm.validateFields();
            setRecordLoading(true);

            let attachments: string[] = [];
            if (fileList.length > 0) {
                const uploadFiles = fileList.map(f => (f.originFileObj || f) as File);
                attachments = await uploadLeaveAttachments(uploadFiles);
            }

            const [startDate, endDate] = values.date_range;

            const payload = {
                user_id: values.user_id,
                applied_month: startDate.month() + 1,
                year: startDate.year(),
                from_date: startDate.format('YYYY-MM-DD'),
                to_date: endDate.format('YYYY-MM-DD'),
                days_taken: Number(values.days_taken),
                leave_type: values.leave_type || 'ANNUAL',
                reason: values.reason,
                attachments,
            };
            await recordLeave(payload);
            message.success('Ghi nhận nghỉ phép thành công');
            setIsRecordModalOpen(false);
            recordForm.resetFields();
            setFileList([]);
            fetchRecords();
        } catch (error: any) {
            if (error.message) message.error(error.message);
        } finally {
            setRecordLoading(false);
        }
    };

    const handleCellChange = async (id: number, key: keyof IAnnualLeave, val: number | null) => {
        const newData = [...records];
        const index = newData.findIndex(item => id === item.id);
        if (index > -1) {
            const item = newData[index];
            const newValue = val || 0;
            
            // Optimistic Update
            newData[index] = { ...item, [key]: newValue };
            setRecords(newData);

            // API Call
            try {
                await updateAnnualLeave(id, { [key]: newValue });
            } catch (error) {
                message.error('Lỗi khi cập nhật dữ liệu!');
                fetchRecords(); // rollback
            }
        }
    };

    const handleImportExcel = async (file: any) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                
                // Expecting Header mapping (supports both legacy and compensatory columns)
                const headerRow = (json[0] || []).map((h: any) => String(h || '').trim().toLowerCase());
                const compQuotaIdx = headerRow.findIndex(h => h.includes('quỹ nghỉ bù') || h.includes('cấp bù') || h.includes('nghỉ bù'));
                const compTakenIdx = headerRow.findIndex(h => h.includes('đã nghỉ bù') || h.includes('sử dụng bù'));

                const rows = json.slice(1); // skip header
                const payload = rows.map(r => {
                    const getNum = (idx: number) => (idx >= 0 && idx < r.length) ? Number(r[idx]) || 0 : 0;
                    const mIndices: number[] = [];
                    for (let m = 1; m <= 12; m++) {
                        const mIdx = headerRow.findIndex(h => h === `t${m}` || h === `tháng ${m}` || h === `thang ${m}`);
                        mIndices.push(mIdx);
                    }
                    const mVal = (monthNum: number, fallbackIdx: number) => {
                        const idx = mIndices[monthNum - 1];
                        return idx !== -1 ? getNum(idx) : getNum(fallbackIdx);
                    };

                    const hasCompCols = compQuotaIdx !== -1 || r.length >= 21;
                    const compQuota = compQuotaIdx !== -1 ? getNum(compQuotaIdx) : (r.length >= 21 ? getNum(7) : 0);
                    const compTaken = compTakenIdx !== -1 ? getNum(compTakenIdx) : (r.length >= 21 ? getNum(8) : 0);
                    const monthOffset = hasCompCols ? 9 : 7;

                    return {
                        employee_code: r[2]?.toString(),
                        year: selectedYear,
                        leave_balance_n2: Number(r[4]) || 0,
                        leave_balance_n1: Number(r[5]) || 0,
                        current_year_leave: Number(r[6]) || 0,
                        compensatory_leave_quota: compQuota,
                        compensatory_leave_taken: compTaken,
                        m1_taken: mVal(1, monthOffset),
                        m2_taken: mVal(2, monthOffset + 1),
                        m3_taken: mVal(3, monthOffset + 2),
                        m4_taken: mVal(4, monthOffset + 3),
                        m5_taken: mVal(5, monthOffset + 4),
                        m6_taken: mVal(6, monthOffset + 5),
                        m7_taken: mVal(7, monthOffset + 6),
                        m8_taken: mVal(8, monthOffset + 7),
                        m9_taken: mVal(9, monthOffset + 8),
                        m10_taken: mVal(10, monthOffset + 9),
                        m11_taken: mVal(11, monthOffset + 10),
                        m12_taken: mVal(12, monthOffset + 11),
                    };
                }).filter(r => r.employee_code);

                if (payload.length === 0) {
                    message.warning('Không tìm thấy dữ liệu hợp lệ trong file');
                    return;
                }

                setLoading(true);
                const res = await importAnnualLeaves(payload);
                message.success(`Import thành công ${res.success} bản ghi.`);
                if (res.errors && res.errors.length) {
                    console.log('Import errors:', res.errors);
                    message.warning(`Có ${res.errors.length} lỗi, vui lòng kiểm tra Console.`);
                }
                fetchRecords();
            } catch (err: any) {
                message.error('Lỗi khi đọc file Excel: ' + err.message);
                setLoading(false);
            }
        };
        reader.readAsBinaryString(file);
        return false; // Prevent auto upload
    };

    const downloadTemplate = () => {
        const worksheet = XLSX.utils.aoa_to_sheet([
            ['STT', 'Họ và tên', 'MSNV', 'Năm làm', `Tồn ${selectedYear - 2}`, `Tồn ${selectedYear - 1}`, `Phép ${selectedYear}`, 'Quỹ nghỉ bù', 'Đã nghỉ bù', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']
        ]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
        XLSX.writeFile(workbook, `Template_Phep_${selectedYear}.xlsx`);
    };

    const EditableCell = ({ value, recordId, dataKey, width = 60 }: any) => {
        const [editing, setEditing] = useState(false);
        const [tempVal, setTempVal] = useState(value);

        const toggleEdit = () => {
            if (!canWrite) return;
            setEditing(true);
            setTempVal(value);
        };

        const save = () => {
            if (tempVal !== value) {
                handleCellChange(recordId, dataKey, tempVal);
            }
            setEditing(false);
        };

        if (!canWrite) {
            return (
                <div style={{ width, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {value === 0 ? <span style={{color: '#d9d9d9'}}>0</span> : <span style={{fontWeight: 500}}>{value}</span>}
                </div>
            );
        }

        if (editing) {
            return (
                <InputNumber 
                    autoFocus
                    value={tempVal} 
                    onChange={(val) => setTempVal(val)} 
                    onBlur={save}
                    onPressEnter={save}
                    style={{ width }} 
                    controls={false}
                    size="small"
                />
            );
        }

        return (
            <div 
                onClick={toggleEdit} 
                style={{ 
                    width, 
                    minHeight: 24, 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '0 4px',
                    borderRadius: 4,
                    transition: 'background 0.2s',
                    justifyContent: 'center'
                }}
                className="editable-cell-hover"
                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                {value === 0 ? <span style={{color: '#d9d9d9'}}>0</span> : <span style={{fontWeight: 500}}>{value}</span>}
            </div>
        );
    };

    const filtered = records.filter(c => 
        c.user?.name?.toLowerCase().includes(searchText.toLowerCase()) || 
        c.user?.employee_code?.toLowerCase().includes(searchText.toLowerCase())
    );

    const calcTotal = (r: IAnnualLeave) => (Number(r.leave_balance_n2) || 0) + (Number(r.leave_balance_n1) || 0) + (Number(r.current_year_leave) || 0);
    const calcTaken = (r: IAnnualLeave) => (Number(r.m1_taken) || 0) + (Number(r.m2_taken) || 0) + (Number(r.m3_taken) || 0) + (Number(r.m4_taken) || 0) + 
        (Number(r.m5_taken) || 0) + (Number(r.m6_taken) || 0) + (Number(r.m7_taken) || 0) + (Number(r.m8_taken) || 0) + 
        (Number(r.m9_taken) || 0) + (Number(r.m10_taken) || 0) + (Number(r.m11_taken) || 0) + (Number(r.m12_taken) || 0);
    const calcRemain = (r: IAnnualLeave) => calcTotal(r) - calcTaken(r);
    const calcCompRemain = (r?: IAnnualLeave) => {
        if (!r) return 0;
        return (Number(r.compensatory_leave_quota) || 0) - (Number(r.compensatory_leave_taken) || 0);
    };

    const columns: any = [
        {
            title: 'MSNV',
            width: 80,
            fixed: 'left',
            render: (_: any, r: IAnnualLeave) => <b>{r.user?.employee_code}</b>
        },
        {
            title: 'Họ và tên',
            width: 150,
            fixed: 'left',
            render: (_: any, r: IAnnualLeave) => (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{r.user?.name}</span>
                    {r.user && (
                        <Button 
                            type="text" 
                            size="small" 
                            icon={<EyeOutlined style={{ color: '#1890ff' }} />} 
                            onClick={() => setSelectedProfileUser(r.user)} 
                            title="Xem chi tiết lịch sử phép"
                        />
                    )}
                </div>
            )
        },
        {
            title: 'Quỹ Phép năm',
            children: [
                { title: `Tồn ${selectedYear - 2}`, width: 70, render: (v: any, r: IAnnualLeave) => <EditableCell value={r.leave_balance_n2} recordId={r.id} dataKey="leave_balance_n2" /> },
                { title: `Tồn ${selectedYear - 1}`, width: 70, render: (v: any, r: IAnnualLeave) => <EditableCell value={r.leave_balance_n1} recordId={r.id} dataKey="leave_balance_n1" /> },
                { title: `Phép ${selectedYear}`, width: 70, render: (v: any, r: IAnnualLeave) => <EditableCell value={r.current_year_leave} recordId={r.id} dataKey="current_year_leave" /> },
                { title: 'TỔNG', width: 70, render: (v: any, r: IAnnualLeave) => <b>{calcTotal(r)}</b> }
            ]
        },
        {
            title: 'Quỹ Nghỉ bù (Tích luỹ)',
            children: [
                { 
                    title: 'Được cấp', 
                    width: 75, 
                    render: (v: any, r: IAnnualLeave) => (
                        <EditableCell 
                            value={r.compensatory_leave_quota || 0} 
                            recordId={r.id} 
                            dataKey="compensatory_leave_quota" 
                        />
                    ) 
                },
                { 
                    title: 'Đã nghỉ', 
                    width: 75, 
                    render: (v: any, r: IAnnualLeave) => (
                        <EditableCell 
                            value={r.compensatory_leave_taken || 0} 
                            recordId={r.id} 
                            dataKey="compensatory_leave_taken" 
                        />
                    ) 
                },
                { 
                    title: 'Tồn bù', 
                    width: 75, 
                    render: (v: any, r: IAnnualLeave) => {
                        const compRemain = calcCompRemain(r);
                        return <b style={{ color: compRemain < 0 ? '#ff4d4f' : compRemain > 0 ? '#722ed1' : '#8c8c8c' }}>{compRemain}</b>;
                    } 
                }
            ]
        },
        {
            title: 'Sử dụng phép năm từng tháng',
            children: Array.from({ length: 12 }, (_, i) => ({
                title: `T${i + 1}`,
                width: 60,
                render: (v: any, r: IAnnualLeave) => <EditableCell value={r[`m${i+1}_taken` as keyof IAnnualLeave]} recordId={r.id} dataKey={`m${i+1}_taken`} width={50} />
            }))
        },
        {
            title: 'Thống kê',
            fixed: 'right',
            children: [
                { title: 'Đã nghỉ', width: 80, fixed: 'right', render: (v: any, r: IAnnualLeave) => <span style={{color: '#faad14'}}>{calcTaken(r)}</span> },
                { 
                    title: 'TỒN PHÉP', width: 95, fixed: 'right',
                    render: (v: any, r: IAnnualLeave) => {
                        const remain = calcRemain(r);
                        return <b style={{ color: remain < 0 ? '#ff4d4f' : '#52c41a' }}>{remain}</b>
                    }
                }
            ]
        }
    ];

    const handleDateRangeChange = (dates: any) => {
        if (dates && dates[0] && dates[1]) {
            const diffDays = dates[1].startOf('day').diff(dates[0].startOf('day'), 'day') + 1;
            if (diffDays > 0) {
                recordForm.setFieldsValue({ days_taken: diffDays });
            }
        }
    };

    const uploadProps = {
        onRemove: (file: any) => {
            const index = fileList.indexOf(file);
            const newFileList = fileList.slice();
            newFileList.splice(index, 1);
            setFileList(newFileList);
        },
        beforeUpload: (file: File) => {
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            const isImage = file.type.startsWith('image/');
            
            if (!isPdf && !isImage) {
                message.error('Vui lòng chọn file PDF hoặc hình ảnh giấy phép nghỉ!');
                return Upload.LIST_IGNORE;
            }

            const isLt10M = file.size / 1024 / 1024 <= 10;
            if (!isLt10M) {
                message.error('File phải nhỏ hơn hoặc bằng 10MB!');
                return Upload.LIST_IGNORE;
            }

            const uploadFile = {
                uid: (file as any).uid || Math.random().toString(),
                name: file.name,
                status: 'done',
                originFileObj: file,
                type: file.type,
                size: file.size
            };
            setFileList([uploadFile]);
            return false;
        },
        fileList,
        maxCount: 1
    };

    return (
        <div style={{ padding: 24, minHeight: '100%', background: '#f0f2f5' }}>
            <Card variant="borderless" style={{ marginBottom: 24, borderRadius: 8 }} styles={{ body: { padding: '16px 24px' } }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Title level={4} style={{ margin: 0 }}>Quản lý Quyển phép năm</Title>
                        <Text type="secondary">Theo dõi, nhập liệu thủ công hoặc import phép từ Excel</Text>
                    </Col>
                    <Col>
                        <Space>
                            {canWrite && (
                                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenRecordModal}>
                                    Ghi nhận nghỉ phép
                                </Button>
                            )}
                            {canWrite && (
                                <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
                                    File Mẫu Excel
                                </Button>
                            )}
                            {canWrite && (
                                <Upload beforeUpload={handleImportExcel} showUploadList={false}>
                                    <Button type="primary" icon={<UploadOutlined />}>
                                        Import Dữ liệu
                                    </Button>
                                </Upload>
                            )}
                        </Space>
                    </Col>
                </Row>
            </Card>

            <Card variant="borderless" style={{ borderRadius: 8 }}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                    <Space>
                        <InputNumber 
                            min={2000} max={2100} 
                            value={selectedYear} 
                            onChange={(v) => v && setSelectedYear(v)} 
                            prefix="Năm:" 
                            style={{ width: 120 }} 
                        />
                        <Input
                            placeholder="Tìm kiếm MSNV hoặc Tên"
                            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ width: 250 }}
                            allowClear
                        />
                    </Space>
                </div>

                <Table 
                    columns={columns} 
                    dataSource={filtered} 
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['10', '15', '30', '50'] }}
                    scroll={{ x: 1500, y: 600 }}
                    size="small"
                    bordered
                    locale={{
                        emptyText: (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={<span style={{ color: '#999' }}>Chưa có dữ liệu phép năm {selectedYear}. Hãy import file Excel hoặc liên hệ HR.</span>}
                            />
                        )
                    }}
                />
            </Card>

            <Modal
                title="Ghi nhận Nghỉ phép nhân viên"
                open={isRecordModalOpen}
                onOk={handleRecordSubmit}
                onCancel={() => {
                    setIsRecordModalOpen(false);
                    setFileList([]);
                }}
                confirmLoading={recordLoading}
                width={560}
                destroyOnClose
            >
                <Form form={recordForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="user_id" label="Nhân viên" rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}>
                        <Select
                            showSearch
                            placeholder="Chọn nhân viên"
                            optionFilterProp="children"
                            filterOption={(input, option: any) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {activeUsers.map(u => (
                                <Option key={u.user_id} value={u.user_id}>
                                    {u.name} ({u.employee_code || u.user_id})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Row gutter={12}>
                        <Col xs={24} sm={12}>
                            <Form.Item 
                                name="leave_type" 
                                label="Loại hình nghỉ" 
                                rules={[{ required: true, message: 'Vui lòng chọn loại hình nghỉ' }]}
                                initialValue="ANNUAL"
                            >
                                <Select>
                                    <Option value="ANNUAL">🏖️ Nghỉ phép năm (Trừ quỹ phép)</Option>
                                    <Option value="COMPENSATORY">⏰ Nghỉ bù ca/lễ (Trừ quỹ bù)</Option>
                                    <Option value="SPECIAL_PAID">💍 Việc riêng có lương (Cưới hỏi, tang...)</Option>
                                    <Option value="SICK_LEAVE">🏥 Nghỉ ốm / Thai sản / BHXH</Option>
                                    <Option value="UNPAID">🚫 Nghỉ việc riêng không lương</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item name="days_taken" label="Số ngày nghỉ" rules={[{ required: true, message: 'Nhập số ngày nghỉ' }]}>
                                <InputNumber min={0.5} max={30} step={0.5} style={{ width: '100%' }} placeholder="VD: 1, 0.5..." />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="date_range" label="Thời gian nghỉ (Từ ngày - Đến ngày)" rules={[{ required: true, message: 'Chọn khoảng ngày' }]}>
                        <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" onChange={handleDateRangeChange} />
                    </Form.Item>

                    <Form.Item name="reason" label="Lý do nghỉ phép">
                        <Input.TextArea rows={3} placeholder="Ghi chú thêm lý do..." />
                    </Form.Item>

                    <Form.Item label="Đính kèm file PDF nghỉ phép (Giấy nghỉ phép / Đơn xin nghỉ)">
                        <Upload {...uploadProps}>
                            <Button icon={<UploadOutlined />}>Tải lên file PDF giấy phép</Button>
                        </Upload>
                        <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                            Đính kèm file scan PDF hoặc ảnh giấy phép nghỉ đã duyệt (tối đa 10MB)
                        </Text>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Profile Modal for viewing Leave History */}
            <ProfileModal
                open={!!selectedProfileUser}
                onCancel={() => setSelectedProfileUser(null)}
                user={selectedProfileUser}
                onUpdateSuccess={() => {}}
                initialSection="leaves"
            />
        </div>
    );
};

export default LeaveManagement;
