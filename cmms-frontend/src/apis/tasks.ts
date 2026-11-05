import { getToken } from "../utils/auth";
import {
    ICreateProjectPayload,
    ICreateTaskPayload,
    IExecutiveDashboardData,
    IKpiEvaluationReportData,
    IReminderScanResult,
    ITaskAssignmentContext,
    ITaskAttachment,
    ITaskChecklistItem,
    ITaskComment,
    ITaskFilterParams,
    ITaskProject,
    ITaskStats,
    IUserTaskSummary,
    IWorkTask,
} from "../types/tasks.types";

const BASE_URL = process.env.REACT_APP_BASE_URL || "http://localhost:3000";

const getAuthHeaders = (isJson = true): HeadersInit => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (isJson) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
};

// ─────────────────────────── PROJECTS ───────────────────────────

export const getTaskProjects = async (params?: { status?: string; dept_id?: number }): Promise<ITaskProject[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.dept_id) query.append("dept_id", String(params.dept_id));

    const response = await fetch(`${BASE_URL}/tasks/projects?${query.toString()}`, {
        method: "GET",
        headers: getAuthHeaders(),
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || "Không thể tải danh sách dự án");
    return (res.data || []) as ITaskProject[];
};

export const createTaskProject = async (payload: ICreateProjectPayload): Promise<ITaskProject> => {
    const response = await fetch(`${BASE_URL}/tasks/projects`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || "Không thể tạo dự án");
    return res.data as ITaskProject;
};

export const updateTaskProject = async (
    id: number,
    payload: Partial<ICreateProjectPayload>
): Promise<ITaskProject> => {
    const response = await fetch(`${BASE_URL}/tasks/projects/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || "Không thể cập nhật dự án");
    return res.data as ITaskProject;
};

export const deleteTaskProject = async (id: number): Promise<void> => {
    const response = await fetch(`${BASE_URL}/tasks/projects/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });
    if (!response.ok) {
        const res = await response.json();
        throw new Error(res.message || "Không thể xóa dự án");
    }
};

// ─────────────────────────── TASKS CRUD ───────────────────────────

export const getTasks = async (
    params?: ITaskFilterParams
): Promise<{
    items: IWorkTask[];
    stats: ITaskStats;
    assignmentContext?: ITaskAssignmentContext;
}> => {
    const query = new URLSearchParams();
    if (params?.view_mode) query.append("view_mode", params.view_mode);
    if (params?.status) query.append("status", params.status);
    if (params?.priority) query.append("priority", params.priority);
    if (params?.task_type) query.append("task_type", params.task_type);
    if (params?.project_id) query.append("project_id", String(params.project_id));
    if (params?.dept_id) query.append("dept_id", String(params.dept_id));
    if (params?.device_group_id) {
        query.append("device_group_id", String(params.device_group_id));
    }
    if (params?.assignee_id) query.append("assignee_id", String(params.assignee_id));
    if (params?.assigner_id) query.append("assigner_id", String(params.assigner_id));
    if (params?.search) query.append("search", params.search);
    if (params?.include_subtasks !== undefined) {
        query.append("include_subtasks", String(params.include_subtasks));
    }

    const response = await fetch(`${BASE_URL}/tasks?${query.toString()}`, {
        method: "GET",
        headers: getAuthHeaders(),
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || "Không thể tải danh sách công việc");
    return res.data as {
        items: IWorkTask[];
        stats: ITaskStats;
        assignmentContext?: ITaskAssignmentContext;
    };
};

export const getTaskById = async (id: number): Promise<IWorkTask> => {
    const response = await fetch(`${BASE_URL}/tasks/${id}`, {
        method: "GET",
        headers: getAuthHeaders(),
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || "Không thể tải chi tiết công việc");
    return res.data as IWorkTask;
};

export const createTask = async (payload: ICreateTaskPayload): Promise<IWorkTask> => {
    const response = await fetch(`${BASE_URL}/tasks`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || "Không thể giao công việc mới");
    return res.data as IWorkTask;
};

export const updateTask = async (
    id: number,
    payload: Partial<ICreateTaskPayload> & { status?: string }
): Promise<IWorkTask> => {
    const response = await fetch(`${BASE_URL}/tasks/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || "Không thể cập nhật công việc");
    return res.data as ITaskProject & IWorkTask;
};

export const deleteTask = async (id: number): Promise<void> => {
    const response = await fetch(`${BASE_URL}/tasks/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });
    if (!response.ok) {
        const res = await response.json();
        throw new Error(res.message || "Không thể xóa công việc");
    }
};

// ─────────────────────────── 5-STEP WORKFLOW ───────────────────────────

export const respondToTask = async (
    id: number,
    payload: {
        action: "ACCEPT" | "REQUEST_CHANGE";
        proposed_deadline?: string;
        reason?: string;
    }
): Promise<IWorkTask> => {
    const response = await fetch(`${BASE_URL}/tasks/${id}/respond`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || "Không thể phản hồi công việc");
    return res.data as IWorkTask;
};

export const resolveChangeRequest = async (
    id: number,
    payload: {
        approved: boolean;
        new_deadline?: string;
        note?: string;
    }
): Promise<IWorkTask> => {
    const response = await fetch(`${BASE_URL}/tasks/${id}/resolve-change`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || "Không thể xử lý đề nghị điều chỉnh");
    return res.data as IWorkTask;
};

export const updateTaskProgress = async (
    id: number,
    payload: {
        progress?: number;
        checklist?: ITaskChecklistItem[];
        attachments?: ITaskAttachment[];
        note?: string;
    }
): Promise<IWorkTask> => {
    const response = await fetch(`${BASE_URL}/tasks/${id}/progress`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || "Không thể cập nhật tiến độ");
    return res.data as IWorkTask;
};

export const submitTaskForReview = async (
    id: number,
    payload: {
        completion_note?: string;
        evidence_files?: ITaskAttachment[];
    }
): Promise<IWorkTask> => {
    const response = await fetch(`${BASE_URL}/tasks/${id}/submit`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || "Không thể gửi báo cáo hoàn thành");
    return res.data as IWorkTask;
};

export const reviewTask = async (
    id: number,
    payload: {
        action: "APPROVE" | "REJECT";
        review_note?: string;
        kpi_score?: number;
    }
): Promise<IWorkTask> => {
    const response = await fetch(`${BASE_URL}/tasks/${id}/review`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || "Không thể nghiệm thu công việc");
    return res.data as IWorkTask;
};

export const addTaskComment = async (
    id: number,
    payload: {
        content: string;
        attachments?: { name: string; url: string }[];
    }
): Promise<ITaskComment> => {
    const response = await fetch(`${BASE_URL}/tasks/${id}/comments`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || "Không thể gửi bình luận");
    return res.data as ITaskComment;
};

export const uploadTaskFile = async (
    file: File
): Promise<{ url: string; name: string; size: number }> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${BASE_URL}/tasks/upload`, {
        method: "POST",
        headers: getAuthHeaders(false),
        body: formData,
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || "Tải tệp đính kèm thất bại");
    return res.data as { url: string; name: string; size: number };
};

// ─────────────────────────── PHASE 2: EXECUTIVE DASHBOARD & REMINDERS ───────────────────────────

export const getExecutiveDashboard = async (params?: {
    dept_id?: number;
    project_id?: number;
    month?: string;
}): Promise<IExecutiveDashboardData> => {
    const query = new URLSearchParams();
    if (params?.dept_id) query.append("dept_id", String(params.dept_id));
    if (params?.project_id) query.append("project_id", String(params.project_id));
    if (params?.month) query.append("month", params.month);

    const response = await fetch(
        `${BASE_URL}/tasks/executive-dashboard?${query.toString()}`,
        {
            method: "GET",
            headers: getAuthHeaders(),
        }
    );
    const res = await response.json();
    if (!response.ok)
        throw new Error(res.message || "Không thể tải dữ liệu Dashboard Lãnh đạo");
    return res.data as IExecutiveDashboardData;
};

export const runTaskReminders = async (): Promise<{
    message: string;
    data: IReminderScanResult;
}> => {
    const response = await fetch(`${BASE_URL}/tasks/reminders/run`, {
        method: "POST",
        headers: getAuthHeaders(),
    });
    const res = await response.json();
    if (!response.ok)
        throw new Error(res.message || "Không thể kích hoạt quét nhắc việc");
    return res as { message: string; data: IReminderScanResult };
};

export const nudgeTask = async (
    id: number,
    note?: string
): Promise<{ message: string; data: IWorkTask }> => {
    const response = await fetch(`${BASE_URL}/tasks/${id}/nudge`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ note }),
    });
    const res = await response.json();
    if (!response.ok)
        throw new Error(res.message || "Không thể gửi thông báo đôn đốc");
    return res as { message: string; data: IWorkTask };
};

// ─────────────────────────── PHASE 3: KPI EVALUATION & 360 USER SUMMARY ───────────────────────────

export const getKpiEvaluationReport = async (params?: {
    period_type?: "MONTH" | "QUARTER" | "YEAR" | "ALL";
    period_value?: string;
    dept_id?: number;
}): Promise<IKpiEvaluationReportData> => {
    const query = new URLSearchParams();
    if (params?.period_type) query.append("period_type", params.period_type);
    if (params?.period_value) query.append("period_value", params.period_value);
    if (params?.dept_id) query.append("dept_id", String(params.dept_id));

    const response = await fetch(
        `${BASE_URL}/tasks/kpi-report?${query.toString()}`,
        {
            method: "GET",
            headers: getAuthHeaders(),
        }
    );
    const res = await response.json();
    if (!response.ok)
        throw new Error(res.message || "Không thể tải báo cáo đánh giá KPI");
    return res.data as IKpiEvaluationReportData;
};

export const getUserTaskSummary = async (
    userId: number
): Promise<IUserTaskSummary> => {
    const response = await fetch(`${BASE_URL}/tasks/user-summary/${userId}`, {
        method: "GET",
        headers: getAuthHeaders(),
    });
    const res = await response.json();
    if (!response.ok)
        throw new Error(
            res.message || "Không thể tải tổng hợp KPI công việc nhân sự"
        );
    return res.data as IUserTaskSummary;
};
