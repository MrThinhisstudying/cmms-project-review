import React, { useEffect, useState } from "react";
import {
  Modal,
  Tabs,
  Typography,
  Descriptions,
  Tag,
  List,
  Avatar,
  Spin,
  Empty,
  Button
} from "antd";
import { 
    CodeSandboxOutlined, 
    HistoryOutlined, 
    ExportOutlined 
} from "@ant-design/icons";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { useAuthContext } from "../../../../context/AuthContext/AuthContext";

const { Text, Title } = Typography;

export default function ItemDetailModal({ open, onClose, item }: any) {
  const { getItemTransactions, getStockOutsByItemId } = useInventoryContext();
  const { user } = useAuthContext();

  const [txs, setTxs] = useState<any[]>([]);
  const [stockOuts, setStockOuts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      (async () => {
        setLoading(true);
        try {
           // Safe check for item_id
          const id = item?.item_id ?? item?.id;
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
    if (s === "pending") return <Tag color="warning">Đang chờ</Tag>;
    if (s === "canceled" || s === "cancelled") return <Tag color="error">Đã hủy</Tag>;
    return <Tag color="default">Unknown</Tag>;
  };

  const renderHistoryList = (data: any[], type: "in" | "out") => {
    if (loading) return <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>;
    if (!data || data.length === 0) return <Empty description={type === "in" ? "Chưa có lịch sử nhập" : "Chưa có lịch sử xuất"} />;

    return (
      <List
        dataSource={data}
        renderItem={(record) => (
          <List.Item>
            <List.Item.Meta
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong style={{ color: type === "in" ? '#3f8600' : '#cf1322' }}>
                        {type === "in" ? "+" : "-"}{type === "in" ? record.delta : record.quantity} {item?.quantity_unit}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(record.created_at || record.occurred_at).toLocaleString('vi-VN')}
                    </Text>
                </div>
              }
              description={
                <div>
                    <div>{record.note || record.purpose || (type === "in" ? "Nhập hàng" : "Xuất kho")}</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                        {type === "out" && <span style={{ marginRight: 8 }}>{getStatusTag(record.status)}</span>}
                        <span>Bởi: <b>{record.user?.name || record.requested_by?.name || "Unknown"}</b></span>
                    </div>
                </div>
              }
            />
          </List.Item>
        )}
        style={{ maxHeight: 400, overflowY: 'auto' }}
      />
    );
  };

  const items = [
    {
      key: '1',
      label: <span><HistoryOutlined /> Lịch sử nhập</span>,
      children: renderHistoryList(txs, "in"),
    },
    {
      key: '2',
      label: <span><ExportOutlined /> Lịch sử xuất</span>,
      children: renderHistoryList(stockOuts, "out"),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[<Button key="close" onClick={onClose}>Đóng</Button>]}
      width={700}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar shape="square" size={48} src={item?.image} icon={<CodeSandboxOutlined />} />
            <div>
                <Title level={5} style={{ margin: 0 }}>{item?.name}</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>{item?.category?.name}</Text>
            </div>
        </div>
      }
    >
        <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
            <Descriptions.Item label="Mô tả">{item?.info || "—"}</Descriptions.Item>
            <Descriptions.Item label="Tồn kho">
                <strong>{item?.quantity}</strong> {item?.quantity_unit}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
                <Tag color={item?.enabled ? "blue" : "default"}>
                    {item?.enabled ? "Hoạt động" : "Ngừng sử dụng"}
                </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Cập nhật cuối">
                {item?.updated_at ? new Date(item.updated_at).toLocaleString('vi-VN') : "—"}
            </Descriptions.Item>
        </Descriptions>

        <Tabs defaultActiveKey="1" items={items} style={{ marginTop: 24 }} />
    </Modal>
  );
}
