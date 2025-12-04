import React from "react";
import { Modal, Descriptions, Table, Tag, Divider, Card, Row, Col } from "antd";
import dayjs from "dayjs";

interface Props {
  open: boolean;
  onCancel: () => void;
  data: any; // Dữ liệu phiếu (Ticket)
}

const TicketDetailModal: React.FC<Props> = ({ open, onCancel, data }) => {
  if (!data) return null;

  // --- Helper: Làm sạch văn bản (Xóa dấu "-" đầu dòng) ---
  const cleanText = (text: any) => {
    if (!text) return "";
    const s = String(text).trim();
    if (s === "-" || s === "–") return "";
    return s.replace(/-/g, " ");
  };

  // --- Helper: Map cấp độ sang tiếng Việt ---
  const getLevelLabel = (level: string) => {
    const map: any = {
      "1M": "01 Tháng",
      "3M": "03 Tháng",
      "6M": "06 Tháng",
      "9M": "09 Tháng",
      "1Y": "01 Năm",
      "2Y": "02 Năm",
    };
    return map[level] || level;
  };

  // --- Helper: Render Kết quả Checklist ---
  const renderChecklistStatus = (record: any) => {
    if (
      record.type === "input_number" ||
      (record.req && record.req.includes("M"))
    ) {
      return <b>{cleanText(record.value) || "_"}</b>;
    }
    if (record.status === "pass") return <Tag color="green">Đạt (✓)</Tag>;
    if (record.status === "fail") return <Tag color="red">K.Đạt (X)</Tag>;
    return <Tag>N/A</Tag>;
  };

  // --- Cấu hình cột cho bảng Checklist ---
  const checklistColumns = [
    {
      title: "Hạng mục kiểm tra",
      dataIndex: "task",
      key: "task",
      render: (text: string, record: any) => (
        <div>
          <div style={{ fontSize: 12, color: "#888" }}>
            {cleanText(record.category)}
          </div>
          <div style={{ fontWeight: 500 }}>{cleanText(text)}</div>
        </div>
      ),
    },
    {
      title: "Yêu cầu",
      dataIndex: "req",
      width: 100,
      align: "center" as const,
      render: (t: string) => {
        const clean = cleanText(t);
        return clean ? <Tag color="blue">{clean}</Tag> : "-";
      },
    },
    {
      title: "Kết quả",
      key: "result",
      width: 120,
      align: "center" as const,
      render: (_: any, record: any) => renderChecklistStatus(record),
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      render: (t: string) => (
        <span style={{ fontStyle: "italic", color: "#666" }}>
          {cleanText(t)}
        </span>
      ),
    },
  ];

  // --- Cấu hình cột cho bảng Nghiệm thu ---
  const acceptanceColumns = [
    {
      title: "Nội dung nghiệm thu",
      dataIndex: "item",
      render: (text: string, record: any) => {
        // Xử lý thụt đầu dòng nếu là mục con (dựa trên id có dấu chấm, vd: 3.1)
        const isSub = record.id && record.id.includes(".");
        return (
          <span
            style={{
              paddingLeft: isSub ? 20 : 0,
              fontWeight: isSub ? "normal" : 500,
            }}
          >
            {cleanText(text)}
          </span>
        );
      },
    },
    {
      title: "Đánh giá",
      dataIndex: "status",
      width: 120,
      align: "center" as const,
      render: (status: string) =>
        status === "pass" ? (
          <Tag color="green">ĐẠT</Tag>
        ) : (
          <Tag color="red">KHÔNG ĐẠT</Tag>
        ),
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      render: (t: string) => cleanText(t),
    },
  ];

  return (
    <Modal
      title={`Chi tiết Phiếu #${data.ticket_id}`}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={1000}
      style={{ top: 20 }}
    >
      {/* 1. THÔNG TIN CHUNG */}
      <Card
        size="small"
        title="1. TRANG THIẾT BỊ BẢO DƯỠNG / EQUIPMENT"
        style={{ marginBottom: 16 }}
      >
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="Thiết bị">
            <b>{data.device?.name}</b>
          </Descriptions.Item>
          <Descriptions.Item label="Biển số">
            {data.device?.serial_number}
          </Descriptions.Item>
          <Descriptions.Item label="Cấp bảo dưỡng">
            {/* Đã sửa: Hiển thị tiếng Việt */}
            <Tag color="orange">{getLevelLabel(data.maintenance_level)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Số GHĐ/Km">
            {data.working_hours ? data.working_hours.toLocaleString() : "..."}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày thực hiện">
            {dayjs(data.execution_date).format("DD/MM/YYYY")}
          </Descriptions.Item>
          <Descriptions.Item label="Người lập phiếu">
            {data.user?.name}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 2. NGƯỜI THỰC HIỆN */}
      <Card
        size="small"
        title="2. NGƯỜI THỰC HIỆN / CHECKED BY"
        style={{ marginBottom: 16 }}
      >
        {Array.isArray(data.execution_team) &&
        data.execution_team.length > 0 ? (
          <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
            {data.execution_team.map((p: any, idx: number) => (
              <li key={idx}>
                <b>{p.name}</b> - Ngày: {dayjs(p.date).format("DD/MM/YYYY")}
              </li>
            ))}
          </ul>
        ) : (
          <span style={{ color: "#999" }}>Chưa cập nhật</span>
        )}
      </Card>

      {/* 3. CHECKLIST CHI TIẾT */}
      <Card
        size="small"
        title="3. NỘI DUNG BẢO DƯỠNG (ĐÍNH KÈM)"
        style={{ marginBottom: 16 }}
      >
        <Table
          dataSource={data.checklist_result || []}
          columns={checklistColumns}
          rowKey="code"
          pagination={false}
          size="small"
          scroll={{ y: 400 }}
          bordered
        />
      </Card>

      {/* 4. PHÁT SINH */}
      <Card size="small" title="4. PHÁT SINH KHÁC" style={{ marginBottom: 16 }}>
        <div style={{ whiteSpace: "pre-wrap" }}>
          {cleanText(data.arising_issues) || "Không có"}
        </div>
      </Card>

      {/* 5. NGHIỆM THU & KẾT LUẬN (ĐÃ CẬP NHẬT CẤU TRÚC) */}
      <Card
        size="small"
        title="5. NGHIỆM THU & KẾT LUẬN / CHECK AND TAKE OVER"
        style={{ marginBottom: 16 }}
      >
        {/* 5.1 Người thực hiện (Lấy từ mục 2) */}
        <div
          style={{
            marginBottom: 15,
            background: "#fafafa",
            padding: 10,
            borderRadius: 4,
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: 5 }}>
            5.1. Người thực hiện / Checked by (Ký/ Signature):
          </div>
          <div
            style={{ marginLeft: 20, fontStyle: "italic", fontSize: "15px" }}
          >
            {/* Hiển thị danh sách tên ngăn cách bởi dấu phẩy */}
            {Array.isArray(data.execution_team) &&
            data.execution_team.length > 0
              ? data.execution_team.map((p: any) => p.name).join(", ")
              : "(Chưa có thông tin)"}
          </div>
        </div>

        {/* 5.2 Bảng xác nhận */}
        <div style={{ fontWeight: "bold", marginBottom: 10 }}>
          5.2. Xác nhận của đơn vị sử dụng / Approved by using unit:
        </div>

        <Table
          dataSource={data.acceptance_result || []}
          columns={acceptanceColumns}
          rowKey="id"
          pagination={false}
          size="small"
          bordered
          style={{ marginBottom: 16 }}
        />

        {/* Kết luận */}
        <div
          style={{
            padding: 10,
            background: data.final_conclusion ? "#f6ffed" : "#fff1f0",
            border: "1px solid #d9d9d9",
            borderRadius: 4,
          }}
        >
          <strong>KẾT LUẬN CUỐI CÙNG: </strong>
          {data.final_conclusion ? (
            <span>
              <b style={{ color: "green" }}>ĐẠT YCKT</b> - Đưa vào khai thác{" "}
              <i style={{ color: "#666" }}>(Ready)</i>
            </span>
          ) : (
            <span>
              <b style={{ color: "red" }}>KHÔNG ĐẠT</b>{" "}
              <i style={{ color: "#666" }}>(Not good)</i>
            </span>
          )}
        </div>

        <Divider />

        {/* 6. Chữ ký */}
        <Row gutter={16} style={{ textAlign: "center" }}>
          <Col span={12}>
            <div>
              <b>ĐỘI-KT / DIVISION TEAM</b>
            </div>
            <div style={{ fontStyle: "italic", fontSize: 12, color: "#888" }}>
              (Ký tên / Signature)
            </div>
            <div
              style={{
                marginTop: 40,
                fontWeight: 600,
                borderBottom: "1px dotted #ccc",
                display: "inline-block",
                minWidth: 200, // Tăng chiều rộng chỗ ký
                paddingBottom: 5,
                fontSize: 16, // Tăng cỡ chữ tên
              }}
            >
              {data.leader_user?.name || ""}
            </div>
          </Col>
          <Col span={12}>
            <div>
              <b>TỔ VHTTBMĐ / GSE OP. TEAM</b>
            </div>
            <div style={{ fontStyle: "italic", fontSize: 12, color: "#888" }}>
              (Ký tên / Signature)
            </div>
            <div
              style={{
                marginTop: 40,
                fontWeight: 600,
                borderBottom: "1px dotted #ccc",
                display: "inline-block",
                minWidth: 200,
                paddingBottom: 5,
                fontSize: 16,
              }}
            >
              {data.operator_user?.name || ""}
            </div>
          </Col>
        </Row>
      </Card>
    </Modal>
  );
};

export default TicketDetailModal;
