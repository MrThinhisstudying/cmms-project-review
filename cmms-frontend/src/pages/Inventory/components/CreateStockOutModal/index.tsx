import React, { useEffect, useState } from "react";
import { Modal, Form, Input, InputNumber, Button, Typography, message } from "antd";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";

const { Text } = Typography;

export default function CreateStockOutModal({
  open,
  onClose,
  item,
  onSaved,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  item: any;
  onSaved?: (payload?: any) => void;
  onError?: (payload?: any) => void;
}) {
  const { requestStockOut } = useInventoryContext();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleSubmit = async (values: any) => {
    const qty = Number(values.quantity ?? 0);
    const available = Number(item?.quantity ?? 0);

    if (qty <= 0) {
        message.error("Số lượng xuất phải lớn hơn 0");
        return;
    }

    if (qty > available) {
      form.setFields([
        {
          name: 'quantity',
          errors: [`Số lượng không được vượt quá tồn kho hiện có (${available})`],
        },
      ]);
      return;
    }

    try {
      setLoading(true);
      await requestStockOut({
        item_id: item.item_id ?? item.id,
        quantity: qty,
        note: values.note ?? "",
      });
      message.success("Yêu cầu xuất kho đã được tạo");
      onSaved?.({ message: "Yêu cầu xuất kho đã được tạo" });
      onClose();
    } catch (err: any) {
      const msg = err?.message ?? "Tạo yêu cầu xuất kho thất bại";
      message.error(msg);
      onError?.({ message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Tạo phiếu xuất — ${item?.name ?? ""}`}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Huỷ
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={() => form.submit()}
        >
          Gửi yêu cầu
        </Button>,
      ]}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Tồn hiện có: <strong>{item?.quantity ?? 0} {item?.quantity_unit || ''}</strong>
        </Text>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="quantity"
          label="Số lượng xuất"
          rules={[{ required: true, message: "Vui lòng nhập số lượng" }]}
        >
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            step={1}
            placeholder="Nhập số lượng"
          />
        </Form.Item>

        <Form.Item name="note" label="Ghi chú (tùy chọn)">
          <Input.TextArea rows={3} placeholder="Nhập ghi chú xuất kho" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
