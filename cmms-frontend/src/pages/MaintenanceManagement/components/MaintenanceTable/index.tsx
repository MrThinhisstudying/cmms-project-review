import React, { useState, useMemo } from "react";
import { Table, Tooltip, Button, Tag, message, Grid, Card, Space, Pagination, Empty, Spin } from "antd";
import {
  CalendarOutlined,
  FileSearchOutlined,
  ToolOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { IMaintenance } from "../../../../types/maintenance.types";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
// Import Modal xem chi tiết
import MaintenanceDetailModal from "../MaintenanceDetailModal";
import { Modal } from "antd";
import { StopOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { cancelMaintenancePlan } from "../../../../apis/maintenance";
import { getToken } from "../../../../utils/auth";
import {
  renderMaintenanceStatusTag,
  getMaintenanceStatusInfo,
  getMaintenanceCycleDeadline,
} from "../../../../utils/maintenanceDue";
const { confirm } = Modal;
const { useBreakpoint } = Grid;

const LEVEL_LABEL_MAP: Record<string, string> = {
  "1W": "Tuần",
  Tuần: "Tuần",
  "1M": "01 Tháng",
  "3M": "03 Tháng",
  "6M": "06 Tháng",
  "9M": "09 Tháng",
  "1Y": "01 Năm",
  "2Y": "02 Năm",
};

const LEVEL_COLOR_MAP: Record<string, string> = {
  Tuần: "blue",
  "1W": "blue",
  "1M": "cyan",
  "3M": "geekblue",
  "6M": "purple",
  "9M": "magenta",
  "1Y": "magenta",
  "2Y": "volcano",
};
// --- QUAN TRỌNG: CẬP NHẬT INTERFACE ĐỂ KHỚP VỚI TRANG CHA ---
interface Props {
  loading: boolean; // Nhận loading từ cha (để fix lỗi Property 'loading' does not exist)
  dataSource: IMaintenance[]; // Nhận dữ liệu từ cha
  onCreateTicket?: (record: IMaintenance) => void;
  onEdit?: (record: IMaintenance) => void;
  onRefresh?: () => void;
}

const MaintenanceTable: React.FC<Props> = ({
  loading,
  dataSource,
  onCreateTicket,
  onEdit,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [mobilePage, setMobilePage] = useState(1);
  const mobilePageSize = 10;

  // State quản lý Modal xem lịch 12 tháng
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const handleCancelPlan = (id: number) => {
    confirm({
      title: "Dừng theo dõi thiết bị này?",
      icon: <ExclamationCircleOutlined />,
      content:
        "Kế hoạch sẽ bị hủy và không còn hiện trong danh sách theo dõi. Bạn có chắc không?",
      okText: "Dừng theo dõi",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await cancelMaintenancePlan(id, getToken());
          message.success("Đã hủy kế hoạch thành công");
          if (onRefresh) onRefresh(); // Reload bảng
        } catch (e) {
          message.error("Lỗi khi hủy kế hoạch");
        }
      },
    });
  };
  const columns = [
    {
      title: "STT",
      key: "index",
      align: "center" as const,
      width: "5%",
      render: (_: any, __: any, index: number) => (
        <span style={{ fontWeight: 600, color: "#94a3b8" }}>{index + 1}</span>
      ),
    },
    {
      title: "Thiết bị / Xe",
      key: "device",
      width: "25%",
      render: (_: any, record: IMaintenance) => (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#e6f4ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1677ff",
              fontSize: 15,
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            🚚
          </div>
          <div style={{ minWidth: 0, wordBreak: "break-word" }}>
            <div
              style={{
                fontWeight: 600,
                color: "#0f172a",
                fontSize: 13.5,
                cursor: "pointer",
                lineHeight: 1.35,
              }}
              onClick={() => {
                setSelectedDevice(record.device);
                setIsDetailOpen(true);
              }}
            >
              {record.device?.name || "N/A"}
            </div>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {record.device?.reg_number ? (
                <Tag color="cyan" style={{ borderRadius: 4, margin: 0, fontWeight: 500, fontSize: 11 }}>
                  {record.device.reg_number}
                </Tag>
              ) : (
                <span style={{ fontStyle: "italic", color: "#94a3b8", fontSize: 11 }}>Chưa có biển số</span>
              )}
              {record.device?.brand && (
                <span style={{ fontSize: 11, color: "#64748b" }}>• {record.device.brand}</span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Lịch 12T",
      key: "timeline",
      align: "center" as const,
      width: "10%",
      render: (_: any, record: IMaintenance) => (
        <Tooltip title="Xem chi tiết kế hoạch năm">
          <Button
            type="primary"
            ghost
            size="small"
            icon={<CalendarOutlined />}
            onClick={() => {
              setSelectedDevice(record.device);
              setIsDetailOpen(true);
            }}
            style={{ borderRadius: 6, fontWeight: 500, fontSize: 12 }}
          >
            Chi tiết
          </Button>
        </Tooltip>
      ),
    },
    {
      title: "Cấp độ tiếp theo",
      dataIndex: "level",
      align: "center" as const,
      width: "11%",
      render: (level: string) => (
        <Tag
          color={LEVEL_COLOR_MAP[level] || "blue"}
          style={{ fontWeight: 600, borderRadius: 4, margin: 0, minWidth: 64, textAlign: "center" }}
        >
          {LEVEL_LABEL_MAP[level] || level}
        </Tag>
      ),
    },
    {
      title: "Ngày BD gần nhất",
      dataIndex: "last_maintenance_date",
      align: "center" as const,
      width: "13%",
      render: (date: string) => (
        <span style={{ color: date && dayjs(date).isValid() ? "#334155" : "#94a3b8", fontSize: 13 }}>
          {date && dayjs(date).isValid()
            ? dayjs(date).format("DD/MM/YYYY")
            : "(Chưa làm)"}
        </span>
      ),
    },
    {
      title: "Ngày đến hạn (Dự kiến)",
      dataIndex: "next_maintenance_date",
      align: "center" as const,
      width: "15%",
      sorter: (a: any, b: any) => {
        const dateA = a.next_maintenance_date
          ? dayjs(a.next_maintenance_date).unix()
          : 0;
        const dateB = b.next_maintenance_date
          ? dayjs(b.next_maintenance_date).unix()
          : 0;
        return dateA - dateB;
      },
      render: (date: string, record: IMaintenance) => {
        if (!date) return <span style={{ color: "#94a3b8" }}>-</span>;
        const statusInfo = getMaintenanceStatusInfo(record);
        const deadline = getMaintenanceCycleDeadline(date, record.level);

        if (statusInfo.isOverdue) {
          return (
            <div>
              <div style={{ fontWeight: 700, color: "#cf1322", fontSize: 13 }}>
                <CalendarOutlined style={{ marginRight: 5 }} />
                {dayjs(date).format("DD/MM/YYYY")}
              </div>
              <Tag color="error" style={{ fontSize: 10, borderRadius: 4, marginTop: 2, marginInlineEnd: 0 }}>
                Trễ {statusInfo.overdueDays} ngày
              </Tag>
            </div>
          );
        }

        if (statusInfo.type === "in_cycle_last_day") {
          return (
            <div>
              <div style={{ fontWeight: 600, color: "#d46b08", fontSize: 13 }}>
                <CalendarOutlined style={{ marginRight: 5 }} />
                {dayjs(date).format("DD/MM/YYYY")}
              </div>
              <Tag color="warning" style={{ fontSize: 10, borderRadius: 4, marginTop: 2, marginInlineEnd: 0 }}>
                Hạn chót hôm nay
              </Tag>
            </div>
          );
        }

        if (statusInfo.type === "in_cycle") {
          return (
            <div>
              <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>
                <CalendarOutlined style={{ marginRight: 5, color: "#1677ff" }} />
                {dayjs(date).format("DD/MM/YYYY")}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                Hạn: {deadline.format("DD/MM/YYYY")}
              </div>
            </div>
          );
        }

        return (
          <div style={{ color: "#475569", fontSize: 13 }}>
            <CalendarOutlined style={{ marginRight: 5, color: "#94a3b8" }} />
            {dayjs(date).format("DD/MM/YYYY")}
          </div>
        );
      },
    },
    {
      title: "Trạng thái",
      key: "status_display",
      align: "center" as const,
      width: "11%",
      render: (_: any, record: IMaintenance) => renderMaintenanceStatusTag(record),
    },
    {
      title: "Thao tác",
      key: "action",
      align: "center" as const,
      width: "10%",
      render: (_: any, record: IMaintenance) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
          {record.status === "active" && (
            <Tooltip title="Thực hiện bảo dưỡng ngay">
              <Button
                type="primary"
                size="small"
                icon={<ToolOutlined />}
                onClick={() => onCreateTicket && onCreateTicket(record)}
                style={{
                  borderRadius: 6,
                  background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
                }}
              />
            </Tooltip>
          )}

          <Tooltip title="Chỉnh sửa kế hoạch">
            <Button
              type="default"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit && onEdit(record)}
              style={{ borderRadius: 6 }}
            />
          </Tooltip>

          <Tooltip title="Xem lịch sử phiếu">
            <Button
              type="default"
              size="small"
              icon={<FileSearchOutlined />}
              onClick={() =>
                navigate(
                  `/lich_su_phieu_bao_duong?search=${encodeURIComponent(
                    record.device?.brand || record.device?.name || ""
                  )}`
                )
              }
              style={{ borderRadius: 6 }}
            />
          </Tooltip>

          <Tooltip title="Dừng theo dõi / Hủy kế hoạch">
            <Button
              danger
              size="small"
              icon={<StopOutlined />}
              onClick={() => handleCancelPlan(record.maintenance_id)}
              style={{ borderRadius: 6 }}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  const paginatedMobileData = useMemo(() => {
    const start = (mobilePage - 1) * mobilePageSize;
    return dataSource.slice(start, start + mobilePageSize);
  }, [dataSource, mobilePage]);

  return (
    <>
      {isMobile ? (
        <Spin spinning={loading}>
          {dataSource.length === 0 ? (
            <Card style={{ borderRadius: 12, textAlign: "center", padding: "24px 0" }}>
              <Empty description="Không có kế hoạch thiết bị nào phù hợp" />
            </Card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {paginatedMobileData.map((record, idx) => {
                const stt = (mobilePage - 1) * mobilePageSize + idx + 1;
                const levelText = LEVEL_LABEL_MAP[record.level] || record.level || "Tuần";
                const levelColor = LEVEL_COLOR_MAP[record.level] || "blue";
                const lastDate =
                  record.last_maintenance_date && dayjs(record.last_maintenance_date).isValid()
                    ? dayjs(record.last_maintenance_date).format("DD/MM/YYYY")
                    : "Chưa làm";
                const nextDate =
                  record.next_maintenance_date && dayjs(record.next_maintenance_date).isValid()
                    ? dayjs(record.next_maintenance_date).format("DD/MM/YYYY")
                    : "-";
                const statusInfo = getMaintenanceStatusInfo(record);

                return (
                  <Card
                    key={record.maintenance_id}
                    size="small"
                    style={{
                      borderRadius: 12,
                      border: statusInfo.isOverdue
                        ? "1.5px solid #ffa39e"
                        : "1px solid #e2e8f0",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                    }}
                    styles={{ body: { padding: "12px 14px" } }}
                  >
                    {/* Row 1: STT + Cấp độ + Trạng thái */}
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
                        <Tag style={{ margin: 0, fontWeight: 700, borderRadius: 6 }}>#{stt}</Tag>
                        <Tag color={levelColor} style={{ margin: 0, fontWeight: 600, borderRadius: 6 }}>
                          Cấp: {levelText}
                        </Tag>
                      </Space>
                      {renderMaintenanceStatusTag(record)}
                    </div>

                    {/* Row 2: Tên Thiết bị & Biển số */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setSelectedDevice(record.device);
                        setIsDetailOpen(true);
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "#e6f4ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 15,
                          flexShrink: 0,
                        }}
                      >
                        🚚
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14.5, color: "#0f172a", lineHeight: 1.35 }}>
                          {record.device?.name || "N/A"}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 3 }}>
                          {record.device?.reg_number ? (
                            <Tag color="cyan" style={{ margin: 0, fontSize: 11.5, fontWeight: 600 }}>
                              {record.device.reg_number}
                            </Tag>
                          ) : (
                            <span style={{ fontStyle: "italic", color: "#94a3b8", fontSize: 11 }}>
                              Chưa có biển số
                            </span>
                          )}
                          {record.device?.brand && (
                            <span style={{ fontSize: 12, color: "#64748b" }}>• {record.device.brand}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Ngày BD gần nhất & Ngày đến hạn */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                        background: "#f8fafc",
                        borderRadius: 8,
                        padding: "8px 10px",
                        marginTop: 10,
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <div style={{ color: "#64748b", fontSize: 11 }}>BD gần nhất</div>
                        <div style={{ fontWeight: 600, color: "#334155", marginTop: 2 }}>{lastDate}</div>
                      </div>
                      <div>
                        <div style={{ color: "#64748b", fontSize: 11 }}>Hạn dự kiến</div>
                        <div
                          style={{
                            fontWeight: 700,
                            color: statusInfo.isOverdue ? "#cf1322" : "#0f172a",
                            marginTop: 2,
                          }}
                        >
                          {nextDate}
                          {statusInfo.isOverdue ? ` (Trễ ${statusInfo.overdueDays}n)` : ""}
                        </div>
                      </div>
                    </div>

                    {/* Row 4: Action buttons */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 10,
                        paddingTop: 8,
                        borderTop: "1px dashed #e2e8f0",
                      }}
                    >
                      <Space size={6} wrap>
                        <Button
                          type="primary"
                          ghost
                          size="small"
                          icon={<CalendarOutlined />}
                          onClick={() => {
                            setSelectedDevice(record.device);
                            setIsDetailOpen(true);
                          }}
                          style={{ borderRadius: 6, fontSize: 12 }}
                        >
                          Lịch 12T
                        </Button>
                        {record.status === "active" && (
                          <Button
                            type="primary"
                            size="small"
                            icon={<ToolOutlined />}
                            onClick={() => onCreateTicket && onCreateTicket(record)}
                            style={{
                              borderRadius: 6,
                              fontSize: 12,
                              background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
                            }}
                          >
                            Làm BD
                          </Button>
                        )}
                      </Space>

                      <Space size={4}>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => onEdit && onEdit(record)}
                          style={{ borderRadius: 6 }}
                        />
                        <Button
                          size="small"
                          icon={<FileSearchOutlined />}
                          onClick={() =>
                            navigate(
                              `/lich_su_phieu_bao_duong?search=${encodeURIComponent(
                                record.device?.brand || record.device?.name || ""
                              )}`
                            )
                          }
                          style={{ borderRadius: 6 }}
                        />
                        <Button
                          danger
                          size="small"
                          icon={<StopOutlined />}
                          onClick={() => handleCancelPlan(record.maintenance_id)}
                          style={{ borderRadius: 6 }}
                        />
                      </Space>
                    </div>
                  </Card>
                );
              })}

              {dataSource.length > mobilePageSize && (
                <div style={{ textAlign: "center", marginTop: 8 }}>
                  <Pagination
                    size="small"
                    current={mobilePage}
                    pageSize={mobilePageSize}
                    total={dataSource.length}
                    onChange={(p) => setMobilePage(p)}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </div>
          )}
        </Spin>
      ) : (
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="maintenance_id"
          loading={loading}
          tableLayout="fixed"
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} kế hoạch thiết bị`,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
          }}
          style={{
            marginTop: 16,
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
            overflow: "hidden",
          }}
        />
      )}

      <MaintenanceDetailModal
        open={isDetailOpen}
        deviceId={selectedDevice?.device_id}
        deviceName={selectedDevice?.name}
        onClose={() => {
            setIsDetailOpen(false);
            setSelectedDevice(null);
        }}
        onPerformMaintenance={(record) => {
             // Pass callback to parent if needed, or handle directly
             if (onCreateTicket) onCreateTicket(record);
        }}
      />
    </>
  );
};

export default MaintenanceTable;
