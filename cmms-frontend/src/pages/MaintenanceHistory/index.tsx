import React, { useEffect, useState, useMemo } from "react";
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
  Grid,
  Pagination,
  Empty,
  Spin,
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
const { useBreakpoint } = Grid;

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
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mobilePage, setMobilePage] = useState(1);
  const mobilePageSize = 10;

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
      width: "6%",
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Mã Phiếu",
      dataIndex: "ticket_id",
      width: "10%",
      align: "center" as const,
      render: (id: number) => (
        <Tag color="blue" style={{ fontWeight: 700, margin: 0 }}>
          #{id}
        </Tag>
      ),
    },
    {
      title: "Thiết bị",
      key: "device",
      width: "26%",
      render: (_: any, record: any) => (
        <div style={{ wordBreak: "break-word" }}>
          <div style={{ fontWeight: 600, color: "#1890ff", lineHeight: 1.35 }}>
            {record.device?.name || "N/A"}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#888",
              marginTop: 2,
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
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
      width: "11%",
      render: (level: string) => {
        const info = LEVEL_MAP[level] || { label: level || "Tuần", color: "blue" };
        return <Tag color={info.color} style={{ margin: 0 }}>{info.label}</Tag>;
      },
    },
    {
      title: "Ngày thực hiện",
      dataIndex: "execution_date",
      width: "14%",
      align: "center" as const,
      sorter: (a: any, b: any) => {
        const dateA = a.execution_date ? dayjs(a.execution_date).unix() : 0;
        const dateB = b.execution_date ? dayjs(b.execution_date).unix() : 0;
        return dateA - dateB;
      },
      render: (d: string, record: any) => {
        const dateVal = d || record.created_at;
        return dateVal ? (
          <span style={{ fontWeight: 500, color: "#262626", fontSize: 13 }}>
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
      width: "14%",
      render: (t: string) => (
        <span style={{ fontSize: 13, wordBreak: "break-word" }}>
          <UserOutlined style={{ marginRight: 5, color: "#8c8c8c" }} />
          {t || "Hệ thống"}
        </span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      align: "center" as const,
      width: "11%",
      render: (status: string) => {
        if (status === "done") {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />} style={{ margin: 0 }}>
              Hoàn thành
            </Tag>
          );
        }
        if (status === "canceled") {
          return (
            <Tag color="error" icon={<CloseCircleOutlined />} style={{ margin: 0 }}>
              Đã hủy
            </Tag>
          );
        }
        return <Tag style={{ margin: 0 }}>{status || "Đang xử lý"}</Tag>;
      },
    },
    {
      title: "Thao tác",
      key: "action",
      width: "8%",
      align: "center" as const,
      render: (_: any, record: any) => (
        <Space size={4}>
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

  const paginatedMobileData = useMemo(() => {
    const start = (mobilePage - 1) * mobilePageSize;
    return filteredData.slice(start, start + mobilePageSize);
  }, [filteredData, mobilePage]);

  return (
    <div
      style={{
        width: "100%",
        padding: isMobile ? "4px 0 24px 0" : "20px",
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
          flexWrap: "wrap",
          gap: 10,
          marginBottom: isMobile ? 12 : 16,
          padding: isMobile ? "12px 14px" : "16px 24px",
          background: "#fff",
          borderRadius: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 style={{ margin: 0, color: "#002766", fontSize: isMobile ? 16 : 20, lineHeight: 1.3 }}>
            <HistoryOutlined style={{ marginRight: 8, color: "#1890ff" }} />
            Lịch Sử Phiếu Bảo Dưỡng
          </h2>
          <div style={{ color: "#64748b", fontSize: isMobile ? 12 : 13, marginTop: 2 }}>
            Theo dõi nhật ký thực hiện bảo dưỡng và quản lý các phiếu bảo dưỡng định kỳ
          </div>
        </div>

        <Button
          size={isMobile ? "small" : "middle"}
          icon={<ReloadOutlined />}
          onClick={fetchData}
          loading={loading}
        >
          Làm mới
        </Button>
      </div>

      {/* KPI Cards Thống Kê Nhanh (3 cột ngang gọn gàng cả trên Mobile) */}
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} style={{ marginBottom: isMobile ? 12 : 16 }}>
        <Col xs={8} sm={8}>
          <Card
            hoverable
            onClick={() => {
              setFilterStatus(undefined);
              setMobilePage(1);
            }}
            styles={{ body: { padding: isMobile ? "10px 8px" : "14px 20px" } }}
            style={{
              borderRadius: 10,
              borderLeft: "4px solid #1890ff",
              border: !filterStatus ? "1.5px solid #1890ff" : undefined,
              background: !filterStatus ? "#f0f7ff" : "#fff",
              height: "100%",
            }}
          >
            <div style={{ fontSize: isMobile ? 11 : 13, color: "#64748b", lineHeight: 1.25 }}>
              {isMobile ? "Tổng phiếu" : "Tổng số phiếu bảo dưỡng"}
            </div>
            <div
              style={{
                fontSize: isMobile ? 18 : 24,
                fontWeight: 700,
                color: "#1890ff",
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <HistoryOutlined style={{ fontSize: isMobile ? 15 : 20 }} />
              <span>{totalCount}</span>
            </div>
          </Card>
        </Col>
        <Col xs={8} sm={8}>
          <Card
            hoverable
            onClick={() => {
              setFilterStatus(filterStatus === "done" ? undefined : "done");
              setMobilePage(1);
            }}
            styles={{ body: { padding: isMobile ? "10px 8px" : "14px 20px" } }}
            style={{
              borderRadius: 10,
              borderLeft: "4px solid #52c41a",
              border: filterStatus === "done" ? "1.5px solid #52c41a" : undefined,
              background: filterStatus === "done" ? "#f6ffed" : "#fff",
              height: "100%",
            }}
          >
            <div style={{ fontSize: isMobile ? 11 : 13, color: "#64748b", lineHeight: 1.25 }}>
              Đã hoàn thành
            </div>
            <div
              style={{
                fontSize: isMobile ? 18 : 24,
                fontWeight: 700,
                color: "#52c41a",
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <CheckCircleOutlined style={{ fontSize: isMobile ? 15 : 20 }} />
              <span>{doneCount}</span>
            </div>
          </Card>
        </Col>
        <Col xs={8} sm={8}>
          <Card
            hoverable
            onClick={() => {
              setFilterStatus(filterStatus === "canceled" ? undefined : "canceled");
              setMobilePage(1);
            }}
            styles={{ body: { padding: isMobile ? "10px 8px" : "14px 20px" } }}
            style={{
              borderRadius: 10,
              borderLeft: "4px solid #ff4d4f",
              border: filterStatus === "canceled" ? "1.5px solid #ff4d4f" : undefined,
              background: filterStatus === "canceled" ? "#fff1f0" : "#fff",
              height: "100%",
            }}
          >
            <div style={{ fontSize: isMobile ? 11 : 13, color: "#64748b", lineHeight: 1.25 }}>
              Đã hủy
            </div>
            <div
              style={{
                fontSize: isMobile ? 18 : 24,
                fontWeight: 700,
                color: "#ff4d4f",
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <CloseCircleOutlined style={{ fontSize: isMobile ? 15 : 20 }} />
              <span>{canceledCount}</span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* THANH BỘ LỌC */}
      <Card
        styles={{ body: { padding: isMobile ? 12 : 16 } }}
        style={{ marginBottom: isMobile ? 12 : 16, borderRadius: 10 }}
      >
        <Row gutter={[10, 10]} align="middle">
          <Col xs={24} md={7}>
            <Input
              placeholder="Tìm mã phiếu, tên xe, biển số, người làm..."
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setMobilePage(1);
              }}
              allowClear
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="Cấp bảo dưỡng"
              style={{ width: "100%" }}
              value={filterLevel}
              allowClear
              onChange={(val) => {
                setFilterLevel(val);
                setMobilePage(1);
              }}
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
              value={filterStatus}
              allowClear
              onChange={(val) => {
                setFilterStatus(val);
                setMobilePage(1);
              }}
            >
              <Option value="done">Hoàn thành</Option>
              <Option value="canceled">Đã hủy</Option>
            </Select>
          </Col>
          <Col xs={24} sm={16} md={6}>
            <RangePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              value={dateRange}
              onChange={(dates) => {
                setDateRange(dates);
                setMobilePage(1);
              }}
            />
          </Col>
          <Col xs={24} sm={8} md={3} style={{ textAlign: "right" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
              {(searchText || filterLevel || filterStatus || dateRange) && (
                <Button
                  size="small"
                  onClick={() => {
                    setSearchText("");
                    setFilterLevel(undefined);
                    setFilterStatus(undefined);
                    setDateRange(null);
                    setMobilePage(1);
                  }}
                >
                  Xóa lọc
                </Button>
              )}
              <div
                style={{
                  background: "#f1f5f9",
                  padding: "4px 10px",
                  borderRadius: 16,
                  fontSize: 12.5,
                  color: "#475569",
                  fontWeight: 600,
                }}
              >
                <FilterOutlined style={{ color: "#1677ff", marginRight: 4 }} />
                <b>{filteredData.length}</b> phiếu
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* DANH SÁCH DỮ LIỆU: MOBILE CARD VIEW vs TABLET/DESKTOP FIXED TABLE */}
      {isMobile ? (
        <Spin spinning={loading}>
          {filteredData.length === 0 ? (
            <Card style={{ borderRadius: 10, textAlign: "center", padding: "24px 0" }}>
              <Empty description="Không có phiếu bảo dưỡng nào phù hợp" />
            </Card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {paginatedMobileData.map((record) => {
                const levelInfo = LEVEL_MAP[record.maintenance_level] || {
                  label: record.maintenance_level || "Tuần",
                  color: "blue",
                };
                const dateVal = record.execution_date || record.created_at;
                return (
                  <Card
                    key={record.ticket_id}
                    size="small"
                    style={{
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                    }}
                    styles={{ body: { padding: "12px 14px" } }}
                  >
                    {/* Top row: Mã phiếu + Cấp độ + Trạng thái */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 6,
                        marginBottom: 8,
                      }}
                    >
                      <Space size={6}>
                        <Tag color="blue" style={{ margin: 0, fontWeight: 700, borderRadius: 6 }}>
                          #{record.ticket_id}
                        </Tag>
                        <Tag color={levelInfo.color} style={{ margin: 0, borderRadius: 6, fontWeight: 600 }}>
                          Cấp: {levelInfo.label}
                        </Tag>
                      </Space>

                      {record.status === "done" ? (
                        <Tag color="success" icon={<CheckCircleOutlined />} style={{ margin: 0, borderRadius: 10 }}>
                          Hoàn thành
                        </Tag>
                      ) : record.status === "canceled" ? (
                        <Tag color="error" icon={<CloseCircleOutlined />} style={{ margin: 0, borderRadius: 10 }}>
                          Đã hủy
                        </Tag>
                      ) : (
                        <Tag style={{ margin: 0 }}>{record.status || "Đang xử lý"}</Tag>
                      )}
                    </div>

                    {/* Device info */}
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14.5,
                        color: "#1890ff",
                        lineHeight: 1.35,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setSelectedTicket(record);
                        setIsDetailOpen(true);
                      }}
                    >
                      {record.device?.name || "N/A"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                      {record.device?.reg_number ? (
                        <Tag color="cyan" style={{ margin: 0, fontSize: 11.5, fontWeight: 600 }}>
                          {record.device.reg_number}
                        </Tag>
                      ) : record.device?.serial_number ? (
                        <Tag style={{ margin: 0, fontSize: 11.5 }}>{record.device.serial_number}</Tag>
                      ) : null}
                      {record.device?.brand && (
                        <span style={{ fontSize: 12, color: "#64748b" }}>• {record.device.brand}</span>
                      )}
                    </div>

                    {/* Execution date & User */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 10,
                        paddingTop: 8,
                        borderTop: "1px dashed #e2e8f0",
                        fontSize: 12.5,
                        color: "#475569",
                      }}
                    >
                      <Space size={10} wrap>
                        <span>
                          <CalendarOutlined style={{ color: "#1890ff", marginRight: 4 }} />
                          <strong>{dateVal ? dayjs(dateVal).format("DD/MM/YYYY") : "-"}</strong>
                        </span>
                        <span>
                          <UserOutlined style={{ color: "#64748b", marginRight: 4 }} />
                          {record.user?.name || "Hệ thống"}
                        </span>
                      </Space>

                      <Space size={6}>
                        <Button
                          type="primary"
                          ghost
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => {
                            setSelectedTicket(record);
                            setIsDetailOpen(true);
                          }}
                        >
                          Chi tiết
                        </Button>
                        {record.status !== "canceled" && (
                          <Button
                            danger
                            size="small"
                            icon={<StopOutlined />}
                            onClick={() => handleCancelTicket(record.ticket_id)}
                          />
                        )}
                      </Space>
                    </div>
                  </Card>
                );
              })}

              {filteredData.length > mobilePageSize && (
                <div style={{ textAlign: "center", marginTop: 8 }}>
                  <Pagination
                    size="small"
                    current={mobilePage}
                    pageSize={mobilePageSize}
                    total={filteredData.length}
                    onChange={(p) => setMobilePage(p)}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </div>
          )}
        </Spin>
      ) : (
        <Card
          style={{ borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
          styles={{ body: { padding: 0 } }}
        >
          <Table
            dataSource={filteredData}
            columns={columns}
            rowKey="ticket_id"
            loading={loading}
            tableLayout="fixed"
            pagination={{
              pageSize: 10,
              showTotal: (total) => `Tổng ${total} phiếu`,
            }}
          />
        </Card>
      )}

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
