import React, { useState } from "react";
import { Card, Button, Tooltip, Switch, Modal, Divider, message, Image, Typography } from "antd";
import { 
    EditOutlined, 
    DeleteOutlined, 
    ExportOutlined, 
    EyeOutlined,
    FileImageOutlined
} from "@ant-design/icons";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { useAuthContext } from "../../../../context/AuthContext/AuthContext";
import CreateStockOutModal from "../CreateStockOutModal";
import ItemDetailModal from "../ItemDetailModal";

const { Text, Title, Paragraph } = Typography;

export default function ItemCard({ item, toggleDrawer, refreshAll }: any) {
  const { user } = useAuthContext();
  const { deleteItem, updateItem } = useInventoryContext();
  const [openCreateSO, setOpenCreateSO] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = () => {
    Modal.confirm({
      title: "Xóa vật tư",
      content: "Bạn có chắc chắn muốn xóa vật tư này khỏi kho không? Hành động này không thể hoàn tác.",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await deleteItem(item.item_id);
          message.success("Xóa vật tư thành công");
          await refreshAll();
        } catch (err: any) {
          message.error("Không thể xóa vật tư: vật tư này đang được sử dụng.");
        }
      }
    });
  };

  const handleToggleEnabled = async (checked: boolean) => {
    try {
      setLoading(true);
      await updateItem(item.item_id, { enabled: checked });
      await refreshAll();
      message.success(`Đã ${checked ? "bật" : "tắt"} hoạt động vật tư`);
    } catch(err) {
        message.error("Cập nhật thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Card
      hoverable
      cover={
        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', overflow: 'hidden' }}>
            {item.image ? (
                <div style={{ width: '100%', height: '100%', display: 'flex' }}>
                    <Image 
                        src={item.image} 
                        alt={item.name} 
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }} 
                        width='100%'
                        height='100%'
                        preview={false} 
                    />
                </div>
            ) : (
                <FileImageOutlined style={{ fontSize: 60, color: '#d9d9d9' }} />
            )}
        </div>
      }
      styles={{ body: { padding: 16 } }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minHeight: 60 }}>
            <div style={{ flex: 1, paddingRight: 8 }}>
                <Tooltip title={item.name}>
                    <Title level={5} ellipsis={{ rows: 2 }} style={{ margin: 0, fontSize: 16, lineHeight: 1.3 }}>
                        {item.name}
                    </Title>
                </Tooltip>
                <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ fontSize: 13, marginBottom: 0, marginTop: 4 }}>
                    {item.info || "—"}
                </Paragraph>
            </div>
            
            {["admin", "manager", "ADMIN", "MANAGER"].includes(user?.role || "") && (
                <div style={{ display: 'flex', gap: 0 }}>
                    <Tooltip title="Chỉnh sửa">
                        <Button size="small" type="text" icon={<EditOutlined />} onClick={() => toggleDrawer(true, item)} />
                    </Tooltip>
                    <Tooltip title="Xoá vật tư">
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={handleDelete} />
                    </Tooltip>
                </div>
            )}
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                 <Text strong style={{ marginRight: 8 }}>SL: {item.quantity}</Text>
                 <Text type="secondary">({item.quantity_unit || '-'})</Text>
            </div>

            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                 <Tooltip title="Xuất kho">
                    <Button size="small" icon={<ExportOutlined />} onClick={() => setOpenCreateSO(true)} />
                 </Tooltip>
                 
                 {["admin", "manager", "ADMIN", "MANAGER"].includes(user?.role || "") && (
                     <>
                        <Tooltip title="Chi tiết & Lịch sử">
                            <Button size="small" icon={<EyeOutlined />} onClick={() => setOpenDetail(true)} />
                        </Tooltip>
                        <Tooltip title={item.enabled ? "Đang hoạt động" : "Đã tắt"}>
                            <Switch 
                                size="small" 
                                checked={!!item.enabled} 
                                onChange={handleToggleEnabled} 
                                loading={loading}
                            />
                        </Tooltip>
                     </>
                 )}
            </div>
        </div>
    </Card>

    {["admin", "manager", "ADMIN", "MANAGER"].includes(user?.role || "") && (
        <ItemDetailModal
          open={openDetail}
          onClose={() => setOpenDetail(false)}
          item={item}
        />
    )}

    <CreateStockOutModal
        open={openCreateSO}
        onClose={() => setOpenCreateSO(false)}
        item={item}
        onSaved={refreshAll}
    />
    </>
  );
}
