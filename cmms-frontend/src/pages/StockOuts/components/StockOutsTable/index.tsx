import React, { useState } from "react";
import { Table, Button, Tag, Space, Tooltip, Popconfirm, message, Avatar } from "antd";
import {
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  UserOutlined,
  DropboxOutlined,
  ToolOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { IStockOut } from "../../../../types/inventory.types";
import RepairTicketBadge from "../RepairTicketBadge";

interface Props {
  data: IStockOut[];
  loading: boolean;
  onDetail: (so: IStockOut) => void;
  onOpenRepairDetail?: (repairId: number) => void;
  onError?: (msg: string) => void;
  onSuccess?: () => void;
}

export default function StockOutsTable({
  data = [],
  loading,
  onDetail,
  onOpenRepairDetail,
  onError,
  onSuccess,
}: Props) {
  const { approveStockOut, cancelStockOut } = useInventoryContext();
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Soft-badge status renderer
  const renderStatus = (status?: string) => {
    const s = String(status ?? "").toUpperCase();
    let bg = "#f1f5f9";
    let color = "#475569";
    let dotColor = "#94a3b8";
    let borderColor = "#cbd5e1";
    let label = "Chưa xác định";

    if (s === "PENDING") {
      bg = "#fffbeb";
      color = "#d97706";
      dotColor = "#f59e0b";
      borderColor = "#fde68a";
      label = "Chờ duyệt";
    } else if (s === "APPROVED") {
      bg = "#ecfdf5";
      color = "#059669";
      dotColor = "#10b981";
      borderColor = "#a7f3d0";
      label = "Đã xuất kho";
    } else if (s === "CANCELED" || s === "CANCELLED") {
      bg = "#fef2f2";
      color = "#dc2626";
      dotColor = "#ef4444";
      borderColor = "#fecaca";
      label = "Đã từ chối / Hủy";
    }

    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 16,
          fontSize: 12,
          fontWeight: 600,
          background: bg,
          color: color,
          border: `1px solid ${borderColor}`,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: dotColor,
            boxShadow: `0 0 0 2px ${bg}`,
          }}
        />
        {label}
      </div>
    );
  };

  const handleAction = async (id: number, action: "approve" | "cancel") => {
    setActionLoadingId(id);
    try {
      if (action === "approve") {
        await approveStockOut(id);
        message.success(`Đã phê duyệt yêu cầu xuất kho #${id}`);
      } else {
        await cancelStockOut(id);
        message.success(`Đã từ chối/hủy yêu cầu xuất kho #${id}`);
      }
      onSuccess?.();
    } catch (err: any) {
      const msg = err?.message || "Thao tác thất bại";
      message.error(msg);
      onError?.(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns = [
    {
      title: "Mã #",
      dataIndex: "id",
      key: "id",
      width: 90,
      align: "center" as const,
      render: (id: number) => (
        <Tag
          style={{
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 12,
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            color: "#1e293b",
            margin: 0,
            padding: "2px 8px",
          }}
        >
          #{id}
        </Tag>
      ),
      sorter: (a: IStockOut, b: IStockOut) => (a.id || 0) - (b.id || 0),
      defaultSortOrder: "descend" as const,
    },
    {
      title: "Vật tư / Phụ tùng",
      key: "item",
      minWidth: 220,
      render: (_: any, record: IStockOut) => {
        const itemName = record.item?.name || "Vật tư không xác định";
        const catName = record.item?.category?.name || "Chưa phân loại";
        const isRepair = Boolean(record.repair);

        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                border: "1px solid #bfdbfe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#1d4ed8",
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              <DropboxOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13, lineHeight: 1.4 }}>
                {itemName}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>{catName}</span>
                {isRepair && record.repair && (
                  <RepairTicketBadge
                    repair={record.repair}
                    onClick={(id) => onOpenRepairDetail?.(id)}
                  />
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Người yêu cầu & Thời gian",
      key: "requester",
      minWidth: 190,
      render: (_: any, record: IStockOut) => {
        const u = record.requested_by;
        let name = "—";
        let avatarUrl: string | undefined = undefined;

        if (u && typeof u === "object") {
          name = u.name || u.email || "—";
          avatarUrl = u.avatar;
        } else if (record.requester_name) {
          name = record.requester_name;
        }

        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar
              icon={<UserOutlined />}
              src={avatarUrl}
              size={32}
              style={{
                backgroundColor: "#e0f2fe",
                color: "#0284c7",
                border: "1px solid #bae6fd",
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{name}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
                {record.created_at ? dayjs(record.created_at).format("HH:mm DD/MM/YYYY") : "—"}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Số lượng xuất & Tồn kho",
      key: "quantity_stock",
      minWidth: 170,
      render: (_: any, record: IStockOut) => {
        const qty = record.quantity ?? 1;
        const unit = record.item?.quantity_unit || "Cái";
        const currentStock = record.item?.quantity;
        const hasStockInfo = currentStock !== undefined && currentStock !== null;
        const isShortage = hasStockInfo && currentStock < qty && record.status === "PENDING";

        return (
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                {qty}
              </span>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                {unit}
              </span>
            </div>

            {hasStockInfo && (
              <div style={{ marginTop: 2 }}>
                {isShortage ? (
                  <Tag
                    color="error"
                    style={{
                      borderRadius: 4,
                      fontSize: 10,
                      margin: 0,
                      fontWeight: 600,
                      padding: "0 4px",
                    }}
                  >
                    <WarningOutlined style={{ marginRight: 2 }} />
                    Thiếu hàng! (Tồn: {currentStock})
                  </Tag>
                ) : (
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    Tồn khả dụng: <b style={{ color: "#059669" }}>{currentStock} {unit}</b>
                  </span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Mục đích sử dụng",
      dataIndex: "purpose",
      key: "purpose",
      minWidth: 160,
      render: (purpose: string, record: IStockOut) => (
        <Tooltip title={record.note ? `Ghi chú: ${record.note}` : purpose || "Xuất vật tư"}>
          <div
            style={{
              fontSize: 12,
              color: "#334155",
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {purpose || record.note || "—"}
          </div>
        </Tooltip>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      align: "center" as const,
      width: 145,
      render: (status: string) => renderStatus(status),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 150,
      fixed: "right" as const,
      align: "center" as const,
      render: (_: any, record: IStockOut) => {
        const isPending = record.status === "PENDING";
        const isRepair = Boolean(record.repair);
        const isBusy = actionLoadingId === record.id;

        return (
          <Space size={4}>
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onDetail(record)}
              style={{
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 12,
                boxShadow: "0 2px 6px rgba(22, 119, 255, 0.2)",
              }}
            >
              Chi tiết
            </Button>

            {isPending && !isRepair && (
              <>
                <Popconfirm
                  title="Xác nhận duyệt xuất kho?"
                  description={`Duyệt xuất ${record.quantity} ${record.item?.quantity_unit || ""} cho yêu cầu #${record.id}?`}
                  onConfirm={() => handleAction(record.id, "approve")}
                  okText="Duyệt"
                  cancelText="Hủy"
                >
                  <Tooltip title="Duyệt nhanh">
                    <Button
                      type="text"
                      size="small"
                      icon={<CheckOutlined style={{ color: "#059669", fontSize: 14 }} />}
                      loading={isBusy}
                      style={{
                        borderRadius: 6,
                        background: "#ecfdf5",
                        borderColor: "#a7f3d0",
                      }}
                    />
                  </Tooltip>
                </Popconfirm>

                <Popconfirm
                  title="Từ chối yêu cầu xuất kho?"
                  description="Yêu cầu này sẽ bị hủy bỏ và không xuất vật tư."
                  onConfirm={() => handleAction(record.id, "cancel")}
                  okText="Từ chối"
                  okButtonProps={{ danger: true }}
                  cancelText="Hủy"
                >
                  <Tooltip title="Từ chối / Hủy">
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<CloseOutlined style={{ fontSize: 13 }} />}
                      loading={isBusy}
                      style={{
                        borderRadius: 6,
                        background: "#fef2f2",
                        borderColor: "#fecaca",
                      }}
                    />
                  </Tooltip>
                </Popconfirm>
              </>
            )}

            {isPending && isRepair && (
              <Tooltip title="Phiếu xuất này thuộc quy trình sửa chữa và sẽ được duyệt đồng thời khi duyệt nghiệm thu phiếu sửa chữa">
                <Tag color="default" style={{ fontSize: 10, borderRadius: 4, margin: 0, padding: "0 4px" }}>
                  Theo quy trình SC
                </Tag>
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
        pageSizeOptions: ["10", "20", "50", "100"],
        showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} trên tổng ${total} yêu cầu xuất kho`,
      }}
      scroll={{ x: 1000 }}
      size="middle"
    />
  );
}
