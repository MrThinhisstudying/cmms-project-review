import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Space, message, Popconfirm, Card, Typography, Input, Row, Col, Upload } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { ITrainingProgram } from '../../types/certificates.types';
import certificatesApi from '../../apis/certificates';
import TrainingProgramModal from '../Users/components/TrainingProgramModal';
import * as XLSX from 'xlsx';

const { Title } = Typography;

const TrainingPrograms = () => {
    const [programs, setPrograms] = useState<ITrainingProgram[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProgram, setSelectedProgram] = useState<ITrainingProgram | null>(null);

    // Search state
    const [searchText, setSearchText] = useState('');

    const fetchPrograms = async () => {
        setLoading(true);
        try {
            const data = await certificatesApi.getTrainingPrograms();
            setPrograms(data);
        } catch (error) {
            console.error('Failed to fetch training programs:', error);
            message.error('Lỗi khi tải danh sách chương trình đào tạo');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrograms();
    }, []);

    const filteredPrograms = useMemo(() => {
        let result = programs;
        if (searchText.trim()) {
            const lower = searchText.toLowerCase();
            result = result.filter(p => p.name?.toLowerCase().includes(lower));
        }
        return result;
    }, [programs, searchText]);

    const handleAdd = () => {
        setSelectedProgram(null);
        setIsModalOpen(true);
    };

    const handleEdit = (record: ITrainingProgram) => {
        setSelectedProgram(record);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await certificatesApi.deleteTrainingProgram(id);
            message.success('Xóa chương trình đào tạo thành công');
            fetchPrograms();
        } catch (error) {
            console.error('Failed to delete training program:', error);
            message.error('Lỗi khi xóa chương trình đào tạo, có thể đang được sử dụng ở nơi khác');
        }
    };

    const handleModalOk = async (values: any) => {
        setLoading(true);
        try {
            if (selectedProgram) {
                await certificatesApi.updateTrainingProgram(selectedProgram.id, values);
                message.success('Cập nhật chương trình đào tạo thành công');
            } else {
                await certificatesApi.createTrainingProgram(values);
                message.success('Thêm mới chương trình đào tạo thành công');
            }
            setIsModalOpen(false);
            fetchPrograms();
        } catch (error) {
            console.error('Error saving program:', error);
            message.error('Lỗi lưu thông tin');
        } finally {
            setLoading(false);
        }
    };

    // Excel Import Logic
    const handleImportExcel = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                setLoading(true);
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                
                // header: 1 means parsing as an array of arrays
                const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                let successCount = 0;
                let errorCount = 0;
                
                // Bỏ qua dòng 0 vì là header ("Tên CCCM / Chương trình đào tạo", "Thời hạn định kỳ (tháng)")
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || row.length === 0 || !row[0]) continue; // Bỏ qua dòng rỗng

                    const name = row[0]?.toString().trim();
                    const validity_months = parseInt(row[1]) || 12; // Mặc định 12 tháng nếu không điền

                    if (name) {
                        try {
                            await certificatesApi.createTrainingProgram({ name, validity_months });
                            successCount++;
                        } catch (err) {
                            console.error(`Lỗi import row ${i}:`, err);
                            errorCount++;
                        }
                    }
                }
                
                message.success(`Đã import thành công ${successCount} chương trình.${errorCount > 0 ? ` Lỗi ${errorCount} dòng.` : ''}`);
                fetchPrograms(); // Refresh data
            } catch (error) {
                console.error(error);
                message.error('Lỗi đọc file Excel. Định dạng không hợp lệ.');
            } finally {
                setLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
        return false; // Prevent auto upload behavior of antd Upload
    };

    // Tải file mẫu
    const handleDownloadTemplate = () => {
        const ws_data = [
            ['Tên CCCM / Chương trình đào tạo', 'Thời hạn định kỳ (tháng)'],
            ['Nghiệp vụ Phòng cháy chữa cháy', 12],
            ['An toàn lao động Nhóm 1', 24]
        ];
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Mau_Import");
        XLSX.writeFile(wb, "Mau_Import_CTDT.xlsx");
    };

    const columns = [
        {
            title: 'STT', key: 'index',
            render: (_: any, __: any, index: number) => index + 1,
            width: 60, align: 'center' as const,
        },
        {
            title: 'Tên CCCM / Chương trình đào tạo', dataIndex: 'name', key: 'name',
        },
        {
            title: 'Thời hạn định kỳ (Tháng)', dataIndex: 'validity_months', key: 'validity_months',
            width: 250, align: 'center' as const,
        },
        {
            title: 'Hành động', key: 'action', width: 150, align: 'center' as const,
            render: (_: any, record: ITrainingProgram) => (
                <Space size="small">
                    <Button type="text" size="small" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => handleEdit(record)} />
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa chương trình này?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                    >
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Card>
            <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>Quản lý Chương trình đào tạo / CCCM</Title>
                <Space>
                    <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                        Tải file mẫu
                    </Button>
                    <Upload beforeUpload={handleImportExcel} showUploadList={false} accept=".xlsx, .xls">
                        <Button style={{ background: '#52c41a', color: '#fff', border: 'none' }} icon={<UploadOutlined />}>
                            Import Excel
                        </Button>
                    </Upload>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        Thêm thủ công
                    </Button>
                </Space>
            </div>

            <Row gutter={12} style={{ marginBottom: 16 }}>
                <Col span={12}>
                    <Input
                        placeholder="Tìm kiếm theo tên chương trình..."
                        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        allowClear
                    />
                </Col>
                <Col span={12} style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ color: '#999', fontSize: 13 }}>
                        Hiển thị {filteredPrograms.length} / {programs.length} chương trình
                    </span>
                </Col>
            </Row>

            <Table
                columns={columns}
                dataSource={filteredPrograms}
                rowKey="id"
                loading={loading}
                bordered
                pagination={{
                    defaultPageSize: 15,
                    showSizeChanger: true,
                    pageSizeOptions: ['15', '30', '50'],
                }}
            />

            <TrainingProgramModal
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={handleModalOk}
                loading={loading}
                initialValues={selectedProgram}
            />
        </Card>
    );
};

export default TrainingPrograms;
