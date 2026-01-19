import React, { useState } from "react";
import { Table, Button, Tag, Space, Tooltip, Modal, message } from "antd";
import {
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { IStockOut } from "../../../../types/inventory.types";

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
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Vật tư",
      dataIndex: ["item", "name"],
      key: "item_name",
      render: (text: string, record: IStockOut) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{text || "-"}</span>
          {record.repair && <Tag color="blue" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>Sửa chữa</Tag>}
        </Space>
      ),
    },
    {
      title: "Danh mục",
      dataIndex: ["item", "category", "name"],
      key: "category",
      render: (text: string) => text || "-",
    },
    {
      title: "Người yêu cầu",
      key: "requested_by",
      render: (_: any, record: IStockOut) => {
        const u = record.requested_by;
        if (!u) return "-";
        if (typeof u === "object") return u.name || u.email;
        return "-";
      },
    },
    {
      title: "Người duyệt",
      key: "approved_by",
      render: (_: any, record: IStockOut) => {
        const u = record.approved_by;
        if (!u) return "-";
        if (typeof u === "object") return u.name || u.email;
        return "-";
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status: string) => renderStatus(status),
    },
    {
      title: "Số lượng",
      key: "qty",
      render: (_: any, record: IStockOut) => (
        <span>
          <strong>{record.quantity}</strong> {record.item?.quantity_unit || ""}
        </span>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: any) =>
        date ? new Date(date).toLocaleString("vi-VN") : "-",
    },
    {
      title: "Hành động",
      key: "action",
      width: 120,
      fixed: "right" as const,
      render: (_: any, record: IStockOut) => {
        const isPending = record.status === "PENDING";
        const isRepair = !!record.repair; // Automations are handled by system primarily

        return (
          <Space>
            <Tooltip title="Xem chi tiết">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => onDetail(record)}
              />
            </Tooltip>
            {isPending && !isRepair && (
              <>
                <Tooltip title="Duyệt">
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<CheckOutlined />}
                    onClick={() => handleConfirmAction(record.id, "approve")}
                    disabled={busy}
                  />
                </Tooltip>
                <Tooltip title="Huỷ">
                  <Button
                    size="small"
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => handleConfirmAction(record.id, "cancel")}
                    disabled={busy}
                  />
                </Tooltip>
              </>
            )}
            {isPending && isRepair && (
                 <Tooltip title="Tự động duyệt theo quy trình sửa chữa">
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                 </Tooltip>
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
