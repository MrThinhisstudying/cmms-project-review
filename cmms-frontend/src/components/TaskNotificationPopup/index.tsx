import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Tag, Button } from "antd";
import {
    CloseOutlined,
    RocketOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    AuditOutlined,
    TrophyOutlined,
    MessageOutlined,
    BellOutlined,
    EyeOutlined,
} from "@ant-design/icons";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import { useSocket } from "../../hooks/useSocket";
import TaskDetailModal from "../../pages/Tasks/components/TaskDetailModal";

export interface ITaskRealtimeAlert {
    id: string;
    message: string;
    title?: string;
    taskId?: number;
    taskCode?: string;
    actionType?: string;
    timestamp?: string;
    remaining: number; // in seconds
}

// Gentle audio ding tone using Web Audio API
const playDingTone = () => {
    try {
        const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.45);
    } catch {
        // Ignore audio playback restrictions if blocked by browser
    }
};

const getAlertConfig = (actionType?: string) => {
    switch (actionType) {
        case "NEW_TASK":
            return {
                title: "Giao việc mới",
                badge: "📋 Công việc mới được giao",
                icon: <RocketOutlined style={{ color: "#2563eb", fontSize: 20 }} />,
                bg: "#eff6ff",
                border: "#bfdbfe",
                primaryColor: "#2563eb",
            };
        case "TASK_DISPATCHED":
            return {
                title: "Giao việc thành công",
                badge: "📤 Đã phân công công việc",
                icon: <RocketOutlined style={{ color: "#059669", fontSize: 20 }} />,
                bg: "#ecfdf5",
                border: "#a7f3d0",
                primaryColor: "#059669",
            };
        case "TASK_ACCEPTED":
            return {
                title: "Tiếp nhận công việc",
                badge: "✅ Đã xác nhận tiếp nhận",
                icon: <CheckCircleOutlined style={{ color: "#16a34a", fontSize: 20 }} />,
                bg: "#f0fdf4",
                border: "#bbf7d0",
                primaryColor: "#16a34a",
            };
        case "SUBMIT_FOR_REVIEW":
            return {
                title: "Báo cáo hoàn thành",
                badge: "🚀 Báo cáo hoàn thành (Chờ duyệt)",
                icon: <AuditOutlined style={{ color: "#7c3aed", fontSize: 20 }} />,
                bg: "#f5f3ff",
                border: "#ddd6fe",
                primaryColor: "#7c3aed",
            };
        case "REQUEST_CHANGE":
            return {
                title: "Đề nghị gia hạn / Điều chỉnh",
                badge: "⏳ Xin gia hạn thời hạn",
                icon: <ClockCircleOutlined style={{ color: "#d97706", fontSize: 20 }} />,
                bg: "#fffbeb",
                border: "#fde68a",
                primaryColor: "#d97706",
            };
        case "TASK_APPROVED":
            return {
                title: "Nghiệm thu hoàn tất",
                badge: "🏆 Nghiệm thu & Chấm KPI",
                icon: <TrophyOutlined style={{ color: "#ca8a04", fontSize: 20 }} />,
                bg: "#fefce8",
                border: "#fef08a",
                primaryColor: "#ca8a04",
            };
        case "TASK_REJECTED":
            return {
                title: "Yêu cầu làm lại",
                badge: "🔄 Yêu cầu chỉnh sửa / Làm lại",
                icon: <ClockCircleOutlined style={{ color: "#dc2626", fontSize: 20 }} />,
                bg: "#fef2f2",
                border: "#fecaca",
                primaryColor: "#dc2626",
            };
        case "TASK_COMMENT":
            return {
                title: "Trao đổi công việc",
                badge: "💬 Nhật ký / Trao đổi mới",
                icon: <MessageOutlined style={{ color: "#0891b2", fontSize: 20 }} />,
                bg: "#ecfeff",
                border: "#a5f3fc",
                primaryColor: "#0891b2",
            };
        default:
            return {
                title: "Thông báo công việc",
                badge: "🔔 Cập nhật công việc",
                icon: <BellOutlined style={{ color: "#2563eb", fontSize: 20 }} />,
                bg: "#f8fafc",
                border: "#cbd5e1",
                primaryColor: "#2563eb",
            };
    }
};

/**
 * Helper phát sự kiện popup thông báo công việc tức thì trên trình duyệt
 */
export const emitTaskAlert = (data: {
    message?: string;
    title?: string;
    taskId?: number;
    taskCode?: string;
    actionType?: string;
    timestamp?: string;
}) => {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cmms_task_alert", { detail: data }));
    }
};

export const TaskNotificationPopup: React.FC = () => {
    const { user } = useAuthContext();
    const [alerts, setAlerts] = useState<ITaskRealtimeAlert[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    // Bộ nhớ đệm chặn trùng lặp trong vòng 3.5 giây
    const recentAlertsRef = useRef<Map<string, number>>(new Map());

    const handleDismiss = useCallback((id: string) => {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
    }, []);

    const handleOpenTaskDetail = (taskId?: number) => {
        if (!taskId) return;
        setSelectedTaskId(taskId);
        setModalOpen(true);
    };

    const addAlert = useCallback(
        (data: {
            message?: string;
            title?: string;
            taskId?: number;
            taskCode?: string;
            actionType?: string;
            timestamp?: string;
        }) => {
            const rawMessage = (data.message || "Bạn có thông báo mới về công việc").trim();
            // Khóa định danh sự kiện để loại bỏ trùng lặp (nhiều nguồn WebSocket / Local)
            const dedupeKey = `${data.taskId || ""}_${data.actionType || ""}_${data.taskCode || ""}_${rawMessage}`;
            const now = Date.now();
            const lastSeen = recentAlertsRef.current.get(dedupeKey);
            if (lastSeen && now - lastSeen < 3500) {
                // Đã nhận cùng một sự kiện này trong 3.5 giây gần nhất -> BỎ QUA để không bị lặp popup
                return;
            }
            recentAlertsRef.current.set(dedupeKey, now);

            // Dọn dẹp cache cũ hơn 10s
            if (recentAlertsRef.current.size > 50) {
                for (const [key, time] of recentAlertsRef.current.entries()) {
                    if (now - time > 10000) {
                        recentAlertsRef.current.delete(key);
                    }
                }
            }

            const newAlert: ITaskRealtimeAlert = {
                id: `alert_${now}_${Math.random().toString(36).slice(2, 6)}`,
                message: rawMessage,
                title: data.title,
                taskId: data.taskId,
                taskCode: data.taskCode,
                actionType: data.actionType,
                timestamp: data.timestamp || new Date().toISOString(),
                remaining: 7, // 7 seconds
            };

            playDingTone();

            setAlerts((prev) => {
                // Kiểm tra xem trong danh sách hiện tại đã có alert cùng nội dung chưa
                const isDuplicate = prev.some(
                    (a) =>
                        (data.taskId && a.taskId === data.taskId && a.actionType === data.actionType) ||
                        a.message === rawMessage
                );
                if (isDuplicate) return prev;

                // Giữ tối đa 3 popup đồng thời để tránh che khuất màn hình
                const list = [newAlert, ...prev];
                return list.slice(0, 3);
            });
        },
        []
    );

    // Lắng nghe sự kiện custom nội bộ trên window để popup hiển thị ngay lập tức khi người dùng thao tác
    useEffect(() => {
        const handleCustomAlert = (event: Event) => {
            const customEv = event as CustomEvent;
            if (customEv.detail) {
                addAlert(customEv.detail);
            }
        };
        window.addEventListener("cmms_task_alert", handleCustomAlert);
        return () => {
            window.removeEventListener("cmms_task_alert", handleCustomAlert);
        };
    }, [addAlert]);

    // Socket.io listener: CHỈ lắng nghe task_alert để tránh trùng lặp với notification quả chuông
    useSocket(user?.user_id, {
        task_alert: (data: unknown) => {
            if (data && typeof data === "object") {
                addAlert(data as Record<string, unknown>);
            }
        },
    });

    // 7-second countdown timer for each alert
    const alertsRef = useRef(alerts);
    alertsRef.current = alerts;

    useEffect(() => {
        if (alerts.length === 0) return;

        const interval = setInterval(() => {
            setAlerts((prev) => {
                const nextList: ITaskRealtimeAlert[] = [];
                prev.forEach((alert) => {
                    const newRemaining = alert.remaining - 0.2;
                    if (newRemaining > 0) {
                        nextList.push({ ...alert, remaining: newRemaining });
                    }
                });
                return nextList;
            });
        }, 200);

        return () => clearInterval(interval);
    }, [alerts.length]);

    if (alerts.length === 0 && !modalOpen) return null;

    const popupContainer =
        alerts.length > 0 ? (
            <div
                style={{
                    position: "fixed",
                    top: 24,
                    right: 24,
                    zIndex: 9999999, // Nổi cao trên mọi Modal & Backdrop (Ant Design Modal z-index: 1000)
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    pointerEvents: "none",
                    maxWidth: 420,
                    width: "calc(100vw - 48px)",
                }}
            >
                {alerts.map((alert) => {
                    const cfg = getAlertConfig(alert.actionType);
                    const progressPercent = Math.max(
                        0,
                        Math.min(100, (alert.remaining / 7) * 100)
                    );

                    return (
                        <div
                            key={alert.id}
                            style={{
                                pointerEvents: "auto",
                                background: "#ffffff",
                                borderRadius: 14,
                                border: `1.5px solid ${cfg.border}`,
                                boxShadow:
                                    "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                                overflow: "hidden",
                                transition: "all 0.3s ease",
                                animation: "slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                            }}
                        >
                            {/* Card Header */}
                            <div
                                style={{
                                    padding: "10px 14px",
                                    background: cfg.bg,
                                    borderBottom: `1px solid ${cfg.border}`,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                    }}
                                >
                                    {cfg.icon}
                                    <span
                                        style={{
                                            fontWeight: 700,
                                            fontSize: 13.5,
                                            color: "#0f172a",
                                        }}
                                    >
                                        {alert.title || cfg.title}
                                    </span>
                                    {alert.taskCode && (
                                        <Tag
                                            color="blue"
                                            style={{
                                                margin: 0,
                                                fontWeight: 700,
                                                fontSize: 11,
                                            }}
                                        >
                                            {alert.taskCode}
                                        </Tag>
                                    )}
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 11,
                                            color: "#64748b",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {Math.ceil(alert.remaining)}s
                                    </span>
                                    {/* Dấu X để chủ động tắt ngay lập tức */}
                                    <button
                                        type="button"
                                        aria-label="Đóng thông báo"
                                        onClick={() => handleDismiss(alert.id)}
                                        style={{
                                            background: "transparent",
                                            border: "none",
                                            cursor: "pointer",
                                            color: "#64748b",
                                            padding: "2px 4px",
                                            borderRadius: 4,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: 13,
                                            transition: "color 0.15s ease",
                                        }}
                                        onMouseEnter={(e) =>
                                            (e.currentTarget.style.color = "#0f172a")
                                        }
                                        onMouseLeave={(e) =>
                                            (e.currentTarget.style.color = "#64748b")
                                        }
                                    >
                                        <CloseOutlined />
                                    </button>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div style={{ padding: "12px 14px" }}>
                                <div
                                    style={{
                                        fontSize: 13,
                                        color: "#334155",
                                        lineHeight: 1.5,
                                        marginBottom: 10,
                                        fontWeight: 500,
                                    }}
                                >
                                    {alert.message}
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 11.5,
                                            color: "#94a3b8",
                                        }}
                                    >
                                        Tự động đóng sau 7 giây
                                    </span>

                                    {alert.taskId && (
                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={<EyeOutlined />}
                                            onClick={() => {
                                                handleDismiss(alert.id);
                                                handleOpenTaskDetail(alert.taskId);
                                            }}
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                borderRadius: 6,
                                                background: cfg.primaryColor,
                                                borderColor: cfg.primaryColor,
                                            }}
                                        >
                                            Xem công việc
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* 7-Second Countdown Progress Bar */}
                            <div
                                style={{
                                    height: 3,
                                    background: "#e2e8f0",
                                    width: "100%",
                                }}
                            >
                                <div
                                    style={{
                                        height: "100%",
                                        width: `${progressPercent}%`,
                                        background: cfg.primaryColor,
                                        transition: "width 0.2s linear",
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        ) : null;

    return (
        <>
            {typeof document !== "undefined" && popupContainer
                ? createPortal(popupContainer, document.body)
                : popupContainer}

            {/* In-place Task Detail Modal when clicking "Xem công việc" from anywhere */}
            <TaskDetailModal
                open={modalOpen}
                taskId={selectedTaskId}
                currentUser={user}
                onClose={() => {
                    setModalOpen(false);
                    setSelectedTaskId(null);
                }}
                onSelectTask={(id) => setSelectedTaskId(id)}
            />
        </>
    );
};

export default TaskNotificationPopup;
