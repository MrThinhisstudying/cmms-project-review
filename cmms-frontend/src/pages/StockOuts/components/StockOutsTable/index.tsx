import React, { useState } from "react";
import { Table, Button, Tag, Space, Tooltip, Modal, message, Avatar, Typography, Divider } from "antd";
import {
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  UserOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { IStockOut } from "../../../../types/inventory.types";

const { Text } = Typography;

interface Props {
  data: IStockOut[];
  loading: boolean;
  rowsPerPage?: number; // kept for compatibility but AntD handles it
  page?: number;        // kept for compatibility
  onDetail: (so: IStockOut) => void;
  onError?: (msg: string) => void;
  onSuccess?: (msg: string) => void;
}

export default function StockOutsTable({
  data = [],
  loading,
  onDetail,
  onError,
  onSuccess,
}: Props) {
  const { approveStockOut, cancelStockOut } = useInventoryContext();
  const [busy, setBusy] = useState(false);

  // Status Helper
  const renderStatus = (status?: string) => {
    const s = String(status ?? "").toLowerCase();
    if (s === "approved") return <Tag color="success">Đã duyệt</Tag>;
    if (s === "pending") return <Tag color="warning">Đang chờ</Tag>;
    if (s === "canceled") return <Tag color="error">Đã huỷ</Tag>;
    return <Tag color="default">Unknown</Tag>;
  };

  const handleConfirmAction = (
    id: number,
    action: "approve" | "cancel"
  ) => {
    Modal.confirm({
      title: action === "approve" ? "Duyệt yêu cầu" : "Huỷ yêu cầu",
      content:
        action === "approve"
          ? "Bạn có chắc muốn duyệt yêu cầu xuất kho này?"
          : "Bạn có chắc muốn huỷ yêu cầu xuất kho này?",
      okText: action === "approve" ? "Duyệt" : "Huỷ yêu cầu",
      okType: action === "approve" ? "primary" : "danger",
      cancelText: "Thôi",
      onOk: async () => {
        setBusy(true);
        try {
          if (action === "approve") {
            await approveStockOut(id);
            message.success("Đã duyệt yêu cầu");
            onSuccess?.("Đã duyệt yêu cầu");
          } else {
            await cancelStockOut(id);
            message.success("Đã huỷ yêu cầu");
            onSuccess?.("Đã huỷ yêu cầu");
          }
        } catch (err: any) {
          const msg = err?.message ?? "Thao tác thất bại";
          message.error(msg);
          onError?.(msg);
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 60,
      align: "center" as const,
      render: (_: any, __: any, index: number) => <span style={{ color: '#8c8c8c' }}>{index + 1}</span>,
    },
    {
      title: "Vật tư",
      dataIndex: ["item", "name"],
      key: "item_name",
      render: (text: string, record: IStockOut) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: 14 }}>{text || "-"}</Text>
          <Space split={<Divider type="vertical" />}>
             <Text type="secondary" style={{ fontSize: 12 }}>{record.item?.category?.name || 'Chưa phân loại'}</Text>
             {record.repair && <Tag color="blue" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', border: 0 }}>Sửa chữa</Tag>}
          </Space>
        </Space>
      ),
    },
    {
      title: "Người yêu cầu",
      key: "requested_by",
      render: (_: any, record: IStockOut) => {
        const u = record.requested_by;
        let name = "-";
        if (u && typeof u === "object") name = u.name || u.email;
        
        return (
            <Space>
               <Avatar icon={<UserOutlined />} src={typeof u === 'object' ? u?.avatar : undefined} size="small" style={{ backgroundColor: '#f0f2f5', color: '#8c8c8c' }} />
               <Text>{name}</Text>
            </Space>
        )
      },
    },
    {
      title: "Số lượng",
      key: "qty",
      align: "right" as const,
      render: (_: any, record: IStockOut) => (
        <span>
          <strong style={{ fontSize: 15 }}>{record.quantity}</strong> 
          <span style={{ fontSize: 12, color: '#8c8c8c', marginLeft: 4 }}>{record.item?.quantity_unit || ""}</span>
        </span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      align: "center" as const,
      width: 140,
      render: (status: string) => renderStatus(status),
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      align: "right" as const,
      render: (date: any) =>
        date ? <Text type="secondary" style={{ fontSize: 13 }}>{dayjs(date).format("HH:mm DD/MM/YYYY")}</Text> : "-",
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      fixed: "right" as const,
      align: "center" as const,
      render: (_: any, record: IStockOut) => {
        const isPending = record.status === "PENDING";
        const isRepair = !!record.repair; 

        return (
          <Space>
            <Tooltip title="Xem chi tiết">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined style={{ color: '#1890ff' }} />}
                onClick={() => onDetail(record)}
              />
            </Tooltip>
            {isPending && !isRepair && (
              <>
                <Tooltip title="Duyệt nhanh">
                  <Button
                    type="text"
                    size="small"
                    icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                    onClick={() => handleConfirmAction(record.id, "approve")}
                    disabled={busy}
                  />
                </Tooltip>
                <Tooltip title="Huỷ">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => handleConfirmAction(record.id, "cancel")}
                    disabled={busy}
                  />
                </Tooltip>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
      pagination={{
        defaultPageSize: 10,
        showSizeChanger: true,
        pageSizeOptions: ["10", "20", "50"],
      }}
      scroll={{ x: 1000 }}
      size="middle"
    />
  );
}
