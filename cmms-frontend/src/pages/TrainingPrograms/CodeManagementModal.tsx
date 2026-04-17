import React, { useState } from 'react';
import { Modal, List, Input, Button, Space, message, Empty } from 'antd';
import { EditOutlined, PlusOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import certificatesApi from '../../apis/certificates';

interface CodeManagementModalProps {
    open: boolean;
    onCancel: () => void;
    codes: string[];
    programCountByCode: Record<string, number>;
    onCodeRenamed: () => void;
}

const CodeManagementModal: React.FC<CodeManagementModalProps> = ({
    open, onCancel, codes, programCountByCode, onCodeRenamed
}) => {
    const [editingCode, setEditingCode] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [newCodeName, setNewCodeName] = useState('');
    const [addingNew, setAddingNew] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleRename = async (oldCode: string) => {
        if (!editValue.trim() || editValue.trim() === oldCode) {
            setEditingCode(null);
            return;
        }
        setLoading(true);
        try {
            await certificatesApi.renameCode(oldCode, editValue.trim());
            message.success(`Đã đổi mã "${oldCode}" → "${editValue.trim()}"`);
            setEditingCode(null);
            onCodeRenamed();
        } catch (error: any) {
            message.error(error.message || 'Lỗi đổi mã CTĐT');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCode = async () => {
        if (!newCodeName.trim()) return;
        if (codes.includes(newCodeName.trim())) {
            message.warning('Mã đã tồn tại');
            return;
        }
        setLoading(true);
        try {
            await certificatesApi.createTrainingProgram({
                code: newCodeName.trim(),
                group_name: '(Chưa phân nhóm)',
                name: `(Chương trình mới - ${newCodeName.trim()})`,
                validity_months: 12,
                evaluation_days: 0,
            });
            message.success(`Đã tạo mã "${newCodeName.trim()}" với chương trình mặc định`);
            setNewCodeName('');
            setAddingNew(false);
            onCodeRenamed();
        } catch (error: any) {
            message.error(error.message || 'Lỗi tạo mã');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Quản lý Mã CTĐT"
            open={open}
            onCancel={onCancel}
            footer={null}
            width={500}
        >
            {codes.length === 0 ? (
                <Empty description="Chưa có mã nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <List
                    size="small"
                    bordered
                    dataSource={codes}
                    renderItem={(code) => (
                        <List.Item
                            actions={editingCode === code ? [
                                <Button key="save" type="text" size="small" icon={<CheckOutlined style={{ color: '#52c41a' }} />} onClick={() => handleRename(code)} loading={loading} />,
                                <Button key="cancel" type="text" size="small" icon={<CloseOutlined />} onClick={() => setEditingCode(null)} />,
                            ] : [
                                <Button key="edit" type="text" size="small" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => { setEditingCode(code); setEditValue(code); }} />,
                            ]}
                        >
                            {editingCode === code ? (
                                <Input
                                    size="small"
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    onPressEnter={() => handleRename(code)}
                                    autoFocus
                                    style={{ width: '70%' }}
                                />
                            ) : (
                                <div>
                                    <span style={{ fontWeight: 500 }}>{code}</span>
                                    <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>
                                        ({programCountByCode[code] || 0} chương trình)
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
                            placeholder="Mã CTĐT mới..."
                            value={newCodeName}
                            onChange={e => setNewCodeName(e.target.value)}
                            onPressEnter={handleAddCode}
                            autoFocus
                        />
                        <Button size="small" type="primary" onClick={handleAddCode} loading={loading}>Tạo</Button>
                        <Button size="small" onClick={() => { setAddingNew(false); setNewCodeName(''); }}>Hủy</Button>
                    </Space>
                ) : (
                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => setAddingNew(true)} block>
                        Thêm mã mới
                    </Button>
                )}
            </div>
        </Modal>
    );
};

export default CodeManagementModal;
