import React, { useEffect, useState } from "react";
import { Modal, Table, Button, Input, Form, Space, message, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { 
    getAllDeviceTypes, 
    createDeviceType, 
    updateDeviceType, 
    deleteDeviceType, 
    IDeviceType 
} from "../../../apis/device-types";
import { getToken } from "../../../utils/auth";

interface Props {
    open: boolean;
    onClose: () => void;
    onChange?: () => void;
}

const DeviceTypeManagerModal: React.FC<Props> = ({ open, onClose, onChange }) => {
    const [loading, setLoading] = useState(false);
    const [list, setList] = useState<IDeviceType[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form] = Form.useForm();

    const fetchList = async () => {
        setLoading(true);
        try {
            const data = await getAllDeviceTypes(getToken());
            setList(data);
        } catch (error) {
            // silent or message
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchList();
            form.resetFields();
            setEditingId(null);
        }
    }, [open, form]);

    const onFinish = async (values: any) => {
        try {
            if (editingId) {
                await updateDeviceType(getToken(), editingId, values);
                message.success("Cập nhật thành công");
                setEditingId(null);
            } else {
                // Auto generate code if not provided
                if (!values.code) {
                     values.code = values.name.toLowerCase()
                        .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a")
                        .replace(/[èéẹẻẽêềếệểễ]/g, "e")
                        .replace(/[ìíịỉĩ]/g, "i")
                        .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o")
                        .replace(/[ùúụủũưừứựửữ]/g, "u")
                        .replace(/[ỳýỵỷỹ]/g, "y")
                        .replace(/đ/g, "d")
                        .replace(/\s+/g, "_")
                        .replace(/[^a-z0-9_]/g, "");
                }
                
                await createDeviceType(getToken(), values);
                message.success("Thêm mới thành công");
            }
            form.resetFields();
            form.resetFields();
            await fetchList();
            setTimeout(() => onChange?.(), 500); // Wait bit for safety
        } catch (err: any) {
            message.error("Lỗi: " + (err.message || "Không thể lưu"));
        }
    };

    const handleEdit = (record: IDeviceType) => {
        setEditingId(record.id);
        form.setFieldsValue(record);
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteDeviceType(getToken(), id);
            message.success("Xóa thành công");
            await fetchList();
            setTimeout(() => onChange?.(), 500);
        } catch (err) {
            message.error("Không thể xóa (có thể đang được sử dụng)");
        }
    };

    const columns = [
        { title: "Tên hiển thị", dataIndex: "name", key: "name" },
        { title: "Mã hệ thống", dataIndex: "code", key: "code" },
        {
            title: "Hành động",
            key: "action",
            render: (_: any, record: IDeviceType) => (
                <Space>
                    <Button 
                        size="small" 
                        icon={<EditOutlined />} 
                        onClick={() => handleEdit(record)} 
                    />
                    <Popconfirm 
                        title="Xóa loại này?" 
                        onConfirm={() => handleDelete(record.id)}
                    >
                        <Button 
                            size="small" 
                            danger 
                            icon={<DeleteOutlined />} 
                        />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <Modal
            title="Quản lý Loại Thiết Bị"
            open={open}
            onCancel={onClose}
            footer={null}
            width={700}
            destroyOnClose
        >
            <Form form={form} layout="inline" onFinish={onFinish} style={{ marginBottom: 20 }}>
                <Form.Item 
                    name="name" 
                    rules={[{ required: true, message: "Nhập tên" }]}
                >
                    <Input placeholder="Tên loại (Vd: Xe Cẩu)" />
                </Form.Item>
                <Form.Item name="code">
                    <Input placeholder="Mã (tự động nếu để trống)" />
                </Form.Item>
                <Form.Item>
                    <Button type="primary" htmlType="submit" icon={editingId ? <EditOutlined /> : <PlusOutlined />}>
                        {editingId ? "Lưu" : "Thêm"}
                    </Button>
                    {editingId && (
                        <Button 
                            style={{ marginLeft: 8 }} 
                            onClick={() => {
                                setEditingId(null);
                                form.resetFields();
                            }}
                        >
                            Hủy
                        </Button>
                    )}
                </Form.Item>
            </Form>

            <Table 
                dataSource={list} 
                columns={columns} 
                rowKey="id" 
                loading={loading}
                pagination={{ pageSize: 5 }}
            />
        </Modal>
    );
};

export default DeviceTypeManagerModal;
