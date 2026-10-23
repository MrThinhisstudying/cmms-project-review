import React, { useState } from "react";
import { Modal, Form, InputNumber, Input, Typography, message, Button } from "antd";
import { PlusCircleOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { IItem } from "../../../../types/inventory.types";

const { Text } = Typography;

interface QuickRestockModalProps {
  open: boolean;
  item: IItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function QuickRestockModal({ open, item, onClose, onSuccess }: QuickRestockModalProps) {
  const { restockItem } = useInventoryContext();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [addQty, setAddQty] = useState<number>(1);

  if (!item) return null;

  const currentQty = item.quantity ?? 0;
  const newQty = currentQty + (addQty || 0);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await restockItem(item.item_id, {
        qty: Number(values.qty),
        note: values.note || "Nhập kho nhanh",
      });
      message.success(`Đã nhập thêm ${values.qty} ${item.quantity_unit || "đơn vị"} vào kho!`);
      form.resetFields();
      setAddQty(1);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || "Nhập kho thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              background: "#dcfce7",
              color: "#16a34a",
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            <PlusCircleOutlined />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              Nhập kho nhanh (Quick Restock)
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Cộng thêm số lượng tồn kho cho vật tư
            </div>
          </div>
        </div>
      }
      onCancel={() => {
        form.resetFields();
        setAddQty(1);
        onClose();
      }}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={loading}>
          Hủy bỏ
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          style={{ background: "#16a34a", borderColor: "#16a34a" }}
        >
          Xác nhận nhập kho
        </Button>,
      ]}
      width={520}
      destroyOnClose
    >
      <div style={{ margin: "16px 0 20px" }}>
        {/* Info Card */}
        <div
          style={{
            background: "#f8fafc",
            borderRadius: 10,
            padding: "14px 16px",
            border: "1px solid #e2e8f0",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
            {item.name}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            Mã: <Text code>{item.code || "N/A"}</Text> • Danh mục:{" "}
            {item.category?.name || "Chưa phân loại"}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px dashed #cbd5e1",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "#64748b" }}>TỒN HIỆN TẠI</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                {currentQty} {item.quantity_unit}
              </div>
            </div>

            <ArrowRightOutlined style={{ color: "#94a3b8", fontSize: 16 }} />

            <div>
              <div style={{ fontSize: 11, color: "#16a34a" }}>TỒN SAU KHI NHẬP</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#16a34a" }}>
                {newQty} {item.quantity_unit}
              </div>
            </div>
          </div>
        </div>

        {/* Restock Form */}
        <Form form={form} layout="vertical" initialValues={{ qty: 1, note: "" }}>
          <Form.Item
            name="qty"
            label="Số lượng nhập thêm"
            rules={[
              { required: true, message: "Vui lòng nhập số lượng" },
              { type: "number", min: 1, message: "Số lượng phải lớn hơn 0" },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={1}
              size="large"
              placeholder="Nhập số lượng"
              addonAfter={item.quantity_unit || "Đơn vị"}
              onChange={(val) => setAddQty(Number(val) || 0)}
            />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú nhập kho">
            <Input.TextArea
              rows={3}
              placeholder="Ví dụ: Nhập bổ sung đợt định kỳ tháng 10, hóa đơn #12345..."
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
