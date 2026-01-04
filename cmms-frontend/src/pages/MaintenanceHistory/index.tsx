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
} from "antd";
import {
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  FilePdfOutlined,
  FilterOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
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

const MaintenanceHistoryPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- STATE BỘ LỌC ---
  const [searchText, setSearchText] = useState("");
  const [filterLevel, setFilterLevel] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(
    undefined
  );
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

  // Hàm xem PDF (Mở tab mới)
  const handleDownloadPdf = async (ticketId: number) => {
    try {
      message.loading({ content: "Đang tạo PDF...", key: "pdf_loading" });
      const token = getToken();
      const url = `${process.env.REACT_APP_BASE_URL}/maintenance-tickets/${ticketId}/pdf`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Lỗi tải file");

      const blob = await response.blob();
      const fileURL = window.URL.createObjectURL(blob);
      
      // Mở tab mới
      const newWindow = window.open(fileURL, "_blank");
      if (newWindow) {
         newWindow.focus();
      } else {
         message.warning("Vui lòng cho phép popup để xem PDF");
      }

      message.success({ content: "Đã mở xem trước!", key: "pdf_loading" });
    } catch (e) {
      message.error({ content: "Không thể tải file PDF", key: "pdf_loading" });
    }
  };

  // Hàm hủy phiếu
  const handleCancelTicket = (ticketId: number) => {
    let reason = "";
    Modal.confirm({
      title: "Hủy phiếu bảo dưỡng này?",
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>Hành động này sẽ đổi trạng thái phiếu sang "Đã hủy".</p>
          <Input
            placeholder="Nhập lý do hủy..."
            onChange={(e) => (reason = e.target.value)}
          />
        </div>
      ),
      okText: "Xác nhận Hủy",
      okType: "danger",
      onOk: async () => {
        if (!reason.trim()) return message.warning("Vui lòng nhập lý do!");
        try {
          await cancelMaintenanceTicket(ticketId, reason, getToken());
          message.success("Đã hủy phiếu");
          fetchData(); // Reload bảng
        } catch (e) {
          message.error("Lỗi hủy phiếu");
        }
      },
    });
  };

  const columns = [
    {
      title: "Mã Phiếu",
      dataIndex: "ticket_id",
      width: 80,
      align: "center" as const,
      render: (id: number) => <b>#{id}</b>,
    },
    {
      title: "Thiết bị",
      dataIndex: ["device", "name"],
      render: (text: string, record: any) => (
        <div>
          <div style={{ fontWeight: 600, color: "#1890ff" }}>{text}</div>
          <div style={{ fontSize: 12, color: "#888" }}>
            {record.device?.brand} ({record.device?.serial_number})
          </div>
        </div>
      ),
    },
    {
      title: "Cấp độ",
      dataIndex: "maintenance_level",
      align: "center" as const,
      width: 120,
      render: (text: string) => {
        const map: any = {
          "1M": "01 Tháng",
          "3M": "03 Tháng",
          "6M": "06 Tháng",
          "1Y": "01 Năm",
          "2Y": "02 Năm",
        };
        return <Tag color="orange">{map[text] || text}</Tag>;
      },
    },
    {
      title: "Người thực hiện",
      dataIndex: ["user", "name"],
      render: (t: string) => t || <span style={{ color: "#ccc" }}>---</span>,
    },
    {
      title: "Ngày hoàn thành",
      dataIndex: "execution_date",
      width: 120,
      align: "center" as const,
      render: (d: string) => (d ? dayjs(d).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      align: "center" as const,
      width: 120,
      render: (status: string) => {
        const mapColor: any = { done: "green", canceled: "error" };
        const mapText: any = { done: "Hoàn thành", canceled: "Đã hủy" };
        return (
          <Tag color={mapColor[status] || "default"}>
            {mapText[status] || status}
          </Tag>
        );
      },
    },
    {
      title: "Thao tác",
      key: "action",
      width: 150,
      align: "center" as const,
      render: (_, record: any) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedTicket(record);
                setIsDetailOpen(true);
              }}
            />
          </Tooltip>

          <Tooltip title="Tải PDF">
            <Button
              type="primary"
              ghost
              size="small"
              icon={<FilePdfOutlined />}
              onClick={() => handleDownloadPdf(record.ticket_id)}
            />
          </Tooltip>

          {/* Chỉ hiện nút hủy nếu chưa hủy */}
          {record.status !== "canceled" && (
            <Tooltip title="Hủy phiếu">
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
    const matchText =
      !searchText ||
      item.device?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.user?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.device?.serial_number
        ?.toLowerCase()
        .includes(searchText.toLowerCase());

    const matchLevel = !filterLevel || item.maintenance_level === filterLevel;
    const matchStatus = !filterStatus || item.status === filterStatus;

    let matchDate = true;
    if (dateRange && dateRange[0] && dateRange[1]) {
      const ticketDate = dayjs(item.created_at);
      matchDate = ticketDate.isBetween(dateRange[0], dateRange[1], "day", "[]");
    }

    return matchText && matchLevel && matchStatus && matchDate;
  });

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0 }}>📜 Lịch Sử Bảo Dưỡng</h2>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Làm mới
          </Button>
        </div>

        {/* THANH BỘ LỌC */}
        <Card bodyStyle={{ padding: 16 }} style={{ borderRadius: 8 }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={6}>
              <Input
                placeholder="🔍 Tìm tên xe, biển số..."
                prefix={<SearchOutlined style={{ color: "#999" }} />}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={12} md={4}>
              <Select
                placeholder="Lọc cấp độ"
                style={{ width: "100%" }}
                allowClear
                onChange={setFilterLevel}
              >
                <Option value="1M">01 Tháng</Option>
                <Option value="3M">03 Tháng</Option>
                <Option value="6M">06 Tháng</Option>
                <Option value="1Y">01 Năm</Option>
              </Select>
            </Col>
            <Col xs={12} md={4}>
              <Select
                placeholder="Lọc trạng thái"
                style={{ width: "100%" }}
                allowClear
                onChange={setFilterStatus}
              >
                <Option value="done">Hoàn thành</Option>
                <Option value="canceled">Đã hủy</Option>
              </Select>
            </Col>
            <Col xs={12} md={6}>
              <RangePicker
                style={{ width: "100%" }}
                format="DD/MM/YYYY"
                onChange={(dates) => setDateRange(dates)}
              />
            </Col>
            <Col xs={24} md={4} style={{ textAlign: "right" }}>
              <div style={{ lineHeight: "32px", color: "#888" }}>
                <FilterOutlined /> <b>{filteredData.length}</b> phiếu
              </div>
            </Col>
          </Row>
        </Card>
      </div>

      <Card
        style={{ borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
        bodyStyle={{ padding: 0 }}
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

      <TicketDetailModal
        open={isDetailOpen}
        data={selectedTicket}
        onCancel={() => {
          setIsDetailOpen(false);
          setSelectedTicket(null);
        }}
      />
    </div>
  );
};

export default MaintenanceHistoryPage;
