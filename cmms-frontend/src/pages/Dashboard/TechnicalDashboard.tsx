import React, { useEffect, useMemo, useCallback, useState } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Button,
  Space,
  Tag,
  Tabs,
  Timeline,
  Avatar,
  Grid,
} from "antd";
import {
  ToolOutlined,
  RightOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
  TrophyOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import { useNavigate } from "react-router-dom";
import { useInventoryContext } from "../../context/InventoryContext/InventoryContext";
import { useDevicesContext } from "../../context/DevicesContext/DevicesContext";
import { useRepairsContext } from "../../context/RepairsContext/RepairsContext";
import { useMaintenanceContext } from "../../context/MaintenanceContext/MaintenanceContext";
import dayjs from "dayjs";
import { DeviceStatus } from "../../types/devicesManagement.types";
import { isMaintenanceOverdue, getMaintenanceStatusInfo } from "../../utils/maintenanceDue";
import RepairDetailDrawer from "../RepairsManagement/components/RepairDetailDrawer";
import TaskDetailModal from "../Tasks/components/TaskDetailModal";
import { useRefreshOnFocus } from "../../hooks/useRefreshOnFocus";
import { useSocket } from "../../hooks/useSocket";
import { getTasks } from "../../apis/tasks";
import { getBackendImageUrl } from "../../utils/imageUrl";
import { ITaskStats, IWorkTask } from "../../types/tasks.types";
import {
  TASK_PRIORITY_CONFIG,
  TASK_STATUS_CONFIG,
  getDeadlineMeta,
  isTaskOverdue,
} from "../Tasks/taskConstants";

const { Title, Text } = Typography;

const DEFAULT_TASK_STATS: ITaskStats = {
  total: 0,
  newCount: 0,
  inProgress: 0,
  pendingReview: 0,
  completed: 0,
  overdue: 0,
  myAssigned: 0,
  myCreated: 0,
  waitingMyReview: 0,
};

const TechnicalDashboard: React.FC = () => {
  const { user } = useAuthContext();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const navigate = useNavigate();

  const role = (user?.role || "").toUpperCase();
  const isTechnicalMember = useMemo(() => {
    if (["TECHNICIAN", "OPERATOR"].includes(role)) return true;
    if (user?.department?.is_technical) return true;
    if (user?.user_departments?.some((ud) => ud.department?.is_technical)) return true;
    return false;
  }, [user, role]);

  const { items, refreshAll } = useInventoryContext();
  const { devices, fetchDevices } = useDevicesContext();
  const { repairs, reload: reloadRepairs, reviewRepairItem, exportRepairItem } = useRepairsContext();
  const { maintenances, fetchMaintenances } = useMaintenanceContext();

  // Work Tasks state
  const [myTasks, setMyTasks] = useState<IWorkTask[]>([]);
  const [, setTaskStats] = useState<ITaskStats>(DEFAULT_TASK_STATS);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  // Repair Drawer State
  const [selectedRepair, setSelectedRepair] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loadMyTasks = useCallback(async () => {
    try {
      const res = await getTasks({ view_mode: "MY_ASSIGNED", include_subtasks: true });
      setMyTasks(res.items || []);
      setTaskStats(res.stats || DEFAULT_TASK_STATS);
    } catch (err) {
      console.error("Failed to load personal tasks:", err);
    }
  }, []);

  const refreshDashboard = useCallback(() => {
    loadMyTasks();
    if (isTechnicalMember) {
      refreshAll();
      fetchDevices();
      reloadRepairs();
      fetchMaintenances();
    }
  }, [loadMyTasks, isTechnicalMember, refreshAll, fetchDevices, reloadRepairs, fetchMaintenances]);

  useEffect(() => {
    refreshDashboard();
    const interval = setInterval(() => {
      loadMyTasks();
      if (isTechnicalMember) {
        reloadRepairs();
        fetchMaintenances(true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshDashboard, loadMyTasks, isTechnicalMember, reloadRepairs, fetchMaintenances]);

  useRefreshOnFocus(refreshDashboard);

  const socketListeners = useMemo(
    () => ({
      dashboard_refresh: () => refreshDashboard(),
      task_updated: () => loadMyTasks(),
      repair_updated: () => reloadRepairs(),
      device_updated: () => fetchDevices(),
    }),
    [refreshDashboard, loadMyTasks, reloadRepairs, fetchDevices]
  );
  useSocket(user?.user_id, socketListeners);

  // Active tasks assigned to me (excluding completed/cancelled)
  const activeMyTasks = useMemo(() => {
    return myTasks
      .filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED")
      .sort((a, b) => {
        const aNew = a.status === "NEW" ? 1 : 0;
        const bNew = b.status === "NEW" ? 1 : 0;
        if (aNew !== bNew) return bNew - aNew;
        return dayjs(a.deadline).valueOf() - dayjs(b.deadline).valueOf();
      });
  }, [myTasks]);

  const myOverdueOrUrgentCount = useMemo(() => {
    return activeMyTasks.filter((t) => isTaskOverdue(t) || t.priority === "URGENT").length;
  }, [activeMyTasks]);

  // Technical stats
  const stats = useMemo(() => {
    const activeDevices = devices.filter(
      (d) =>
        d.status === ("DANG_SU_DUNG" as DeviceStatus) ||
        d.status === ("MOI" as DeviceStatus)
    ).length;
    const totalDevices = devices.length;
    const readinessRate =
      totalDevices > 0 ? Math.round((activeDevices / totalDevices) * 100) : 0;
    const overdueCount = maintenances.filter((m) => isMaintenanceOverdue(m)).length;
    const lowStockCount = items.filter((item) => item.quantity < 10).length;

    return {
      readinessRate,
      overdueCount,
      lowStockCount,
    };
  }, [devices, maintenances, items]);

  // Phiếu chờ TÔI xử lý
  const myPendingRepairs = useMemo(() => {
    if (!user || !isTechnicalMember) return [];
    return repairs
      .filter((r: any) => {
        if (
          ["TECHNICIAN", "OPERATOR"].includes(role) &&
          (r.status_request === "WAITING_TECH" || r.status_request === "PENDING")
        ) {
          return true;
        }
        return false;
      })
      .sort((a: any, b: any) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());
  }, [repairs, user, role, isTechnicalMember]);

  const recentRepairs = useMemo(() => {
    return [...repairs]
      .sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf())
      .slice(0, 6);
  }, [repairs]);

  const scheduleData = useMemo(() => {
    const now = dayjs();
    return maintenances
      .filter((m) => {
        if (!m.next_maintenance_date) return false;
        const info = getMaintenanceStatusInfo(m, now);
        return (
          info.isOverdue ||
          info.type === "in_cycle" ||
          info.type === "in_cycle_last_day"
        );
      })
      .sort(
        (a, b) =>
          dayjs(a.next_maintenance_date).valueOf() -
          dayjs(b.next_maintenance_date).valueOf()
      )
      .slice(0, 5);
  }, [maintenances]);

  const handleReview = async (
    action: "approve" | "reject",
    reason?: string,
    phase?: any
  ) => {
    if (!selectedRepair) return;
    try {
      await reviewRepairItem(selectedRepair.repair_id, {
        action,
        reason,
        phase,
      });
      setIsDetailOpen(false);
      reloadRepairs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async (type: any) => {
    if (!selectedRepair) return;
    try {
      await exportRepairItem(selectedRepair.repair_id, type);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: isMobile ? "6px 4px 20px" : "12px 16px 32px" }}>
      {/* ============================================================ */}
      {/* 1. PERSONAL WORKSPACE BANNER */}
      {/* ============================================================ */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)",
          borderRadius: isMobile ? 12 : 16,
          padding: isMobile ? "14px 14px" : "20px 24px",
          marginBottom: isMobile ? 12 : 18,
          color: "#fff",
          boxShadow: "0 4px 16px rgba(15, 23, 42, 0.2)",
        }}
      >
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col xs={24} md={14}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar
                size={isMobile ? 42 : 50}
                src={user?.avatar ? getBackendImageUrl(user.avatar) : undefined}
                icon={!user?.avatar && <UserOutlined />}
                style={{
                  background: "#2563eb",
                  border: "2px solid rgba(255,255,255,0.25)",
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Title
                    level={isMobile ? 5 : 4}
                    style={{ margin: 0, color: "#fff", fontWeight: 700 }}
                  >
                    Xin chào, {user?.name || "Đồng chí"}!
                  </Title>
                  <Tag
                    color="cyan"
                    style={{ margin: 0, borderRadius: 10, fontSize: 11, fontWeight: 600 }}
                  >
                    {user?.position || (isTechnicalMember ? "Kỹ thuật & Vận hành" : "Chuyên viên")}
                  </Tag>
                </div>
                <div style={{ fontSize: isMobile ? 11.5 : 13, color: "#cbd5e1", marginTop: 4 }}>
                  <CalendarOutlined style={{ marginRight: 6 }} />
                  Hôm nay: {dayjs().format("DD/MM/YYYY")} •{" "}
                  <b>{activeMyTasks.length} công việc</b> cần thực hiện
                </div>
              </div>
            </div>
          </Col>

          <Col xs={24} md={10} style={{ textAlign: isMobile ? "left" : "right" }}>
            <Space wrap size={8}>
              {isTechnicalMember && (
                <>
                  <Button
                    size={isMobile ? "small" : "middle"}
                    type="primary"
                    icon={<WarningOutlined />}
                    onClick={() => navigate("/bao_cao_tinh_trang_xe")}
                    style={{
                      background: "#ea580c",
                      borderColor: "#ea580c",
                      fontWeight: 600,
                      borderRadius: 8,
                    }}
                  >
                    Báo cáo sự cố xe
                  </Button>
                  <Button
                    size={isMobile ? "small" : "middle"}
                    icon={<ToolOutlined />}
                    onClick={() => navigate("/quan_ly_sua_chua")}
                    style={{
                      background: "rgba(255,255,255,0.14)",
                      borderColor: "rgba(255,255,255,0.25)",
                      color: "#fff",
                      borderRadius: 8,
                    }}
                  >
                    Phiếu sửa chữa
                  </Button>
                </>
              )}
              <Button
                size={isMobile ? "small" : "middle"}
                icon={<TrophyOutlined />}
                onClick={() => navigate("/kpi_thi_dua")}
                style={{
                  background: "rgba(255,255,255,0.12)",
                  borderColor: "rgba(255,255,255,0.25)",
                  color: "#fde047",
                  borderRadius: 8,
                }}
              >
                Điểm KPI
              </Button>
              <Button
                size={isMobile ? "small" : "middle"}
                icon={<ReloadOutlined />}
                onClick={refreshDashboard}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  borderColor: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  borderRadius: 8,
                }}
              />
            </Space>
          </Col>
        </Row>
      </div>

      {/* ============================================================ */}
      {/* 2. COMPACT KPI STRIP (2x2 ON MOBILE, 4 COLS ON DESKTOP) */}
      {/* ============================================================ */}
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} style={{ marginBottom: isMobile ? 12 : 20 }}>
        <Col xs={12} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => navigate("/quan_ly_cong_viec")}
            style={{
              borderRadius: 12,
              borderTop: "4px solid #2563eb",
              height: "100%",
            }}
            styles={{ body: { padding: isMobile ? "10px 12px" : "16px" } }}
          >
            <Text
              type="secondary"
              style={{ fontSize: isMobile ? 10.5 : 12, fontWeight: 600 }}
            >
              VIỆC TÔI ĐANG NHẬN
            </Text>
            <div
              style={{
                fontSize: isMobile ? 22 : 28,
                fontWeight: 700,
                color: "#2563eb",
                margin: "2px 0",
              }}
            >
              {activeMyTasks.length}
            </div>
            <div style={{ fontSize: isMobile ? 11 : 12, color: "#64748b" }}>
              {myTasks.filter((t) => t.status === "NEW").length} việc mới chờ nhận
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => navigate("/lich_cong_viec")}
            style={{
              borderRadius: 12,
              borderTop:
                myOverdueOrUrgentCount > 0
                  ? "4px solid #ef4444"
                  : "4px solid #10b981",
              height: "100%",
            }}
            styles={{ body: { padding: isMobile ? "10px 12px" : "16px" } }}
          >
            <Text
              type="secondary"
              style={{ fontSize: isMobile ? 10.5 : 12, fontWeight: 600 }}
            >
              KHẨN CẤP / QUÁ HẠN
            </Text>
            <div
              style={{
                fontSize: isMobile ? 22 : 28,
                fontWeight: 700,
                color: myOverdueOrUrgentCount > 0 ? "#ef4444" : "#10b981",
                margin: "2px 0",
              }}
            >
              {myOverdueOrUrgentCount}
            </div>
            <div style={{ fontSize: isMobile ? 11 : 12, color: "#64748b" }}>
              Cần ưu tiên hoàn thành
            </div>
          </Card>
        </Col>

        {isTechnicalMember ? (
          <>
            <Col xs={12} sm={12} md={6}>
              <Card
                hoverable
                onClick={() => navigate("/quan_ly_sua_chua")}
                style={{
                  borderRadius: 12,
                  borderTop: "4px solid #d97706",
                  height: "100%",
                }}
                styles={{ body: { padding: isMobile ? "10px 12px" : "16px" } }}
              >
                <Text
                  type="secondary"
                  style={{ fontSize: isMobile ? 10.5 : 12, fontWeight: 600 }}
                >
                  PHIẾU SC CHỜ XỬ LÝ
                </Text>
                <div
                  style={{
                    fontSize: isMobile ? 22 : 28,
                    fontWeight: 700,
                    color: "#d97706",
                    margin: "2px 0",
                  }}
                >
                  {myPendingRepairs.length}
                </div>
                <div style={{ fontSize: isMobile ? 11 : 12, color: "#64748b" }}>
                  Sẵn sàng TTB: {stats.readinessRate}%
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <Card
                hoverable
                onClick={() => navigate("/quan_ly_bao_duong")}
                style={{
                  borderRadius: 12,
                  borderTop:
                    stats.overdueCount > 0
                      ? "4px solid #ef4444"
                      : "4px solid #0284c7",
                  height: "100%",
                }}
                styles={{ body: { padding: isMobile ? "10px 12px" : "16px" } }}
              >
                <Text
                  type="secondary"
                  style={{ fontSize: isMobile ? 10.5 : 12, fontWeight: 600 }}
                >
                  BẢO DƯỠNG ĐẾN HẠN
                </Text>
                <div
                  style={{
                    fontSize: isMobile ? 22 : 28,
                    fontWeight: 700,
                    color: stats.overdueCount > 0 ? "#ef4444" : "#0284c7",
                    margin: "2px 0",
                  }}
                >
                  {scheduleData.length}
                </div>
                <div style={{ fontSize: isMobile ? 11 : 12, color: "#64748b" }}>
                  {stats.overdueCount} xe quá hạn bảo dưỡng
                </div>
              </Card>
            </Col>
          </>
        ) : (
          <>
            <Col xs={12} sm={12} md={6}>
              <Card
                hoverable
                onClick={() => navigate("/quan_ly_cong_viec")}
                style={{
                  borderRadius: 12,
                  borderTop: "4px solid #7c3aed",
                  height: "100%",
                }}
                styles={{ body: { padding: isMobile ? "10px 12px" : "16px" } }}
              >
                <Text
                  type="secondary"
                  style={{ fontSize: isMobile ? 10.5 : 12, fontWeight: 600 }}
                >
                  CHỜ NGHIỆM THU
                </Text>
                <div
                  style={{
                    fontSize: isMobile ? 22 : 28,
                    fontWeight: 700,
                    color: "#7c3aed",
                    margin: "2px 0",
                  }}
                >
                  {myTasks.filter((t) => t.status === "PENDING_REVIEW").length}
                </div>
                <div style={{ fontSize: isMobile ? 11 : 12, color: "#64748b" }}>
                  Đã gửi báo cáo hoàn thành
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <Card
                hoverable
                onClick={() => navigate("/kpi_thi_dua")}
                style={{
                  borderRadius: 12,
                  borderTop: "4px solid #16a34a",
                  height: "100%",
                }}
                styles={{ body: { padding: isMobile ? "10px 12px" : "16px" } }}
              >
                <Text
                  type="secondary"
                  style={{ fontSize: isMobile ? 10.5 : 12, fontWeight: 600 }}
                >
                  VIỆC ĐÃ HOÀN THÀNH
                </Text>
                <div
                  style={{
                    fontSize: isMobile ? 22 : 28,
                    fontWeight: 700,
                    color: "#16a34a",
                    margin: "2px 0",
                  }}
                >
                  {myTasks.filter((t) => t.status === "COMPLETED").length}
                </div>
                <div style={{ fontSize: isMobile ? 11 : 12, color: "#64748b" }}>
                  Xem bảng điểm KPI →
                </div>
              </Card>
            </Col>
          </>
        )}
      </Row>

      {/* ============================================================ */}
      {/* 3. MAIN WORKSPACE CONTENT */}
      {/* ============================================================ */}
      <Row gutter={[isMobile ? 12 : 20, isMobile ? 12 : 20]}>
        <Col xs={24} lg={isTechnicalMember ? 15 : 24}>
          {/* KHỐI 1: CÔNG VIỆC CỦA TÔI CẦN THỰC HIỆN */}
          <Card
            title={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <InboxOutlined style={{ color: "#2563eb", fontSize: 16 }} />
                  <span style={{ fontWeight: 700, fontSize: isMobile ? 14 : 15 }}>
                    Công việc của tôi ({activeMyTasks.length})
                  </span>
                </div>
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate("/quan_ly_cong_viec")}
                  style={{ padding: 0 }}
                >
                  Xem tất cả <RightOutlined />
                </Button>
              </div>
            }
            style={{
              borderRadius: 12,
              marginBottom: isMobile ? 12 : 20,
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
            styles={{ body: { padding: isMobile ? "10px" : "12px 16px" } }}
          >
            {activeMyTasks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 0" }}>
                <CheckCircleOutlined
                  style={{ fontSize: 38, color: "#10b981", marginBottom: 8 }}
                />
                <div style={{ fontWeight: 600, color: "#1e293b" }}>
                  Tuyệt vời! Bạn đã hoàn thành hết các công việc được giao.
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {activeMyTasks.slice(0, 6).map((t) => {
                  const sCfg =
                    TASK_STATUS_CONFIG[t.status] || TASK_STATUS_CONFIG.NEW;
                  const pCfg =
                    TASK_PRIORITY_CONFIG[t.priority] ||
                    TASK_PRIORITY_CONFIG.NORMAL;
                  const dMeta = getDeadlineMeta(t);

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTaskId(t.id);
                        setTaskDetailOpen(true);
                      }}
                      style={{
                        background: t.status === "NEW" ? "#eff6ff" : "#f8fafc",
                        border:
                          t.status === "NEW"
                            ? "1px solid #93c5fd"
                            : "1px solid #e2e8f0",
                        borderRadius: 10,
                        padding: isMobile ? "10px 12px" : "12px 16px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                          flexWrap: "wrap",
                          gap: 6,
                        }}
                      >
                        <Space size={6}>
                          <Tag color="blue" style={{ margin: 0, fontWeight: 700 }}>
                            {t.code}
                          </Tag>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: sCfg.color,
                              background: sCfg.bg,
                              padding: "1px 8px",
                              borderRadius: 999,
                            }}
                          >
                            ● {sCfg.label}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: pCfg.color,
                              background: pCfg.bg,
                              padding: "1px 6px",
                              borderRadius: 4,
                            }}
                          >
                            {pCfg.label}
                          </span>
                        </Space>

                        <Button
                          type={t.status === "NEW" ? "primary" : "default"}
                          size="small"
                          style={{ borderRadius: 6, fontSize: 12 }}
                        >
                          {t.status === "NEW"
                            ? "Tiếp nhận ngay"
                            : "Cập nhật / Báo cáo"}
                        </Button>
                      </div>

                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: "#0f172a",
                          marginBottom: 6,
                        }}
                      >
                        {t.title}
                      </div>

                      <Row justify="space-between" align="middle" gutter={[8, 4]}>
                        <Col xs={24} sm={14}>
                          <span style={{ fontSize: 12, color: "#64748b" }}>
                            Người giao: <b>{t.assigner?.name || "Cấp trên"}</b> • Hạn:{" "}
                            <b>{dayjs(t.deadline).format("HH:mm DD/MM/YYYY")}</b>
                          </span>
                        </Col>
                        <Col xs={24} sm={10} style={{ textAlign: isMobile ? "left" : "right" }}>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: dMeta.color,
                            }}
                          >
                            <ClockCircleOutlined /> {dMeta.text} ({t.progress}%)
                          </span>
                        </Col>
                      </Row>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* KHỐI 2: PHIẾU SỬA CHỮA (CHỈ HIỆN CHO ĐỘI KỸ THUẬT / VẬN HÀNH) */}
          {isTechnicalMember && (
            <Card
              style={{
                borderRadius: 12,
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
              styles={{ body: { padding: isMobile ? "8px 10px" : "8px 16px 16px" } }}
            >
              <Tabs
                defaultActiveKey="my-queue"
                size={isMobile ? "small" : "middle"}
                items={[
                  {
                    key: "my-queue",
                    label: (
                      <span>
                        🔔 Phiếu chờ tiếp nhận ({myPendingRepairs.length})
                      </span>
                    ),
                    children:
                      myPendingRepairs.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "24px 0" }}>
                          <CheckCircleOutlined
                            style={{ fontSize: 36, color: "#52c41a", marginBottom: 8 }}
                          />
                          <div>Không có phiếu sửa chữa nào chờ bạn tiếp nhận</div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {myPendingRepairs.map((r: any) => (
                            <div
                              key={r.repair_id}
                              onClick={() => {
                                setSelectedRepair(r);
                                setIsDetailOpen(true);
                              }}
                              style={{
                                padding: "10px 12px",
                                borderRadius: 8,
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                cursor: "pointer",
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 600, color: "#0f172a" }}>
                                  #{r.repair_id} • {r.device?.name || "Thiết bị"} (BS:{" "}
                                  {r.device?.reg_number || "N/A"})
                                </div>
                                <div style={{ fontSize: 12, color: "#64748b" }}>
                                  Ngày tạo:{" "}
                                  {r.created_at
                                    ? dayjs(r.created_at).format("DD/MM/YYYY")
                                    : "---"}
                                </div>
                              </div>
                              <Button type="primary" size="small">
                                Xem & Xử lý
                              </Button>
                            </div>
                          ))}
                        </div>
                      ),
                  },
                  {
                    key: "recent",
                    label: "📋 Hoạt động sửa chữa gần đây",
                    children: (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {recentRepairs.map((r: any) => (
                          <div
                            key={r.repair_id}
                            onClick={() => {
                              setSelectedRepair(r);
                              setIsDetailOpen(true);
                            }}
                            style={{
                              padding: "8px 12px",
                              borderRadius: 8,
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              cursor: "pointer",
                            }}
                          >
                            <div>
                              <Text strong>#{r.repair_id}</Text> •{" "}
                              <Text strong>{r.device?.name}</Text>{" "}
                              <Text type="secondary">
                                ({r.device?.reg_number || "N/A"})
                              </Text>
                            </div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {r.created_at
                                ? dayjs(r.created_at).format("DD/MM/YYYY")
                                : "---"}
                            </Text>
                          </div>
                        ))}
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          )}
        </Col>

        {/* RIGHT COLUMN FOR TECHNICAL MEMBERS: MAINTENANCE SCHEDULE */}
        {isTechnicalMember && (
          <Col xs={24} lg={9}>
            <Card
              title={
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: isMobile ? 14 : 15 }}>
                    🛠️ Lịch Bảo trì Cần chú ý
                  </span>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => navigate("/quan_ly_bao_duong")}
                    style={{ padding: 0 }}
                  >
                    Tất cả <RightOutlined />
                  </Button>
                </div>
              }
              style={{
                borderRadius: 12,
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              {scheduleData.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "24px 0",
                    color: "#94a3b8",
                  }}
                >
                  Không có lịch bảo trì đến hạn hôm nay
                </div>
              ) : (
                <Timeline
                  items={scheduleData.map((m) => {
                    const isOverdue = isMaintenanceOverdue(m);
                    return {
                      color: isOverdue ? "red" : "green",
                      children: (
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <Text strong>{m.device?.name || "Thiết bị"}</Text>
                            <Tag color={isOverdue ? "error" : "success"}>
                              {isOverdue ? "Quá hạn" : "Hôm nay"}
                            </Tag>
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            BS: {m.device?.reg_number || "---"} • Hạn:{" "}
                            {dayjs(m.next_maintenance_date).format("DD/MM/YYYY")}
                          </div>
                        </div>
                      ),
                    };
                  })}
                />
              )}
            </Card>
          </Col>
        )}
      </Row>

      <RepairDetailDrawer
        open={isDetailOpen}
        data={selectedRepair}
        onClose={() => setIsDetailOpen(false)}
        currentUser={user}
        onReview={handleReview}
        onExport={handleExport}
        canExport={true}
      />

      <TaskDetailModal
        open={taskDetailOpen}
        taskId={selectedTaskId}
        currentUser={user}
        canCreateTask={false}
        onClose={() => setTaskDetailOpen(false)}
        onUpdated={loadMyTasks}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />
    </div>
  );
};

export default TechnicalDashboard;
