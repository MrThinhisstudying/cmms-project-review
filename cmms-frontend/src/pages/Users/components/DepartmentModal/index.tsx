import React, { useState } from "react";
import { Modal, Table, Button, Space, Typography, Popconfirm, message } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useDepartmentsContext } from "../../../../context/DepartmentsContext/DepartmentsContext";
import DepartmentFormModal from "../DepartmentFormModal";
import { IDepartment } from "../../../../types/user.types";

const DepartmentModal: React.FC<{
  open: boolean;
  onClose: (changed?: boolean) => void;
}> = ({ open, onClose }) => {
  const { departments, removeDepartment } = useDepartmentsContext();
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleOpenAdd = () => {
    setEditingId(null);
    setOpenForm(true);
  };

  const handleOpenEdit = (id: number) => {
    setEditingId(id);
    setOpenForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await removeDepartment(id);
      message.success("Xóa phòng ban thành công");
      onClose(true); // Signal change
    } catch (e) {
      message.error("Xóa phòng ban thất bại");
    }
  };

  const handleFormClose = (isChanged?: boolean) => {
    setOpenForm(false);
    if (isChanged) onClose(true);
  };

  const columns = [
    {
      title: 'Tên phòng ban',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Trưởng phòng',
      key: 'manager',
      render: (_: any, record: IDepartment) => record.manager?.name || '-'
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: IDepartment) => (
        <Space>
           <Button icon={<EditOutlined />} size="small" onClick={() => handleOpenEdit(record.dept_id)} />
           <Popconfirm title="Xóa phòng ban này?" onConfirm={() => handleDelete(record.dept_id)}>
              <Button icon={<DeleteOutlined />} size="small" danger />
           </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <>
      <Modal
        title="Quản lý phòng ban"
        open={open}
        onCancel={() => onClose(false)}
        footer={null}
        width={900}
      >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
            Thêm phòng ban
          </Button>
        </div>

        <Table 
          columns={columns} 
          dataSource={departments} 
          rowKey="dept_id"
          pagination={{ pageSize: 10 }}
        />
      </Modal>

      <DepartmentFormModal
        open={openForm}
        onClose={handleFormClose}
        editingId={editingId}
      />
    </>
  );
};

export default DepartmentModal;
