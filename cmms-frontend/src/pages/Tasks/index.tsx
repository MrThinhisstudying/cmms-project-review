import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
    Card,
    Row,
    Col,
    Button,
    Input,
    Select,
    Table,
    Tag,
    Avatar,
    Progress,
    Space,
    Tooltip,
    Segmented,
    Empty,
    Badge,
    Grid,
    Drawer,
    message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
    PlusOutlined,
    FolderOpenOutlined,
    SearchOutlined,
    ReloadOutlined,
    TableOutlined,
    AppstoreOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    WarningOutlined,
    AuditOutlined,
    UserOutlined,
    BranchesOutlined,
    CheckSquareOutlined,
    PaperClipOutlined,
    TrophyOutlined,
    EyeOutlined,
    SendOutlined,
    InboxOutlined,
    SyncOutlined,
    FilterOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import { useSocket } from "../../hooks/useSocket";
import { getToken } from "../../utils/auth";
import { getBackendImageUrl } from "../../utils/imageUrl";
import { getAllUsers } from "../../apis/users";
import { getDepartments } from "../../apis/departments";
import { getTasks, getTaskProjects } from "../../apis/tasks";
import {
    ITaskAssignmentContext,
    ITaskFilterParams,
    ITaskProject,
    ITaskStats,
    IWorkTask,
    WorkTaskPriority,
    WorkTaskStatus,
    WorkTaskType,
} from "../../types/tasks.types";
import { IDepartment, IUser } from "../../types/user.types";
import {
    TASK_PRIORITY_CONFIG,
    TASK_STATUS_CONFIG,
    TASK_TYPE_CONFIG,
    getDeadlineMeta,
} from "./taskConstants";
import TaskFormModal from "./components/TaskFormModal";
import TaskDetailModal from "./components/TaskDetailModal";
import ProjectModal from "./components/ProjectModal";
import TaskCalendarView from "./components/TaskCalendarView";
import ExecutiveDashboardView from "./components/ExecutiveDashboardView";
import KpiEvaluationView from "./components/KpiEvaluationView";

const DEFAULT_STATS: ITaskStats = {
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

export interface TasksPageProps {
    mode?: "tasks" | "calendar" | "dashboard" | "kpi";
}

const TasksPage: React.FC<TasksPageProps> = ({ mode }) => {
    const { user: currentUser } = useAuthContext();
    const location = useLocation();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

    // Xác định chế độ dựa theo prop hoặc URL path
    const activeMode: "tasks" | "calendar" | "dashboard" | "kpi" = mode || (
        location.pathname.startsWith('/lich_cong_viec') ? 'calendar' :
        location.pathname.startsWith('/dashboard_lanh_dao') ? 'dashboard' :
        location.pathname.startsWith('/kpi_thi_dua') ? 'kpi' : 'tasks'
    );

    // Data state
    const [tasks, setTasks] = useState<IWorkTask[]>([]);
    const [stats, setStats] = useState<ITaskStats>(DEFAULT_STATS);
    const [assignmentContext, setAssignmentContext] =
        useState<ITaskAssignmentContext | null>(null);
    const [projects, setProjects] = useState<ITaskProject[]>([]);
    const [departments, setDepartments] = useState<IDepartment[]>([]);
    const [users, setUsers] = useState<IUser[]>([]);
    const [loading, setLoading] = useState(false);

    // Filter state
    const [viewMode, setViewMode] = useState<
        "ALL" | "MY_ASSIGNED" | "MY_CREATED" | "COLLABORATING" | "PENDING_MY_REVIEW"
    >("ALL");
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [priorityFilter, setPriorityFilter] = useState<string | undefined>(undefined);
    const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
    const [projectFilter, setProjectFilter] = useState<number | undefined>(undefined);
    const [deptFilter, setDeptFilter] = useState<number | undefined>(undefined);
    const [deviceGroupFilter, setDeviceGroupFilter] = useState<number | undefined>(
        undefined
    );
    const [searchText, setSearchText] = useState("");
    const [displayMode, setDisplayMode] = useState<"TABLE" | "KANBAN">("TABLE");

    const headerTitle = useMemo(() => {
        switch (activeMode) {
            case "calendar":
                return "Lịch Công việc Toàn hệ thống";
            case "dashboard":
                return "Dashboard Lãnh đạo & Điều hành Tiến độ";
            case "kpi":
                return "Bình xét KPI & Đánh giá Thi đua";
            default:
                return "Trung tâm Quản lý Công việc & Giao việc";
        }
    }, [activeMode]);

    const headerSubtitle = useMemo(() => {
        switch (activeMode) {
            case "calendar":
                return "Theo dõi toàn bộ lịch trình công tác, phân ca, bảo dưỡng và hạn chót hoàn thành theo thời gian thực";
            case "dashboard":
                return "Báo cáo chỉ số điều hành, tỷ lệ hoàn thành công việc và tiến độ theo từng Đơn vị / Phòng ban";
            case "kpi":
                return "Hệ thống tính điểm KPI tự động, xếp loại mức độ hoàn thành nhiệm vụ và bảng vinh danh thi đua";
            default:
                return "Giao việc phân cấp (Ban Giám đốc → Đội trưởng/Phó → Tổ trưởng/Phó (Cán bộ) → Nhân viên) & Chia sẻ theo Nhóm trang thiết bị";
        }
    }, [activeMode]);

    // Modals state
    const [formOpen, setFormOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<IWorkTask | null>(null);
    const [parentTaskForSub, setParentTaskForSub] = useState<IWorkTask | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [projectModalOpen, setProjectModalOpen] = useState(false);

    const fetchMasterData = useCallback(async () => {
        try {
            const token = getToken();
            const [projList, deptList, userList] = await Promise.all([
                getTaskProjects(),
                getDepartments(),
                getAllUsers(token),
            ]);
            setProjects(projList);
            setDepartments(deptList);
            // Lọc chỉ giữ các tài khoản đang hoạt động (loại trừ tài khoản ngưng hoạt động / khóa)
            const activeUserList = (userList || []).filter(
                (u: IUser) => !u.status || u.status.trim().toLowerCase() === "active"
            );
            setUsers(activeUserList);
        } catch (err) {
            console.error("Failed to load task master data:", err);
        }
    }, []);

    const fetchTaskList = useCallback(
        async (silent = false) => {
            if (!silent) setLoading(true);
            try {
                const params: ITaskFilterParams = {
                    view_mode: viewMode,
                    status: statusFilter,
                    priority: priorityFilter,
                    task_type: typeFilter,
                    project_id: projectFilter,
                    dept_id: deptFilter,
                    device_group_id: deviceGroupFilter,
                    search: searchText.trim() || undefined,
                    include_subtasks: true,
                };
                const data = await getTasks(params);
                setTasks(data.items || []);
                setStats(data.stats || DEFAULT_STATS);
                if (data.assignmentContext) {
                    setAssignmentContext(data.assignmentContext);
                }
            } catch (err) {
                if (!silent) {
                    const msg =
                        err instanceof Error
                            ? err.message
                            : "Không thể tải danh sách công việc";
                    message.error(msg);
                }
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [
            viewMode,
            statusFilter,
            priorityFilter,
            typeFilter,
            projectFilter,
            deptFilter,
            deviceGroupFilter,
            searchText,
        ]
    );

    useEffect(() => {
        fetchMasterData();
    }, [fetchMasterData]);

    useEffect(() => {
        fetchTaskList(false);
    }, [fetchTaskList]);

    useSocket(currentUser?.user_id, {
        task_updated: () => {
            fetchTaskList(true);
        },
        dashboard_refresh: () => {
            fetchTaskList(true);
        },
    });

    const handleOpenCreateTask = () => {
        setEditingTask(null);
        setParentTaskForSub(null);
        setFormOpen(true);
    };

    const handleOpenEditTask = (task: IWorkTask) => {
        setEditingTask(task);
        setParentTaskForSub(null);
        setFormOpen(true);
    };

    const handleOpenCreateSubtask = (parentTask: IWorkTask) => {
        setEditingTask(null);
        setParentTaskForSub(parentTask);
        setFormOpen(true);
    };

    const handleOpenDetail = (taskId: number) => {
        setSelectedTaskId(taskId);
        setDetailOpen(true);
    };

    // ─────────────────────────── KPI CARDS ───────────────────────────
    const kpiCards = [
        {
            key: "ALL",
            title: "Tổng công việc",
            value: stats.total,
            icon: <AppstoreOutlined />,
            color: "#2563eb",
            bg: "#eff6ff",
            border: "#bfdbfe",
            onClick: () => {
                setViewMode("ALL");
                setStatusFilter(undefined);
            },
            active: viewMode === "ALL" && !statusFilter,
        },
        {
            key: "MY_ASSIGNED",
            title: "Việc tôi nhận",
            value: stats.myAssigned,
            icon: <InboxOutlined />,
            color: "#0284c7",
            bg: "#f0f9ff",
            border: "#bae6fd",
            onClick: () => {
                setViewMode("MY_ASSIGNED");
                setStatusFilter(undefined);
            },
            active: viewMode === "MY_ASSIGNED",
        },
        {
            key: "MY_CREATED",
            title: "Việc tôi giao",
            value: stats.myCreated,
            icon: <SendOutlined />,
            color: "#4f46e5",
            bg: "#eef2ff",
            border: "#c7d2fe",
            onClick: () => {
                setViewMode("MY_CREATED");
                setStatusFilter(undefined);
            },
            active: viewMode === "MY_CREATED",
        },
        {
            key: "PENDING_MY_REVIEW",
            title: "Chờ tôi nghiệm thu",
            value: stats.waitingMyReview,
            icon: <AuditOutlined />,
            color: "#7c3aed",
            bg: "#f5f3ff",
            border: "#ddd6fe",
            onClick: () => {
                setViewMode("PENDING_MY_REVIEW");
                setStatusFilter(undefined);
            },
            active: viewMode === "PENDING_MY_REVIEW",
        },
        {
            key: "IN_PROGRESS",
            title: "Đang thực hiện",
            value: stats.inProgress,
            icon: <SyncOutlined />,
            color: "#0891b2",
            bg: "#ecfeff",
            border: "#a5f3fc",
            onClick: () => {
                setViewMode("ALL");
                setStatusFilter("IN_PROGRESS");
            },
            active: statusFilter === "IN_PROGRESS",
        },
        {
            key: "OVERDUE",
            title: "Đang quá hạn",
            value: stats.overdue,
            icon: <WarningOutlined />,
            color: "#dc2626",
            bg: "#fef2f2",
            border: "#fecaca",
            onClick: () => {
                setViewMode("ALL");
                setStatusFilter(undefined);
            },
            active: false,
        },
        {
            key: "COMPLETED",
            title: "Đã hoàn thành",
            value: stats.completed,
            icon: <CheckCircleOutlined />,
            color: "#16a34a",
            bg: "#f0fdf4",
            border: "#bbf7d0",
            onClick: () => {
                setViewMode("ALL");
                setStatusFilter("COMPLETED");
            },
            active: statusFilter === "COMPLETED",
        },
    ];

    // ─────────────────────────── TABLE COLUMNS ───────────────────────────
    const columns: ColumnsType<IWorkTask> = [
        {
            title: "Mã CV",
            dataIndex: "code",
            key: "code",
            width: 125,
            fixed: "left",
            render: (code: string, record: IWorkTask) => (
                <div>
                    <Tag
                        color={record.parent_id ? "purple" : "blue"}
                        style={{ fontWeight: 700, cursor: "pointer", margin: 0 }}
                        onClick={() => handleOpenDetail(record.id)}
                    >
                        {code}
                    </Tag>
                    {record.parent_id && (
                        <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 2 }}>
                            <BranchesOutlined /> Việc con
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: "Nội dung công việc & Phân loại",
            key: "title",
            width: 310,
            render: (_: unknown, record: IWorkTask) => {
                const typeCfg =
                    TASK_TYPE_CONFIG[record.task_type] || TASK_TYPE_CONFIG.DIRECTIVE;
                const checkTotal = (record.checklist || []).length;
                const checkDone = (record.checklist || []).filter(
                    (c) => c.completed
                ).length;
                const subCount = (record.subtasks || []).length;
                const attCount = (record.attachments || []).length;

                return (
                    <div
                        style={{ cursor: "pointer" }}
                        onClick={() => handleOpenDetail(record.id)}
                    >
                        <div
                            style={{
                                fontWeight: 600,
                                fontSize: 14,
                                color: "#0f172a",
                                marginBottom: 4,
                            }}
                        >
                            {record.title}
                        </div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 6,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 11,
                                    padding: "1px 8px",
                                    borderRadius: 6,
                                    background: typeCfg.bg,
                                    color: typeCfg.color,
                                    border: `1px solid ${typeCfg.border}`,
                                    fontWeight: 500,
                                }}
                            >
                                {typeCfg.label}
                            </span>

                            {record.project && (
                                <Tag
                                    color="geekblue"
                                    style={{ margin: 0, fontSize: 11 }}
                                >
                                    <FolderOpenOutlined /> {record.project.name}
                                </Tag>
                            )}

                            {record.device_group && (
                                <Tag
                                    color="cyan"
                                    style={{ margin: 0, fontSize: 11 }}
                                >
                                    ⚙ Nhóm TB: {record.device_group.name}
                                </Tag>
                            )}

                            {checkTotal > 0 && (
                                <span style={{ fontSize: 11, color: "#475569" }}>
                                    <CheckSquareOutlined /> {checkDone}/{checkTotal}
                                </span>
                            )}

                            {subCount > 0 && (
                                <span style={{ fontSize: 11, color: "#7c3aed" }}>
                                    <BranchesOutlined /> {subCount} việc con
                                </span>
                            )}

                            {attCount > 0 && (
                                <span style={{ fontSize: 11, color: "#2563eb" }}>
                                    <PaperClipOutlined /> {attCount}
                                </span>
                            )}
                        </div>

                        {record.status === "CHANGE_REQUESTED" && (
                            <div
                                style={{
                                    marginTop: 6,
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                    background: "#fffbeb",
                                    border: "1px solid #f59e0b",
                                    color: "#b45309",
                                    fontSize: 11.5,
                                    fontWeight: 600,
                                }}
                            >
                                ⏳{" "}
                                <strong>
                                    {record.assignee?.name || "Nhân sự nhận việc"}
                                </strong>{" "}
                                xin gia hạn
                                {record.proposed_deadline
                                    ? ` → ${dayjs(record.proposed_deadline).format(
                                          "DD/MM/YYYY HH:mm"
                                      )}`
                                    : ""}
                                {record.change_request_reason && (
                                    <div
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 500,
                                            color: "#92400e",
                                            marginTop: 2,
                                        }}
                                    >
                                        Lý do: {record.change_request_reason}
                                    </div>
                                )}
                            </div>
                        )}

                        {record.status === "NEW" &&
                            record.change_request_reason &&
                            record.change_request_reason.startsWith("❌") && (
                                <div
                                    style={{
                                        marginTop: 6,
                                        padding: "4px 8px",
                                        borderRadius: 6,
                                        background: "#fef2f2",
                                        border: "1px solid #fca5a5",
                                        color: "#b91c1c",
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                    }}
                                >
                                    {record.change_request_reason} (Chờ{" "}
                                    {record.assignee?.name || "nhân sự"} tiếp nhận)
                                </div>
                            )}
                    </div>
                );
            },
        },
        {
            title: "Ưu tiên",
            dataIndex: "priority",
            key: "priority",
            width: 110,
            align: "center",
            render: (priority: WorkTaskPriority) => {
                const cfg =
                    TASK_PRIORITY_CONFIG[priority] || TASK_PRIORITY_CONFIG.NORMAL;
                return (
                    <span
                        style={{
                            display: "inline-block",
                            padding: "2px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 600,
                            color: cfg.color,
                            background: cfg.bg,
                            border: `1px solid ${cfg.border}`,
                        }}
                    >
                        {cfg.label}
                    </span>
                );
            },
        },
        {
            title: "Trạng thái & Tiến độ",
            key: "status",
            width: 175,
            render: (_: unknown, record: IWorkTask) => {
                const cfg =
                    TASK_STATUS_CONFIG[record.status] || TASK_STATUS_CONFIG.NEW;
                return (
                    <div>
                        <span
                            style={{
                                display: "inline-block",
                                padding: "2px 10px",
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 700,
                                color: cfg.color,
                                background: cfg.bg,
                                border: `1px solid ${cfg.border}`,
                                marginBottom: 4,
                            }}
                        >
                            ● {cfg.label}
                        </span>
                        <Progress
                            percent={record.progress}
                            size="small"
                            strokeColor={
                                record.status === "COMPLETED" ? "#16a34a" : "#2563eb"
                            }
                        />
                    </div>
                );
            },
        },
        {
            title: "Người giao → Người thực hiện",
            key: "people",
            width: 220,
            render: (_: unknown, record: IWorkTask) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Avatar
                            size={22}
                            src={getBackendImageUrl(record.assignee?.avatar)}
                            icon={<UserOutlined />}
                            style={{ backgroundColor: "#059669" }}
                        />
                        <div>
                            <div
                                style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: "#0f172a",
                                    lineHeight: 1.2,
                                }}
                            >
                                {record.assignee?.name || "—"}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                                Giao bởi: {record.assigner?.name || "—"}
                            </div>
                        </div>
                    </div>
                    {record.department && (
                        <Tag style={{ width: "fit-content", margin: 0, fontSize: 11 }}>
                            {record.department.name}
                        </Tag>
                    )}
                </div>
            ),
        },
        {
            title: "Hạn hoàn thành",
            key: "deadline",
            width: 165,
            render: (_: unknown, record: IWorkTask) => {
                const meta = getDeadlineMeta(record);
                return (
                    <div>
                        <div
                            style={{
                                fontSize: 12.5,
                                fontWeight: 600,
                                color: "#1e293b",
                            }}
                        >
                            <ClockCircleOutlined style={{ marginRight: 4 }} />
                            {dayjs(record.deadline).format("DD/MM/YYYY HH:mm")}
                        </div>
                        <span
                            style={{
                                display: "inline-block",
                                marginTop: 3,
                                padding: "1px 8px",
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 700,
                                color: meta.color,
                                background: meta.bg,
                            }}
                        >
                            {meta.text}
                        </span>
                    </div>
                );
            },
        },
        {
            title: "KPI",
            key: "kpi",
            width: 105,
            align: "center",
            render: (_: unknown, record: IWorkTask) => (
                <div>
                    <div style={{ fontSize: 12, color: "#475569" }}>
                        Hệ số: <strong>{record.kpi_weight}</strong>
                    </div>
                    {record.kpi_score !== null && record.kpi_score !== undefined && (
                        <Tag
                            color="green"
                            icon={<TrophyOutlined />}
                            style={{ marginTop: 2, marginInlineEnd: 0 }}
                        >
                            {record.kpi_score} đ
                        </Tag>
                    )}
                </div>
            ),
        },
        {
            title: "Thao tác",
            key: "action",
            width: 120,
            fixed: "right",
            align: "center",
            render: (_: unknown, record: IWorkTask) => (
                <Button
                    type="primary"
                    ghost
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => handleOpenDetail(record.id)}
                >
                    Xử lý
                </Button>
            ),
        },
    ];

    // ─────────────────────────── KANBAN COLUMNS ───────────────────────────
    const kanbanColumns: {
        key: string;
        title: string;
        statuses: WorkTaskStatus[];
        headerBg: string;
        headerColor: string;
        borderColor: string;
    }[] = [
        {
            key: "COL_NEW",
            title: "Mới giao / Đề nghị điều chỉnh",
            statuses: ["NEW", "CHANGE_REQUESTED"],
            headerBg: "#eff6ff",
            headerColor: "#1d4ed8",
            borderColor: "#bfdbfe",
        },
        {
            key: "COL_PROGRESS",
            title: "Đang thực hiện / Làm lại",
            statuses: ["IN_PROGRESS", "REJECTED"],
            headerBg: "#f0f9ff",
            headerColor: "#0369a1",
            borderColor: "#bae6fd",
        },
        {
            key: "COL_REVIEW",
            title: "Chờ nghiệm thu",
            statuses: ["PENDING_REVIEW"],
            headerBg: "#f5f3ff",
            headerColor: "#6d28d9",
            borderColor: "#ddd6fe",
        },
        {
            key: "COL_DONE",
            title: "Đã hoàn thành",
            statuses: ["COMPLETED"],
            headerBg: "#f0fdf4",
            headerColor: "#15803d",
            borderColor: "#bbf7d0",
        },
    ];

    const activeFilterCount = [
        projectFilter,
        deptFilter,
        deviceGroupFilter,
        typeFilter,
        priorityFilter,
        statusFilter,
    ].filter(Boolean).length;

    const handleResetTaskFilters = () => {
        setProjectFilter(undefined);
        setDeptFilter(undefined);
        setDeviceGroupFilter(undefined);
        setTypeFilter(undefined);
        setPriorityFilter(undefined);
        setStatusFilter(undefined);
        setSearchText("");
    };

    return (
        <div style={{ padding: isMobile ? "8px 4px" : "16px 20px" }}>
            {/* ─────────────── PAGE HEADER ─────────────── */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: isMobile ? 8 : 12,
                    marginBottom: isMobile ? 10 : 16,
                }}
            >
                <div style={{ minWidth: 0, flex: 1 }}>
                    <h2
                        style={{
                            margin: 0,
                            fontSize: isMobile ? 17 : 22,
                            fontWeight: 700,
                            color: "#0f172a",
                        }}
                    >
                        {headerTitle}
                    </h2>
                    <div
                        style={{
                            fontSize: 12.5,
                            color: "#64748b",
                            marginTop: 2,
                            display: "flex",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 6,
                        }}
                    >
                        {!isMobile && <span>{headerSubtitle}</span>}
                        {activeMode === "tasks" && assignmentContext && (
                            <Tag color="blue" style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>
                                {assignmentContext.hierarchyLabel}
                            </Tag>
                        )}
                        {activeMode === "tasks" &&
                            assignmentContext &&
                            assignmentContext.myDeviceGroups.map((dg) => (
                                <Tag key={dg.id} color="cyan" style={{ margin: 0, fontSize: 11 }}>
                                    ⚙ Nhóm TB: {dg.name}
                                </Tag>
                            ))}
                    </div>
                </div>

                <Space wrap size={isMobile ? 6 : 8}>
                    {activeMode === "tasks" && (
                        <Button
                            size={isMobile ? "small" : "middle"}
                            icon={<FolderOpenOutlined />}
                            onClick={() => setProjectModalOpen(true)}
                        >
                            {isMobile ? `Dự án (${projects.length})` : `Dự án / Chiến dịch (${projects.length})`}
                        </Button>
                    )}
                    <Button
                        size={isMobile ? "small" : "middle"}
                        icon={<ReloadOutlined />}
                        onClick={() => fetchTaskList(false)}
                        loading={loading}
                    >
                        {!isMobile && "Làm mới"}
                    </Button>
                    {assignmentContext?.canCreateTask !== false && (
                        <Button
                            type="primary"
                            size={isMobile ? "middle" : "large"}
                            icon={<PlusOutlined />}
                            onClick={handleOpenCreateTask}
                            style={{
                                background:
                                    "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                                fontWeight: 600,
                                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.28)",
                            }}
                        >
                            Giao việc mới
                        </Button>
                    )}
                </Space>
            </div>

            {/* ─────────────── INTERACTIVE KPI CARDS & FILTERS (CHỈ HIỂN THỊ Ở CHẾ ĐỘ TASKS) ─────────────── */}
            {activeMode === "tasks" && (
            <>
            <div
                style={
                    isMobile
                        ? {
                              display: "flex",
                              overflowX: "auto",
                              gap: 8,
                              paddingBottom: 4,
                              marginBottom: 10,
                          }
                        : {
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
                              gap: 12,
                              marginBottom: 16,
                          }
                }
            >
                {kpiCards.map((card) => (
                    <div
                        key={card.key}
                        onClick={card.onClick}
                        style={{
                            minWidth: isMobile ? 116 : undefined,
                            flexShrink: 0,
                            background: card.active ? card.bg : "#ffffff",
                            border: card.active
                                ? `2px solid ${card.color}`
                                : "1px solid #e2e8f0",
                            borderRadius: isMobile ? 10 : 12,
                            padding: isMobile ? "8px 10px" : "12px 14px",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            boxShadow: card.active
                                ? `0 4px 12px ${card.border}`
                                : "0 1px 3px rgba(15, 23, 42, 0.04)",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: isMobile ? 2 : 6,
                                gap: 4,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: isMobile ? 11 : 12.5,
                                    fontWeight: 600,
                                    color: "#475569",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {card.title}
                            </span>
                            <span
                                style={{
                                    width: isMobile ? 22 : 28,
                                    height: isMobile ? 22 : 28,
                                    borderRadius: 6,
                                    background: card.bg,
                                    color: card.color,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: isMobile ? 12 : 14,
                                }}
                            >
                                {card.icon}
                            </span>
                        </div>
                        <div
                            style={{
                                fontSize: isMobile ? 18 : 22,
                                fontWeight: 800,
                                color: card.color,
                                lineHeight: 1.1,
                            }}
                        >
                            {card.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* ─────────────── FILTER & VIEW TOOLBAR ─────────────── */}
            <Card
                size="small"
                style={{
                    borderRadius: 12,
                    marginBottom: isMobile ? 10 : 16,
                    border: "1px solid #e2e8f0",
                }}
                styles={{ body: { padding: isMobile ? 10 : 12 } }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 8,
                        marginBottom: 10,
                        paddingBottom: 8,
                        borderBottom: "1px solid #f1f5f9",
                    }}
                >
                    <div style={{ overflowX: "auto", maxWidth: "100%" }}>
                        <Segmented
                            size={isMobile ? "small" : "middle"}
                            value={viewMode}
                            onChange={(val) =>
                                setViewMode(
                                    val as
                                        | "ALL"
                                        | "MY_ASSIGNED"
                                        | "MY_CREATED"
                                        | "COLLABORATING"
                                        | "PENDING_MY_REVIEW"
                                )
                            }
                            options={[
                                { label: isMobile ? "Tất cả" : "Tất cả trong phạm vi", value: "ALL" },
                                {
                                    label: `Tôi nhận (${stats.myAssigned})`,
                                    value: "MY_ASSIGNED",
                                },
                                {
                                    label: `Tôi giao (${stats.myCreated})`,
                                    value: "MY_CREATED",
                                },
                                {
                                    label: isMobile ? "Phối hợp" : "Việc tôi phối hợp / theo dõi",
                                    value: "COLLABORATING",
                                },
                                {
                                    label: (
                                        <Badge
                                            count={stats.waitingMyReview}
                                            size="small"
                                            offset={[6, -2]}
                                        >
                                            <span>{isMobile ? "Chờ duyệt" : "Chờ tôi nghiệm thu"}</span>
                                        </Badge>
                                    ),
                                    value: "PENDING_MY_REVIEW",
                                },
                            ]}
                        />
                    </div>

                    {!isMobile && (
                        <Segmented
                            value={displayMode}
                            onChange={(val) => setDisplayMode(val as "TABLE" | "KANBAN")}
                            options={[
                                {
                                    label: "Danh sách",
                                    value: "TABLE",
                                    icon: <TableOutlined />,
                                },
                                {
                                    label: "Bảng Kanban",
                                    value: "KANBAN",
                                    icon: <AppstoreOutlined />,
                                },
                            ]}
                        />
                    )}
                </div>

                {isMobile ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Input
                            allowClear
                            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                            placeholder="Tìm mã CV, tên việc..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <Badge count={activeFilterCount} size="small">
                            <Button
                                icon={<FilterOutlined />}
                                onClick={() => setFilterDrawerOpen(true)}
                            >
                                Lọc
                            </Button>
                        </Badge>
                        <Segmented
                            value={displayMode}
                            onChange={(val) => setDisplayMode(val as "TABLE" | "KANBAN")}
                            options={[
                                { value: "TABLE", icon: <TableOutlined /> },
                                { value: "KANBAN", icon: <AppstoreOutlined /> },
                            ]}
                        />
                    </div>
                ) : (
                    <Row gutter={[10, 10]}>
                        <Col xs={24} sm={8} md={5}>
                            <Input
                                allowClear
                                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                                placeholder="Tìm theo mã CV, tên công việc..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                        </Col>

                        <Col xs={12} sm={8} md={4}>
                            <Select
                                allowClear
                                style={{ width: "100%" }}
                                placeholder="Dự án / Chiến dịch"
                                value={projectFilter}
                                onChange={(val) => setProjectFilter(val)}
                                options={projects.map((p) => ({
                                    value: p.id,
                                    label: p.name,
                                }))}
                            />
                        </Col>

                        <Col xs={12} sm={8} md={4}>
                            <Select
                                allowClear
                                style={{ width: "100%" }}
                                placeholder="Đơn vị / Phòng ban"
                                value={deptFilter}
                                onChange={(val) => setDeptFilter(val)}
                                options={departments.map((d) => ({
                                    value: d.dept_id,
                                    label: d.name,
                                }))}
                            />
                        </Col>

                        <Col xs={12} sm={8} md={4}>
                            <Select
                                allowClear
                                style={{ width: "100%" }}
                                placeholder="Nhóm trang thiết bị"
                                value={deviceGroupFilter}
                                onChange={(val) => setDeviceGroupFilter(val)}
                                options={(assignmentContext?.allDeviceGroups || []).map(
                                    (dg) => ({
                                        value: dg.id,
                                        label: `⚙ ${dg.name}`,
                                    })
                                )}
                            />
                        </Col>

                        <Col xs={12} sm={8} md={2}>
                            <Select
                                allowClear
                                style={{ width: "100%" }}
                                placeholder="Phân loại"
                                value={typeFilter}
                                onChange={(val) => setTypeFilter(val)}
                                options={Object.entries(TASK_TYPE_CONFIG).map(
                                    ([k, v]) => ({
                                        value: k as WorkTaskType,
                                        label: v.label,
                                    })
                                )}
                            />
                        </Col>

                        <Col xs={12} sm={8} md={2}>
                            <Select
                                allowClear
                                style={{ width: "100%" }}
                                placeholder="Mức ưu tiên"
                                value={priorityFilter}
                                onChange={(val) => setPriorityFilter(val)}
                                options={Object.entries(TASK_PRIORITY_CONFIG).map(
                                    ([k, v]) => ({
                                        value: k,
                                        label: v.label,
                                    })
                                )}
                            />
                        </Col>

                        <Col xs={12} sm={8} md={3}>
                            <Select
                                allowClear
                                style={{ width: "100%" }}
                                placeholder="Trạng thái"
                                value={statusFilter}
                                onChange={(val) => setStatusFilter(val)}
                                options={Object.entries(TASK_STATUS_CONFIG).map(
                                    ([k, v]) => ({
                                        value: k,
                                        label: v.label,
                                    })
                                )}
                            />
                        </Col>
                    </Row>
                )}
            </Card>

            {/* Mobile Filter Bottom Drawer */}
            <Drawer
                title="Bộ lọc công việc"
                placement="bottom"
                height="auto"
                open={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                extra={
                    <Button size="small" type="link" onClick={handleResetTaskFilters}>
                        Xóa bộ lọc
                    </Button>
                }
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 12 }}>
                    <Select
                        allowClear
                        style={{ width: "100%" }}
                        placeholder="Dự án / Chiến dịch"
                        value={projectFilter}
                        onChange={(val) => setProjectFilter(val)}
                        options={projects.map((p) => ({ value: p.id, label: p.name }))}
                    />
                    <Select
                        allowClear
                        style={{ width: "100%" }}
                        placeholder="Đơn vị / Phòng ban"
                        value={deptFilter}
                        onChange={(val) => setDeptFilter(val)}
                        options={departments.map((d) => ({ value: d.dept_id, label: d.name }))}
                    />
                    <Select
                        allowClear
                        style={{ width: "100%" }}
                        placeholder="Nhóm trang thiết bị"
                        value={deviceGroupFilter}
                        onChange={(val) => setDeviceGroupFilter(val)}
                        options={(assignmentContext?.allDeviceGroups || []).map((dg) => ({
                            value: dg.id,
                            label: `⚙ ${dg.name}`,
                        }))}
                    />
                    <Row gutter={10}>
                        <Col span={12}>
                            <Select
                                allowClear
                                style={{ width: "100%" }}
                                placeholder="Phân loại"
                                value={typeFilter}
                                onChange={(val) => setTypeFilter(val)}
                                options={Object.entries(TASK_TYPE_CONFIG).map(([k, v]) => ({
                                    value: k as WorkTaskType,
                                    label: v.label,
                                }))}
                            />
                        </Col>
                        <Col span={12}>
                            <Select
                                allowClear
                                style={{ width: "100%" }}
                                placeholder="Mức ưu tiên"
                                value={priorityFilter}
                                onChange={(val) => setPriorityFilter(val)}
                                options={Object.entries(TASK_PRIORITY_CONFIG).map(([k, v]) => ({
                                    value: k,
                                    label: v.label,
                                }))}
                            />
                        </Col>
                    </Row>
                    <Select
                        allowClear
                        style={{ width: "100%" }}
                        placeholder="Trạng thái"
                        value={statusFilter}
                        onChange={(val) => setStatusFilter(val)}
                        options={Object.entries(TASK_STATUS_CONFIG).map(([k, v]) => ({
                            value: k,
                            label: v.label,
                        }))}
                    />
                    <Button
                        type="primary"
                        block
                        onClick={() => setFilterDrawerOpen(false)}
                        style={{ marginTop: 4, borderRadius: 8 }}
                    >
                        Áp dụng ({tasks.length} kết quả)
                    </Button>
                </div>
            </Drawer>
            </>
            )}

            {/* ─────────────── CONTENT: TABLE / KANBAN / CALENDAR / DASHBOARD / KPI ─────────────── */}
            {activeMode === "kpi" ? (
                <KpiEvaluationView
                    departments={departments}
                    onOpenDetail={handleOpenDetail}
                />
            ) : activeMode === "dashboard" ? (
                <ExecutiveDashboardView
                    departments={departments}
                    projects={projects}
                    onOpenDetail={handleOpenDetail}
                    onRefreshTasks={() => fetchTaskList(true)}
                />
            ) : activeMode === "calendar" ? (
                <TaskCalendarView
                    tasks={tasks}
                    onOpenDetail={handleOpenDetail}
                />
            ) : displayMode === "TABLE" ? (
                isMobile ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {tasks.length === 0 ? (
                            <Card style={{ borderRadius: 12, textAlign: "center" }}>
                                <Empty description="Không có công việc nào phù hợp" />
                            </Card>
                        ) : (
                            tasks.map((record) => {
                                const sCfg =
                                    TASK_STATUS_CONFIG[record.status] || TASK_STATUS_CONFIG.NEW;
                                const pCfg =
                                    TASK_PRIORITY_CONFIG[record.priority] ||
                                    TASK_PRIORITY_CONFIG.NORMAL;
                                const dMeta = getDeadlineMeta(record);
                                const subCount = (record.subtasks || []).length;

                                return (
                                    <div
                                        key={record.id}
                                        onClick={() => handleOpenDetail(record.id)}
                                        style={{
                                            background: "#ffffff",
                                            borderRadius: 12,
                                            padding: "12px 14px",
                                            border: "1px solid #e2e8f0",
                                            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                marginBottom: 6,
                                                gap: 6,
                                            }}
                                        >
                                            <Space size={4} wrap>
                                                <Tag
                                                    color={record.parent_id ? "purple" : "blue"}
                                                    style={{ margin: 0, fontWeight: 700 }}
                                                >
                                                    {record.code}
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
                                            </Space>
                                            <span
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color: pCfg.color,
                                                    background: pCfg.bg,
                                                    padding: "1px 8px",
                                                    borderRadius: 999,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {pCfg.label}
                                            </span>
                                        </div>

                                        <div
                                            style={{
                                                fontWeight: 600,
                                                fontSize: 14,
                                                color: "#0f172a",
                                                marginBottom: 6,
                                                lineHeight: 1.35,
                                            }}
                                        >
                                            {record.title}
                                        </div>

                                        {subCount > 0 && (
                                            <div style={{ fontSize: 11.5, color: "#7c3aed", marginBottom: 6 }}>
                                                <BranchesOutlined /> {subCount} việc con
                                            </div>
                                        )}

                                        <Progress
                                            percent={record.progress}
                                            size="small"
                                            strokeColor={
                                                record.status === "COMPLETED" ? "#16a34a" : "#2563eb"
                                            }
                                        />

                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                marginTop: 8,
                                                paddingTop: 8,
                                                borderTop: "1px solid #f1f5f9",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <Avatar
                                                    size={22}
                                                    src={getBackendImageUrl(record.assignee?.avatar)}
                                                    icon={<UserOutlined />}
                                                    style={{ backgroundColor: "#059669" }}
                                                />
                                                <div>
                                                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>
                                                        {record.assignee?.name || "—"}
                                                    </div>
                                                    {record.department && (
                                                        <div style={{ fontSize: 11, color: "#64748b" }}>
                                                            {record.department.name}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ textAlign: "right" }}>
                                                <div style={{ fontSize: 11.5, color: "#475569" }}>
                                                    <ClockCircleOutlined />{" "}
                                                    {dayjs(record.deadline).format("HH:mm DD/MM")}
                                                </div>
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        color: dMeta.color,
                                                    }}
                                                >
                                                    {dMeta.text}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    <Card
                        size="small"
                        style={{
                            borderRadius: 12,
                            border: "1px solid #e2e8f0",
                        }}
                    >
                        <Table
                            rowKey="id"
                            loading={loading}
                            columns={columns}
                            dataSource={tasks}
                            scroll={{ x: 1200 }}
                            pagination={{
                                pageSize: 12,
                                showSizeChanger: true,
                                showTotal: (total) => `Tổng cộng ${total} công việc`,
                            }}
                        />
                    </Card>
                )
            ) : (
                <Row gutter={[14, 14]}>
                    {kanbanColumns.map((col) => {
                        const colTasks = tasks.filter((t) =>
                            col.statuses.includes(t.status)
                        );
                        return (
                            <Col xs={24} md={12} xl={6} key={col.key}>
                                <div
                                    style={{
                                        background: "#f1f5f9",
                                        borderRadius: 12,
                                        border: "1px solid #e2e8f0",
                                        display: "flex",
                                        flexDirection: "column",
                                        height: "calc(100vh - 330px)",
                                        minHeight: 480,
                                    }}
                                >
                                    <div
                                        style={{
                                            padding: "10px 14px",
                                            background: col.headerBg,
                                            borderBottom: `2px solid ${col.borderColor}`,
                                            borderTopLeftRadius: 12,
                                            borderTopRightRadius: 12,
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontWeight: 700,
                                                fontSize: 13.5,
                                                color: col.headerColor,
                                            }}
                                        >
                                            {col.title}
                                        </span>
                                        <Tag
                                            style={{
                                                margin: 0,
                                                fontWeight: 700,
                                                borderRadius: 999,
                                            }}
                                        >
                                            {colTasks.length}
                                        </Tag>
                                    </div>

                                    <div
                                        style={{
                                            padding: 10,
                                            overflowY: "auto",
                                            flex: 1,
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 10,
                                        }}
                                    >
                                        {colTasks.length === 0 ? (
                                            <Empty
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                description="Trống"
                                            />
                                        ) : (
                                            colTasks.map((t) => {
                                                const pCfg =
                                                    TASK_PRIORITY_CONFIG[t.priority] ||
                                                    TASK_PRIORITY_CONFIG.NORMAL;
                                                const sCfg =
                                                    TASK_STATUS_CONFIG[t.status] ||
                                                    TASK_STATUS_CONFIG.NEW;
                                                const dMeta = getDeadlineMeta(t);
                                                return (
                                                    <div
                                                        key={t.id}
                                                        onClick={() =>
                                                            handleOpenDetail(t.id)
                                                        }
                                                        style={{
                                                            background: "#ffffff",
                                                            borderRadius: 10,
                                                            padding: 12,
                                                            border: "1px solid #e2e8f0",
                                                            boxShadow:
                                                                "0 1px 3px rgba(15, 23, 42, 0.06)",
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                justifyContent:
                                                                    "space-between",
                                                                alignItems: "center",
                                                                marginBottom: 6,
                                                            }}
                                                        >
                                                            <Tag
                                                                color="blue"
                                                                style={{
                                                                    margin: 0,
                                                                    fontWeight: 600,
                                                                    fontSize: 11,
                                                                }}
                                                            >
                                                                {t.code}
                                                            </Tag>
                                                            <span
                                                                style={{
                                                                    fontSize: 11,
                                                                    fontWeight: 600,
                                                                    color: pCfg.color,
                                                                    background: pCfg.bg,
                                                                    padding: "1px 8px",
                                                                    borderRadius: 999,
                                                                }}
                                                            >
                                                                {pCfg.label}
                                                            </span>
                                                        </div>

                                                        <div
                                                            style={{
                                                                fontWeight: 600,
                                                                fontSize: 13.5,
                                                                color: "#0f172a",
                                                                marginBottom: 8,
                                                                lineHeight: 1.35,
                                                            }}
                                                        >
                                                            {t.title}
                                                        </div>

                                                        {t.device_group && (
                                                            <div
                                                                style={{
                                                                    marginBottom: 6,
                                                                }}
                                                            >
                                                                <Tag
                                                                    color="cyan"
                                                                    style={{
                                                                        margin: 0,
                                                                        fontSize: 11,
                                                                    }}
                                                                >
                                                                    ⚙ Nhóm TB:{" "}
                                                                    {
                                                                        t
                                                                            .device_group
                                                                            .name
                                                                    }
                                                                </Tag>
                                                            </div>
                                                        )}

                                                        <Progress
                                                            percent={t.progress}
                                                            size="small"
                                                            strokeColor={
                                                                t.status === "COMPLETED"
                                                                    ? "#16a34a"
                                                                    : "#2563eb"
                                                            }
                                                        />

                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                justifyContent:
                                                                    "space-between",
                                                                alignItems: "center",
                                                                marginTop: 8,
                                                                paddingTop: 8,
                                                                borderTop:
                                                                    "1px solid #f1f5f9",
                                                            }}
                                                        >
                                                            <Tooltip
                                                                title={`Thực hiện: ${
                                                                    t.assignee?.name ||
                                                                    "—"
                                                                }`}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display: "flex",
                                                                        alignItems:
                                                                            "center",
                                                                        gap: 6,
                                                                    }}
                                                                >
                                                                    <Avatar
                                                                        size={20}
                                                                        src={getBackendImageUrl(
                                                                            t.assignee
                                                                                ?.avatar
                                                                        )}
                                                                        icon={
                                                                            <UserOutlined />
                                                                        }
                                                                        style={{
                                                                            backgroundColor:
                                                                                "#059669",
                                                                        }}
                                                                    />
                                                                    <span
                                                                        style={{
                                                                            fontSize: 12,
                                                                            color: "#334155",
                                                                            fontWeight: 500,
                                                                        }}
                                                                    >
                                                                        {t.assignee
                                                                            ?.name ||
                                                                            "—"}
                                                                    </span>
                                                                </div>
                                                            </Tooltip>

                                                            <span
                                                                style={{
                                                                    fontSize: 11,
                                                                    fontWeight: 700,
                                                                    color: dMeta.color,
                                                                    background: dMeta.bg,
                                                                    padding: "1px 8px",
                                                                    borderRadius: 999,
                                                                }}
                                                            >
                                                                {dMeta.text}
                                                            </span>
                                                        </div>

                                                        {t.status ===
                                                            "CHANGE_REQUESTED" && (
                                                            <div
                                                                style={{
                                                                    marginTop: 6,
                                                                    padding: "4px 8px",
                                                                    borderRadius: 6,
                                                                    background: "#fffbeb",
                                                                    border: "1px solid #f59e0b",
                                                                    fontSize: 11,
                                                                    fontWeight: 600,
                                                                    color: "#b45309",
                                                                }}
                                                            >
                                                                ⏳{" "}
                                                                {t.assignee?.name ||
                                                                    "Nhân sự"}{" "}
                                                                xin gia hạn
                                                                {t.proposed_deadline
                                                                    ? ` → ${dayjs(
                                                                          t.proposed_deadline
                                                                      ).format("DD/MM HH:mm")}`
                                                                    : ""}
                                                            </div>
                                                        )}

                                                        {t.status === "NEW" &&
                                                            t.change_request_reason &&
                                                            t.change_request_reason.startsWith(
                                                                "❌"
                                                            ) && (
                                                                <div
                                                                    style={{
                                                                        marginTop: 6,
                                                                        padding: "4px 8px",
                                                                        borderRadius: 6,
                                                                        background:
                                                                            "#fef2f2",
                                                                        border: "1px solid #fca5a5",
                                                                        fontSize: 11,
                                                                        fontWeight: 600,
                                                                        color: "#b91c1c",
                                                                    }}
                                                                >
                                                                    ❌ Đã từ chối gia hạn
                                                                    (Chờ tiếp nhận)
                                                                </div>
                                                            )}

                                                        {t.status === "REJECTED" && (
                                                            <div
                                                                style={{
                                                                    marginTop: 6,
                                                                    fontSize: 11,
                                                                    fontWeight: 600,
                                                                    color: sCfg.color,
                                                                }}
                                                            >
                                                                ● {sCfg.label}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </Col>
                        );
                    })}
                </Row>
            )}

            {/* ─────────────── MODALS ─────────────── */}
            <TaskFormModal
                open={formOpen}
                onClose={() => {
                    setFormOpen(false);
                    setEditingTask(null);
                    setParentTaskForSub(null);
                }}
                onSuccess={() => {
                    fetchTaskList(true);
                }}
                editingTask={editingTask}
                parentTask={parentTaskForSub}
                projects={projects}
                departments={departments}
                users={users}
                assignmentContext={assignmentContext}
            />

            <TaskDetailModal
                open={detailOpen}
                taskId={selectedTaskId}
                currentUser={currentUser}
                canCreateTask={assignmentContext?.canCreateTask ?? true}
                onClose={() => setDetailOpen(false)}
                onUpdated={() => fetchTaskList(true)}
                onEditTask={(t) => {
                    setDetailOpen(false);
                    handleOpenEditTask(t);
                }}
                onCreateSubtask={(parent) => {
                    handleOpenCreateSubtask(parent);
                }}
                onSelectTask={(id) => setSelectedTaskId(id)}
            />

            <ProjectModal
                open={projectModalOpen}
                onClose={() => setProjectModalOpen(false)}
                projects={projects}
                departments={departments}
                users={users}
                onRefresh={() => {
                    fetchMasterData();
                    fetchTaskList(true);
                }}
            />
        </div>
    );
};

export default TasksPage;

