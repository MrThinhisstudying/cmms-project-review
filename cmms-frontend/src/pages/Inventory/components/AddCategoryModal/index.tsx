import React from "react";
import { Modal, Form, Input, message } from "antd";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";

export default function AddCategoryModal({ open, handleClose }: { open: boolean; handleClose: () => void }) {
  const { createCategory, refreshAll } = useInventoryContext();
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (values: { name: string; description?: string }) => {
    try {
      setLoading(true);
      await createCategory({
        name: values.name.trim(),
        description: values.description || "",
      });
      message.success("Thêm danh mục thành công");
      await refreshAll();
      form.resetFields();
      handleClose();
    } catch (err: any) {
      message.error(err.message || "Thêm danh mục thất bại");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal
      title="Thêm danh mục mới"
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="Thêm"
      cancelText="Hủy"
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="name"
          label="Tên danh mục"
          rules={[{ required: true, message: 'Vui lòng nhập tên danh mục' }, { max: 100, message: 'Tên quá dài' }]}
        >
          <Input placeholder="Nhập tên danh mục" />
        </Form.Item>
        <Form.Item
          name="description"
          label="Mô tả (tùy chọn)"
          rules={[{ max: 255, message: 'Mô tả quá dài' }]}
        >
          <Input.TextArea placeholder="Nhập mô tả" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
