import { IUser, IDepartment } from "./user.types";

export type WorkTaskType = "PROJECT" | "RECURRING" | "DIRECTIVE";
export type WorkTaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type WorkTaskStatus =
    | "NEW"
    | "CHANGE_REQUESTED"
    | "IN_PROGRESS"
    | "PENDING_REVIEW"
    | "COMPLETED"
    | "REJECTED"
    | "CANCELLED";

export type TaskProjectStatus = "PLANNING" | "ACTIVE" | "COMPLETED" | "ON_HOLD";
export type TaskCommentType = "COMMENT" | "SYSTEM_LOG";

export interface ITaskCollaborator {
    user_id: number;
    name: string;
    role: "COLLABORATOR" | "WATCHER";
    avatar?: string;
    position?: string;
}

export interface ITaskChecklistItem {
    id: string;
    title: string;
    completed: boolean;
    completed_at?: string | null;
    completed_by?: string | null;
}

export interface ITaskAttachment {
    name: string;
    url: string;
    type?: "ATTACHMENT" | "EVIDENCE";
    uploaded_at?: string;
    uploaded_by?: string;
}

export interface ITaskProject {
    id: number;
    code: string;
    name: string;
    description?: string | null;
    status: TaskProjectStatus;
    dept_id?: number | null;
    department?: IDepartment | null;
    manager_id?: number | null;
    manager?: IUser | null;
    start_date?: string | null;
    end_date?: string | null;
    created_at: string;
    updated_at: string;
}

export interface ITaskComment {
    id: number;
    task_id: number;
    user_id: number;
    user?: IUser;
    content: string;
    type: TaskCommentType;
    action_type?: string;
    attachments?: { name: string; url: string }[] | null;
    created_at: string;
}

export type TaskHierarchyTier = "DIRECTOR" | "UNIT_LEAD" | "TEAM_LEAD" | "STAFF";

export interface ITaskDeviceGroup {
    id: number;
    name: string;
    dept_id?: number | null;
    dept_name?: string | null;
    leader_id?: number | null;
    member_ids?: number[];
}

export interface ITaskAssignmentContext {
    userId: number;
    hierarchyTier: TaskHierarchyTier;
    hierarchyLabel: string;
    canCreateTask: boolean;
    assignableUserIds: number[];
    myDeptIds: number[];
    managedDeptIds: number[];
    myDeviceGroups: Array<{
        id: number;
        name: string;
        dept_id?: number | null;
        is_lead: boolean;
    }>;
    allDeviceGroups: ITaskDeviceGroup[];
}

export interface IWorkTask {
    id: number;
    code: string;
    title: string;
    description?: string | null;
    task_type: WorkTaskType;
    priority: WorkTaskPriority;
    status: WorkTaskStatus;
    progress: number;
    project_id?: number | null;
    project?: ITaskProject | null;
    parent_id?: number | null;
    parent?: IWorkTask | null;
    subtasks?: IWorkTask[];
    dept_id?: number | null;
    department?: IDepartment | null;
    device_group_id?: number | null;
    device_group?: ITaskDeviceGroup | null;
    assigner_id: number;
    assigner?: IUser;
    assignee_id: number;
    assignee?: IUser;
    collaborators?: ITaskCollaborator[];
    start_date?: string | null;
    deadline: string;
    proposed_deadline?: string | null;
    change_request_reason?: string | null;
    change_request_note?: string | null;
    accepted_at?: string | null;
    submitted_at?: string | null;
    completed_at?: string | null;
    last_reminded_at?: string | null;
    completion_note?: string | null;
    review_note?: string | null;
    kpi_weight: number;
    kpi_score?: number | null;
    checklist?: ITaskChecklistItem[];
    attachments?: ITaskAttachment[];
    tags?: string[];
    comments?: ITaskComment[];
    created_at: string;
    updated_at: string;
}

export interface ITaskStats {
    total: number;
    newCount: number;
    inProgress: number;
    pendingReview: number;
    completed: number;
    overdue: number;
    myAssigned: number;
    myCreated: number;
    waitingMyReview: number;
}

export interface ITaskFilterParams {
    view_mode?: "ALL" | "MY_ASSIGNED" | "MY_CREATED" | "COLLABORATING" | "PENDING_MY_REVIEW";
    status?: string;
    priority?: string;
    task_type?: string;
    project_id?: number;
    dept_id?: number;
    device_group_id?: number;
    assignee_id?: number;
    assigner_id?: number;
    search?: string;
    include_subtasks?: boolean;
}

export interface ICreateTaskPayload {
    title: string;
    description?: string;
    task_type?: WorkTaskType;
    priority?: WorkTaskPriority;
    project_id?: number | null;
    parent_id?: number | null;
    dept_id?: number | null;
    device_group_id?: number | null;
    assignee_id: number;
    collaborators?: ITaskCollaborator[];
    start_date?: string | null;
    deadline: string;
    kpi_weight?: number;
    checklist?: ITaskChecklistItem[];
    attachments?: ITaskAttachment[];
    tags?: string[];
}

export interface ICreateProjectPayload {
    name: string;
    description?: string;
    status?: TaskProjectStatus;
    dept_id?: number | null;
    manager_id?: number | null;
    start_date?: string | null;
    end_date?: string | null;
}

// ─────────────────────────── PHASE 2 TYPES ───────────────────────────

export interface IReminderScanResult {
    scannedCount: number;
    overdueCount: number;
    dueT1Count: number;
    dueT3Count: number;
    stalledNewCount: number;
    notificationsSent: number;
    timestamp: string;
}

export interface IStalledTaskAlert {
    id: number;
    code: string;
    title: string;
    status: WorkTaskStatus;
    priority: WorkTaskPriority;
    progress: number;
    deadline: string;
    created_at: string;
    submitted_at?: string | null;
    alertType: "OVERDUE" | "NEW_OVER_24H" | "PENDING_REVIEW_OVER_24H" | "CHANGE_REQUESTED";
    alertLabel: string;
    hoursDelayed: number;
    assignee?: {
        user_id: number;
        name: string;
        avatar?: string;
        position?: string;
    };
    assigner?: {
        user_id: number;
        name: string;
    };
    department?: {
        dept_id: number;
        name: string;
    };
}

export interface IDepartmentWorkload {
    dept_id: number;
    dept_name: string;
    total: number;
    newCount: number;
    inProgress: number;
    pendingReview: number;
    completed: number;
    completedOnTime: number;
    overdue: number;
    onTimeRate: number;
}

export interface IEmployeeWorkload {
    user_id: number;
    name: string;
    avatar?: string;
    position?: string;
    dept_name: string;
    total: number;
    inProgress: number;
    pendingReview: number;
    completed: number;
    completedOnTime: number;
    overdue: number;
    onTimeRate: number;
    totalKpiScore: number;
}

export interface IExecutiveDashboardData {
    summary: {
        totalTasks: number;
        activeTasks: number;
        completedTasks: number;
        overdueTasks: number;
        stalledCount: number;
        pendingReviewCount: number;
        completionRate: number;
        onTimeCompletionRate: number;
        totalKpiScore: number;
        avgKpiScore: number;
    };
    statusBreakdown: Array<{
        status: WorkTaskStatus;
        label: string;
        count: number;
        color: string;
    }>;
    priorityBreakdown: Array<{
        priority: WorkTaskPriority;
        label: string;
        count: number;
        color: string;
    }>;
    departmentWorkload: IDepartmentWorkload[];
    employeeWorkload: IEmployeeWorkload[];
    stalledTasks: IStalledTaskAlert[];
}

// ─────────────────────────── PHASE 3: KPI EVALUATION & 360 SUMMARY TYPES ───────────────────────────

export type KpiGradeType = "A+" | "A" | "B" | "C";

export interface IKpiEmployeeTaskItem {
    id: number;
    code: string;
    title: string;
    status: WorkTaskStatus;
    priority: WorkTaskPriority;
    deadline: string;
    completed_at?: string | null;
    kpi_weight: number;
    kpi_score?: number | null;
    onTime: boolean;
}

export interface IKpiEmployeeRow {
    rank: number;
    user_id: number;
    name: string;
    avatar?: string;
    position?: string;
    dept_id?: number | null;
    dept_name: string;
    totalAssigned: number;
    completedTotal: number;
    completedOnTime: number;
    completedLate: number;
    inProgress: number;
    overdueUnfinished: number;
    totalWeight: number;
    earnedKpiScore: number;
    penaltyScore: number;
    netKpiScore: number;
    completionRate: number;
    onTimeRate: number;
    kpiEfficiency: number;
    grade: KpiGradeType;
    gradeLabel: string;
    tasks: IKpiEmployeeTaskItem[];
}

export interface IKpiDepartmentRow {
    rank: number;
    dept_name: string;
    memberCount: number;
    totalAssigned: number;
    completedTotal: number;
    completedOnTime: number;
    overdueUnfinished: number;
    netKpiScore: number;
    avgScorePerMember: number;
    completionRate: number;
    onTimeRate: number;
    grade: KpiGradeType;
    gradeLabel: string;
}

export interface IKpiEvaluationReportData {
    periodLabel: string;
    summary: {
        evaluatedEmployees: number;
        totalTasks: number;
        totalNetKpiScore: number;
        gradeCounts: {
            A_PLUS: number;
            A: number;
            B: number;
            C: number;
        };
    };
    employeeRanking: IKpiEmployeeRow[];
    departmentRanking: IKpiDepartmentRow[];
}

export interface IUserTaskSummary {
    totalAssigned: number;
    completedTotal: number;
    completedOnTime: number;
    completedLate: number;
    inProgress: number;
    overdueUnfinished: number;
    earnedKpiScore: number;
    penaltyScore: number;
    netKpiScore: number;
    completionRate: number;
    onTimeRate: number;
    grade: KpiGradeType;
    gradeLabel: string;
    recentTasks: IWorkTask[];
}
