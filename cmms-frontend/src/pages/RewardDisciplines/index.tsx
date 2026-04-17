import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Input, Tag, Space, Modal, Form, Select, DatePicker, message, Tooltip, Row, Col, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getRewardDisciplines, createRewardDiscipline, updateRewardDiscipline, deleteRewardDiscipline, IRewardDiscipline } from '../../apis/rewardDisciplines';
import { getAllUsers } from '../../apis/users';
import { getToken } from '../../utils/auth';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const RewardDisciplines: React.FC = () => {
    const [records, setRecords] = useState<IRewardDiscipline[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    
    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<IRewardDiscipline | null>(null);
    const [form] = Form.useForm();
    const [modalLoading, setModalLoading] = useState(false);

    useEffect(() => {
        fetchRecords();
        fetchUsers();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const data = await getRewardDisciplines();
            setRecords(data);
        } catch (error: any) {
            message.error(error.message || 'Lỗi tải danh sách quyết định');
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
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({
            effective_date: dayjs(),
            record_type: 'REWARD'
        });
        setIsModalOpen(true);
    };

    const handleEdit = (record: IRewardDiscipline) => {
        setEditingRecord(record);
        form.setFieldsValue({
            ...record,
            user_id: record.user?.user_id,
            effective_date: dayjs(record.effective_date)
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        Modal.confirm({
            title: 'Xác nhận xoá',
            content: 'Bạn có chắc chắn muốn xoá bản ghi này?',
            okText: 'Xoá',
            cancelText: 'Huỷ',
            okType: 'danger',
            onOk: async () => {
                try {
                    await deleteRewardDiscipline(id);
                    message.success('Xoá thành công');
                    fetchRecords();
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
                effective_date: values.effective_date.toISOString(),
            };

            if (editingRecord) {
                await updateRewardDiscipline(editingRecord.id, payload);
                message.success('Cập nhật thành công');
            } else {
                await createRewardDiscipline(payload);
                message.success('Thêm mới thành công');
            }
            setIsModalOpen(false);
            fetchRecords();
        } catch (error: any) {
            if (error.message) message.error(error.message);
        } finally {
            setModalLoading(false);
        }
    };

    const filtered = records.filter(c => 
        c.user?.name?.toLowerCase().includes(searchText.toLowerCase()) || 
        c.decision_number.toLowerCase().includes(searchText.toLowerCase())
    );

    const columns = [
        {
            title: 'Số QĐ',
            dataIndex: 'decision_number',
            key: 'decision_number',
            fontWeight: 600,
            width: 140
        },
        {
            title: 'Phân loại',
            key: 'record_type',
            width: 120,
            render: (_: any, record: IRewardDiscipline) => (
                <Tag color={record.record_type === 'REWARD' ? 'green' : 'red'}>
                    {record.record_type === 'REWARD' ? 'Khen thưởng' : 'Kỷ luật'}
                </Tag>
            )
        },
        {
            title: 'Nhân viên',
            key: 'user',
            render: (_: any, record: IRewardDiscipline) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{record.user?.name}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{record.user?.department?.name || 'Chưa xếp phòng'}</div>
                </div>
            )
        },
        {
            title: 'Nội dung',
            dataIndex: 'content',
            key: 'content',
            width: 300,
            render: (text: string) => <Text ellipsis={{ tooltip: text }} style={{ maxWidth: 280 }}>{text}</Text>
        },
        {
            title: 'Ngày hiệu lực',
            key: 'effective_date',
            width: 130,
            render: (_: any, record: IRewardDiscipline) => (
                <span style={{ fontWeight: 500 }}>{dayjs(record.effective_date).format('DD/MM/YYYY')}</span>
            )
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 100,
            align: 'center' as const,
            render: (_: any, record: IRewardDiscipline) => (
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
                        <Title level={4} style={{ margin: 0 }}>Quản lý Khen thưởng - Kỷ luật</Title>
                        <Text type="secondary">Theo dõi các quyết định thi đua khen thưởng và kỷ luật nhân sự</Text>
                    </Col>
                    <Col>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large">
                            Thêm Bản ghi
                        </Button>
                    </Col>
                </Row>
            </Card>

            <Card variant="borderless" style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                    <Input
                        placeholder="Tìm kiếm theo Tên NV hoặc Số quyết định"
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
                title={editingRecord ? 'Cập nhật Thông tin' : 'Thêm mới Quyết định'}
                open={isModalOpen}
                onOk={handleModalOk}
                onCancel={() => setIsModalOpen(false)}
                confirmLoading={modalLoading}
                width={650}
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
                                        <Option key={u.user_id} value={u.user_id}>{u.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="record_type" label="Phân loại" rules={[{ required: true }]}>
                                <Select>
                                    <Option value="REWARD">Khen thưởng</Option>
                                    <Option value="DISCIPLINE">Kỷ luật</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="decision_number" label="Số quyết định" rules={[{ required: true, message: 'Vui lòng nhập số QĐ' }]}>
                                <Input placeholder="VD: 552/QĐ-ACV" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="effective_date" label="Ngày hiệu lực" rules={[{ required: true }]}>
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="content" label="Nội dung" rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}>
                                <TextArea rows={4} placeholder="Nhập tóm tắt nội dung khen thưởng / kỷ luật..." />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
};

export default RewardDisciplines;
