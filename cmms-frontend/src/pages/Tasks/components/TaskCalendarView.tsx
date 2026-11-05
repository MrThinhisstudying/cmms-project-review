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

    const displayedDayTasks =
        calendarScope === "DEADLINE"
            ? dueOnSelectedDate
            : activeSpanningSelectedDate;

    const dateCellRender = (value: Dayjs) => {
        const key = value.format("YYYY-MM-DD");
        const dayTasks = tasksByDeadlineDate.get(key) || [];
        if (dayTasks.length === 0) return null;

        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    marginTop: 2,
                }}
            >
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

                    return (
                        <div
                            key={t.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenDetail(t.id);
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
                            }}
                            title={`[${t.code}] ${t.title} — Thực hiện: ${
                                t.assignee?.name || "—"
                            }`}
                        >
                            {t.title}
                        </div>
                    );
                })}
                {dayTasks.length > 3 && (
                    <div
                        style={{
                            fontSize: 11,
                            color: "#475569",
                            fontWeight: 600,
                            paddingLeft: 4,
                        }}
                    >
                        +{dayTasks.length - 3} công việc khác
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
                        value={selectedDate}
                        onSelect={(date) => setSelectedDate(date)}
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
                                    calendarScope === "DEADLINE"
                                        ? `Không có công việc nào đến hạn vào ngày ${selectedDate.format(
                                              "DD/MM/YYYY"
                                          )}`
                                        : `Không có công việc nào triển khai trong ngày ${selectedDate.format(
                                              "DD/MM/YYYY"
                                          )}`
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
                                                marginBottom: 6,
                                            }}
                                        >
                                            {t.title}
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
