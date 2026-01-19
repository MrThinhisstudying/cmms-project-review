import React, { useEffect, useState } from "react";
import { Drawer, Form, Button, Input, Select, InputNumber, Upload, Space, message, Row, Col } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";

const { Option } = Select;

export default function AddItemDrawer({ openDrawer, toggleDrawer, data, categories, onSaved, onError }: any) {
  const { createItem, updateItem, restockItem } = useInventoryContext();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (openDrawer) {
        if (data) {
            form.setFieldsValue({
                ...data,
                category_id: data.category?.id ? String(data.category.id) : undefined,
                quantity: data.quantity, 
                restock: 0,
                restock_note: ''
            });
            setImageUrl(data.image || null);
        } else {
            form.resetFields();
            setImageUrl(null);
        }
    }
  }, [openDrawer, data, form]);

  const onFinish = async (values: any) => {
      setLoading(true);
      try {
          const payload = {
              category_id: Number(values.category_id),
              name: values.name,
              info: values.info,
              quantity_unit: values.quantity_unit,
              image: imageUrl || "", 
              code: values.code,
              price: values.price
          };

          if (data) {
            await updateItem(data.item_id, payload);

            if (values.restock && values.restock > 0) {
                await restockItem(data.item_id, {
                    qty: values.restock,
                    note: values.restock_note
                });
            }
          } else {
            // Create requires quantity
            await createItem({
                ...payload,
                quantity: Number(values.quantity || 0),
            });
          }
          if (onSaved) onSaved({ message: data ? "Cập nhật thành công" : "Thêm mới thành công" });
          else message.success(data ? "Cập nhật thành công" : "Thêm mới thành công");
      } catch(err: any) {
          if (onError) onError({ message: err.message });
          else message.error(err.message || "Có lỗi xảy ra");
      } finally {
          setLoading(false);
      }
  };

  const handleUpload = (file: File) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
          setImageUrl(reader.result as string);
      };
      return false; // Prevent auto upload
  };

  return (
    <Drawer
        title={data ? "Chỉnh sửa vật tư" : "Thêm vật tư mới"}
        width={720}
        onClose={() => toggleDrawer(false, null)}
        open={openDrawer}
        bodyStyle={{ paddingBottom: 80 }}
        extra={
            <Space>
                <Button onClick={() => toggleDrawer(false, null)}>Hủy</Button>
                <Button onClick={() => form.submit()} type="primary" loading={loading}>
                    {data ? "Cập nhật" : "Thêm"}
                </Button>
            </Space>
        }
    >
        <Form layout="vertical" form={form} onFinish={onFinish}>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item name="name" label="Tên vật tư" rules={[{ required: true, message: 'Vui lòng nhập tên vật tư' }]}>
                        <Input placeholder="Nhập tên vật tư" />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item name="category_id" label="Danh mục" rules={[{ required: true, message: 'Vui lòng chọn danh mục' }]}>
                        <Select placeholder="Chọn danh mục">
                            {categories?.map((c: any) => (
                                <Option key={c.id} value={String(c.id)}>{c.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
            </Row>
            
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item name="code" label="Mã vật tư">
                        <Input placeholder="Mã vật tư" />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item name="price" label="Giá (VNĐ)">
                         <InputNumber 
                            style={{ width: '100%' }} 
                            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                         />
                    </Form.Item>
                </Col>
            </Row>

             <Row gutter={16}>
                <Col span={12}>
                     {data ? (
                         <Form.Item label="Số lượng hiện có">
                             <Input value={data.quantity} disabled />
                         </Form.Item>
                     ) : (
                         <Form.Item name="quantity" label="Số lượng ban đầu" initialValue={0}>
                             <InputNumber min={0} style={{ width: '100%' }} />
                         </Form.Item>
                     )}
                </Col>
                <Col span={12}>
                    <Form.Item name="quantity_unit" label="Đơn vị tính">
                        <Input placeholder="kg, cái, ..." />
                    </Form.Item>
                </Col>
            </Row>
            
            {data && (
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="restock" label="Nhập thêm (số lượng)" initialValue={0}>
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="restock_note" label="Ghi chú nhập">
                            <Input placeholder="Ghi chú nhập thêm" />
                        </Form.Item>
                    </Col>
                </Row>
            )}

            <Form.Item name="info" label="Mô tả">
                <Input.TextArea rows={4} placeholder="Mô tả chi tiết" />
            </Form.Item>

            <Form.Item label="Hình ảnh">   
                <Upload 
                    listType="picture-card"
                    maxCount={1}
                    beforeUpload={handleUpload}
                    showUploadList={false}
                >
                     {imageUrl ? <img src={imageUrl} alt="avatar" style={{ width: '100%' }} /> : (
                         <div>
                            <PlusOutlined />
                            <div style={{ marginTop: 8 }}>Upload</div>
                        </div>
                     )}
                </Upload>
                {imageUrl && <Button type="link" danger onClick={() => setImageUrl(null)}>Xóa ảnh</Button>}
            </Form.Item>
        </Form>
    </Drawer>
  );
}
