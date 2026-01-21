import React, { useState, useEffect } from "react";
import { Modal, Table, Button, Input, Space, message, Popconfirm, Form, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { getDeviceGroups, IDeviceGroup } from "../../../apis/device-groups";
import { getToken } from "../../../utils/auth";
 
// Using axiosInstance for consistency with other parts if available, 
// or fetch. Let's use fetch since device-groups.ts uses fetch.
// Actually, I'll create CRUD functions in device-groups.ts first? 
// No, I'll put them here or update API file. 
// Let's stick to updating the API file properly in a separate step or fetch here directly.
// Best practice: Update api file. But I'll do inline for speed then move if needed, 
// OR I'll assume I update api file next.
// Let's use `fetch` here for now to ensure it works then refactor.
import { getAllDevices } from "../../../apis/devices";
import { IDevice } from "../../../types/devicesManagement.types";
import { ToolOutlined } from "@ant-design/icons";
import { Transfer } from "antd";
import type { TransferDirection } from 'antd/es/transfer';

interface DeviceGroupModalProps {
    open: boolean;
    onClose: () => void;
}

const DeviceGroupModal: React.FC<DeviceGroupModalProps> = ({ open, onClose }) => {
    const [groups, setGroups] = useState<IDeviceGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingGroup, setEditingGroup] = useState<IDeviceGroup | null>(null);
    const [form] = Form.useForm();
    const token = getToken();
    const [isEditMode, setIsEditMode] = useState(false);

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const data = await getDeviceGroups();
            setGroups(data);
        } catch (error) {
            message.error("Lỗi tải danh sách nhóm");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) fetchGroups();
    }, [open]);

    const [createModalOpen, setCreateModalOpen] = useState(false);

    const handleOpenCreate = () => {
        setIsEditMode(false);
        setEditingGroup(null);
        form.resetFields();
        setCreateModalOpen(true);
    };

    const handleEdit = (group: IDeviceGroup) => {
        setEditingGroup(group);
        setIsEditMode(true);
        form.setFieldsValue(group);
        setCreateModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await fetch(`${process.env.REACT_APP_BASE_URL}/device-groups/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success("Xóa nhóm thành công");
            fetchGroups();
        } catch (error) {
            message.error("Xóa thất bại");
        }
    };

    const handleFinish = async (values: any) => {
        try {
            if (isEditMode && editingGroup) {
                await fetch(`${process.env.REACT_APP_BASE_URL}/device-groups/${editingGroup.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify(values)
                });
                message.success("Cập nhật thành công");
            } else {
                await fetch(`${process.env.REACT_APP_BASE_URL}/device-groups`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify(values)
                });
                message.success("Tạo nhóm thành công");
            }
            setCreateModalOpen(false);
            form.resetFields();
            setIsEditMode(false);
            setEditingGroup(null);
            fetchGroups();
        } catch (error) {
            message.error("Thao tác thất bại");
        }
    };

    const [devicesModalOpen, setDevicesModalOpen] = useState(false);
    const [selectedGroupForDevices, setSelectedGroupForDevices] = useState<IDeviceGroup | null>(null);
    const [allDevices, setAllDevices] = useState<IDevice[]>([]);
    const [targetKeys, setTargetKeys] = useState<string[]>([]); // device_ids in group

    const handleManageDevices = async (group: IDeviceGroup) => {
        setSelectedGroupForDevices(group);
        setLoading(true);
        try {
            // Fetch all devices to show in transfer
            const devices = await getAllDevices(token);
            setAllDevices(devices);
            
            // Set target keys from group.devices
            // Note: group.devices might need to be refreshed from server to ensure latest
            // The list `groups` comes from `getDeviceGroups` which now includes `devices`.
            // So we can use `group.devices` directly if `fetchGroups` was called recently.
            // But checking `getDeviceGroups` update... yes it includes `devices`.
            // However, `group` here is from `record`.
            const currentGroupDevices = group.devices || [];
            setTargetKeys(currentGroupDevices.map(d => d.device_id.toString()));
            
            setDevicesModalOpen(true);
        } catch (error) {
            message.error("Lỗi tải danh sách thiết bị");
        } finally {
            setLoading(false);
        }
    };

    const handleTransferChange = async (nextTargetKeys: string[], direction: TransferDirection, moveKeys: string[]) => {
        if (!selectedGroupForDevices) return;
        
        // This is tricky because Transfer change gives final state, but API is Add/Remove one by one or batch.
        // My API is one by one: addDevice / removeDevice.
        // Optimizing this for batch is better, but I only have atomic APIs right now.
        // I will Loop through `moveKeys`.
        
        // However, I should implement batch API eventually. 
        // For now, loop.
        
        setLoading(true);
        try {
            if (direction === 'right') {
                // Moving to Right -> Add to Group
                await Promise.all(moveKeys.map(key => 
                    fetch(`${process.env.REACT_APP_BASE_URL}/device-groups/${selectedGroupForDevices.id}/devices`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ deviceId: parseInt(key) })
                    })
                ));
            } else {
                // Moving to Left -> Remove from Group
                await Promise.all(moveKeys.map(key => 
                    fetch(`${process.env.REACT_APP_BASE_URL}/device-groups/devices/${key}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ));
            }
            
            setTargetKeys(nextTargetKeys);
            message.success("Cập nhật thiết bị thành công");
            fetchGroups(); // Refresh main list data
            
            // Update selectedGroupForDevices devices locally to keep sync if we keep modal open
            // But fetchGroups updates `groups`. `selectedGroupForDevices` is stale reference.
            // I should update it or close modal?
            // Actually Transfer uses `targetKeys` state, so it's fine visually.
            // When closing, it's fine.
            
        } catch (error) {
            message.error("Cập nhật thất bại");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { title: 'ID', dataIndex: 'id', width: 50 },
        { title: 'Tên nhóm', dataIndex: 'name' },
        { title: 'Mô tả', dataIndex: 'description' },
        { 
            title: 'Số lượng xe', 
            render: (_: any, record: IDeviceGroup) => record.devices?.length || 0 
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_: any, record: IDeviceGroup) => (
                <Space>
                    <Button icon={<ToolOutlined />} size="small" onClick={() => handleManageDevices(record)}>Thiết bị</Button>
                    <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
                    <Popconfirm title="Xóa nhóm này?" onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} size="small" danger />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <>
        <Modal 
            title="Quản lý Nhóm thiết bị" 
            open={open} 
            onCancel={onClose} 
            footer={null}
            width={1000}
        >
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
                    Thêm nhóm mới
                </Button>
            </div>

            <Table 
                columns={columns} 
                dataSource={groups} 
                rowKey="id" 
                loading={loading} 
                pagination={{ pageSize: 10 }} 
                size="middle"
                bordered
            />
        </Modal>

        <Modal
            title={isEditMode ? "Chỉnh sửa nhóm" : "Thêm nhóm thiết bị mới"}
            open={createModalOpen}
            onCancel={() => setCreateModalOpen(false)}
            footer={null}
        >
            <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Form.Item name="name" label="Tên nhóm" rules={[{ required: true, message: 'Vui lòng nhập tên nhóm' }]}>
                    <Input placeholder="Ví dụ: Xe cứu hỏa, Xe bus..." />
                </Form.Item>
                <Form.Item name="description" label="Mô tả">
                    <Input.TextArea rows={3} placeholder="Mô tả chi tiết về nhóm thiết bị này" />
                </Form.Item>
                <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                    <Space>
                        <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
                        <Button type="primary" htmlType="submit">
                            {isEditMode ? "Cập nhật" : "Tạo mới"}
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </Modal>

        <Modal
            title={`Danh sách thiết bị: ${selectedGroupForDevices?.name}`}
            open={devicesModalOpen}
            onCancel={() => setDevicesModalOpen(false)}
            footer={null}
            width={800}
        >
            <Transfer
                dataSource={allDevices
                    .filter(d => !d.device_group || d.device_group.id === selectedGroupForDevices?.id)
                    .map(d => ({
                        key: d.device_id?.toString() || '',
                        title: `${d.name} (${d.serial_number || 'No SN'})`,
                        description: d.note || d.brand,
                        disabled: false
                    }))}
                showSearch
                listStyle={{
                    width: '45%',
                    height: 400,
                }}
                targetKeys={targetKeys}
                onChange={handleTransferChange}
                titles={['Tất cả thiết bị', 'Trong nhóm này']}
                render={item => (
                    <Tooltip title={item.title} placement="topLeft" mouseEnterDelay={0.5}>
                        <div style={{ 
                            width: '100%', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap'
                        }}>
                            {item.title}
                        </div>
                    </Tooltip>
                )}
            />
        </Modal>
        </>
    );
};

export default DeviceGroupModal;
