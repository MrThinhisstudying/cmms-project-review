import React, { useMemo } from "react";
import { Popover, Tag, Descriptions, Alert, Badge, Typography, Space } from "antd";
import {
  InboxOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";

interface WarehouseItemBadgeProps {
  itemId?: number | null;
  itemName?: string;
  itemCode?: string;
  requestedQty?: number;
  requestedUnit?: string;
  repairId?: number;
  showName?: boolean;
}

export const WarehouseItemBadge: React.FC<WarehouseItemBadgeProps> = ({
  itemId,
  itemName = "",
  itemCode = "",
  requestedQty,
  requestedUnit,
  repairId,
  showName = true,
}) => {
  const { items, stockOuts } = useInventoryContext();

  // Tìm thông tin vật tư trong kho
  const warehouseItem = useMemo(() => {
    if (itemId) {
      const match = items.find((it) => it.item_id === itemId);
      if (match) return match;
    }
    if (itemCode) {
      const match = items.find(
        (it) => (it.code || "").trim().toLowerCase() === itemCode.trim().toLowerCase()
      );
      if (match) return match;
    }
    if (itemName) {
      const cleanName = itemName.trim().toLowerCase();
      const match = items.find(
        (it) => (it.name || "").trim().toLowerCase() === cleanName
      );
      if (match) return match;
    }
    return null;
  }, [items, itemId, itemCode, itemName]);

  // Tìm yêu cầu xuất kho liên quan đến phiếu sửa chữa này (nếu có)
  const relatedStockOut = useMemo(() => {
    if (!stockOuts || !warehouseItem) return null;
    return stockOuts.find((s) => {
      const matchRepair =
        repairId &&
        (s.repair?.repair_id === repairId ||
          (s.purpose && s.purpose.includes(`#${repairId}`)));
      const matchItem =
        s.item?.item_id === warehouseItem.item_id ||
        (s as any).item_id === warehouseItem.item_id;
      return matchRepair && matchItem;
    });
  }, [stockOuts, repairId, warehouseItem]);

  // Nếu không phải vật tư kho (vật tư mua ngoài)
  if (!warehouseItem) {
    if (!showName) return null;
    return (
      <div style={{ display: "inline-flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
        <span style={{ fontWeight: 600, color: "#0f172a" }}>{itemName || "Vật tư ngoài"}</span>
        <Tag color="default" style={{ margin: 0, fontSize: 11, padding: "0 6px", borderRadius: 4 }}>
          Vật tư ngoài / tự mua
        </Tag>
      </div>
    );
  }

  const currentStock = warehouseItem.quantity ?? 0;
  const unit = warehouseItem.quantity_unit || requestedUnit || "Đơn vị";
  const numReq = typeof requestedQty === "number" ? requestedQty : undefined;
  const isSufficient = numReq !== undefined ? currentStock >= numReq : currentStock > 0;
  const shortage = numReq !== undefined && currentStock < numReq ? numReq - currentStock : 0;

  // Thẻ Popover thể hiện đầy đủ thông tin chi tiết vật tư trong kho
  const popoverContent = (
    <div style={{ width: 340, fontSize: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          borderBottom: "1px solid #f1f5f9",
          paddingBottom: 8,
        }}
      >
        <Space size={6}>
          <InboxOutlined style={{ color: "#1677ff", fontSize: 16 }} />
          <Typography.Text strong style={{ fontSize: 13, color: "#0f172a" }}>
            Vật tư trong kho
          </Typography.Text>
        </Space>
        <Tag color={isSufficient ? "success" : "error"} style={{ margin: 0, fontWeight: 600 }}>
          {isSufficient ? "Đủ hàng xuất" : "Thiếu hàng"}
        </Tag>
      </div>

      <Descriptions column={1} size="small" bordered style={{ marginBottom: 10 }}>
        <Descriptions.Item label="Mã vật tư">
          <Typography.Text strong copyable={Boolean(warehouseItem.code)}>
            {warehouseItem.code || `VT-${warehouseItem.item_id}`}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Tên trong kho">
          <span style={{ fontWeight: 600, color: "#0958d9" }}>{warehouseItem.name}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Danh mục kho">
          {warehouseItem.category?.name || "Chưa phân loại"}
        </Descriptions.Item>
        <Descriptions.Item label="Tồn kho khả dụng">
          <Badge
            status={isSufficient ? "success" : "error"}
            text={
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: isSufficient ? "#389e0d" : "#cf1322",
                }}
              >
                {currentStock} {unit}
              </span>
            }
          />
        </Descriptions.Item>
        {numReq !== undefined && (
          <Descriptions.Item label="Số lượng trên phiếu">
            <span style={{ fontWeight: 700, color: "#0f172a" }}>
              {numReq} {requestedUnit || unit}
            </span>
          </Descriptions.Item>
        )}
        {warehouseItem.info && (
          <Descriptions.Item label="Quy cách / Ghi chú">
            <span style={{ color: "#475569" }}>{warehouseItem.info}</span>
          </Descriptions.Item>
        )}
        {warehouseItem.price !== undefined && warehouseItem.price !== null && (
          <Descriptions.Item label="Đơn giá định mức">
            <span style={{ color: "#d46b08", fontWeight: 600 }}>
              {warehouseItem.price.toLocaleString("vi-VN")} đ
            </span>
          </Descriptions.Item>
        )}
        {relatedStockOut && (
          <Descriptions.Item label="Yêu cầu xuất kho">
            <Space>
              <Tag color="purple">#{relatedStockOut.id}</Tag>
              <Tag
                color={
                  relatedStockOut.status === "APPROVED"
                    ? "green"
                    : relatedStockOut.status === "CANCELED"
                    ? "red"
                    : "orange"
                }
              >
                {relatedStockOut.status === "APPROVED"
                  ? "Đã duyệt xuất"
                  : relatedStockOut.status === "CANCELED"
                  ? "Đã hủy"
                  : "Chờ duyệt xuất"}
              </Tag>
            </Space>
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* Cảnh báo trạng thái tồn kho */}
      {isSufficient ? (
        <Alert
          type="success"
          showIcon
          message="Vật tư hợp lệ"
          description={`Tồn kho khả dụng (${currentStock} ${unit}) đáp ứng đủ định mức yêu cầu.`}
          style={{ padding: "6px 10px", fontSize: 12 }}
        />
      ) : (
        <Alert
          type="error"
          showIcon
          message="Cảnh báo: Không đủ tồn kho!"
          description={`Yêu cầu ${numReq} ${unit} nhưng kho chỉ còn ${currentStock} ${unit} (Thiếu ${shortage} ${unit}). Cần nhập thêm kho.`}
          style={{ padding: "6px 10px", fontSize: 12 }}
        />
      )}
    </div>
  );

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
      {showName && (
        <span style={{ fontWeight: 600, color: "#0f172a" }}>
          {itemName || warehouseItem.name}
        </span>
      )}
      <Popover
        content={popoverContent}
        trigger="hover"
        placement="right"
        mouseEnterDelay={0.1}
      >
        <Tag
          color={isSufficient ? "blue" : "error"}
          icon={isSufficient ? <InboxOutlined /> : <WarningOutlined />}
          style={{
            cursor: "pointer",
            margin: 0,
            fontSize: 11,
            padding: "1px 6px",
            borderRadius: 4,
            fontWeight: 500,
            transition: "all 0.2s",
          }}
        >
          {isSufficient
            ? `Vật tư xuất kho (Tồn: ${currentStock} ${unit})`
            : `⚠️ Thiếu kho (Tồn: ${currentStock} / Cần: ${numReq || "?"})`}
        </Tag>
      </Popover>
    </div>
  );
};

export default WarehouseItemBadge;
