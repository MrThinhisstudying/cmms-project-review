import React, { useState, useMemo } from "react";
import { Modal, Form, Select, InputNumber, Input, Typography, message, Alert, Row, Col, Tag } from "antd";
import { DropboxOutlined, AlertOutlined } from "@ant-design/icons";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { IItem } from "../../../../types/inventory.types";

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateStockOutDirectModal({ open, onClose, onSuccess }: Props) {
  const { items, requestStockOut } = useInventoryContext();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return items.find((i: IItem) => i.item_id === selectedItemId) || null;
  }, [items, selectedItemId]);

  const handleClose = () => {
    form.resetFields();
    setSelectedItemId(null);
    onClose();
  };

  const handleSubmit = async (values: any) => {
    if (!selectedItem) {
      message.error("Vui lòng chọn vật tư cần xuất");
      return;
    }

    const qty = Number(values.quantity ?? 0);
    const available = Number(selectedItem.quantity ?? 0);

    if (qty <= 0) {
      message.error("Số lượng xuất phải lớn hơn 0");
      return;
    }

    if (qty > available) {
      form.setFields([
        {
          name: "quantity",
          errors: [`Số lượng không được vượt quá tồn kho hiện có (${available} ${selectedItem.quantity_unit || ""})`],
        },
      ]);
      return;
    }

    try {
      setLoading(true);
      await requestStockOut({
        item_id: selectedItem.item_id,
        quantity: qty,
        purpose: values.purpose ?? "Xuất vật tư theo kế hoạch",
        note: values.note ?? "",
      });
      message.success("Tạo yêu cầu xuất kho thành công");
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      message.error(err?.message || "Tạo yêu cầu xuất kho thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <DropboxOutlined style={{ color: "#1677ff", fontSize: 18 }} />
          <span>Tạo Yêu Cầu Xuất Kho Mới</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      okText="Gửi yêu cầu"
      cancelText="Hủy"
      confirmLoading={loading}
      destroyOnClose
      width={560}
      styles={{ body: { paddingTop: 16 } }}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="item_id"
          label={<span style={{ fontWeight: 600 }}>Chọn vật tư / phụ tùng xuất kho</span>}
          rules={[{ required: true, message: "Vui lòng chọn vật tư" }]}
        >
          <Select
            placeholder="Tìm kiếm vật tư theo tên, mã..."
            showSearch
            optionFilterProp="children"
            onChange={(val) => setSelectedItemId(val)}
            style={{ width: "100%" }}
          >
            {items.map((item: IItem) => (
              <Option key={item.item_id} value={item.item_id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>
                    <b>{item.name}</b> {item.code ? `(${item.code})` : ""}
                  </span>
                  <Tag color={item.quantity > 0 ? "blue" : "error"} style={{ marginLeft: 8, fontSize: 11 }}>
                    Tồn: {item.quantity} {item.quantity_unit || ""}
                  </Tag>
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {selectedItem && (
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16,
            }}
          >
            <Row gutter={[16, 6]}>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Đơn vị tính:</Text>{" "}
                <Text strong>{selectedItem.quantity_unit || "Cái"}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Tồn kho khả dụng:</Text>{" "}
                <Tag color={selectedItem.quantity > 0 ? "success" : "error"} style={{ fontWeight: 700 }}>
                  {selectedItem.quantity} {selectedItem.quantity_unit || ""}
                </Tag>
              </Col>
              {selectedItem.category && (
                <Col span={24}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Danh mục:</Text>{" "}
                  <Text>{selectedItem.category.name}</Text>
                </Col>
              )}
            </Row>
          </div>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="quantity"
              label={<span style={{ fontWeight: 600 }}>Số lượng xuất</span>}
              rules={[
                { required: true, message: "Vui lòng nhập số lượng" },
                { type: "number", min: 1, message: "Số lượng tối thiểu là 1" },
              ]}
              initialValue={1}
            >
              <InputNumber
                min={1}
                max={selectedItem ? selectedItem.quantity : undefined}
                style={{ width: "100%" }}
                placeholder="Nhập số lượng..."
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="purpose"
              label={<span style={{ fontWeight: 600 }}>Mục đích sử dụng</span>}
              rules={[{ required: true, message: "Vui lòng nhập mục đích" }]}
              initialValue="Bảo dưỡng & sửa chữa"
            >
              <Input placeholder="Vd: Bảo dưỡng xe đầu kéo..." />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="note" label={<span style={{ fontWeight: 600 }}>Ghi chú bổ sung</span>}>
          <TextArea rows={3} placeholder="Ghi chú chi tiết, khu vực sử dụng hoặc số phiếu bảo dưỡng..." />
        </Form.Item>

        {selectedItem && selectedItem.quantity === 0 && (
          <Alert
            type="error"
            showIcon
            icon={<AlertOutlined />}
            message="Vật tư này hiện đã hết hàng trong kho, không thể tạo yêu cầu xuất!"
            style={{ marginTop: 8 }}
          />
        )}
      </Form>
    </Modal>
  );
}
