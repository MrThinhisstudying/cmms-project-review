import React, { useEffect, useState } from "react";
import {
  Modal,
  Tabs,
  Typography,
  Tag,
  List,
  Avatar,
  Spin,
  Empty,
  Button,
} from "antd";
import {
  CodeSandboxOutlined,
  HistoryOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { useAuthContext } from "../../../../context/AuthContext/AuthContext";
import { IItem } from "../../../../types/inventory.types";
import dayjs from "dayjs";

const { Text, Title } = Typography;

interface ItemDetailModalProps {
  open: boolean;
  onClose: () => void;
  item: IItem | null;
}

export default function ItemDetailModal({ open, onClose, item }: ItemDetailModalProps) {
  const { getItemTransactions, getStockOutsByItemId } = useInventoryContext();
  const { user } = useAuthContext();

  const [txs, setTxs] = useState<any[]>([]);
  const [stockOuts, setStockOuts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && item) {
      (async () => {
        setLoading(true);
        try {
          const id = item.item_id ?? (item as any).id;
          if (!id) return;

          const [txData, soData] = await Promise.all([
            getItemTransactions(id),
            getStockOutsByItemId(id),
          ]);
          setTxs(Array.isArray(txData) ? txData.filter((tx: any) => tx.delta > 0) : []);
          setStockOuts(Array.isArray(soData) ? soData : []);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [open, item, user, getItemTransactions, getStockOutsByItemId]);

  const getStatusTag = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "approved") return <Tag color="success">Đã duyệt</Tag>;
    if (s === "pending") return <Tag color="warning">Đang chờ duyệt</Tag>;
    if (s === "canceled" || s === "cancelled") return <Tag color="error">Đã hủy</Tag>;
    return <Tag color="default">{status}</Tag>;
  };

  const renderHistoryList = (data: any[], type: "in" | "out") => {
    if (loading)
      return (
        <div style={{ textAlign: "center", padding: 30 }}>
          <Spin />
        </div>
      );
    if (!data || data.length === 0)
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={type === "in" ? "Chưa có lịch sử nhập kho" : "Chưa có lịch sử xuất kho"}
        />
      );

    return (
      <List
        dataSource={data}
        renderItem={(record) => (
          <List.Item style={{ padding: "12px 14px" }}>
            <List.Item.Meta
              avatar={
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: type === "in" ? "#dcfce7" : "#fee2e2",
                    color: type === "in" ? "#16a34a" : "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  {type === "in" ? <HistoryOutlined /> : <ExportOutlined />}
                </div>
              }
              title={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text strong style={{ color: type === "in" ? "#16a34a" : "#dc2626", fontSize: 15 }}>
                    {type === "in" ? "+" : "-"}
                    {type === "in" ? record.delta : record.quantity} {item?.quantity_unit || "đơn vị"}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(record.created_at || record.occurred_at).format("DD/MM/YYYY HH:mm")}
                  </Text>
                </div>
              }
              description={
                <div style={{ marginTop: 4 }}>
                  <div style={{ color: "#334155", fontSize: 13 }}>
                    {record.note || record.purpose || (type === "in" ? "Nhập hàng" : "Xuất kho")}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginTop: 4,
                      fontSize: 12,
                      color: "#64748b",
                    }}
                  >
                    {type === "out" && getStatusTag(record.status)}
                    <span>
                      Thực hiện: <b>{record.user?.name || record.requested_by?.name || "Hệ thống"}</b>
                    </span>
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
        style={{ maxHeight: 380, overflowY: "auto" }}
      />
    );
  };

  const currentQty = item?.quantity ?? 0;
  const isOutOfStock = currentQty <= 0;
  const isLowStock = currentQty > 0 && currentQty <= 10;
  const unitPrice = item?.price ? `${Number(item.price).toLocaleString("vi-VN")} đ` : "—";
  const totalPrice =
    item?.price && currentQty > 0
      ? `${(Number(item.price) * currentQty).toLocaleString("vi-VN")} đ`
      : "—";

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      width={720}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar
            shape="square"
            size={52}
            src={item?.image}
            icon={<CodeSandboxOutlined />}
            style={{ backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0" }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Title level={5} style={{ margin: 0, color: "#0f172a" }}>
                {item?.name}
              </Title>
              {item?.code && (
                <Tag color="blue" style={{ margin: 0 }}>
                  {item.code}
                </Tag>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Danh mục: {item?.category?.name || "Chưa phân loại"}
            </Text>
          </div>
        </div>
      }
    >
      {/* Overview Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          margin: "16px 0",
        }}
      >
        <div
          style={{
            background: isOutOfStock ? "#fee2e2" : isLowStock ? "#fef3c7" : "#ecfdf5",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid",
            borderColor: isOutOfStock ? "#fecdd3" : isLowStock ? "#fde68a" : "#a7f3d0",
          }}
        >
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>TỒN KHO HIỆN TẠI</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: isOutOfStock ? "#dc2626" : isLowStock ? "#d97706" : "#16a34a",
              marginTop: 2,
            }}
          >
            {currentQty} {item?.quantity_unit || "đơn vị"}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {isOutOfStock ? "🔴 Hết hàng" : isLowStock ? "⚠️ Sắp hết hàng" : "🟢 Đủ hàng"}
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>ĐƠN GIÁ</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
            {unitPrice}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Giá niêm yết</div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>THÀNH TIỀN TỒN</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#2563eb", marginTop: 2 }}>
            {totalPrice}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Giá trị kho tạm tính</div>
        </div>
      </div>

      {item?.info && (
        <div
          style={{
            background: "#f8fafc",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 13,
            color: "#475569",
            marginBottom: 16,
          }}
        >
          <span style={{ fontWeight: 600, color: "#1e293b" }}>Mô tả chi tiết: </span>
          {item.info}
        </div>
      )}

      {/* Tabs: Thẻ kho / Lịch sử nhập & xuất */}
      <Tabs
        defaultActiveKey="1"
        items={[
          {
            key: "1",
            label: (
              <span>
                <HistoryOutlined /> Lịch sử nhập kho ({txs.length})
              </span>
            ),
            children: renderHistoryList(txs, "in"),
          },
          {
            key: "2",
            label: (
              <span>
                <ExportOutlined /> Lịch sử xuất kho ({stockOuts.length})
              </span>
            ),
            children: renderHistoryList(stockOuts, "out"),
          },
        ]}
      />
    </Modal>
  );
}
