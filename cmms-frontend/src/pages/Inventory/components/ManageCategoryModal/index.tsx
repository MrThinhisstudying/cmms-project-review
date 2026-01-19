import React, { useState } from "react";
import { Modal, Button, List, Input, message, Popconfirm } from "antd";
import { EditOutlined, SaveOutlined, DeleteOutlined, CloseOutlined } from "@ant-design/icons";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import AddCategoryModal from "../AddCategoryModal";

export default function ManageCategoryModal({ open, handleClose, categories }: any) {
  const { updateCategory, deleteCategory, refreshAll } = useInventoryContext();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{name: string, description: string}>({ name: '', description: '' });
  const [openAdd, setOpenAdd] = useState(false);

  const startEdit = (item: any) => {
      setEditingId(item.id);
      setEditForm({ name: item.name, description: item.description || '' });
  };

  const cancelEdit = () => {
      setEditingId(null);
      setEditForm({ name: '', description: '' });
  };

  const saveEdit = async (id: number) => {
      try {
          await updateCategory(id, editForm);
          message.success("Cập nhật thành công");
          await refreshAll();
          cancelEdit();
      } catch(err) {
          message.error("Cập nhật phần mục thất bại");
      }
  };

  const handleDelete = async (id: number) => {
      try {
          await deleteCategory(id);
          message.success("Xóa danh mục thành công");
          await refreshAll();
      } catch(err) {
          message.error("Xóa thất bại");
      }
  };

  return (
    <>
    <Modal
        title="Quản lý danh mục"
        open={open}
        onCancel={handleClose}
        footer={[
            <Button key="close" onClick={handleClose}>Đóng</Button>
        ]}
        width={700}
    >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" onClick={() => setOpenAdd(true)}>Thêm mới</Button>
        </div>
        
        <List
            rowKey="id"
            dataSource={categories}
            pagination={{ pageSize: 5 }}
            renderItem={(item: any) => {
                const isEditing = editingId === item.id;
                return (
                    <List.Item
                        actions={isEditing ? [
                            <Button key="save" type="link" icon={<SaveOutlined />} onClick={() => saveEdit(item.id)} />,
                            <Button key="cancel" type="link" danger icon={<CloseOutlined />} onClick={cancelEdit} />
                        ] : [
                            <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => startEdit(item)} />,
                            <Popconfirm key="delete" title="Xóa danh mục?" onConfirm={() => handleDelete(item.id)}>
                                <Button type="link" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        ]}
                    >
                        {isEditing ? (
                            <div style={{ width: '100%', display: 'flex', gap: 8 }}>
                                <Input 
                                    value={editForm.name} 
                                    onChange={e => setEditForm(prev => ({...prev, name: e.target.value}))} 
                                    placeholder="Tên danh mục"
                                />
                                <Input 
                                    value={editForm.description} 
                                    onChange={e => setEditForm(prev => ({...prev, description: e.target.value}))} 
                                    placeholder="Mô tả"
                                />
                            </div>
                        ) : (
                            <List.Item.Meta
                                title={item.name}
                                description={item.description || <span style={{ fontStyle: 'italic', color: '#ccc' }}>Chưa có mô tả</span>}
                            />
                        )}
                    </List.Item>
                );
            }}
        />
    </Modal>

    <AddCategoryModal 
        open={openAdd} 
        handleClose={() => setOpenAdd(false)} 
    />
    </>
  );
}
