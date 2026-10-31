import React, { useEffect, useState, useCallback } from "react";
import {
  Drawer,
  Button,
  Card,
  Space,
  Tag,
  Alert,
  Spin,
  Empty,
  message,
  Modal,
  Row,
  Col,
  Steps,
} from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  DropboxOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { IStockOut } from "../../../../types/inventory.types";
import RepairTicketBadge from "../RepairTicketBadge";

interface Props {
  open: boolean;
  onClose: () => void;
  stockOutId?: number;
  onActionSuccess?: () => void;
  onOpenRepairDetail?: (repairId: number) => void;
}

export default function StockOutDetailDrawer({
  open,
  onClose,
  stockOutId,
  onActionSuccess,
  onOpenRepairDetail,
}: Props) {
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

  const renderStatusTag = (status?: string) => {
    const s = String(status ?? "").toUpperCase();
    if (s === "APPROVED") {
      return (
        <Tag color="success" style={{ fontWeight: 600, borderRadius: 6, padding: "2px 10px" }}>
          <CheckCircleOutlined style={{ marginRight: 4 }} />
          Đã xuất kho
        </Tag>
      );
    }
    if (s === "PENDING") {
      return (
        <Tag color="warning" style={{ fontWeight: 600, borderRadius: 6, padding: "2px 10px" }}>
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          Chờ phê duyệt
        </Tag>
      );
    }
    if (s === "CANCELED" || s === "CANCELLED") {
      return (
        <Tag color="error" style={{ fontWeight: 600, borderRadius: 6, padding: "2px 10px" }}>
          <CloseCircleOutlined style={{ marginRight: 4 }} />
          Đã từ chối / Hủy
        </Tag>
      );
    }
    return <Tag>Chưa xác định</Tag>;
  };

  const handleApprove = () => {
    if (!stockOutId) return;
    Modal.confirm({
      title: "Xác nhận phê duyệt xuất kho",
      content: `Bạn có chắc chắn muốn duyệt xuất kho #${stockOutId} và trừ tồn kho tự động?`,
      okText: "Phê duyệt ngay",
      okType: "primary",
      cancelText: "Hủy",
      onOk: async () => {
        setBusy(true);
        try {
          await approveStockOut(stockOutId);
          message.success("Đã phê duyệt và xuất kho thành công");
          onActionSuccess?.();
          onClose();
        } catch (err: any) {
          message.error(err?.message || "Lỗi khi duyệt yêu cầu");
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const handleCancel = () => {
    if (!stockOutId) return;
    Modal.confirm({
      title: "Xác nhận từ chối / hủy yêu cầu",
      content: "Yêu cầu xuất kho này sẽ bị hủy bỏ và không xuất vật tư.",
      okText: "Từ chối yêu cầu",
      okType: "danger",
      cancelText: "Quay lại",
      onOk: async () => {
        setBusy(true);
        try {
          await cancelStockOut(stockOutId);
          message.success("Đã từ chối / hủy yêu cầu thành công");
          onActionSuccess?.();
          onClose();
        } catch (err: any) {
          message.error(err?.message || "Lỗi khi hủy yêu cầu");
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const isRepairRelated = Boolean(detail?.repair);
  const statusUpper = String(detail?.status ?? "").toUpperCase();

  // Steps progress
  const stepCurrent =
    statusUpper === "APPROVED" ? 2 : statusUpper === "CANCELED" ? 1 : 0;
  const stepStatus = statusUpper === "CANCELED" ? "error" : "process";

  // Stock comparison calculation
  const stockQty = detail?.item?.quantity ?? 0;
  const reqQty = detail?.quantity ?? 0;
  const unit = detail?.item?.quantity_unit || "Cái";
  const remainingStock = stockQty - reqQty;
  const isOutOfStock = stockQty < reqQty && statusUpper === "PENDING";

  return (
    <Drawer
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1d4ed8",
              fontSize: 16,
            }}
          >
            <DropboxOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>
              Chi tiết yêu cầu xuất kho #{detail?.id}
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              Hệ thống Quản lý Vật tư & Cấp phát CMMS VCS
            </div>
          </div>
        </div>
      }
      open={open}
      onClose={onClose}
      width={640}
      extra={detail && renderStatusTag(detail.status)}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Button onClick={onClose} style={{ borderRadius: 6 }}>
            Đóng
          </Button>

          {statusUpper === "PENDING" && !isRepairRelated && (
            <Space size={10}>
              <Button
                danger
                onClick={handleCancel}
                loading={busy}
                style={{ borderRadius: 6, fontWeight: 600 }}
              >
                Từ chối / Hủy
              </Button>
              <Button
                type="primary"
                onClick={handleApprove}
                loading={busy}
                style={{
                  borderRadius: 6,
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
                }}
              >
                Phê duyệt xuất kho
              </Button>
            </Space>
          )}

          {statusUpper === "PENDING" && isRepairRelated && (
            <span style={{ fontSize: 12, color: "#7c3aed", fontWeight: 500 }}>
              <ToolOutlined style={{ marginRight: 4 }} />
              Duyệt qua quy trình phiếu sửa chữa #{detail?.repair?.repair_id}
            </span>
          )}
        </div>
      }
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: "#64748b" }}>Đang tải chi tiết yêu cầu...</div>
        </div>
      ) : !detail ? (
        <Empty description="Không tìm thấy dữ liệu yêu cầu xuất kho" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Progress Timeline */}
          <Card
            variant="borderless"
            style={{
              background: "#f8fafc",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
            }}
            styles={{ body: { padding: "16px 20px" } }}
          >
            <Steps
              current={stepCurrent}
              status={stepStatus}
              size="small"
              items={[
                {
                  title: <span style={{ fontWeight: 600 }}>1. Tạo yêu cầu</span>,
                  description: (
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      {detail.created_at ? dayjs(detail.created_at).format("HH:mm DD/MM") : ""}
                    </span>
                  ),
                },
                {
                  title: <span style={{ fontWeight: 600 }}>2. Cán bộ duyệt</span>,
                  description: (
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      {statusUpper === "APPROVED"
                        ? "Đã duyệt xuất"
                        : statusUpper === "CANCELED"
                        ? "Đã từ chối"
                        : "Đang chờ duyệt"}
                    </span>
                  ),
                },
                {
                  title: <span style={{ fontWeight: 600 }}>3. Cấp phát kho</span>,
                  description: (
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      {statusUpper === "APPROVED" ? "Hoàn tất" : "Chưa thực hiện"}
                    </span>
                  ),
                },
              ]}
            />
          </Card>

          {/* Sửa chữa alert nếu có */}
          {isRepairRelated && (
            <Alert
              type="info"
              showIcon
              icon={<ToolOutlined />}
              message={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>Yêu cầu cấp phát theo quy trình Sửa chữa</span>
                  {detail?.repair && (
                    <RepairTicketBadge
                      repair={detail.repair}
                      onClick={(id) => onOpenRepairDetail?.(id)}
                    />
                  )}
                </div>
              }
              description={
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Vật tư này được đăng ký phục vụ phiếu sửa chữa <b>#{detail.repair?.repair_id}</b>. Khi
                  phiếu sửa chữa được cấp thẩm quyền nghiệm thu, hệ thống sẽ tự động xác nhận xuất kho.
                </div>
              }
              style={{ borderRadius: 8, border: "1px solid #ddd6fe", background: "#f5f3ff" }}
            />
          )}

          {/* Khối Đối chiếu Tồn kho */}
          <Card
            variant="borderless"
            style={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>
              ĐỐI CHIẾU SỐ LƯỢNG & TỒN KHO KHẢ DỤNG
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr auto 1fr",
                alignItems: "center",
                gap: 8,
                background: "#f8fafc",
                borderRadius: 10,
                padding: "16px 14px",
                border: "1px solid #f1f5f9",
              }}
            >
              {/* Tồn hiện tại */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>TỒN HIỆN CÓ</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                  {stockQty}
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{unit}</div>
              </div>

              {/* Mũi tên trừ */}
              <div style={{ fontSize: 18, color: "#94a3b8", fontWeight: 800 }}>-</div>

              {/* Số lượng xuất */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#d97706", fontWeight: 700 }}>XUẤT THEO PHIẾU</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#d97706", marginTop: 2 }}>
                  {reqQty}
                </div>
                <div style={{ fontSize: 11, color: "#d97706" }}>{unit}</div>
              </div>

              {/* Mũi tên bằng */}
              <div style={{ fontSize: 18, color: "#94a3b8", fontWeight: 800 }}>=</div>

              {/* Tồn còn lại */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: remainingStock >= 0 ? "#059669" : "#dc2626", fontWeight: 700 }}>
                  TỒN DỰ KIẾN
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: remainingStock >= 0 ? "#059669" : "#dc2626",
                    marginTop: 2,
                  }}
                >
                  {remainingStock}
                </div>
                <div style={{ fontSize: 11, color: remainingStock >= 0 ? "#059669" : "#dc2626" }}>{unit}</div>
              </div>
            </div>

            {isOutOfStock && (
              <Alert
                type="error"
                showIcon
                icon={<WarningOutlined />}
                message="Cảnh báo thiếu hàng trong kho!"
                description={`Số lượng yêu cầu xuất (${reqQty} ${unit}) vượt quá lượng tồn kho khả dụng hiện tại (${stockQty} ${unit}). Cần nhập thêm tồn hoặc điều chỉnh số lượng trước khi duyệt.`}
                style={{ marginTop: 12, borderRadius: 8 }}
              />
            )}
          </Card>

          {/* Chi tiết vật tư */}
          <Card
            variant="borderless"
            style={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>
              THÔNG TIN VẬT TƯ / PHỤ TÙNG
            </div>

            {detail.item ? (
              <Row gutter={[16, 12]}>
                <Col span={14}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Tên vật tư / Phụ tùng:</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                    {detail.item.name}
                  </div>
                </Col>
                <Col span={10}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Mã quản lý:</div>
                  <Tag color="blue" style={{ marginTop: 2, fontWeight: 600 }}>
                    {detail.item.code || `VT-${detail.item.item_id}`}
                  </Tag>
                </Col>
                <Col span={14}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Danh mục:</div>
                  <div style={{ fontSize: 13, color: "#334155", marginTop: 2 }}>
                    {detail.item.category?.name || "Chưa phân loại"}
                  </div>
                </Col>
                <Col span={10}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Đơn vị tính:</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginTop: 2 }}>
                    {detail.item.quantity_unit || "Cái"}
                  </div>
                </Col>
                {detail.item.info && (
                  <Col span={24}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Thông số / Mô tả kỹ thuật:</div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                      {detail.item.info}
                    </div>
                  </Col>
                )}
              </Row>
            ) : (
              <Empty description="Không có thông tin chi tiết vật tư" />
            )}
          </Card>

          {/* Thông tin luồng yêu cầu */}
          <Card
            variant="borderless"
            style={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>
              THÔNG TIN PHÊ DUYỆT & GIAO DỊCH
            </div>

            <Row gutter={[16, 12]}>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#64748b" }}>Người gửi yêu cầu:</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>
                  <UserOutlined style={{ marginRight: 6, color: "#1677ff" }} />
                  {typeof detail.requested_by === "object"
                    ? detail.requested_by?.name || detail.requested_by?.email
                    : detail.requester_name || "—"}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#64748b" }}>Thời gian gửi:</div>
                <div style={{ fontSize: 13, color: "#334155", marginTop: 2 }}>
                  <CalendarOutlined style={{ marginRight: 6, color: "#64748b" }} />
                  {detail.created_at ? dayjs(detail.created_at).format("HH:mm DD/MM/YYYY") : "—"}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#64748b" }}>Người phê duyệt:</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>
                  <UserOutlined style={{ marginRight: 6, color: "#059669" }} />
                  {typeof detail.approved_by === "object"
                    ? detail.approved_by?.name || detail.approved_by?.email
                    : "Chưa duyệt"}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#64748b" }}>Mục đích sử dụng:</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginTop: 2 }}>
                  {detail.purpose || "Xuất bảo dưỡng sửa chữa"}
                </div>
              </Col>
              {detail.note && (
                <Col span={24}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Ghi chú:</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#475569",
                      marginTop: 2,
                      background: "#f8fafc",
                      padding: "8px 12px",
                      borderRadius: 6,
                    }}
                  >
                    {detail.note}
                  </div>
                </Col>
              )}
            </Row>
          </Card>
        </div>
      )}
    </Drawer>
  );
}
