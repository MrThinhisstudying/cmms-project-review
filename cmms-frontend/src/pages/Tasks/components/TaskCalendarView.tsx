import React, { useState, useMemo } from "react";
import {
    Calendar,
    Card,
    Row,
    Col,
    Tag,
    Badge,
    Avatar,
    Progress,
    Empty,
    Segmented,
    Button,
    Grid,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import {
    CalendarOutlined,
    ClockCircleOutlined,
    UserOutlined,
} from "@ant-design/icons";
import { IWorkTask } from "../../../types/tasks.types";
import { getBackendImageUrl } from "../../../utils/imageUrl";
import {
    TASK_PRIORITY_CONFIG,
    TASK_STATUS_CONFIG,
    getDeadlineMeta,
    isTaskOverdue,
} from "../taskConstants";

interface TaskCalendarViewProps {
    tasks: IWorkTask[];
    onOpenDetail: (taskId: number) => void;
}

const TaskCalendarView: React.FC<TaskCalendarViewProps> = ({
    tasks,
    onOpenDetail,
}) => {
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    const [calendarScope, setCalendarScope] = useState<"DEADLINE" | "SPAN">(
        "DEADLINE"
    );

    const tasksByDeadlineDate = useMemo(() => {
        const map = new Map<string, IWorkTask[]>();
        tasks.forEach((t) => {
            if (!t.deadline) return;
            const key = dayjs(t.deadline).format("YYYY-MM-DD");
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(t);
        });
        return map;
    }, [tasks]);

    // Thống kê số lượng công việc đang triển khai trong từng ngày (start_date -> deadline)
    const activeTasksCountByDate = useMemo(() => {
        const map = new Map<string, number>();
        tasks.forEach((t) => {
            if (!t.deadline) return;
            const start = t.start_date ? dayjs(t.start_date).startOf("day") : dayjs(t.created_at).startOf("day");
            const end = dayjs(t.deadline).endOf("day");
            let curr = start;
            let safetyCount = 0;
            while ((curr.isBefore(end) || curr.isSame(end, "day")) && safetyCount < 60) {
                const key = curr.format("YYYY-MM-DD");
                map.set(key, (map.get(key) || 0) + 1);
                curr = curr.add(1, "day");
                safetyCount++;
            }
        });
        return map;
    }, [tasks]);

    const selectedDateStr = selectedDate.format("YYYY-MM-DD");

    // Tasks due exactly on selectedDate
    const dueOnSelectedDate = useMemo(() => {
        return tasksByDeadlineDate.get(selectedDateStr) || [];
    }, [tasksByDeadlineDate, selectedDateStr]);

    // Tasks active spanning across selectedDate (start_date <= selectedDate <= deadline)
    const activeSpanningSelectedDate = useMemo(() => {
        const startOfDay = selectedDate.startOf("day");
        const endOfDay = selectedDate.endOf("day");
        return tasks.filter((t) => {
            const start = t.start_date ? dayjs(t.start_date) : dayjs(t.created_at);
            const end = dayjs(t.deadline);
            return (
                (start.isBefore(endOfDay) || start.isSame(endOfDay)) &&
                (end.isAfter(startOfDay) || end.isSame(startOfDay))
            );
        });
    }, [tasks, selectedDate]);

    // Tự động chuyển tab thông minh khi người dùng click vào một ngày bất kỳ
    const handleSelectDate = (date: Dayjs) => {
        setSelectedDate(date);
        const dateStr = date.format("YYYY-MM-DD");
        const dueCount = (tasksByDeadlineDate.get(dateStr) || []).length;

        const startOfDay = date.startOf("day");
        const endOfDay = date.endOf("day");
        const spanCount = tasks.filter((t) => {
            const start = t.start_date ? dayjs(t.start_date) : dayjs(t.created_at);
            const end = dayjs(t.deadline);
            return (
                (start.isBefore(endOfDay) || start.isSame(endOfDay)) &&
                (end.isAfter(startOfDay) || end.isSame(startOfDay))
            );
        }).length;

        if (dueCount === 0 && spanCount > 0) {
            setCalendarScope("SPAN");
        } else if (dueCount > 0) {
            setCalendarScope("DEADLINE");
        }
    };

    const displayedDayTasks =
        calendarScope === "DEADLINE"
            ? dueOnSelectedDate
            : activeSpanningSelectedDate;

    const dateCellRender = (value: Dayjs) => {
        const key = value.format("YYYY-MM-DD");
        const dayTasks = tasksByDeadlineDate.get(key) || [];
        const activeCount = activeTasksCountByDate.get(key) || 0;

        if (dayTasks.length === 0 && activeCount === 0) return null;

        // Trên điện thoại (fullscreen=false): hiển thị chấm tròn chỉ báo gọn gàng dưới ngày
        if (isMobile) {
            const hasOverdue = dayTasks.some((t) => isTaskOverdue(t));
            const hasUrgent = dayTasks.some((t) => t.priority === "URGENT");
            const dotColor = hasOverdue
                ? "#dc2626"
                : hasUrgent
                ? "#d97706"
                : dayTasks.length > 0
                ? "#2563eb"
                : "#38bdf8";

            return (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 2,
                        marginTop: 2,
                    }}
                >
                    <span
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: dotColor,
                            display: "inline-block",
                        }}
                    />
                    {dayTasks.length > 1 && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: dotColor }}>
                            {dayTasks.length}
                        </span>
                    )}
                </div>
            );
        }

        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    marginTop: 2,
                }}
            >
                {/* 1. Hiển thị thẻ công việc đúng tại Ngày Hạn Chót (Deadline) */}
                {dayTasks.slice(0, 3).map((t) => {
                    const overdue = isTaskOverdue(t);
                    const isDone = t.status === "COMPLETED";
                    const pillBg = isDone
                        ? "#dcfce7"
                        : overdue
                        ? "#fee2e2"
                        : t.priority === "URGENT"
                        ? "#fef3c7"
                        : "#dbeafe";
                    const pillColor = isDone
                        ? "#15803d"
                        : overdue
                        ? "#b91c1c"
                        : t.priority === "URGENT"
                        ? "#b45309"
                        : "#1d4ed8";

                    const start = t.start_date ? dayjs(t.start_date) : dayjs(t.created_at);
                    const end = dayjs(t.deadline);
                    const spanDays = Math.max(1, end.diff(start, "day") + 1);

                    return (
                        <div
                            key={t.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelectDate(value);
                            }}
                            style={{
                                background: pillBg,
                                color: pillColor,
                                borderRadius: 4,
                                padding: "1px 6px",
                                fontSize: 11,
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                cursor: "pointer",
                                borderLeft: `3px solid ${pillColor}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 4,
                            }}
                        >
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                                {t.title}
                            </span>
                            {spanDays > 1 && (
                                <span style={{ fontSize: 9.5, opacity: 0.8, flexShrink: 0, fontWeight: 700 }}>
                                    {spanDays}d
                                </span>
                            )}
                        </div>
                    );
                })}
                {dayTasks.length > 3 && (
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSelectDate(value);
                        }}
                        style={{
                            fontSize: 10.5,
                            color: "#475569",
                            fontWeight: 600,
                            paddingLeft: 4,
                            cursor: "pointer",
                        }}
                    >
                        +{dayTasks.length - 3} hạn chót khác
                    </div>
                )}

                {/* 2. Nếu ngày này không có hạn chót nhưng có công việc đang chạy ngầm trong kỳ */}
                {dayTasks.length === 0 && activeCount > 0 && (
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSelectDate(value);
                        }}
                        style={{
                            fontSize: 10,
                            color: "#0369a1",
                            background: "#f0f9ff",
                            borderRadius: 4,
                            padding: "1px 5px",
                            fontWeight: 600,
                            border: "1px dashed #bae6fd",
                            marginTop: 2,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            cursor: "pointer",
                        }}
                    >
                        ⚡ {activeCount} việc đang làm
                    </div>
                )}
            </div>
        );
    };

    return (
        <Row gutter={[16, 16]}>
            {/* LEFT: MONTHLY CALENDAR */}
            <Col xs={24} xl={15}>
                <Card
                    size="small"
                    style={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                    }}
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
                                <CalendarOutlined style={{ color: "#2563eb" }} />
                                <span style={{ fontWeight: 700, color: "#0f172a" }}>
                                    Lịch Hạn hoàn thành & Tiến độ Công việc
                                </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
                                <Badge color="#dc2626" text="Quá hạn" />
                                <Badge color="#d97706" text="Khẩn cấp" />
                                <Badge color="#2563eb" text="Đang thực hiện" />
                                <Badge color="#16a34a" text="Hoàn thành" />
                            </div>
                        </div>
                    }
                >
                    <Calendar
                        fullscreen={!isMobile}
                        value={selectedDate}
                        onSelect={handleSelectDate}
                        cellRender={(current, info) => {
                            if (info.type === "date") return dateCellRender(current);
                            return info.originNode;
                        }}
                    />
                </Card>
            </Col>

            {/* RIGHT: SELECTED DAY AGENDA & TIMELINE */}
            <Col xs={24} xl={9}>
                <Card
                    size="small"
                    style={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        height: "100%",
                    }}
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
                            <div>
                                <div style={{ fontWeight: 700, color: "#0f172a" }}>
                                    Chi tiết ngày {selectedDate.format("DD/MM/YYYY")}
                                </div>
                                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>
                                    {dueOnSelectedDate.length} việc đến hạn •{" "}
                                    {activeSpanningSelectedDate.length} việc đang triển khai
                                </div>
                            </div>
                            <Segmented
                                size="small"
                                value={calendarScope}
                                onChange={(val) =>
                                    setCalendarScope(val as "DEADLINE" | "SPAN")
                                }
                                options={[
                                    {
                                        label: `Đến hạn (${dueOnSelectedDate.length})`,
                                        value: "DEADLINE",
                                    },
                                    {
                                        label: `Trong kỳ (${activeSpanningSelectedDate.length})`,
                                        value: "SPAN",
                                    },
                                ]}
                            />
                        </div>
                    }
                >
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                            maxHeight: 640,
                            overflowY: "auto",
                            paddingRight: 4,
                        }}
                    >
                        {displayedDayTasks.length === 0 ? (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={
                                    calendarScope === "DEADLINE" ? (
                                        <div>
                                            <div style={{ color: "#64748b" }}>
                                                Không có công việc nào chốt hạn vào ngày {selectedDate.format("DD/MM/YYYY")}
                                            </div>
                                            {activeSpanningSelectedDate.length > 0 && (
                                                <Button
                                                    size="small"
                                                    type="link"
                                                    style={{ padding: 0, marginTop: 4, fontWeight: 600 }}
                                                    onClick={() => setCalendarScope("SPAN")}
                                                >
                                                    Xem {activeSpanningSelectedDate.length} công việc đang triển khai trong ngày này →
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        `Không có công việc nào triển khai trong ngày ${selectedDate.format("DD/MM/YYYY")}`
                                    )
                                }
                            />
                        ) : (
                            displayedDayTasks.map((t) => {
                                const statusCfg =
                                    TASK_STATUS_CONFIG[t.status] || TASK_STATUS_CONFIG.NEW;
                                const priorityCfg =
                                    TASK_PRIORITY_CONFIG[t.priority] ||
                                    TASK_PRIORITY_CONFIG.NORMAL;
                                const dMeta = getDeadlineMeta(t);
                                const start = t.start_date ? dayjs(t.start_date) : dayjs(t.created_at);
                                const end = dayjs(t.deadline);
                                const spanDays = Math.max(1, end.diff(start, "day") + 1);

                                return (
                                    <div
                                        key={t.id}
                                        onClick={() => onOpenDetail(t.id)}
                                        style={{
                                            background: "#f8fafc",
                                            borderRadius: 10,
                                            padding: 12,
                                            border: "1px solid #e2e8f0",
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
                                            }}
                                        >
                                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                <Tag
                                                    color="blue"
                                                    style={{ margin: 0, fontWeight: 700 }}
                                                >
                                                    {t.code}
                                                </Tag>
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        color: statusCfg.color,
                                                        background: statusCfg.bg,
                                                        padding: "1px 8px",
                                                        borderRadius: 999,
                                                    }}
                                                >
                                                    ● {statusCfg.label}
                                                </span>
                                            </div>
                                            <span
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color: priorityCfg.color,
                                                    background: priorityCfg.bg,
                                                    padding: "1px 8px",
                                                    borderRadius: 999,
                                                }}
                                            >
                                                {priorityCfg.label}
                                            </span>
                                        </div>

                                        <div
                                            style={{
                                                fontWeight: 600,
                                                fontSize: 13.5,
                                                color: "#0f172a",
                                                marginBottom: 4,
                                            }}
                                        >
                                            {t.title}
                                        </div>

                                        {/* Kỳ hạn thực hiện rõ ràng */}
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 6,
                                                fontSize: 12,
                                                color: "#64748b",
                                                marginBottom: 8,
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            <CalendarOutlined style={{ color: "#3b82f6" }} />
                                            <span>
                                                Kỳ thực hiện: <b>{start.format("DD/MM/YYYY")}</b> → <b>{end.format("DD/MM/YYYY")}</b>
                                            </span>
                                            <Tag style={{ margin: 0, fontSize: 10.5, borderRadius: 4, lineHeight: "18px" }}>
                                                {spanDays} ngày
                                            </Tag>
                                        </div>

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
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                marginTop: 8,
                                                paddingTop: 8,
                                                borderTop: "1px solid #e2e8f0",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 6,
                                                }}
                                            >
                                                <Avatar
                                                    size={22}
                                                    src={getBackendImageUrl(
                                                        t.assignee?.avatar
                                                    )}
                                                    icon={<UserOutlined />}
                                                    style={{ backgroundColor: "#059669" }}
                                                />
                                                <div>
                                                    <div
                                                        style={{
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            color: "#1e293b",
                                                        }}
                                                    >
                                                        {t.assignee?.name || "—"}
                                                    </div>
                                                    {t.department && (
                                                        <div
                                                            style={{
                                                                fontSize: 11,
                                                                color: "#64748b",
                                                            }}
                                                        >
                                                            {t.department.name}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ textAlign: "right" }}>
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: "#475569",
                                                    }}
                                                >
                                                    <ClockCircleOutlined />{" "}
                                                    {dayjs(t.deadline).format("HH:mm DD/MM")}
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
                </Card>
            </Col>
        </Row>
    );
};

export default TaskCalendarView;
