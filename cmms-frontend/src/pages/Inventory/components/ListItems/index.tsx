import React from "react";
import {
  Table,
  Avatar,
  Tag,
  Button,
  Space,
  Tooltip,
  Progress,
  Popconfirm,
  message,
} from "antd";
import {
  EditOutlined,
  FileImageOutlined,
  PlusCircleOutlined,
  HistoryOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { IItem } from "../../../../types/inventory.types";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { useAuthContext } from "../../../../context/AuthContext/AuthContext";

interface ListItemsProps {
  result: IItem[];
  loading: boolean;
  toggleDrawer: (open: boolean, data: IItem | null) => void;
  onQuickRestock?: (item: IItem) => void;
  onViewDetail?: (item: IItem) => void;
  refreshAll: () => void;
}

export default function ListItems({
  result,
  loading,
  toggleDrawer,
  onQuickRestock,
  onViewDetail,
  refreshAll,
}: ListItemsProps) {
  const { deleteItem } = useInventoryContext();
  const { user } = useAuthContext();
  const isAdminOrManager =
    user?.role === "ADMIN" ||
    user?.role === "MANAGER" ||
    user?.role === "admin" ||
    user?.role === "DIRECTOR" ||
    user?.role === "UNIT_HEAD";

  const handleDelete = async (itemId: number) => {
    try {
      await deleteItem(itemId);
      message.success("Đã xóa vật tư thành công!");
      refreshAll();
    } catch (err: any) {
      message.error(err?.message || "Xóa vật tư thất bại");
    }
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 50,
      align: "center" as const,
      render: (_: any, __: any, index: number) => (
        <span style={{ color: "#94a3b8", fontSize: 13 }}>{index + 1}</span>
      ),
    },
    {
      title: "Ảnh",
      key: "image",
      width: 65,
      align: "center" as const,
      render: (_: any, record: IItem) => (
        <Avatar
          src={record.image}
          shape="square"
          size={42}
          icon={<FileImageOutlined />}
          style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            cursor: onViewDetail ? "pointer" : "default",
          }}
          onClick={() => onViewDetail && onViewDetail(record)}
        />
      ),
    },
    {
      title: "Vật tư & Mã phụ tùng",
      key: "name",
      render: (_: any, record: IItem) => (
        <div style={{ maxWidth: 280 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 13.5,
              color: "#0f172a",
              cursor: onViewDetail ? "pointer" : "default",
            }}
            onClick={() => onViewDetail && onViewDetail(record)}
          >
            {record.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            {record.code ? (
              <Tag
                color="blue"
                style={{
                  fontSize: 11,
                  lineHeight: "16px",
                  margin: 0,
                  borderRadius: 4,
                  fontWeight: 500,
                }}
              >
                #{record.code}
              </Tag>
            ) : (
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Chưa có mã</span>
            )}
            {record.info && (
              <span
                style={{
                  fontSize: 11.5,
                  color: "#64748b",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 160,
                }}
                title={record.info}
              >
                • {record.info}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Danh mục",
      dataIndex: ["category", "name"],
      key: "category",
      width: 150,
      render: (text: string) =>
        text ? (
          <Tag
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              color: "#334155",
              fontSize: 12,
              borderRadius: 6,
            }}
          >
            {text}
          </Tag>
        ) : (
          <span style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
            Chưa phân loại
          </span>
        ),
    },
    {
      title: "Đơn giá",
      dataIndex: "price",
      key: "price",
      width: 120,
      align: "right" as const,
      render: (val?: number) =>
        val ? (
          <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
            {Number(val).toLocaleString("vi-VN")} đ
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>
        ),
    },
    {
      title: "Tồn kho & Mức an toàn",
      key: "stock",
      width: 180,
      render: (_: any, record: IItem) => {
        const qty = record.quantity ?? 0;
        const isOutOfStock = qty <= 0;
        const isLow = qty > 0 && qty <= 10;
        const percent = isOutOfStock
          ? 0
          : isLow
          ? Math.round((qty / 10) * 40)
          : Math.min(100, Math.round((qty / 50) * 100));

        const strokeColor = isOutOfStock ? "#ef4444" : isLow ? "#f59e0b" : "#10b981";

        return (
          <div style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: isOutOfStock ? "#ef4444" : isLow ? "#d97706" : "#0f172a",
                }}
              >
                {qty}{" "}
                <span style={{ fontSize: 11.5, fontWeight: 500, color: "#64748b" }}>
                  {record.quantity_unit || "đơn vị"}
                </span>
              </span>

              {record.price && qty > 0 && (
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  = {((record.price || 0) * qty).toLocaleString("vi-VN")} đ
                </span>
              )}
            </div>

            <Progress
              percent={percent}
              size="small"
              strokeColor={strokeColor}
              showInfo={false}
              style={{ margin: "2px 0 0" }}
            />
          </div>
        );
      },
    },
    {
      title: "Trạng thái",
      key: "status",
      align: "center" as const,
      width: 120,
      render: (_: any, record: IItem) => {
        const qty = record.quantity ?? 0;
        if (qty <= 0) {
          return (
            <Tag color="error" style={{ borderRadius: 10, fontWeight: 600 }}>
              🔴 Hết hàng
            </Tag>
          );
        }
        if (qty <= 10) {
          return (
            <Tag color="warning" style={{ borderRadius: 10, fontWeight: 600 }}>
              ⚠️ Sắp hết
            </Tag>
          );
        }
        return (
          <Tag color="success" style={{ borderRadius: 10, fontWeight: 500 }}>
            🟢 Đủ hàng
          </Tag>
        );
      },
    },
    {
      title: "Thao tác",
      key: "action",
      width: 150,
      align: "center" as const,
      fixed: "right" as const,
      render: (_: any, record: IItem) => (
        <Space size={4}>
          {isAdminOrManager && onQuickRestock && (
            <Tooltip title="Nhập thêm kho nhanh">
              <Button
                type="text"
                size="small"
                icon={<PlusCircleOutlined style={{ color: "#16a34a", fontSize: 16 }} />}
                onClick={() => onQuickRestock(record)}
              />
            </Tooltip>
          )}

          {onViewDetail && (
            <Tooltip title="Xem Thẻ kho / Lịch sử xuất nhập">
              <Button
                type="text"
                size="small"
                icon={<HistoryOutlined style={{ color: "#2563eb", fontSize: 15 }} />}
                onClick={() => onViewDetail(record)}
              />
            </Tooltip>
          )}

          {isAdminOrManager && (
            <Tooltip title="Chỉnh sửa thông tin">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined style={{ color: "#64748b", fontSize: 15 }} />}
                onClick={() => toggleDrawer(true, record)}
              />
            </Tooltip>
          )}

          {isAdminOrManager && (
            <Tooltip title="Xóa vật tư">
              <Popconfirm
                title="Xóa vật tư khỏi hệ thống?"
                description={`Bạn có chắc chắn muốn xóa "${record.name}" không?`}
                onConfirm={() => handleDelete(record.item_id)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined style={{ fontSize: 15 }} />}
                />
              </Popconfirm>
            </Tooltip>
          )}
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
      pagination={false}
      size="middle"
      scroll={{ x: 1000 }}
    />
  );
}
