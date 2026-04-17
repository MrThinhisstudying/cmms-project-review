import React, { useState } from 'react';
import { Modal, List, Input, Button, Space, message, Popconfirm, Empty } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import certificatesApi from '../../apis/certificates';

interface GroupManagementModalProps {
    open: boolean;
    onCancel: () => void;
    groups: string[];
    programCountByGroup: Record<string, number>;
    onGroupRenamed: () => void; // callback to refresh parent data
}

const GroupManagementModal: React.FC<GroupManagementModalProps> = ({
    open, onCancel, groups, programCountByGroup, onGroupRenamed
}) => {
    const [editingGroup, setEditingGroup] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [newGroupName, setNewGroupName] = useState('');
    const [addingNew, setAddingNew] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleRename = async (oldName: string) => {
        if (!editValue.trim() || editValue.trim() === oldName) {
            setEditingGroup(null);
            return;
        }
        setLoading(true);
        try {
            await certificatesApi.renameGroup(oldName, editValue.trim());
            message.success(`Đã đổi tên nhóm "${oldName}" → "${editValue.trim()}"`);
            setEditingGroup(null);
            onGroupRenamed();
        } catch (error: any) {
            message.error(error.message || 'Lỗi đổi tên nhóm');
        } finally {
            setLoading(false);
        }
    };

    const handleAddGroup = async () => {
        if (!newGroupName.trim()) return;
        if (groups.includes(newGroupName.trim())) {
            message.warning('Nhóm đã tồn tại');
            return;
        }
        // Create a placeholder program with that group name
        setLoading(true);
        try {
            await certificatesApi.createTrainingProgram({
                group_name: newGroupName.trim(),
                code: `NEW-${Date.now()}`,
                name: `(Chương trình mới - ${newGroupName.trim()})`,
                validity_months: 12,
                evaluation_days: 0,
            });
            message.success(`Đã tạo nhóm "${newGroupName.trim()}" với chương trình mặc định`);
            setNewGroupName('');
            setAddingNew(false);
            onGroupRenamed();
        } catch (error: any) {
            message.error(error.message || 'Lỗi tạo nhóm');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Quản lý nhóm chương trình"
            open={open}
            onCancel={onCancel}
            footer={null}
            width={500}
        >
            {groups.length === 0 ? (
                <Empty description="Chưa có nhóm nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <List
                    size="small"
                    bordered
                    dataSource={groups}
                    renderItem={(group) => (
                        <List.Item
                            actions={editingGroup === group ? [
                                <Button key="save" type="text" size="small" icon={<CheckOutlined style={{ color: '#52c41a' }} />} onClick={() => handleRename(group)} loading={loading} />,
                                <Button key="cancel" type="text" size="small" icon={<CloseOutlined />} onClick={() => setEditingGroup(null)} />,
                            ] : [
                                <Button key="edit" type="text" size="small" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => { setEditingGroup(group); setEditValue(group); }} />,
                            ]}
                        >
                            {editingGroup === group ? (
                                <Input
                                    size="small"
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    onPressEnter={() => handleRename(group)}
                                    autoFocus
                                    style={{ width: '70%' }}
                                />
                            ) : (
                                <div>
                                    <span style={{ fontWeight: 500 }}>{group}</span>
                                    <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>
                                        ({programCountByGroup[group] || 0} chương trình)
                                    </span>
                                </div>
                            )}
                        </List.Item>
                    )}
                />
            )}

            <div style={{ marginTop: 12 }}>
                {addingNew ? (
                    <Space>
                        <Input
                            size="small"
                            placeholder="Tên nhóm mới..."
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                            onPressEnter={handleAddGroup}
                            autoFocus
                        />
                        <Button size="small" type="primary" onClick={handleAddGroup} loading={loading}>Tạo</Button>
                        <Button size="small" onClick={() => { setAddingNew(false); setNewGroupName(''); }}>Hủy</Button>
                    </Space>
                ) : (
                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => setAddingNew(true)} block>
                        Thêm nhóm mới
                    </Button>
                )}
            </div>
        </Modal>
    );
};

export default GroupManagementModal;
