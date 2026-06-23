import React, { useState, useEffect } from "react";
import { Modal, Table, Button, Space, Tag, Popconfirm, message, Tooltip, Badge } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined, TeamOutlined, ToolOutlined, ApartmentOutlined } from "@ant-design/icons";
import { useDepartmentsContext } from "../../../../context/DepartmentsContext/DepartmentsContext";
import DepartmentFormModal from "../DepartmentFormModal";
import { getToken } from "../../../../utils/auth";

const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:3000/api';

const DepartmentModal: React.FC<{
  open: boolean;
  onClose: (changed?: boolean) => void;
}> = ({ open, onClose }) => {
  const { departments, removeDepartment } = useDepartmentsContext();
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<number | null>(null);
  const [treeData, setTreeData] = useState<any[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);

  // Fetch tree data khi modal mở
  const fetchTree = async () => {
    setTreeLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/department/tree`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setTreeData(json.data || []);
    } catch {
      // Fallback: dùng flat list từ context
      setTreeData(departments as any[]);
    } finally {
      setTreeLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchTree();
  }, [open]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setParentIdForNew(null);
    setOpenForm(true);
  };

  const handleAddChild = (parentId: number) => {
    setEditingId(null);
    setParentIdForNew(parentId);
    setOpenForm(true);
  };

  const handleOpenEdit = (id: number) => {
    setEditingId(id);
    setParentIdForNew(null);
    setOpenForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await removeDepartment(id);
      message.success("Xóa đơn vị thành công");
      fetchTree();
      onClose(true);
    } catch (e) {
      message.error("Xóa đơn vị thất bại");
    }
  };

  const handleFormClose = (isChanged?: boolean) => {
    setOpenForm(false);
    if (isChanged) {
      fetchTree();
      onClose(true);
    }
  };

  const getLevelTag = (level: string) => {
    const config: Record<string, { color: string; label: string }> = {
      PHONG_BAN: { color: 'purple', label: 'Phòng ban' },
      DOI: { color: 'blue', label: 'Đội' },
      TO: { color: 'cyan', label: 'Tổ' },
    };
    const c = config[level] || { color: 'default', label: level };
    return <Tag color={c.color} style={{ fontSize: 11 }}>{c.label}</Tag>;
  };

  const columns = [
    {
      title: 'Tên đơn vị',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <Space>
          <ApartmentOutlined style={{ color: record.is_technical ? '#1890ff' : '#bbb' }} />
          <span style={{ fontWeight: record.level === 'DOI' ? 600 : 400 }}>{name}</span>
        </Space>
      ),
    },
    {
      title: 'Cấp',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: string) => getLevelTag(level),
    },
    {
      title: 'Kỹ thuật',
      dataIndex: 'is_technical',
      key: 'is_technical',
      width: 80,
      align: 'center' as const,
      render: (val: boolean) => val ? (
        <Tooltip title="Đơn vị kỹ thuật">
          <ToolOutlined style={{ color: '#1890ff', fontSize: 16 }} />
        </Tooltip>
      ) : <span style={{ color: '#ddd' }}>—</span>,
    },
    {
      title: 'Trưởng đơn vị',
      key: 'manager',
      render: (_: any, record: any) => record.manager?.name || <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: 'Thành viên',
      dataIndex: 'member_count',
      key: 'member_count',
      width: 90,
      align: 'center' as const,
      render: (count: number) => count > 0 ? (
        <Badge count={count} style={{ backgroundColor: '#52c41a' }} overflowCount={99} />
      ) : <span style={{ color: '#ccc' }}>0</span>,
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 150,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Tooltip title="Sửa">
            <Button icon={<EditOutlined />} size="small" onClick={() => handleOpenEdit(record.dept_id)} />
          </Tooltip>
          {record.level === 'DOI' && (
            <Tooltip title="Thêm Tổ con">
              <Button
                icon={<PlusOutlined />}
                size="small"
                type="dashed"
                style={{ color: '#52c41a', borderColor: '#52c41a' }}
                onClick={() => handleAddChild(record.dept_id)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="Xóa đơn vị này?"
            description={record.children?.length > 0 ? "⚠️ Đơn vị này có Tổ con, xóa sẽ mất cả Tổ con!" : undefined}
            onConfirm={() => handleDelete(record.dept_id)}
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        title={
          <Space>
            <ApartmentOutlined />
            <span>Quản lý đơn vị tổ chức</span>
          </Space>
        }
        open={open}
        onCancel={() => onClose(false)}
        footer={null}
        width={1000}
      >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#999' }}>
            <TeamOutlined /> Phân cấp: Đội → Tổ. Nhấn <PlusOutlined style={{ color: '#52c41a' }} /> ở hàng Đội để thêm Tổ con.
          </span>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
            Thêm đơn vị
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={treeData}
          rowKey="dept_id"
          loading={treeLoading}
          pagination={false}
          expandable={{
            childrenColumnName: 'children',
            defaultExpandAllRows: true,
            indentSize: 24,
          }}
          size="middle"
        />
      </Modal>

      <DepartmentFormModal
        open={openForm}
        onClose={handleFormClose}
        editingId={editingId}
        defaultParentId={parentIdForNew}
      />
    </>
  );
};

export default DepartmentModal;
