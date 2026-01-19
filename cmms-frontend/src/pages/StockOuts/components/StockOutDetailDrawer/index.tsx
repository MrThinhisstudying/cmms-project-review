import React, { useEffect, useState, useCallback } from "react";
import {
  Drawer,
  Typography,
  Button,
  Card,
  Space,
  Descriptions,
  Tag,
  Alert,
  Spin,
  Empty,
  message,
  Modal
} from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  DropboxOutlined
} from "@ant-design/icons";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { IStockOut } from "../../../../types/inventory.types";

const { Text, Paragraph } = Typography;

export default function StockOutDetailDrawer({
  open,
  onClose,
  stockOutId,
  onActionSuccess,
}: {
  open: boolean;
  onClose: () => void;
  stockOutId?: number;
  onActionSuccess?: () => void;
}) {
  const { getStockOut, approveStockOut, cancelStockOut } = useInventoryContext();
  const [detail, setDetail] = useState<IStockOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchDetail = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const so = await getStockOut(id);
      setDetail(so ?? null);
    } catch (err: any) {
      console.error(err);
      message.error("Không thể tải chi tiết yêu cầu");
    } finally {
      setLoading(false);
    }
  }, [getStockOut]);

  useEffect(() => {
    if (open && stockOutId) fetchDetail(stockOutId);
  }, [open, stockOutId, fetchDetail]);

  const renderStatus = (status?: string) => {
    const s = String(status ?? "").toLowerCase();
    if (s === "approved") return <Tag color="success">Đã duyệt</Tag>;
    if (s === "pending") return <Tag color="warning">Đang chờ duyệt</Tag>;
    if (s === "canceled") return <Tag color="error">Đã huỷ</Tag>;
    return <Tag>Unknown</Tag>;
  };

  const handleApprove = () => {
    if (!stockOutId) return;
    Modal.confirm({
        title: "Duyệt yêu cầu",
        content: "Bạn có chắc chắn muốn duyệt yêu cầu này?",
        onOk: async () => {
            setBusy(true);
            try {
              await approveStockOut(stockOutId);
              message.success("Duyệt thành công");
              onActionSuccess?.();
              onClose();
            } catch (err: any) {
              message.error(err?.message ?? "Lỗi khi duyệt");
            } finally {
              setBusy(false);
            }
        }
    });
  };

  const handleCancel = () => {
    if (!stockOutId) return;
     Modal.confirm({
        title: "Huỷ yêu cầu",
        content: "Bạn có chắc chắn muốn huỷ yêu cầu này?",
        okType: 'danger',
        onOk: async () => {
            setBusy(true);
            try {
              await cancelStockOut(stockOutId);
              message.success("Huỷ thành công");
              onActionSuccess?.();
              onClose();
            } catch (err: any) {
              message.error(err?.message ?? "Lỗi khi huỷ");
            } finally {
              setBusy(false);
            }
        }
    });
  };

  const isRepairRelated = !!detail?.repair;

  return (
    <Drawer 
        title={<Space><DropboxOutlined /> Chi tiết xuất kho #{detail?.id}</Space>} 
        open={open} 
        onClose={onClose} 
        width={600}
        extra={
            <Space>
                {detail && renderStatus(detail.status)}
            </Space>
        }
        footer={
            <div style={{ textAlign: 'right' }}>
                <Space>
                    <Button onClick={onClose}>Đóng</Button>
                    {detail?.status === "PENDING" && !isRepairRelated && (
                        <>
                            <Button danger onClick={handleCancel} loading={busy}>Từ chối / Huỷ</Button>
                            <Button type="primary" onClick={handleApprove} loading={busy}>Duyệt yêu cầu</Button>
                        </>
                    )}
                </Space>
            </div>
        }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
      ) : !detail ? (
        <Empty description="Không tìm thấy dữ liệu" />
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {isRepairRelated && (
              <Alert 
                type="info" 
                showIcon 
                message="Yêu cầu từ quy trình sửa chữa"
                description={
                    <span>
                        Yêu cầu này thuộc phiếu sửa chữa <strong>#{detail.repair?.repair_id}</strong>. 
                        Nó sẽ được tự động xử lý khi phiếu sửa chữa được duyệt.
                    </span>
                }
              />
            )}

            <Card type="inner" title="Thông tin chung" size="small">
                <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="Mã yêu cầu">#{detail.id}</Descriptions.Item>
                    <Descriptions.Item label="Người yêu cầu">
                        <Space>
                            <UserOutlined /> 
                            {typeof detail.requested_by === "object" ? (detail.requested_by?.name || detail.requested_by?.email) : "—"}
                        </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Người duyệt">
                         <Space>
                            <UserOutlined />
                            {typeof detail.approved_by === "object" ? (detail.approved_by?.name || detail.approved_by?.email) : "—"}
                        </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày tạo">
                         <Space>
                            <CalendarOutlined />
                            {new Date(detail.created_at || "").toLocaleString('vi-VN')}
                        </Space>
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            <Card type="inner" title="Thông tin vật tư" size="small">
                {detail.item ? (
                    <Descriptions column={1} bordered size="small">
                         <Descriptions.Item label="Tên vật tư"><strong>{detail.item.name}</strong></Descriptions.Item>
                         <Descriptions.Item label="Danh mục">{detail.item.category?.name || "—"}</Descriptions.Item>
                         <Descriptions.Item label="Số lượng xuất">
                            <Text type="danger" strong>{detail.quantity} {detail.item.quantity_unit}</Text>
                         </Descriptions.Item>
                         <Descriptions.Item label="Tồn kho hiện tại">{detail.item.quantity} {detail.item.quantity_unit}</Descriptions.Item>
                         <Descriptions.Item label="Mục đích">{detail.purpose || "—"}</Descriptions.Item>
                    </Descriptions>
                ) : (
                    <Empty description="Không có thông tin vật tư" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
            </Card>

            {detail.note && (
                <Card type="inner" title="Ghi chú" size="small">
                    <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{detail.note}</Paragraph>
                </Card>
            )}
        </Space>
      )}
    </Drawer>
  );
}
