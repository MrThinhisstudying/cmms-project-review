import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Input, Space, Row, Col, Typography, InputNumber, message, Upload, Empty, Modal, Form, Select, DatePicker, Descriptions } from 'antd';
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
    const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
    const [recordForm] = Form.useForm();
    const [recordLoading, setRecordLoading] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
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
        setFileList([]);
        setSelectedUserId(null);
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

            const fromDate = dayjs(values.from_date);

            const payload = {
                ...values,
                applied_month: fromDate.month() + 1,
                year: fromDate.year(),
                from_date: values.from_date.toISOString(),
                to_date: values.to_date.toISOString(),
                attachments
            };
            await recordLeave(payload);
            message.success('Ghi nhận nghỉ phép thành công');
            setIsRecordModalOpen(false);
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
                
                // Expecting Header mapping (you can modify based on the final template)
                // Col 0: STT, Col 1: Ten, Col 2: MSNV, Col 3: Nam vao, Col 4: Ton N-2, Col 5: Ton N-1, Col 6: Phep Nam, Col 7: T1, Col 8: T2...
                const rows = json.slice(1); // skip header
                const payload = rows.map(r => ({
                    employee_code: r[2]?.toString(),
                    year: selectedYear,
                    leave_balance_n2: Number(r[4]) || 0,
                    leave_balance_n1: Number(r[5]) || 0,
                    current_year_leave: Number(r[6]) || 0,
                    m1_taken: Number(r[7]) || 0,
                    m2_taken: Number(r[8]) || 0,
                    m3_taken: Number(r[9]) || 0,
                    m4_taken: Number(r[10]) || 0,
                    m5_taken: Number(r[11]) || 0,
                    m6_taken: Number(r[12]) || 0,
                    m7_taken: Number(r[13]) || 0,
                    m8_taken: Number(r[14]) || 0,
                    m9_taken: Number(r[15]) || 0,
                    m10_taken: Number(r[16]) || 0,
                    m11_taken: Number(r[17]) || 0,
                    m12_taken: Number(r[18]) || 0,
                })).filter(r => r.employee_code);

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
            ['STT', 'Họ và tên', 'MSNV', 'Năm làm', `Tồn ${selectedYear - 2}`, `Tồn ${selectedYear - 1}`, `Phép ${selectedYear}`, 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']
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

    const calcTotal = (r: IAnnualLeave) => r.leave_balance_n2 + r.leave_balance_n1 + r.current_year_leave;
    const calcTaken = (r: IAnnualLeave) => r.m1_taken + r.m2_taken + r.m3_taken + r.m4_taken + r.m5_taken + r.m6_taken + r.m7_taken + r.m8_taken + r.m9_taken + r.m10_taken + r.m11_taken + r.m12_taken;
    const calcRemain = (r: IAnnualLeave) => calcTotal(r) - calcTaken(r);

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
                            title="Xem lịch sử nghỉ phép"
                        />
                    )}
                </div>
            )
        },
        {
            title: 'Khởi tạo',
            children: [
                { title: `Tồn ${selectedYear - 2}`, width: 70, render: (v: any, r: IAnnualLeave) => <EditableCell value={r.leave_balance_n2} recordId={r.id} dataKey="leave_balance_n2" /> },
                { title: `Tồn ${selectedYear - 1}`, width: 70, render: (v: any, r: IAnnualLeave) => <EditableCell value={r.leave_balance_n1} recordId={r.id} dataKey="leave_balance_n1" /> },
                { title: `Phép ${selectedYear}`, width: 70, render: (v: any, r: IAnnualLeave) => <EditableCell value={r.current_year_leave} recordId={r.id} dataKey="current_year_leave" /> },
                { title: 'TỔNG', width: 70, render: (v: any, r: IAnnualLeave) => <b>{calcTotal(r)}</b> }
            ]
        },
        {
            title: 'Sử dụng từng tháng',
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
                    title: 'TỔNG TỒN', width: 90, fixed: 'right',
                    render: (v: any, r: IAnnualLeave) => {
                        const remain = calcRemain(r);
                        return <b style={{ color: remain < 0 ? '#ff4d4f' : '#52c41a' }}>{remain}</b>
                    }
                }
            ]
        }
    ];

    const selectedUserInfo = users.find(u => u.user_id === selectedUserId);
    const selectedUserLeave = records.find(r => r.user?.user_id === selectedUserId);

    const handleDateChange = () => {
        const fromDate = recordForm.getFieldValue('from_date');
        const toDate = recordForm.getFieldValue('to_date');
        
        if (fromDate && toDate) {
            // Simple difference in days + 1 (includes start and end date)
            const diffDays = dayjs(toDate).startOf('day').diff(dayjs(fromDate).startOf('day'), 'day') + 1;
            if (diffDays > 0) {
                recordForm.setFieldsValue({ days_taken: diffDays });
            } else {
                recordForm.setFieldsValue({ days_taken: 0 });
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
            const isPdf = file.type === 'application/pdf';
            const isImage = file.type.startsWith('image/');
            
            if (!isPdf && !isImage) {
                message.error('Chỉ được tải lên file PDF hoặc Ảnh!');
                return Upload.LIST_IGNORE;
            }

            const isLt5M = file.size / 1024 / 1024 < 5;
            if (!isLt5M) {
                message.error('File phải nhỏ hơn 5MB!');
                return Upload.LIST_IGNORE;
            }

            const pdfCount = fileList.filter(f => f.type === 'application/pdf').length;
            if (isPdf && pdfCount > 0) {
                message.error('Chỉ được tải lên 1 file PDF duy nhất!');
                return Upload.LIST_IGNORE;
            }
            if (isPdf && fileList.length > 0) {
                message.error('Nếu tải PDF thì không được kèm thêm file khác!');
                return Upload.LIST_IGNORE;
            }

            if (!isPdf && fileList.length >= 3) {
                message.error('Chỉ được tải lên tối đa 3 ảnh!');
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
            setFileList(prev => [...prev, uploadFile]);
            return false;
        },
        fileList,
        multiple: true
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
                title="Ghi nhận nghỉ phép trực tiếp"
                open={isRecordModalOpen}
                onOk={handleRecordSubmit}
                onCancel={() => setIsRecordModalOpen(false)}
                confirmLoading={recordLoading}
                width={700}
                destroyOnClose
            >
                <Form form={recordForm} layout="vertical" style={{ marginTop: 20 }}>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="user_id" label="Nhân viên" rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}>
                                <Select
                                    showSearch
                                    placeholder="Chọn nhân viên"
                                    optionFilterProp="children"
                                    onChange={(val) => setSelectedUserId(val)}
                                    filterOption={(input, option: any) =>
                                        (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {users.map(u => (
                                        <Option key={u.user_id} value={u.user_id}>
                                            {u.name} - {u.employee_code || 'N/A'} - {u.position || 'N/A'}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    {selectedUserInfo && (
                        <Card size="small" style={{ marginBottom: 16, background: '#fafafa', border: '1px solid #d9d9d9' }}>
                            <Descriptions size="small" column={2}>
                                <Descriptions.Item label="Họ và tên"><b>{selectedUserInfo.name}</b></Descriptions.Item>
                                <Descriptions.Item label="Mã nhân viên">{selectedUserInfo.employee_code || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Bộ phận công tác">{selectedUserInfo.department?.name || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Chức vụ/công việc">{selectedUserInfo.position || 'N/A'}</Descriptions.Item>
                            </Descriptions>
                            
                            <div style={{ marginTop: 12 }}>
                                <Text strong>Số ngày nghỉ tiêu chuẩn:</Text>
                                {selectedUserLeave ? (
                                    <Table 
                                        size="small" 
                                        pagination={false} 
                                        bordered
                                        showHeader={false}
                                        columns={[
                                            { dataIndex: 'label', width: '75%' },
                                            { dataIndex: 'value', align: 'right', render: (val) => <b>{val} ngày</b> }
                                        ]}
                                        dataSource={[
                                            { key: '1', label: `1. Tổng số ngày được nghỉ (Năm ${selectedYear})`, value: calcTotal(selectedUserLeave) },
                                            { key: '2', label: '2. Số ngày đã nghỉ', value: calcTaken(selectedUserLeave) },
                                            { key: '3', label: '3. Số ngày còn lại', value: calcRemain(selectedUserLeave) }
                                        ]}
                                        style={{ marginTop: 8 }}
                                    />
                                ) : (
                                    <div style={{ marginTop: 4 }}>
                                        <Text type="warning">Nhân viên này chưa có dữ liệu quỹ phép năm {selectedYear}.</Text>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                    
                    <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 16 }}>Đề nghị được nghỉ phép:</Text>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="from_date" label="Từ ngày" rules={[{ required: true }]}>
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} onChange={handleDateChange} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="to_date" label="Đến ngày" rules={[{ required: true }]}>
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} onChange={handleDateChange} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="days_taken" label="Số ngày tính phép" rules={[{ required: true, message: 'Nhập số ngày bị trừ' }]}>
                                <InputNumber min={0.5} step={0.5} style={{ width: '100%' }} placeholder="VD: 0.5, 1, 1.5" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="location" label="Địa điểm">
                                <Input placeholder="VD: TP. Cần Thơ..." />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="reason" label="Lý do nghỉ" rules={[{ required: true }]}>
                                <Input.TextArea rows={3} placeholder="VD: Giải quyết việc cá nhân..." />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item label="Đính kèm (Đơn xin nghỉ)">
                                <Upload {...uploadProps}>
                                    <Button icon={<UploadOutlined />}>Chọn file Ảnh hoặc PDF</Button>
                                </Upload>
                                <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>Tối đa 3 ảnh, hoặc 1 file PDF duy nhất. (Tối đa 5MB/file)</Text>
                            </Form.Item>
                        </Col>
                    </Row>
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
