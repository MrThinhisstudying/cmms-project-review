import React, { useEffect, useState, useCallback } from "react";
import { Modal, Table, Tag, Spin, Typography, Button, DatePicker, message, Space } from "antd";
import { getMaintenancesByDevice, createMaintenanceTicket } from "../../../apis/maintenance";
import { getToken } from "../../../utils/auth";
import { renderMaintenanceStatusTag } from "../../../utils/maintenanceDue";
import dayjs from "dayjs";
import { CheckCircleOutlined, ClockCircleOutlined, ToolOutlined, ExclamationCircleOutlined, CalendarOutlined } from "@ant-design/icons";
import { useAuthContext } from "../../../context/AuthContext/AuthContext";
import EditMaintenanceDateModal from "../../../components/EditMaintenanceDateModal";

interface Props {
  open: boolean;
  onClose: () => void;
  deviceId?: number;
  deviceName?: string;
  onPerformMaintenance?: (record: any) => void;
}

const { Title, Text } = Typography;

const MaintenanceDetailModal: React.FC<Props> = ({
  open,
  onClose,
  deviceId,
  deviceName,
  onPerformMaintenance,
}) => {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  // --- NEW STATE FOR PERFORM MAINTENANCE ---
  const [isPerformOpen, setIsPerformOpen] = useState(false);
  const [performRecord, setPerformRecord] = useState<any>(null);
  const [performDate, setPerformDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [minDate, setMinDate] = useState<dayjs.Dayjs | null>(null); // Constraint
  const [creating, setCreating] = useState(false);

  // --- STATE CHO SỬA NGÀY BẢO DƯỠNG ---
  const [isEditDateOpen, setIsEditDateOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  // ----------------------------------------

  const handleOpenPerform = (record: any) => {
      setPerformRecord(record);
      setPerformDate(dayjs()); // Default today
      
      // Calculate Min Date (Must be after the previous completed maintenance)
      const idx = data.findIndex(d => d.maintenance_id === record.maintenance_id);
      if (idx > 0) {
          const prevItem = data[idx - 1];
          if (prevItem && prevItem.last_maintenance_date) {
              setMinDate(dayjs(prevItem.last_maintenance_date));
          } else {
              setMinDate(null);
          }
      } else {
           setMinDate(null);
      }

      setIsPerformOpen(true);
  };

  const handleSavePerform = async () => {
      // USER REQUEST: Disable Template Logic for now.
      // let tId = performTemplateId;
      
      // if (!tId && templates.length > 0) {
      //     tId = templates[0].id; 
      // }

      // if (!tId) {
      //     message.error("Hệ thống chưa có Quy trình bảo dưỡng nào! Vui lòng tạo quy trình trước.");
      //     return;
      // }

      if (!performDate) {
          message.error("Vui lòng chọn ngày thực hiện!");
          return;
      }

      setCreating(true);
      try {
           const payload = {
            device_id: deviceId,
            maintenance_id: performRecord?.maintenance_id,
            template_id: null, // Disable template
            maintenance_level: performRecord.level,
            execution_date: performDate.hour(12).minute(0).second(0).toISOString(),
            checklist_result: [], 
            working_hours: 0,
            execution_team: [], 
           };

           await createMaintenanceTicket(getToken(), payload);
           message.success("Đã tạo phiếu và hoàn thành bảo dưỡng!");
           
           setIsPerformOpen(false);
           fetchDetails(); // Reload list
      } catch (error: any) {
          message.error("Lỗi: " + (error.message || "Không thể tạo phiếu"));
      } finally {
          setCreating(false);
      }
  };
  
  // Date Constraint Function
  const disabledDate = (current: dayjs.Dayjs) => {
      // Cannot select future dates
      return current > dayjs().endOf('day');
  };

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await getMaintenancesByDevice(deviceId!, token);
      // Sort: Active first, then by date desc
      const sorted = Array.isArray(res) ? res.sort((a: any, b: any) => {
          return new Date(a.next_maintenance_date).getTime() - new Date(b.next_maintenance_date).getTime();
      }) : [];
      setData(sorted);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (open && deviceId) {
      fetchDetails();
    }
  }, [open, deviceId, fetchDetails]);

  // --- THỐNG KÊ TIẾN ĐỘ ---
  const completedCount = data.filter((d) => d.status === "inactive" && d.last_maintenance_date).length;
  const activeCount = data.filter((d) => d.status === "active" || d.status === "warning" || d.status === "overdue").length;
  const totalCount = data.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // --- BỘ LỌC TRONG MODAL ---
  const [filterCycle, setFilterCycle] = useState<string>("all");

  const filteredList = data.filter((d) => {
    if (filterCycle === "weekly") {
      const isWeekly = String(d.level).toLowerCase().includes("tuần") || String(d.level).toLowerCase().includes("week");
      return isWeekly;
    }
    if (filterCycle === "monthly") {
      const isWeekly = String(d.level).toLowerCase().includes("tuần") || String(d.level).toLowerCase().includes("week");
      return !isWeekly;
    }
    if (filterCycle === "completed") {
      return d.status === "inactive" && d.last_maintenance_date;
    }
    if (filterCycle === "pending") {
      return !(d.status === "inactive" && d.last_maintenance_date);
    }
    return true;
  });

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            Đang hiển thị <b>{filteredList.length}</b> / {totalCount} kỳ kế hoạch
          </div>
          <Button type="primary" onClick={onClose} style={{ borderRadius: 8, paddingLeft: 24, paddingRight: 24 }}>
            Đóng
          </Button>
        </div>
      }
      width={980}
      styles={{ body: { padding: "20px 24px" } }}
      centered
    >
      {/* 1. Header Banner & Device Overview */}
      <div
        style={{
          background: "linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)",
          borderRadius: 12,
          padding: "16px 20px",
          border: "1px solid #dbeafe",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 20,
                boxShadow: "0 4px 10px rgba(22, 119, 255, 0.25)",
              }}
            >
              <ToolOutlined />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                Kế Hoạch Bảo Dưỡng Chi Tiết
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 14, color: "#334155", fontWeight: 600 }}>{deviceName || "Thiết bị"}</span>
                {deviceId && (
                  <Tag color="cyan" style={{ fontSize: 12, borderRadius: 4, margin: 0 }}>
                    ID: #{deviceId}
                  </Tag>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Chips */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Tag color="success" style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              ✓ Đã hoàn thành: {completedCount} kỳ
            </Tag>
            <Tag color="processing" style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              ● Đang thực hiện: {activeCount} kỳ
            </Tag>
            <Tag color="default" style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              Tổng: {totalCount} kỳ
            </Tag>
          </div>
        </div>

        {/* Thanh Tiến Độ Hoàn Thành (Progress Bar) */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
            <span>Tiến độ thực hiện năm:</span>
            <span style={{ fontWeight: 700, color: "#1677ff" }}>
              {completedCount}/{totalCount} kỳ ({progressPercent}%)
            </span>
          </div>
          <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: "linear-gradient(90deg, #1677ff 0%, #52c41a 100%)",
                borderRadius: 4,
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* 2. Bộ Lọc Kỳ & Trạng Thái Nhanh */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <Space size={6} wrap>
          {[
            { key: "all", label: "Tất cả kỳ" },
            { key: "weekly", label: "📅 Chu kỳ Tuần" },
            { key: "monthly", label: "🗓️ Chu kỳ Tháng & Năm" },
            { key: "completed", label: "✅ Đã xong" },
            { key: "pending", label: "⏳ Chưa làm" },
          ].map((tab) => {
            const isSelected = filterCycle === tab.key;
            return (
              <Button
                key={tab.key}
                size="small"
                type={isSelected ? "primary" : "default"}
                onClick={() => setFilterCycle(tab.key)}
                style={{
                  borderRadius: 6,
                  fontWeight: isSelected ? 600 : 400,
                  fontSize: 12,
                  background: isSelected ? undefined : "#f8fafc",
                  borderColor: isSelected ? undefined : "#cbd5e1",
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </Space>

        <Button
          size="small"
          icon={<ClockCircleOutlined />}
          onClick={fetchDetails}
          loading={loading}
          style={{ borderRadius: 6, fontSize: 12 }}
        >
          Làm mới
        </Button>
      </div>

      {/* 3. Bảng Chi Tiết Kế Hoạch */}
      <Spin spinning={loading}>
        <Table
          dataSource={filteredList}
          rowKey="maintenance_id"
          pagination={{ pageSize: 8, size: "small" }}
          size="small"
          bordered
          rowClassName={(record) => {
            if (record.status === "active") return "active-maintenance-row";
            return "";
          }}
          columns={[
            {
              title: "STT",
              key: "index",
              width: 50,
              align: "center" as const,
              render: (_: any, __: any, idx: number) => (
                <span style={{ color: "#64748b", fontWeight: 500 }}>{idx + 1}</span>
              ),
            },
            {
              title: "Hạng mục",
              dataIndex: "level",
              key: "level",
              width: 110,
              align: "center" as const,
              render: (val: string) => {
                const map: Record<string, string> = {
                  Tuần: "Tuần",
                  Week: "Tuần",
                  "1M": "01 Tháng",
                  "3M": "03 Tháng",
                  "6M": "06 Tháng",
                  "9M": "09 Tháng",
                  "1Y": "01 Năm",
                  "2Y": "02 Năm",
                };
                const colorMap: Record<string, string> = {
                  Tuần: "blue",
                  Week: "blue",
                  "1M": "cyan",
                  "3M": "geekblue",
                  "6M": "purple",
                  "9M": "magenta",
                  "1Y": "magenta",
                  "2Y": "volcano",
                };
                return (
                  <Tag color={colorMap[val] || "blue"} style={{ fontWeight: 600, borderRadius: 4, minWidth: 70, textAlign: "center" }}>
                    {map[val] || val}
                  </Tag>
                );
              },
            },
            {
              title: "Ngày dự kiến",
              dataIndex: "next_maintenance_date",
              key: "date",
              width: 130,
              align: "center" as const,
              render: (val: string) => {
                if (!val) return "---";
                const d = dayjs(val);
                return (
                  <span style={{ fontWeight: 500, color: "#1e293b" }}>
                    <CalendarOutlined style={{ marginRight: 6, color: "#64748b" }} />
                    {d.isValid() ? d.format("DD/MM/YYYY") : "---"}
                  </span>
                );
              },
            },
            {
              title: "Ngày hoàn thành",
              dataIndex: "last_maintenance_date",
              key: "last",
              width: 140,
              align: "center" as const,
              render: (val: any, r: any) => {
                if (r.status === "inactive" && val) {
                  return (
                    <Tag
                      color="success"
                      style={{
                        fontWeight: 600,
                        fontSize: 12,
                        padding: "2px 8px",
                        borderRadius: 4,
                        border: "1px solid #b7eb8f",
                      }}
                    >
                      <CheckCircleOutlined style={{ marginRight: 4 }} />
                      {dayjs(val).format("DD/MM/YYYY")}
                    </Tag>
                  );
                }
                if (r.status === "active" && val) {
                  return <Text type="secondary" style={{ fontSize: 11 }}>(Lần trước: {dayjs(val).format("DD/MM")})</Text>;
                }
                return <span style={{ color: "#94a3b8" }}>---</span>;
              },
            },
            {
              title: "Trạng thái",
              key: "status",
              width: 150,
              align: "center" as const,
              render: (_: any, r: any) => renderMaintenanceStatusTag(r),
            },
            {
              title: "Thao tác",
              key: "action",
              align: "center" as const,
              width: 180,
              render: (_: any, r: any) => {
                const canEditDate = user?.role === "ADMIN" || user?.permissions?.includes("UPDATE_MAINTENANCE_DATE");

                return (
                  <Space size={6}>
                    {canEditDate && (
                      <Button
                        size="small"
                        icon={<CalendarOutlined />}
                        onClick={() => {
                          setEditingRecord({ ...r, device_name: deviceName });
                          setIsEditDateOpen(true);
                        }}
                        style={{ borderRadius: 6, fontSize: 12 }}
                      >
                        Sửa ngày
                      </Button>
                    )}

                    {r.status === "inactive" && r.last_maintenance_date ? (
                      <Tag color="green" style={{ borderRadius: 4, fontWeight: 500, padding: "2px 8px" }}>
                        <CheckCircleOutlined /> Đã hoàn thành
                      </Tag>
                    ) : r.status === "active" ? (
                      <Button
                        type="primary"
                        size="small"
                        icon={<ToolOutlined />}
                        onClick={() => handleOpenPerform(r)}
                        style={{
                          borderRadius: 6,
                          fontWeight: 600,
                          background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
                          boxShadow: "0 2px 8px rgba(22, 119, 255, 0.3)",
                        }}
                      >
                        Thực hiện
                      </Button>
                    ) : (
                      <Button size="small" disabled style={{ borderRadius: 6, fontSize: 12 }}>
                        Chưa tới kỳ
                      </Button>
                    )}
                  </Space>
                );
              },
            },
          ]}
        />
      </Spin>

      {/* --- MODAL THỰC HIỆN BẢO DƯỠNG --- */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ToolOutlined style={{ color: "#1677ff", fontSize: 18 }} />
            <span style={{ fontWeight: 700 }}>
              Thực hiện bảo dưỡng: <span style={{ color: "#1677ff" }}>{deviceName}</span>
            </span>
          </div>
        }
        open={isPerformOpen}
        onCancel={() => setIsPerformOpen(false)}
        onOk={handleSavePerform}
        okText="Lưu & Hoàn thành"
        cancelText="Hủy bỏ"
        confirmLoading={creating}
        destroyOnClose
        centered
      >
        <div style={{ marginBottom: 16, marginTop: 8 }}>
          <Text strong>1. Chọn ngày thực hiện bảo dưỡng:</Text>
          <DatePicker
            style={{ width: "100%", marginTop: 8, borderRadius: 8 }}
            format="DD/MM/YYYY"
            value={performDate}
            onChange={setPerformDate}
            disabledDate={disabledDate}
            allowClear={false}
          />
        </div>

        <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            <ExclamationCircleOutlined style={{ color: "#faad14", marginRight: 6 }} />
            Bạn đang xác nhận hoàn thành bảo dưỡng cấp <b>{performRecord?.level}</b>.
            Hệ thống sẽ lưu ngày thực hiện, cập nhật trạng thái đã hoàn thành và tự động kích hoạt kỳ bảo dưỡng tiếp theo.
          </Text>
        </div>
      </Modal>

      {/* --- MODAL SỬA NGÀY BẢO DƯỠNG --- */}
      <EditMaintenanceDateModal
        open={isEditDateOpen}
        record={editingRecord}
        onClose={() => {
          setIsEditDateOpen(false);
          setEditingRecord(null);
        }}
        onSuccess={() => {
          fetchDetails();
        }}
      />
    </Modal>
  );
};


export default MaintenanceDetailModal;
