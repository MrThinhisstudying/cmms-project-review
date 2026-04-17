import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Input, Space, Row, Col, Typography, InputNumber, Tooltip, message, Upload, Empty } from 'antd';
import { SearchOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { getAnnualLeaves, updateAnnualLeave, importAnnualLeaves, IAnnualLeave } from '../../apis/annualLeaves';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const LeaveManagement: React.FC = () => {
    const [records, setRecords] = useState<IAnnualLeave[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedYear, setSelectedYear] = useState<number>(dayjs().year());
    
    useEffect(() => {
        fetchRecords();
    }, [selectedYear]);

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

    const EditableCell = ({ value, recordId, dataKey, width = 60 }: any) => (
        <InputNumber 
            value={value} 
            onChange={(val) => handleCellChange(recordId, dataKey, val)} 
            style={{ width }} 
            controls={false}
            size="small"
        />
    );

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
            render: (_: any, r: IAnnualLeave) => r.user?.name
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
                            <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
                                File Mẫu Excel
                            </Button>
                            <Upload beforeUpload={handleImportExcel} showUploadList={false}>
                                <Button type="primary" icon={<UploadOutlined />}>
                                    Import Dữ liệu
                                </Button>
                            </Upload>
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
        </div>
    );
};

export default LeaveManagement;
