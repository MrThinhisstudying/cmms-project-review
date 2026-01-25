import React from "react";
import { Table, Avatar, Tag, Button, Space, Tooltip, Typography, Divider } from "antd";
import { EditOutlined, DeleteOutlined, FileImageOutlined } from "@ant-design/icons";
import { IItem } from "../../../../types/inventory.types";

const { Text } = Typography;

interface ListItemsProps {
  result: IItem[];
  loading: boolean;
  toggleDrawer: (open: boolean, data: IItem | null) => void;
  refreshAll: () => void;
}

export default function ListItems({ result, loading, toggleDrawer, refreshAll }: ListItemsProps) {
  
  const columns = [
    {
      title: "#",
      key: "index",
      width: 60,
      align: "center" as const,
      render: (_: any, __: any, index: number) => <span style={{ color: '#8c8c8c' }}>{index + 1}</span>,
    },
    {
      title: "Ảnh",
      key: "image",
      width: 80,
      align: "center" as const,
      render: (_: any, record: IItem) => (
        <Avatar 
            src={record.image} 
            shape="square" 
            size={48} 
            icon={<FileImageOutlined />} 
            style={{ backgroundColor: '#f0f2f5', border: '1px solid #f0f0f0' }}
        />
      ),
    },
    {
      title: "Vật tư",
      key: "name",
      render: (_: any, record: IItem) => (
        <Space direction="vertical" size={2}>
            <Text strong style={{ fontSize: 14 }}>{record.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.code}</Text>
        </Space>
      ),
    },
    {
      title: "Danh mục",
      dataIndex: ["category", "name"],
      key: "category",
      render: (text: string) => text || 'Chưa phân loại',
    },
    {
      title: "Tồn kho",
      key: "stock",
      align: "right" as const,
      render: (_: any, record: IItem) => (
        <span>
            <strong style={{ fontSize: 15 }}>{record.quantity ?? 0}</strong>
            <span style={{ fontSize: 12, color: '#8c8c8c', marginLeft: 4 }}>{record.quantity_unit}</span>
        </span>
      ),
    },
    {
        title: "Trạng thái",
        key: "status",
        align: "center" as const,
        width: 120,
        render: (_: any, record: IItem) => {
            const isAvailable = (record.quantity ?? 0) > 0;
            return isAvailable 
                ? <Tag color="success">Sẵn sàng</Tag> 
                : <Tag color="error">Hết hàng</Tag>
        }
    },
    {
      title: "Hành động",
      key: "action",
      width: 100,
      align: "center" as const,
      fixed: "right" as const,
      render: (_: any, record: IItem) => (
        <Space>
          <Tooltip title="Chỉnh sửa">
            <Button 
                type="text" 
                size="small" 
                icon={<EditOutlined style={{ color: '#1890ff' }} />} 
                onClick={() => toggleDrawer(true, record)}
            />
          </Tooltip>
          {/* Add Delete if needed, though strictly controlled */}
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={result}
      rowKey="item_id"
      loading={loading}
      pagination={false} // Handled by parent
      size="middle"
      scroll={{ x: 1000 }}
    />
  );
}
