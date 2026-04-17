import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Input, Tag, Space, Modal, Form, Select, DatePicker, message, Tooltip, Row, Col, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getLaborContracts, createLaborContract, updateLaborContract, deleteLaborContract, ILaborContract } from '../../apis/laborContracts';
import { getAllUsers } from '../../apis/users';
import { getToken } from '../../utils/auth';

const { Title, Text } = Typography;
const { Option } = Select;

const LaborContracts: React.FC = () => {
    const [contracts, setContracts] = useState<ILaborContract[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    
    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContract, setEditingContract] = useState<ILaborContract | null>(null);
    const [form] = Form.useForm();
    const [modalLoading, setModalLoading] = useState(false);

    useEffect(() => {
        fetchContracts();
        fetchUsers();
    }, []);

    const fetchContracts = async () => {
        setLoading(true);
        try {
            const data = await getLaborContracts();
            setContracts(data);
        } catch (error: any) {
            message.error(error.message || 'Lỗi tải danh sách hợp đồng');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await getAllUsers(getToken());
            setUsers(data);
        } catch (error) {
            message.error('Lỗi tải danh sách nhân viên');
        }
    };

    const handleAdd = () => {
        setEditingContract(null);
        form.resetFields();
        // default dates
        form.setFieldsValue({
            start_date: dayjs(),
            status: 'ACTIVE',
            contract_type: '12_MONTHS'
        });
        setIsModalOpen(true);
    };

    const handleEdit = (record: ILaborContract) => {
        setEditingContract(record);
        form.setFieldsValue({
            ...record,
            user_id: record.user?.user_id,
            start_date: dayjs(record.start_date),
            end_date: record.end_date ? dayjs(record.end_date) : undefined
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        Modal.confirm({
            title: 'Xác nhận xoá',
            content: 'Bạn có chắc chắn muốn xoá hợp đồng này?',
            okText: 'Xoá',
            cancelText: 'Huỷ',
            okType: 'danger',
            onOk: async () => {
                try {
                    await deleteLaborContract(id);
                    message.success('Xoá thành công');
                    fetchContracts();
                } catch (error: any) {
                    message.error(error.message || 'Xoá thất bại');
                }
            }
        });
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            setModalLoading(true);

            const payload: any = {
                ...values,
                start_date: values.start_date.toISOString(),
                end_date: values.end_date ? values.end_date.toISOString() : undefined
            };

            if (editingContract) {
                await updateLaborContract(editingContract.id, payload);
                message.success('Cập nhật thành công');
            } else {
                await createLaborContract(payload);
                message.success('Thêm mới thành công');
            }
            setIsModalOpen(false);
            fetchContracts();
        } catch (error: any) {
            // Validation error or Request error
            if (error.message) message.error(error.message);
        } finally {
            setModalLoading(false);
        }
    };

    const getContractTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            '1_MONTH': '1 Tháng',
            'PROBATION': 'Thử việc',
            '12_MONTHS': '1 Năm',
            '24_MONTHS': '2 Năm',
            '36_MONTHS': '3 Năm',
            'INDEFINITE': 'Vô thời hạn'
        };
        return types[type] || type;
    };

    const getStatusDisplay = (record: ILaborContract) => {
        if (record.status === 'TERMINATED') return <Tag color="red">Chấm dứt</Tag>;
        if (record.status === 'EXPIRED') return <Tag color="orange">Đã hết hạn</Tag>;
        
        // Check expiring actively
        if (record.end_date) {
            const end = dayjs(record.end_date);
            const now = dayjs();
            if (end.isBefore(now)) return <Tag color="red">Hết hạn (Chưa cập nhật)</Tag>;
            const daysLeft = end.diff(now, 'day');
            if (daysLeft <= 30) return (
                <Tag color="warning" icon={<WarningOutlined />}>
                    Sắp hết hạn ({daysLeft} ngày)
                </Tag>
            );
        }
        return <Tag color="green">Còn hiệu lực</Tag>;
    };

    const filtered = contracts.filter(c => 
        c.user?.name?.toLowerCase().includes(searchText.toLowerCase()) || 
        c.contract_number.toLowerCase().includes(searchText.toLowerCase())
    );

    const columns = [
        {
            title: 'Mã HĐ',
            dataIndex: 'contract_number',
            key: 'contract_number',
            fontWeight: 600,
            width: 120
        },
        {
            title: 'Nhân viên',
            key: 'user',
            render: (_: any, record: ILaborContract) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{record.user?.name}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{record.user?.department?.name || 'Chưa xếp phòng'}</div>
                </div>
            )
        },
        {
            title: 'Loại hợp đồng',
            key: 'type',
            width: 130,
            render: (_: any, record: ILaborContract) => getContractTypeLabel(record.contract_type)
        },
        {
            title: 'Thời hạn',
            key: 'duration',
            width: 190,
            render: (_: any, record: ILaborContract) => (
                <div>
                    <span style={{color: '#52c41a'}}>{dayjs(record.start_date).format('DD/MM/YYYY')}</span>
                    &nbsp;-&nbsp;
                    <span style={{color: '#f5222d'}}>{record.end_date ? dayjs(record.end_date).format('DD/MM/YYYY') : 'Vô thời hạn'}</span>
                </div>
            )
        },
        {
            title: 'Trạng thái',
            key: 'status',
            width: 160,
            render: (_: any, record: ILaborContract) => getStatusDisplay(record)
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 100,
            align: 'center' as const,
            render: (_: any, record: ILaborContract) => (
                <Space>
                    <Tooltip title="Chỉnh sửa">
                        <Button type="text" icon={<EditOutlined style={{color: '#1890ff'}}/>} onClick={() => handleEdit(record)} />
                    </Tooltip>
                    <Tooltip title="Xoá">
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
                    </Tooltip>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24, minHeight: '100%', background: '#f0f2f5' }}>
            <Card variant="borderless" style={{ marginBottom: 24, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }} styles={{ body: { padding: '16px 24px' } }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Title level={4} style={{ margin: 0 }}>Quản lý Hợp đồng lao động</Title>
                        <Text type="secondary">Quản lý và cảnh báo thời hạn hợp đồng của toàn bộ nhân sự</Text>
                    </Col>
                    <Col>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large">
                            Thêm Hợp đồng
                        </Button>
                    </Col>
                </Row>
            </Card>

            <Card variant="borderless" style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                    <Input
                        placeholder="Tìm kiếm theo Tên NV hoặc Mã Hợp đồng"
                        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: 350 }}
                        allowClear
                    />
                </div>

                <Table 
                    columns={columns} 
                    dataSource={filtered} 
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 15 }}
                />
            </Card>

            <Modal
                title={editingContract ? 'Cập nhật Hợp đồng' : 'Thêm mới Hợp đồng'}
                open={isModalOpen}
                onOk={handleModalOk}
                onCancel={() => setIsModalOpen(false)}
                confirmLoading={modalLoading}
                width={700}
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="user_id" label="Nhân viên" rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}>
                                <Select
                                    showSearch
                                    placeholder="Chọn nhân viên"
                                    optionFilterProp="children"
                                    filterOption={(input, option: any) =>
                                        (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {users.map(u => (
                                        <Option key={u.user_id} value={u.user_id}>{u.name} - {u.employee_code}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="contract_number" label="Số hợp đồng" rules={[{ required: true, message: 'Vui lòng nhập số HĐ' }]}>
                                <Input placeholder="VD: 01/2026/HĐLĐ" />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="contract_type" label="Loại hợp đồng" rules={[{ required: true }]}>
                                <Select>
                                    <Option value="1_MONTH">1 Tháng</Option>
                                    <Option value="PROBATION">Thử việc</Option>
                                    <Option value="12_MONTHS">1 Năm</Option>
                                    <Option value="24_MONTHS">2 Năm</Option>
                                    <Option value="36_MONTHS">3 Năm</Option>
                                    <Option value="INDEFINITE">Vô thời hạn</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="job_title" label="Chức danh trong hợp đồng">
                                <Input placeholder="VD: Chuyên viên kỹ thuật" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="start_date" label="Ngày bắt đầu" rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}>
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="end_date" label="Ngày kết thúc">
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Trống nếu vô thời hạn" />
                            </Form.Item>
                        </Col>
                    </Row>

                    {editingContract && (
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="status" label="Trạng thái hợp đồng">
                                    <Select>
                                        <Option value="ACTIVE">Còn hiệu lực</Option>
                                        <Option value="EXPIRED">Đã hết hạn</Option>
                                        <Option value="TERMINATED">Đã chấm dứt</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                    )}
                </Form>
            </Modal>
        </div>
    );
};

export default LaborContracts;
