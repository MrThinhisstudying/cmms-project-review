import React from "react";
import {
  Modal,
  Tag,
  Card,
  Alert,
  Button,
  Descriptions,
} from "antd";
import {
  CarOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  ClockCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

interface Props {
  open: boolean;
  onCancel: () => void;
  data: any;
  onCancelTicket?: (ticketId: number) => void;
}

const LEVEL_MAP: Record<string, { label: string; color: string }> = {
  Tuần: { label: "Tuần", color: "blue" },
  "1W": { label: "Tuần", color: "blue" },
  "1M": { label: "01 Tháng", color: "cyan" },
  "3M": { label: "03 Tháng", color: "geekblue" },
  "6M": { label: "06 Tháng", color: "orange" },
  "9M": { label: "09 Tháng", color: "purple" },
  "1Y": { label: "01 Năm", color: "magenta" },
  "2Y": { label: "02 Năm", color: "volcano" },
};

const TicketDetailModal: React.FC<Props> = ({
  open,
  onCancel,
  data,
  onCancelTicket,
}) => {
  if (!data) return null;

  const rawLevel = data.maintenance_level || "Tuần";
  const levelInfo = LEVEL_MAP[rawLevel] || { label: rawLevel, color: "blue" };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#002766" }}>
            Chi Tiết Phiếu Bảo Dưỡng #{data.ticket_id}
          </span>
          {data.status === "done" ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Hoàn thành
            </Tag>
          ) : (
            <Tag color="error" icon={<CloseCircleOutlined />}>
              Đã hủy
            </Tag>
          )}
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          {data.status !== "canceled" && onCancelTicket && (
            <Button
              danger
              icon={<StopOutlined />}
              onClick={() => {
                onCancel();
                onCancelTicket(data.ticket_id);
              }}
            >
              Hủy phiếu
            </Button>
          )}
          <Button type="primary" onClick={onCancel}>
            Đóng
          </Button>
        </div>
      }
      width={720}
      centered
      destroyOnClose
    >
      {/* Cảnh báo nếu phiếu đã bị hủy */}
      {data.status === "canceled" && (
        <Alert
          message="Phiếu bảo dưỡng này đã bị hủy"
          description={
            <div>
              <div>
                <b>Lý do hủy:</b> {data.cancel_reason || "Không có lý do"}
              </div>
              {data.cancelled_by?.name && (
                <div style={{ marginTop: 4 }}>
                  <b>Người thực hiện hủy:</b> {data.cancelled_by.name}
                </div>
              )}
            </div>
          }
          type="error"
          showIcon
          style={{ marginBottom: 16, borderRadius: 6 }}
        />
      )}

      {/* THẺ XANH DƯƠNG CHUẨN FORM BẢO DƯỠNG */}
      <Card
        size="small"
        style={{
          marginBottom: 16,
          background: "linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%)",
          border: "1px solid #91d5ff",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(24, 144, 255, 0.08)",
        }}
        styles={{ body: { padding: "16px 20px" } }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: "#1890ff",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <CarOutlined /> THÔNG TIN THIẾT BỊ BẢO DƯỠNG
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#002766",
                marginTop: 4,
              }}
            >
              {data.device?.name || "N/A"}
            </div>
            <div style={{ fontSize: 13, color: "#595959", marginTop: 2 }}>
              Nhãn hiệu / Chủng loại:{" "}
              <b>
                {data.device?.brand ||
                  data.device?.deviceType?.name ||
                  "Nhật Bản"}
              </b>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid #d9d9d9",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                BIỂN SỐ / ĐĂNG KÝ
              </div>
              <Tag
                color="cyan"
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  margin: "2px 0 0 0",
                }}
              >
                {data.device?.reg_number ||
                  data.device?.serial_number ||
                  "Chưa có biển"}
              </Tag>
            </div>

            <div
              style={{
                background: "#fff",
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid #d9d9d9",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                CẤP BẢO DƯỠNG
              </div>
              <Tag
                color={levelInfo.color}
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  margin: "2px 0 0 0",
                }}
              >
                {levelInfo.label}
              </Tag>
            </div>
          </div>
        </div>

        {/* DÒNG NGÀY THỰC HIỆN BẢO DƯỠNG */}
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px dashed #91d5ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarOutlined style={{ fontSize: 18, color: "#1890ff" }} />
            <span style={{ fontWeight: 600, fontSize: 14, color: "#002766" }}>
              Ngày thực hiện bảo dưỡng:
            </span>
          </div>

          <Tag
            color="blue"
            style={{
              fontSize: 14,
              fontWeight: 700,
              padding: "4px 12px",
              borderRadius: 6,
            }}
          >
            <CalendarOutlined style={{ marginRight: 6 }} />
            {data.execution_date
              ? dayjs(data.execution_date).format("DD/MM/YYYY")
              : data.created_at
              ? dayjs(data.created_at).format("DD/MM/YYYY")
              : "-"}
          </Tag>
        </div>
      </Card>

      {/* THÔNG TIN HỆ THỐNG GHI NHẬN */}
      <Card
        size="small"
        style={{
          borderRadius: 8,
          marginBottom: data.arising_issues ? 16 : 0,
        }}
        styles={{ body: { padding: 16 } }}
      >
        <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
          <Descriptions.Item label="Mã phiếu">
            <b style={{ color: "#1890ff" }}>#{data.ticket_id}</b>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            {data.status === "done" ? (
              <Tag color="success">Hoàn thành</Tag>
            ) : (
              <Tag color="error">Đã hủy</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Người thực hiện / lập">
            <span style={{ fontWeight: 600 }}>
              <UserOutlined style={{ marginRight: 6, color: "#1890ff" }} />
              {data.user?.name || "Hệ thống"}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian ghi nhận">
            <span style={{ color: "#666" }}>
              <ClockCircleOutlined
                style={{ marginRight: 6, color: "#8c8c8c" }}
              />
              {data.created_at
                ? dayjs(data.created_at).format("DD/MM/YYYY HH:mm")
                : "-"}
            </span>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Ghi chú phát sinh nếu có */}
      {data.arising_issues && (
        <Card
          size="small"
          title="Ghi chú / Phát sinh"
          style={{ borderRadius: 8, marginTop: 16 }}
        >
          <div style={{ whiteSpace: "pre-wrap", color: "#555" }}>
            {data.arising_issues}
          </div>
        </Card>
      )}
    </Modal>
  );
};

export default TicketDetailModal;
