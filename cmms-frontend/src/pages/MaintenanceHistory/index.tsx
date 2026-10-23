import React, { useEffect, useState } from "react";
import {
  Table,
  Tag,
  Button,
  Card,
  Tooltip,
  message,
  Input,
  Space,
  DatePicker,
  Select,
  Row,
  Col,
  Modal,
  Statistic,
} from "antd";
import {
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  HistoryOutlined,
  CalendarOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  getMaintenanceHistory,
  cancelMaintenanceTicket,
} from "../../apis/maintenance";
import { getToken } from "../../utils/auth";
import TicketDetailModal from "./components/TicketDetailModal";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isBetween);

const { RangePicker } = DatePicker;
const { Option } = Select;

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

const MaintenanceHistoryPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- STATE BỘ LỌC ---
  const [searchText, setSearchText] = useState("");
  const [filterLevel, setFilterLevel] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<any>(null);

  // State Modal
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await getMaintenanceHistory(token);
      setData(Array.isArray(res) ? res : []);
    } catch (error) {
      message.error("Lỗi tải dữ liệu lịch sử");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Hàm hủy phiếu
  const handleCancelTicket = (ticketId: number) => {
    let reason = "";
    Modal.confirm({
      title: "Hủy phiếu bảo dưỡng này?",
      icon: <ExclamationCircleOutlined />,
      content: (
        <div style={{ marginTop: 8 }}>
          <p style={{ color: "#555" }}>
            Hành động này sẽ đổi trạng thái phiếu sang "Đã hủy" và khôi phục chu kỳ bảo dưỡng tương ứng của thiết bị.
          </p>
          <Input
            placeholder="Nhập lý do hủy..."
            onChange={(e) => (reason = e.target.value)}
          />
        </div>
      ),
      okText: "Xác nhận Hủy",
      okType: "danger",
      cancelText: "Bỏ qua",
      onOk: async () => {
        if (!reason.trim()) {
          message.warning("Vui lòng nhập lý do hủy!");
          return Promise.reject();
        }
        try {
          await cancelMaintenanceTicket(ticketId, reason, getToken());
          message.success("Đã hủy phiếu thành công");
          fetchData();
        } catch (e) {
          message.error("Lỗi khi hủy phiếu");
        }
      },
    });
  };

  const columns = [
    {
      title: "STT",
      key: "index",
      align: "center" as const,
      width: 50,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Mã Phiếu",
      dataIndex: "ticket_id",
      width: 90,
      align: "center" as const,
      render: (id: number) => (
        <Tag color="blue" style={{ fontWeight: 700 }}>
          #{id}
        </Tag>
      ),
    },
    {
      title: "Thiết bị",
      key: "device",
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontWeight: 600, color: "#1890ff" }}>
            {record.device?.name || "N/A"}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#888",
              marginTop: 2,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>{record.device?.brand || record.device?.deviceType?.name || ""}</span>
            {record.device?.reg_number ? (
              <Tag color="cyan" style={{ margin: 0, fontSize: 11 }}>
                {record.device.reg_number}
              </Tag>
            ) : record.device?.serial_number ? (
              <Tag style={{ margin: 0, fontSize: 11 }}>
                {record.device.serial_number}
              </Tag>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      title: "Cấp độ",
      dataIndex: "maintenance_level",
      align: "center" as const,
      width: 120,
      render: (level: string) => {
        const info = LEVEL_MAP[level] || { label: level || "Tuần", color: "blue" };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "Ngày thực hiện",
      dataIndex: "execution_date",
      width: 140,
      align: "center" as const,
      sorter: (a: any, b: any) => {
        const dateA = a.execution_date ? dayjs(a.execution_date).unix() : 0;
        const dateB = b.execution_date ? dayjs(b.execution_date).unix() : 0;
        return dateA - dateB;
      },
      render: (d: string, record: any) => {
        const dateVal = d || record.created_at;
        return dateVal ? (
          <span style={{ fontWeight: 500, color: "#262626" }}>
            <CalendarOutlined style={{ marginRight: 5, color: "#1890ff" }} />
            {dayjs(dateVal).format("DD/MM/YYYY")}
          </span>
        ) : (
          <span style={{ color: "#ccc" }}>-</span>
        );
      },
    },
    {
      title: "Người thực hiện",
      dataIndex: ["user", "name"],
      width: 160,
      render: (t: string) => (
        <span>
          <UserOutlined style={{ marginRight: 6, color: "#8c8c8c" }} />
          {t || "Hệ thống"}
        </span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      align: "center" as const,
      width: 130,
      render: (status: string) => {
        if (status === "done") {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Hoàn thành
            </Tag>
          );
        }
        if (status === "canceled") {
          return (
            <Tag color="error" icon={<CloseCircleOutlined />}>
              Đã hủy
            </Tag>
          );
        }
        return <Tag>{status || "Đang xử lý"}</Tag>;
      },
    },
    {
      title: "Thao tác",
      key: "action",
      width: 110,
      align: "center" as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết phiếu">
            <Button
              type="primary"
              ghost
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedTicket(record);
                setIsDetailOpen(true);
              }}
            />
          </Tooltip>

          {record.status !== "canceled" && (
            <Tooltip title="Hủy phiếu này">
              <Button
                danger
                size="small"
                icon={<StopOutlined />}
                onClick={() => handleCancelTicket(record.ticket_id)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // --- LOGIC LỌC DỮ LIỆU ---
  const filteredData = data.filter((item) => {
    const term = searchText.trim().toLowerCase();
    const matchText =
      !term ||
      item.ticket_id?.toString().includes(term) ||
      item.device?.name?.toLowerCase().includes(term) ||
      item.device?.reg_number?.toLowerCase().includes(term) ||
      item.device?.serial_number?.toLowerCase().includes(term) ||
      item.user?.name?.toLowerCase().includes(term);

    const matchLevel = !filterLevel || item.maintenance_level === filterLevel;
    const matchStatus = !filterStatus || item.status === filterStatus;

    let matchDate = true;
    if (dateRange && dateRange[0] && dateRange[1]) {
      const ticketDate = dayjs(item.execution_date || item.created_at);
      matchDate = ticketDate.isBetween(dateRange[0], dateRange[1], "day", "[]");
    }

    return matchText && matchLevel && matchStatus && matchDate;
  });

  // KPI Counts
  const totalCount = data.length;
  const doneCount = data.filter((d) => d.status === "done").length;
  const canceledCount = data.filter((d) => d.status === "canceled").length;

  return (
    <div
      style={{
        width: "100%",
        padding: "24px",
        background: "#f0f2f5",
        minHeight: "100vh",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          padding: "16px 24px",
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "#002766", fontSize: 20 }}>
            <HistoryOutlined style={{ marginRight: 8, color: "#1890ff" }} />
            Lịch Sử Phiếu Bảo Dưỡng
          </h2>
          <div style={{ color: "#888", fontSize: "13px", marginTop: 4 }}>
            Theo dõi nhật ký thực hiện bảo dưỡng và quản lý các phiếu bảo dưỡng định kỳ
          </div>
        </div>

        <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
          Làm mới
        </Button>
      </div>

      {/* KPI Cards Thống Kê Nhanh */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card
            styles={{ body: { padding: "16px 20px" } }}
            style={{ borderRadius: 8, borderLeft: "4px solid #1890ff" }}
          >
            <Statistic
              title={<span style={{ fontSize: 13, color: "#666" }}>Tổng số phiếu bảo dưỡng</span>}
              value={totalCount}
              valueStyle={{ color: "#1890ff", fontWeight: 700 }}
              prefix={<HistoryOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            styles={{ body: { padding: "16px 20px" } }}
            style={{ borderRadius: 8, borderLeft: "4px solid #52c41a" }}
          >
            <Statistic
              title={<span style={{ fontSize: 13, color: "#666" }}>Đã hoàn thành</span>}
              value={doneCount}
              valueStyle={{ color: "#52c41a", fontWeight: 700 }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            styles={{ body: { padding: "16px 20px" } }}
            style={{ borderRadius: 8, borderLeft: "4px solid #ff4d4f" }}
          >
            <Statistic
              title={<span style={{ fontSize: 13, color: "#666" }}>Đã hủy</span>}
              value={canceledCount}
              valueStyle={{ color: "#ff4d4f", fontWeight: 700 }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* THANH BỘ LỌC */}
      <Card
        styles={{ body: { padding: 16 } }}
        style={{ marginBottom: 16, borderRadius: 8 }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={7}>
            <Input
              placeholder="🔍 Tìm mã phiếu, tên xe, biển số, người làm..."
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="Cấp bảo dưỡng"
              style={{ width: "100%" }}
              allowClear
              onChange={setFilterLevel}
            >
              <Option value="Tuần">Tuần</Option>
              <Option value="1M">01 Tháng</Option>
              <Option value="3M">03 Tháng</Option>
              <Option value="6M">06 Tháng</Option>
              <Option value="9M">09 Tháng</Option>
              <Option value="1Y">01 Năm</Option>
              <Option value="2Y">02 Năm</Option>
            </Select>
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="Trạng thái"
              style={{ width: "100%" }}
              allowClear
              onChange={setFilterStatus}
            >
              <Option value="done">Hoàn thành</Option>
              <Option value="canceled">Đã hủy</Option>
            </Select>
          </Col>
          <Col xs={16} md={6}>
            <RangePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              onChange={(dates) => setDateRange(dates)}
            />
          </Col>
          <Col xs={8} md={3} style={{ textAlign: "right" }}>
            <div style={{ lineHeight: "32px", color: "#888" }}>
              <FilterOutlined /> <b>{filteredData.length}</b> phiếu
            </div>
          </Col>
        </Row>
      </Card>

      {/* BẢNG DỮ LIỆU */}
      <Card
        style={{ borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="ticket_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} phiếu`,
          }}
        />
      </Card>

      {/* MODAL CHI TIẾT PHIẾU THEO FLOW MỚI */}
      <TicketDetailModal
        open={isDetailOpen}
        data={selectedTicket}
        onCancel={() => {
          setIsDetailOpen(false);
          setSelectedTicket(null);
        }}
        onCancelTicket={handleCancelTicket}
      />
    </div>
  );
};

export default MaintenanceHistoryPage;
