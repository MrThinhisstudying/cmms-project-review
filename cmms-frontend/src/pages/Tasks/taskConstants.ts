import dayjs from "dayjs";
import {
    IWorkTask,
    TaskProjectStatus,
    WorkTaskPriority,
    WorkTaskStatus,
    WorkTaskType,
} from "../../types/tasks.types";

export const TASK_TYPE_CONFIG: Record<
    WorkTaskType,
    { label: string; color: string; bg: string; border: string }
> = {
    PROJECT: {
        label: "Theo dự án / Chiến dịch",
        color: "#2563eb",
        bg: "#eff6ff",
        border: "#bfdbfe",
    },
    RECURRING: {
        label: "Công việc thường xuyên",
        color: "#0891b2",
        bg: "#ecfeff",
        border: "#a5f3fc",
    },
    DIRECTIVE: {
        label: "Chỉ đạo / Phát sinh",
        color: "#7c3aed",
        bg: "#f5f3ff",
        border: "#ddd6fe",
    },
};

export const TASK_PRIORITY_CONFIG: Record<
    WorkTaskPriority,
    { label: string; color: string; bg: string; border: string; tagColor: string }
> = {
    LOW: {
        label: "Thấp",
        color: "#64748b",
        bg: "#f8fafc",
        border: "#e2e8f0",
        tagColor: "default",
    },
    NORMAL: {
        label: "Bình thường",
        color: "#2563eb",
        bg: "#eff6ff",
        border: "#bfdbfe",
        tagColor: "blue",
    },
    HIGH: {
        label: "Cao",
        color: "#d97706",
        bg: "#fffbeb",
        border: "#fde68a",
        tagColor: "orange",
    },
    URGENT: {
        label: "Khẩn cấp",
        color: "#dc2626",
        bg: "#fef2f2",
        border: "#fecaca",
        tagColor: "red",
    },
};

export const TASK_STATUS_CONFIG: Record<
    WorkTaskStatus,
    { label: string; color: string; bg: string; border: string; stepIndex: number }
> = {
    NEW: {
        label: "Mới giao",
        color: "#2563eb",
        bg: "#eff6ff",
        border: "#bfdbfe",
        stepIndex: 0,
    },
    CHANGE_REQUESTED: {
        label: "Đề nghị điều chỉnh",
        color: "#d97706",
        bg: "#fffbeb",
        border: "#fde68a",
        stepIndex: 1,
    },
    IN_PROGRESS: {
        label: "Đang thực hiện",
        color: "#0284c7",
        bg: "#f0f9ff",
        border: "#bae6fd",
        stepIndex: 2,
    },
    PENDING_REVIEW: {
        label: "Chờ nghiệm thu",
        color: "#7c3aed",
        bg: "#f5f3ff",
        border: "#ddd6fe",
        stepIndex: 3,
    },
    COMPLETED: {
        label: "Đã hoàn thành",
        color: "#16a34a",
        bg: "#f0fdf4",
        border: "#bbf7d0",
        stepIndex: 4,
    },
    REJECTED: {
        label: "Yêu cầu làm lại",
        color: "#dc2626",
        bg: "#fef2f2",
        border: "#fecaca",
        stepIndex: 2,
    },
    CANCELLED: {
        label: "Đã hủy",
        color: "#64748b",
        bg: "#f1f5f9",
        border: "#cbd5e1",
        stepIndex: 0,
    },
};

export const PROJECT_STATUS_CONFIG: Record<
    TaskProjectStatus,
    { label: string; color: string }
> = {
    PLANNING: { label: "Đang lập kế hoạch", color: "blue" },
    ACTIVE: { label: "Đang triển khai", color: "green" },
    ON_HOLD: { label: "Tạm dừng", color: "orange" },
    COMPLETED: { label: "Đã kết thúc", color: "default" },
};

export const isTaskOverdue = (task: IWorkTask): boolean => {
    if (!task.deadline) return false;
    if (task.status === "COMPLETED" || task.status === "CANCELLED") return false;
    return dayjs(task.deadline).isBefore(dayjs());
};

export const getDeadlineMeta = (
    task: IWorkTask
): { text: string; color: string; bg: string; isOverdue: boolean } => {
    if (!task.deadline) {
        return { text: "Chưa đặt hạn", color: "#64748b", bg: "#f1f5f9", isOverdue: false };
    }

    const deadline = dayjs(task.deadline);
    const now = dayjs();

    if (task.status === "COMPLETED") {
        const completedAt = task.completed_at ? dayjs(task.completed_at) : now;
        const onTime = !completedAt.isAfter(deadline);
        return {
            text: onTime ? "Hoàn thành đúng hạn" : "Hoàn thành trễ hạn",
            color: onTime ? "#15803d" : "#b45309",
            bg: onTime ? "#dcfce7" : "#fef3c7",
            isOverdue: false,
        };
    }

    if (task.status === "CANCELLED") {
        return { text: "Đã hủy", color: "#64748b", bg: "#f1f5f9", isOverdue: false };
    }

    const diffHours = deadline.diff(now, "hour");
    const diffDays = deadline.diff(now, "day");

    if (diffHours < 0) {
        const overdueDays = Math.abs(diffDays);
        const overdueHours = Math.abs(diffHours);
        return {
            text: overdueDays >= 1 ? `Quá hạn ${overdueDays} ngày` : `Quá hạn ${overdueHours} giờ`,
            color: "#dc2626",
            bg: "#fef2f2",
            isOverdue: true,
        };
    }

    if (diffHours <= 24) {
        return {
            text: `Còn ${Math.max(1, diffHours)} giờ`,
            color: "#d97706",
            bg: "#fffbeb",
            isOverdue: false,
        };
    }

    return {
        text: `Còn ${diffDays} ngày`,
        color: "#0f766e",
        bg: "#f0fdfa",
        isOverdue: false,
    };
};

