import React, { useEffect, useState, useCallback } from "react";
import {
    Card,
    Row,
    Col,
    Button,
    Tag,
    Table,
    Avatar,
    Progress,
    Space,
    Select,
    DatePicker,
    Segmented,
    Spin,
    Empty,
    Popconfirm,
    Input,
    Alert,
    message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
    BellOutlined,
    WarningOutlined,
    CheckCircleOutlined,
    TrophyOutlined,
    ThunderboltOutlined,
    EyeOutlined,
    UserOutlined,
    TeamOutlined,
    BarChartOutlined,
    PieChartOutlined,
    ClockCircleOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuthContext } from "../../../context/AuthContext/AuthContext";
import { useSocket } from "../../../hooks/useSocket";
import {
    IDepartmentWorkload,
    IEmployeeWorkload,
    IExecutiveDashboardData,
    IReminderScanResult,
    IStalledTaskAlert,
    ITaskProject,
} from "../../../types/tasks.types";
import { IDepartment } from "../../../types/user.types";
import {
    getExecutiveDashboard,
    nudgeTask,
    runTaskReminders,
} from "../../../apis/tasks";
import { getBackendImageUrl } from "../../../utils/imageUrl";
import { TASK_PRIORITY_CONFIG, TASK_STATUS_CONFIG } from "../taskConstants";

interface ExecutiveDashboardViewProps {
    departments: IDepartment[];
    projects: ITaskProject[];
    onOpenDetail: (taskId: number) => void;
    onRefreshTasks: () => void;
}

const ExecutiveDashboardView: React.FC<ExecutiveDashboardViewProps> = ({
    departments,
    projects,
    onOpenDetail,
    onRefreshTasks,
}) => {
    const { user: currentUser } = useAuthContext();
    const [data, setData] = useState<IExecutiveDashboardData | null>(null);
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [lastScanResult, setLastScanResult] = useState<IReminderScanResult | null>(
        null
    );

    // Filters
    const [deptId, setDeptId] = useState<number | undefined>(undefined);
    const [projectId, setProjectId] = useState<number | undefined>(undefined);
    const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);
    const [workloadTab, setWorkloadTab] = useState<"EMPLOYEE" | "DEPARTMENT">(
        "EMPLOYEE"
    );

    // Nudge state
    const [nudgeNote, setNudgeNote] = useState("");
    const [nudgingId, setNudgingId] = useState<number | null>(null);

    const fetchDashboard = useCallback(
        async (silent = false) => {
            if (!silent) setLoading(true);
            try {
                const res = await getExecutiveDashboard({
                    dept_id: deptId,
                    project_id: projectId,
                    month: selectedMonth,
                });
                setData(res);
            } catch (err) {
                if (!silent) {
                    message.error(
                        err instanceof Error
                            ? err.message
                            : "Không thể tải dữ liệu Dashboard Lãnh đạo"
                    );
                }
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [deptId, projectId, selectedMonth]
    );

    useEffect(() => {
        fetchDashboard(false);
    }, [fetchDashboard]);

    useSocket(currentUser?.user_id, {
        task_updated: () => {
            fetchDashboard(true);
        },
        dashboard_refresh: () => {
            fetchDashboard(true);
        },
    });

    const handleRunReminders = async () => {
        setScanning(true);
        try {
            const res = await runTaskReminders();
            setLastScanResult(res.data);
            message.success(res.message);
            fetchDashboard();
        } catch (err) {
            message.error(
                err instanceof Error ? err.message : "Lỗi quét nhắc việc tự động"
            );
        } finally {
            setScanning(false);
        }
    };

    const handleNudgeTask = async (taskId: number) => {
        setNudgingId(taskId);
        try {
            const res = await nudgeTask(taskId, nudgeNote);
            message.success(res.message);
            setNudgeNote("");
            fetchDashboard();
            onRefreshTasks();
        } catch (err) {
            message.error(
                err instanceof Error ? err.message : "Không thể gửi đôn đốc"
            );
        } finally {
            setNudgingId(null);
        }
    };

    if (loading && !data) {
        return (
            <div
                style={{
                    height: 420,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Spin size="large" tip="Đang tổng hợp dữ liệu điều hành..." />
            </div>
        );
    }

    if (!data) return null;

    const { summary } = data;

    // ─────────────────────────── STALLED TASKS COLUMNS ───────────────────────────
    const stalledColumns: ColumnsType<IStalledTaskAlert> = [
        {
            title: "Mã CV",
            dataIndex: "code",
            key: "code",
            width: 115,
            render: (code: string, record: IStalledTaskAlert) => (
                <Tag
                    color="blue"
                    style={{ fontWeight: 700, cursor: "pointer", margin: 0 }}
                    onClick={() => onOpenDetail(record.id)}
                >
                    {code}
                </Tag>
            ),
        },
        {
            title: "Mức cảnh báo",
            key: "alert",
            width: 195,
            render: (_: unknown, record: IStalledTaskAlert) => {
                const isOverdue = record.alertType === "OVERDUE";
                return (
                    <Tag
                        color={isOverdue ? "red" : "orange"}
                        icon={<WarningOutlined />}
                        style={{ fontWeight: 700, borderRadius: 999 }}
                    >
                        {record.alertLabel}
                    </Tag>
                );
            },
        },
        {
            title: "Nội dung công việc",
            key: "title",
            render: (_: unknown, record: IStalledTaskAlert) => {
                const pCfg =
                    TASK_PRIORITY_CONFIG[record.priority] ||
                    TASK_PRIORITY_CONFIG.NORMAL;
                const sCfg =
                    TASK_STATUS_CONFIG[record.status] || TASK_STATUS_CONFIG.NEW;
                return (
                    <div
                        style={{ cursor: "pointer" }}
                        onClick={() => onOpenDetail(record.id)}
                    >
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>
                            {record.title}
                        </div>
                        <Space size={6} style={{ marginTop: 2 }}>
                            <span
                                style={{
                                    fontSize: 11,
                                    color: sCfg.color,
                                    fontWeight: 600,
                                }}
                            >
                                ● {sCfg.label} ({record.progress}%)
                            </span>
                            <span
                                style={{
                                    fontSize: 11,
                                    color: pCfg.color,
                                    background: pCfg.bg,
                                    padding: "0 6px",
                                    borderRadius: 4,
                                }}
                            >
                                Ưu tiên: {pCfg.label}
                            </span>
                        </Space>
                    </div>
                );
            },
        },
        {
            title: "Người chịu trách nhiệm",
            key: "assignee",
            width: 210,
            render: (_: unknown, record: IStalledTaskAlert) => (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar
                        size={26}
                        src={getBackendImageUrl(record.assignee?.avatar)}
                        icon={<UserOutlined />}
                        style={{ backgroundColor: "#059669" }}
                    />
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                            {record.assignee?.name || "—"}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                            {record.department?.name || record.assignee?.position || ""}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: "Hạn hoàn thành",
            key: "deadline",
            width: 150,
            render: (_: unknown, record: IStalledTaskAlert) => (
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    {dayjs(record.deadline).format("DD/MM/YYYY HH:mm")}
                </span>
            ),
        },
        {
            title: "Đôn đốc / Xử lý",
            key: "action",
            width: 200,
            align: "center",
            render: (_: unknown, record: IStalledTaskAlert) => (
                <Space size={6}>
                    <Popconfirm
                        title={`Gửi thông báo đôn đốc cho ${
                            record.assignee?.name || "nhân sự"
                        }?`}
                        description={
                            <div style={{ width: 260, marginTop: 6 }}>
                                <Input
                                    size="small"
                                    value={nudgeNote}
                                    onChange={(e) => setNudgeNote(e.target.value)}
                                    placeholder="Nhập lời nhắc / chỉ đạo khẩn (tùy chọn)..."
                                />
                            </div>
                        }
                        onConfirm={() => handleNudgeTask(record.id)}
                        okText="Gửi đôn đốc"
                        cancelText="Hủy"
                    >
                        <Button
                            size="small"
                            danger
                            type="primary"
                            icon={<ThunderboltOutlined />}
                            loading={nudgingId === record.id}
                        >
                            Đôn đốc
                        </Button>
                    </Popconfirm>
                    <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => onOpenDetail(record.id)}
                    >
                        Xem
                    </Button>
                </Space>
            ),
        },
    ];

    // ─────────────────────────── EMPLOYEE WORKLOAD COLUMNS ───────────────────────────
    const employeeColumns: ColumnsType<IEmployeeWorkload> = [
        {
            title: "Nhân sự thực hiện",
            key: "employee",
            width: 230,
            render: (_: unknown, r: IEmployeeWorkload) => (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar
                        size={28}
                        src={getBackendImageUrl(r.avatar)}
                        icon={<UserOutlined />}
                        style={{ backgroundColor: "#2563eb" }}
                    />
                    <div>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>
                            {r.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                            {r.position ? `${r.position} • ` : ""}
                            {r.dept_name}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: "Tổng việc",
            dataIndex: "total",
            key: "total",
            width: 95,
            align: "center",
            sorter: (a, b) => a.total - b.total,
            render: (v: number) => (
                <Tag color="blue" style={{ fontWeight: 700 }}>
                    {v}
                </Tag>
            ),
        },
        {
            title: "Đang thực hiện",
            dataIndex: "inProgress",
            key: "inProgress",
            width: 120,
            align: "center",
            sorter: (a, b) => a.inProgress - b.inProgress,
            render: (v: number) => (
                <span style={{ fontWeight: 600, color: "#0284c7" }}>{v}</span>
            ),
        },
        {
            title: "Chờ nghiệm thu",
            dataIndex: "pendingReview",
            key: "pendingReview",
            width: 120,
            align: "center",
            render: (v: number) => (
                <span style={{ fontWeight: 600, color: "#7c3aed" }}>{v}</span>
            ),
        },
        {
            title: "Quá hạn",
            dataIndex: "overdue",
            key: "overdue",
            width: 100,
            align: "center",
            sorter: (a, b) => a.overdue - b.overdue,
            render: (v: number) =>
                v > 0 ? (
                    <Tag color="red" style={{ fontWeight: 700 }}>
                        {v} việc
                    </Tag>
                ) : (
                    <span style={{ color: "#94a3b8" }}>0</span>
                ),
        },
        {
            title: "Đã hoàn thành",
            dataIndex: "completed",
            key: "completed",
            width: 120,
            align: "center",
            sorter: (a, b) => a.completed - b.completed,
            render: (v: number) => (
                <span style={{ fontWeight: 700, color: "#16a34a" }}>{v}</span>
            ),
        },
        {
            title: "Tỷ lệ đúng hạn",
            dataIndex: "onTimeRate",
            key: "onTimeRate",
            width: 160,
            sorter: (a, b) => a.onTimeRate - b.onTimeRate,
            render: (rate: number) => (
                <Progress
                    percent={rate}
                    size="small"
                    strokeColor={
                        rate >= 85 ? "#16a34a" : rate >= 60 ? "#d97706" : "#dc2626"
                    }
                />
            ),
        },
        {
            title: "Tổng điểm KPI",
            dataIndex: "totalKpiScore",
            key: "totalKpiScore",
            width: 130,
            align: "center",
            sorter: (a, b) => a.totalKpiScore - b.totalKpiScore,
            render: (score: number) => (
                <Tag color="gold" icon={<TrophyOutlined />} style={{ fontWeight: 700 }}>
                    {score} điểm
                </Tag>
            ),
        },
    ];

    // ─────────────────────────── DEPARTMENT WORKLOAD COLUMNS ───────────────────────────
    const deptColumns: ColumnsType<IDepartmentWorkload> = [
        {
            title: "Đơn vị / Phòng ban / Đội",
            dataIndex: "dept_name",
            key: "dept_name",
            render: (name: string) => (
                <span style={{ fontWeight: 700, color: "#0f172a" }}>{name}</span>
            ),
        },
        {
            title: "Tổng việc",
            dataIndex: "total",
            key: "total",
            align: "center",
            render: (v: number) => (
                <Tag color="blue" style={{ fontWeight: 700 }}>
                    {v}
                </Tag>
            ),
        },
        {
            title: "Mới giao",
            dataIndex: "newCount",
            key: "newCount",
            align: "center",
        },
        {
            title: "Đang thực hiện",
            dataIndex: "inProgress",
            key: "inProgress",
            align: "center",
            render: (v: number) => (
                <span style={{ color: "#0284c7", fontWeight: 600 }}>{v}</span>
            ),
        },
        {
            title: "Chờ nghiệm thu",
            dataIndex: "pendingReview",
            key: "pendingReview",
            align: "center",
            render: (v: number) => (
                <span style={{ color: "#7c3aed", fontWeight: 600 }}>{v}</span>
            ),
        },
        {
            title: "Quá hạn",
            dataIndex: "overdue",
            key: "overdue",
            align: "center",
            render: (v: number) =>
                v > 0 ? (
                    <Tag color="red" style={{ fontWeight: 700 }}>
                        {v}
                    </Tag>
                ) : (
                    <span style={{ color: "#94a3b8" }}>0</span>
                ),
        },
        {
            title: "Đã hoàn thành",
            dataIndex: "completed",
            key: "completed",
            align: "center",
            render: (v: number) => (
                <span style={{ color: "#16a34a", fontWeight: 700 }}>{v}</span>
            ),
        },
        {
            title: "Tỷ lệ đúng hạn",
            dataIndex: "onTimeRate",
            key: "onTimeRate",
            width: 180,
            render: (rate: number) => (
                <Progress
                    percent={rate}
                    size="small"
                    strokeColor={
                        rate >= 85 ? "#16a34a" : rate >= 60 ? "#d97706" : "#dc2626"
                    }
                />
            ),
        },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* ─────────────── TOP FILTER & REMINDER TRIGGER BAR ─────────────── */}
            <Card
                size="small"
                style={{
                    borderRadius: 12,
                    border: "1px solid #cbd5e1",
                    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                    color: "#fff",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 12,
                    }}
                >
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>
                            Dashboard Điều hành Lãnh đạo & Giám sát Tiến độ
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>
                            Hệ thống tự động quét nhắc việc định kỳ lúc 07:30 và 14:00 hằng
                            ngày (T-3, T-1, Quá hạn & Việc chưa nhận &gt; 24h)
                        </div>
                    </div>

                    <Space wrap>
                        <DatePicker
                            picker="month"
                            placeholder="Lọc theo tháng"
                            format="MM/YYYY"
                            onChange={(val) =>
                                setSelectedMonth(
                                    val ? val.format("YYYY-MM") : undefined
                                )
                            }
                        />
                        <Select
                            allowClear
                            placeholder="Tất cả Đơn vị"
                            style={{ width: 170 }}
                            value={deptId}
                            onChange={(val) => setDeptId(val)}
                            options={departments.map((d) => ({
                                value: d.dept_id,
                                label: d.name,
                            }))}
                        />
                        <Select
                            allowClear
                            placeholder="Tất cả Dự án"
                            style={{ width: 170 }}
                            value={projectId}
                            onChange={(val) => setProjectId(val)}
                            options={projects.map((p) => ({
                                value: p.id,
                                label: p.name,
                            }))}
                        />
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => fetchDashboard(false)}
                            loading={loading}
                        />
                        <Button
                            type="primary"
                            icon={<BellOutlined />}
                            loading={scanning}
                            onClick={handleRunReminders}
                            style={{
                                background: "#f59e0b",
                                borderColor: "#f59e0b",
                                color: "#0f172a",
                                fontWeight: 700,
                            }}
                        >
                            Quét & Gửi nhắc việc ngay
                        </Button>
                    </Space>
                </div>

                {lastScanResult && (
                    <Alert
                        style={{ marginTop: 12, borderRadius: 8 }}
                        type="info"
                        showIcon
                        closable
                        onClose={() => setLastScanResult(null)}
                        message={
                            <span>
                                <strong>Kết quả quét nhắc việc tức thời:</strong> Đã kiểm tra{" "}
                                <strong>{lastScanResult.scannedCount}</strong> công việc đang mở
                                — Phát hiện{" "}
                                <Tag color="red">
                                    {lastScanResult.overdueCount} việc quá hạn
                                </Tag>
                                <Tag color="orange">
                                    {lastScanResult.dueT1Count} việc khẩn T-1 (&lt;24h)
                                </Tag>
                                <Tag color="blue">
                                    {lastScanResult.dueT3Count} việc sắp hạn T-3
                                </Tag>
                                <Tag color="purple">
                                    {lastScanResult.stalledNewCount} việc chưa nhận &gt;24h
                                </Tag>{" "}
                                → Đã bắn{" "}
                                <strong>{lastScanResult.notificationsSent}</strong> thông báo
                                đôn đốc!
                            </span>
                        }
                    />
                )}
            </Card>

            {/* ─────────────── ROW 1: 4 EXECUTIVE SUMMARY CARDS ─────────────── */}
            <Row gutter={[14, 14]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card
                        size="small"
                        style={{
                            borderRadius: 12,
                            border: "1px solid #bfdbfe",
                            background: "#eff6ff",
                        }}
                    >
                        <div style={{ fontSize: 12.5, color: "#1e40af", fontWeight: 600 }}>
                            TỶ LỆ HOÀN THÀNH CHUNG
                        </div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "baseline",
                                marginTop: 6,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 28,
                                    fontWeight: 800,
                                    color: "#1d4ed8",
                                }}
                            >
                                {summary.completionRate}%
                            </span>
                            <span style={{ fontSize: 12, color: "#475569" }}>
                                {summary.completedTasks}/{summary.totalTasks} công việc
                            </span>
                        </div>
                        <Progress
                            percent={summary.completionRate}
                            showInfo={false}
                            strokeColor="#2563eb"
                            size="small"
                        />
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card
                        size="small"
                        style={{
                            borderRadius: 12,
                            border: "1px solid #bbf7d0",
                            background: "#f0fdf4",
                        }}
                    >
                        <div style={{ fontSize: 12.5, color: "#166534", fontWeight: 600 }}>
                            TỶ LỆ HOÀN THÀNH ĐÚNG HẠN
                        </div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "baseline",
                                marginTop: 6,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 28,
                                    fontWeight: 800,
                                    color: "#15803d",
                                }}
                            >
                                {summary.onTimeCompletionRate}%
                            </span>
                            <span style={{ fontSize: 12, color: "#166534" }}>
                                <CheckCircleOutlined /> Đúng tiến độ cam kết
                            </span>
                        </div>
                        <Progress
                            percent={summary.onTimeCompletionRate}
                            showInfo={false}
                            strokeColor="#16a34a"
                            size="small"
                        />
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card
                        size="small"
                        style={{
                            borderRadius: 12,
                            border: "1px solid #fecaca",
                            background: "#fef2f2",
                        }}
                    >
                        <div style={{ fontSize: 12.5, color: "#991b1b", fontWeight: 600 }}>
                            VIỆC BỊ &ldquo;TREO&rdquo; / QUÁ HẠN CẦN ĐÔN ĐỐC
                        </div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "baseline",
                                marginTop: 6,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 28,
                                    fontWeight: 800,
                                    color: "#dc2626",
                                }}
                            >
                                {summary.stalledCount}
                            </span>
                            <span style={{ fontSize: 12, color: "#991b1b" }}>
                                Trong đó {summary.overdueTasks} việc đã quá hạn
                            </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: "#b91c1c", marginTop: 4 }}>
                            <WarningOutlined /> Cần Lãnh đạo / Người giao kiểm tra xử lý
                        </div>
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card
                        size="small"
                        style={{
                            borderRadius: 12,
                            border: "1px solid #fde68a",
                            background: "#fffbeb",
                        }}
                    >
                        <div style={{ fontSize: 12.5, color: "#92400e", fontWeight: 600 }}>
                            TỔNG ĐIỂM KPI NGHIỆM THU
                        </div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "baseline",
                                marginTop: 6,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 28,
                                    fontWeight: 800,
                                    color: "#d97706",
                                }}
                            >
                                {summary.totalKpiScore}
                            </span>
                            <span style={{ fontSize: 12, color: "#92400e" }}>
                                TB: {summary.avgKpiScore} điểm / việc
                            </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: "#b45309", marginTop: 4 }}>
                            <TrophyOutlined /> Tự động tính từ trọng số & tiến độ
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* ─────────────── ROW 2: VISUAL ANALYTICS (STATUS & DEPARTMENT WORKLOAD) ─────────────── */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={10}>
                    <Card
                        size="small"
                        style={{
                            borderRadius: 12,
                            border: "1px solid #e2e8f0",
                            height: "100%",
                        }}
                        title={
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <PieChartOutlined style={{ color: "#2563eb" }} />
                                <span style={{ fontWeight: 700 }}>
                                    Cơ cấu Công việc theo Trạng thái & Ưu tiên
                                </span>
                            </div>
                        }
                    >
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                                padding: "4px 0",
                            }}
                        >
                            {data.statusBreakdown.map((st) => {
                                const pct =
                                    summary.totalTasks > 0
                                        ? Math.round((st.count / summary.totalTasks) * 100)
                                        : 0;
                                return (
                                    <div key={st.status}>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                fontSize: 12.5,
                                                marginBottom: 3,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontWeight: 600,
                                                    color: "#334155",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: "50%",
                                                        backgroundColor: st.color,
                                                        marginRight: 6,
                                                    }}
                                                />
                                                {st.label}
                                            </span>
                                            <span
                                                style={{
                                                    fontWeight: 700,
                                                    color: st.color,
                                                }}
                                            >
                                                {st.count} việc ({pct}%)
                                            </span>
                                        </div>
                                        <Progress
                                            percent={pct}
                                            showInfo={false}
                                            strokeColor={st.color}
                                            size="small"
                                        />
                                    </div>
                                );
                            })}

                            <div
                                style={{
                                    borderTop: "1px solid #f1f5f9",
                                    paddingTop: 10,
                                    marginTop: 4,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    flexWrap: "wrap",
                                    gap: 6,
                                }}
                            >
                                {data.priorityBreakdown.map((pr) => (
                                    <Tag
                                        key={pr.priority}
                                        style={{
                                            margin: 0,
                                            borderColor: pr.color,
                                            color: pr.color,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {pr.label}: {pr.count}
                                    </Tag>
                                ))}
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={24} lg={14}>
                    <Card
                        size="small"
                        style={{
                            borderRadius: 12,
                            border: "1px solid #e2e8f0",
                            height: "100%",
                        }}
                        title={
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <BarChartOutlined style={{ color: "#2563eb" }} />
                                <span style={{ fontWeight: 700 }}>
                                    Tải công việc & Tiến độ theo Phòng ban / Đội
                                </span>
                            </div>
                        }
                    >
                        {data.departmentWorkload.length === 0 ? (
                            <Empty description="Chưa có dữ liệu phòng ban" />
                        ) : (
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 12,
                                    maxHeight: 280,
                                    overflowY: "auto",
                                    paddingRight: 4,
                                }}
                            >
                                {data.departmentWorkload.slice(0, 8).map((dept) => {
                                    const donePct =
                                        dept.total > 0
                                            ? Math.round(
                                                  (dept.completed / dept.total) * 100
                                              )
                                            : 0;
                                    const activePct =
                                        dept.total > 0
                                            ? Math.round(
                                                  ((dept.inProgress +
                                                      dept.pendingReview +
                                                      dept.newCount) /
                                                      dept.total) *
                                                      100
                                              )
                                            : 0;
                                    const overduePct =
                                        dept.total > 0
                                            ? Math.round(
                                                  (dept.overdue / dept.total) * 100
                                              )
                                            : 0;

                                    return (
                                        <div
                                            key={dept.dept_id}
                                            style={{
                                                background: "#f8fafc",
                                                padding: "10px 12px",
                                                borderRadius: 10,
                                                border: "1px solid #e2e8f0",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    marginBottom: 6,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontWeight: 700,
                                                        fontSize: 13,
                                                        color: "#0f172a",
                                                    }}
                                                >
                                                    {dept.dept_name}
                                                </span>
                                                <Space size={6}>
                                                    <Tag
                                                        color="blue"
                                                        style={{ margin: 0 }}
                                                    >
                                                        Tổng: {dept.total}
                                                    </Tag>
                                                    <Tag
                                                        color="cyan"
                                                        style={{ margin: 0 }}
                                                    >
                                                        Đang làm: {dept.inProgress}
                                                    </Tag>
                                                    <Tag
                                                        color="green"
                                                        style={{ margin: 0 }}
                                                    >
                                                        Xong: {dept.completed}
                                                    </Tag>
                                                    {dept.overdue > 0 && (
                                                        <Tag
                                                            color="red"
                                                            style={{ margin: 0 }}
                                                        >
                                                            Quá hạn: {dept.overdue}
                                                        </Tag>
                                                    )}
                                                </Space>
                                            </div>
                                            {/* Stacked bar */}
                                            <div
                                                style={{
                                                    height: 10,
                                                    width: "100%",
                                                    background: "#e2e8f0",
                                                    borderRadius: 999,
                                                    overflow: "hidden",
                                                    display: "flex",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: `${donePct}%`,
                                                        background: "#16a34a",
                                                    }}
                                                    title={`Đã hoàn thành: ${dept.completed}`}
                                                />
                                                <div
                                                    style={{
                                                        width: `${activePct}%`,
                                                        background: "#0284c7",
                                                    }}
                                                    title={`Đang xử lý: ${
                                                        dept.inProgress +
                                                        dept.pendingReview +
                                                        dept.newCount
                                                    }`}
                                                />
                                                <div
                                                    style={{
                                                        width: `${overduePct}%`,
                                                        background: "#dc2626",
                                                    }}
                                                    title={`Quá hạn: ${dept.overdue}`}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* ─────────────── ROW 3: STALLED & OVERDUE TASKS ALERT TABLE ─────────────── */}
            <Card
                size="small"
                style={{
                    borderRadius: 12,
                    border: "1px solid #fecaca",
                }}
                title={
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <WarningOutlined style={{ color: "#dc2626", fontSize: 16 }} />
                            <span style={{ fontWeight: 700, color: "#991b1b" }}>
                                Danh sách Công việc Quá hạn / Bị &ldquo;Treo&rdquo; cần Đôn đốc (
                                {data.stalledTasks.length})
                            </span>
                        </div>
                        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>
                            Bao gồm: Việc đã quá hạn, việc giao &gt;24h chưa tiếp nhận, việc
                            chờ duyệt &gt;24h
                        </span>
                    </div>
                }
            >
                <Table
                    rowKey="id"
                    size="small"
                    columns={stalledColumns}
                    dataSource={data.stalledTasks}
                    pagination={{ pageSize: 6 }}
                    locale={{
                        emptyText: (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="Tuyệt vời! Hiện không có công việc nào bị quá hạn hoặc bị treo."
                            />
                        ),
                    }}
                />
            </Card>

            {/* ─────────────── ROW 4: WORKLOAD MATRIX (EMPLOYEE / DEPARTMENT) ─────────────── */}
            <Card
                size="small"
                style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                title={
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 8,
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <TeamOutlined style={{ color: "#2563eb", fontSize: 16 }} />
                            <span style={{ fontWeight: 700, color: "#0f172a" }}>
                                Bảng Phân tích Tải công việc & Hiệu suất Thực thi
                            </span>
                        </div>
                        <Segmented
                            value={workloadTab}
                            onChange={(val) =>
                                setWorkloadTab(val as "EMPLOYEE" | "DEPARTMENT")
                            }
                            options={[
                                {
                                    label: `Theo Nhân sự (${data.employeeWorkload.length})`,
                                    value: "EMPLOYEE",
                                    icon: <UserOutlined />,
                                },
                                {
                                    label: `Theo Đơn vị / Phòng ban (${data.departmentWorkload.length})`,
                                    value: "DEPARTMENT",
                                    icon: <TeamOutlined />,
                                },
                            ]}
                        />
                    </div>
                }
            >
                {workloadTab === "EMPLOYEE" ? (
                    <Table
                        rowKey="user_id"
                        size="small"
                        columns={employeeColumns}
                        dataSource={data.employeeWorkload}
                        pagination={{ pageSize: 8 }}
                    />
                ) : (
                    <Table
                        rowKey="dept_id"
                        size="small"
                        columns={deptColumns}
                        dataSource={data.departmentWorkload}
                        pagination={{ pageSize: 8 }}
                    />
                )}
            </Card>
        </div>
    );
};

export default ExecutiveDashboardView;
