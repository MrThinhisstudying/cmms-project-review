import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Typography, Input, Button, Space, Avatar, Tag, Tooltip, Select, Upload, message } from 'antd';
import { SearchOutlined, ExportOutlined, EditOutlined, DeleteOutlined, UserOutlined, UploadOutlined } from '@ant-design/icons';
import { ICreateUser, IUser } from '../../types/user.types';
import { ILaborContract, getLaborContracts } from '../../apis/laborContracts';
import { getAllUsers, createUser, updateUser } from '../../apis/users';
import { getToken } from '../../utils/auth';
import { getBackendImageUrl } from '../../utils/imageUrl';
import ProfileDrawer from '../Users/components/ProfileModal';
import { exportUsersToExcel, parseExcelFile } from '../../utils/excelHelper';

const Employees = () => {
    const [users, setUsers] = useState<IUser[]>([]);
    const [contracts, setContracts] = useState<Record<number, ILaborContract>>({});
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

    // Context for Profile Drawer
    const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
    const [openProfileDrawer, setOpenProfileDrawer] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const token = getToken();
                // Tải song song Danh sách nhân viên và Tất cả hợp đồng lao động
                const [uData, cData] = await Promise.all([
                    getAllUsers(token),
                    getLaborContracts()
                ]);

                // Map hợp đồng mới nhất (ACTIVE) vào ID của nhân viên
                const activeContractsMap: Record<number, ILaborContract> = {};
                cData.forEach(c => {
                    if (c.status === 'ACTIVE' && c.user?.user_id) {
                        // Nếu có nhiều hợp đồng active, ưu tiên hợp đồng mới được tạo
                        activeContractsMap[c.user.user_id] = c;
                    }
                });

                setUsers(uData);
                setContracts(activeContractsMap);
            } catch (error) {
                console.error("Failed to fetch employees logic", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleExportExcel = async () => {
        try {
            message.loading({ content: 'Đang xuất file Excel...', key: 'export' });
            await exportUsersToExcel(users);
            message.success({ content: 'Xuất Excel thành công!', key: 'export' });
        } catch (err) {
            message.error({ content: 'Lỗi xuất Excel', key: 'export' });
        }
    };

    const handleImportFile = async (file: File) => {
        try {
            setImporting(true);
            message.loading({ content: 'Đang phân tích và đồng bộ dữ liệu...', key: 'import' });
            
            // 1. Phân tích file Excel
            const rows = await parseExcelFile(file, users);
            if (rows.length === 0) {
                message.warning({ content: 'File không có dữ liệu hợp lệ', key: 'import' });
                return false; // Prevent upload component default behavior
            }

            const token = getToken();
            let newCount = 0;
            let updateCount = 0;
            let errorCount = 0;

            // 2. Đồng bộ ngầm (Magic Sync)
            for (const row of rows) {
                try {
                    if (row.isExisting && row.existingUserId) {
                        const existingUser = users.find(u => u.user_id === row.existingUserId);
                        if (!existingUser) continue;
                        
                        // NGƯỜI CŨ: Đắp dữ liệu Excel lên trên dữ liệu gốc (để vượt qua PUT Validate)
                        // TUYỆT ĐỐI không thay đổi email, role và không nhắc tới password
                        const payload: ICreateUser = {
                            name: row.name || existingUser.name,
                            employee_code: row.employee_code || existingUser.employee_code,
                            email: existingUser.email, 
                            role: existingUser.role,
                            position: row.position || existingUser.position,
                            date_of_birth: row.date_of_birth || existingUser.date_of_birth,
                            place_of_birth: row.place_of_birth || existingUser.place_of_birth,
                            phone_number: row.phone_number || existingUser.phone_number,
                            citizen_identification_card: row.citizen_identification_card || existingUser.citizen_identification_card || '000000000000',
                            cccd_issue_date: row.cccd_issue_date || existingUser.cccd_issue_date,
                            permanent_address: row.permanent_address || existingUser.permanent_address,
                            temporary_address: row.temporary_address || existingUser.temporary_address,
                            hometown: row.hometown || existingUser.hometown,
                        };
                        await updateUser(row.existingUserId, payload, token);
                        updateCount++;
                    } else if (!row.isExisting && row.email) {
                        // NGƯỜI MỚI: Khởi tạo hoàn toàn, sinh Mật khẩu mặc định
                        const payload: ICreateUser = {
                            name: row.name,
                            employee_code: row.employee_code,
                            email: row.email,
                            password: 'Default@123', // Mật khẩu bắt buộc có chữ hoa, chữ thường và ký tự đặc biệt
                            role: 'OPERATOR', // Enum role đúng chuẩn hệ thống
                            status: 'active',
                            position: row.position,
                            date_of_birth: row.date_of_birth || undefined,
                            place_of_birth: row.place_of_birth || undefined,
                            phone_number: row.phone_number || undefined,
                            citizen_identification_card: row.citizen_identification_card || '000000000000', // API bắt buộc
                            cccd_issue_date: row.cccd_issue_date || undefined,
                            permanent_address: row.permanent_address || undefined,
                            temporary_address: row.temporary_address || undefined,
                            hometown: row.hometown || undefined,
                        };
                        await createUser(payload, token);
                        newCount++;
                    } else {
                        // Người mới nhưng thiếu Email -> Bỏ qua vì không thể tạo tài khoản
                        errorCount++;
                    }
                } catch (err) {
                    errorCount++;
                }
            }

            message.success({ 
                content: `Đồng bộ thành công! Mới: ${newCount} | Cập nhật: ${updateCount} | Bỏ qua/Lỗi: ${errorCount}`, 
                key: 'import',
                duration: 5
            });

            // Tải lại bảng ngay lập tức
            const [uData, cData] = await Promise.all([ getAllUsers(token), getLaborContracts() ]);
            const activeMap: Record<number, ILaborContract> = {};
            cData.forEach(c => { if (c.status === 'ACTIVE' && c.user?.user_id) activeMap[c.user.user_id] = c; });
            setUsers(uData);
            setContracts(activeMap);

        } catch (err: any) {
            console.error(err);
            message.error({ content: err.message || 'Lỗi hệ thống khi xử lý file Excel', key: 'import' });
        } finally {
            setImporting(false);
        }
        return false; // Prevent automatic upload
    };

    // Derived states cho filtering
    const filteredUsers = useMemo(() => {
        let result = users;

        if (searchText) {
            const lowerText = searchText.toLowerCase();
            result = result.filter(u => 
                u.name?.toLowerCase().includes(lowerText) || 
                u.employee_code?.toLowerCase().includes(lowerText) ||
                u.email?.toLowerCase().includes(lowerText)
            );
        }

        if (statusFilter) {
            result = result.filter(u => {
                const contract = contracts[u.user_id];
                if (statusFilter === 'NONE') return !contract;
                return contract?.contract_type === statusFilter;
            });
        }

        return result;
    }, [users, searchText, statusFilter, contracts]);

    // Format Tag Trạng thái theo loại hợp đồng
    const renderStatusBadge = (contract: ILaborContract | undefined) => {
        if (!contract) return <Tag color="default" style={{ borderRadius: 12 }}>Chưa có HĐ</Tag>;

        switch (contract.contract_type) {
            case '1_MONTH':
                return <Tag color="volcano" style={{ borderRadius: 12, border: 'none', background: '#fff2e8', color: '#d4380d' }}>Học việc</Tag>;
            case 'PROBATION':
                return <Tag color="magenta" style={{ borderRadius: 12, border: 'none', background: '#fff0f6', color: '#c41d7f' }}>Thử việc</Tag>;
            case '12_MONTHS':
                return <Tag color="blue" style={{ borderRadius: 12, border: 'none', background: '#e6f7ff', color: '#096dd9' }}>12 Tháng</Tag>;
            case '24_MONTHS':
                return <Tag color="cyan" style={{ borderRadius: 12, border: 'none', background: '#e6fffb', color: '#08979c' }}>24 Tháng</Tag>;
            case '36_MONTHS':
                return <Tag color="geekblue" style={{ borderRadius: 12, border: 'none', background: '#f0f5ff', color: '#1d39c4' }}>36 Tháng</Tag>;
            case 'INDEFINITE':
                return <Tag color="green" style={{ borderRadius: 12, border: 'none', background: '#f6ffed', color: '#389e0d' }}>Vô thời hạn</Tag>;
            default:
                return <Tag color="default" style={{ borderRadius: 12 }}>{contract.contract_type}</Tag>;
        }
    };

    const handleViewDetail = (user: IUser) => {
        setSelectedUser(user);
        setOpenProfileDrawer(true);
    };

    const columns = [
        {
            title: 'STT',
            key: 'index',
            width: 60,
            render: (_: any, __: any, index: number) => index + 1
        },
        {
            title: 'MSNV',
            dataIndex: 'employee_code',
            key: 'employee_code',
            width: 110,
            render: (text: string) => <span style={{ fontWeight: 500, color: '#8c8c8c' }}>{text || 'N/A'}</span>
        },
        {
            title: 'Họ và Tên',
            key: 'name',
            render: (_: any, record: IUser) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar 
                        src={getBackendImageUrl(record.avatar)} 
                        icon={!record.avatar && <UserOutlined />} 
                        style={{ border: '1px solid #e8e8e8' }}
                    />
                    <span style={{ fontWeight: 600, color: '#262626' }}>{record.name}</span>
                </div>
            )
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: (text: string) => <span style={{ color: '#595959' }}>{text}</span>
        },
        {
            title: 'Chức vụ',
            dataIndex: 'position',
            key: 'position',
            width: 180,
            render: (text: string) => <span style={{ color: '#595959' }}>{text || '-'}</span>
        },
        {
            title: 'Trạng thái',
            key: 'status',
            align: 'center' as const,
            width: 150,
            render: (_: any, record: IUser) => renderStatusBadge(contracts[record.user_id])
        },
        {
            title: 'Hành động',
            key: 'action',
            align: 'center' as const,
            width: 100,
            render: (_: any, record: IUser) => (
                <Space size="middle">
                    <Tooltip title="Xem Hồ sơ Nhân sự">
                        <Button type="text" icon={<EditOutlined style={{ color: '#8c8c8c' }} />} onClick={() => handleViewDetail(record)} />
                    </Tooltip>
                    <Tooltip title="Xoá">
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Tooltip>
                </Space>
            )
        }
    ];

    return (
        <Card bodyStyle={{ padding: '24px 32px' }} bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Space align="center" size="middle">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Typography.Title level={4} style={{ margin: 0, fontWeight: 700 }}>
                            Quản lý nhân viên
                        </Typography.Title>
                        <Tag style={{ borderRadius: 12, border: 'none', background: '#f5f5f5', color: '#595959', fontSize: 13, padding: '2px 8px' }}>
                            Tổng số: {users.length}
                        </Tag>
                    </div>
                </Space>

                <Space size="middle">
                    <Input 
                        placeholder="Tìm kiếm theo Tên, MSNV..." 
                        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        style={{ width: 280, borderRadius: 6 }}
                        allowClear
                    />
                    <Select 
                        placeholder="Lọc Hợp đồng"
                        allowClear 
                        style={{ width: 140, borderRadius: 6 }}
                        value={statusFilter}
                        onChange={setStatusFilter}
                    >
                        <Select.Option value="1_MONTH">Học việc</Select.Option>
                        <Select.Option value="PROBATION">Thử việc</Select.Option>
                        <Select.Option value="12_MONTHS">12 Tháng</Select.Option>
                        <Select.Option value="24_MONTHS">24 Tháng</Select.Option>
                        <Select.Option value="36_MONTHS">36 Tháng</Select.Option>
                        <Select.Option value="INDEFINITE">Vô thời hạn</Select.Option>
                        <Select.Option value="NONE">Chưa có HĐ</Select.Option>
                    </Select>
                    
                    <Upload 
                        beforeUpload={handleImportFile}
                        accept=".xlsx, .xls"
                        showUploadList={false}
                        disabled={importing}
                    >
                        <Tooltip title="Chỉ cần 1 click chọn file. Nhân viên mới sẽ tự động được tạo (Mật khẩu mặc định: Default@123). Nhân viên cũ sẽ đồng bộ các cập nhật, giữ nguyên vẹn Email và Mật khẩu.">
                            <Button icon={<UploadOutlined />} loading={importing}>Import Excel</Button>
                        </Tooltip>
                    </Upload>

                    <Button icon={<ExportOutlined />} onClick={handleExportExcel}>Export Excel</Button>
                </Space>
            </div>

            <Table 
                columns={columns} 
                dataSource={filteredUsers}
                rowKey="user_id"
                loading={loading}
                pagination={{
                    position: ['bottomLeft'], // Đưa phân trang về góc dưới bên trái giống hình
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '25', '50']
                }}
            />

            {/* Profile Drawer: Re-used from Users Page */}
            {selectedUser && (
                <ProfileDrawer
                    open={openProfileDrawer}
                    user={selectedUser}
                    onCancel={() => {
                        setOpenProfileDrawer(false);
                        setSelectedUser(null);
                    }}
                    onUpdateSuccess={() => {}}
                />
            )}
        </Card>
    );
};

export default Employees;
