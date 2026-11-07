import React, { useEffect, useState, useCallback } from "react";
import {
    Modal,
    Button,
    Tag,
    Avatar,
    Progress,
    Checkbox,
    Input,
    Slider,
    DatePicker,
    Upload,
    Spin,
    Empty,
    Tooltip,
    InputNumber,
    Popconfirm,
    message,
    Row,
    Col,
    Grid,
} from "antd";
import {
    CloseOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    SendOutlined,
    UploadOutlined,
    PaperClipOutlined,
    BranchesOutlined,
    EditOutlined,
    DeleteOutlined,
    UserOutlined,
    FileTextOutlined,
    CheckSquareOutlined,
    TrophyOutlined,
    AuditOutlined,
    RollbackOutlined,
    PlusOutlined,
    FolderOpenOutlined,
    HistoryOutlined,
    CommentOutlined,
    ThunderboltOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useSocket } from "../../../hooks/useSocket";
import {
    ITaskAttachment,
    ITaskChecklistItem,
    IWorkTask,
} from "../../../types/tasks.types";
import {
    getTaskById,
    respondToTask,
    resolveChangeRequest,
    updateTaskProgress,
    submitTaskForReview,
    reviewTask,
    addTaskComment,
    uploadTaskFile,
    deleteTask,
    nudgeTask,
} from "../../../apis/tasks";
import { getBackendImageUrl } from "../../../utils/imageUrl";
import { optimizeImageBeforeUpload } from "../../../utils/imageOptimizer";
import {
    TASK_PRIORITY_CONFIG,
    TASK_STATUS_CONFIG,
    TASK_TYPE_CONFIG,
    getDeadlineMeta,
} from "../taskConstants";
import { emitTaskAlert } from "../../../components/TaskNotificationPopup";

interface TaskDetailModalProps {
    open: boolean;
    taskId: number | null;
    currentUser: { user_id?: number; name?: string; role?: string } | null;
    canCreateTask?: boolean;
    onClose: () => void;
    onUpdated?: () => void;
    onEditTask?: (task: IWorkTask) => void;
    onCreateSubtask?: (parentTask: IWorkTask) => void;
    onSelectTask?: (taskId: number) => void;
}

const WORKFLOW_STEPS = [
    { key: "NEW", label: "1. Giao việc" },
    { key: "ACCEPT", label: "2. Tiếp nhận" },
    { key: "IN_PROGRESS", label: "3. Thực hiện" },
    { key: "PENDING_REVIEW", label: "4. Báo cáo" },
    { key: "COMPLETED", label: "5. Nghiệm thu" },
];

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
    open,
    taskId,
    currentUser,
    canCreateTask = true,
    onClose,
    onUpdated,
    onEditTask,
    onCreateSubtask,
    onSelectTask,
}) => {
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const [task, setTask] = useState<IWorkTask | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Local progress & checklist state
    const [localProgress, setLocalProgress] = useState<number>(0);
    const [newCheckText, setNewCheckText] = useState("");

    // Action Panels State
    const [activePanel, setActivePanel] = useState<
        "NONE" | "REQUEST_CHANGE" | "SUBMIT_REVIEW" | "APPROVE" | "REJECT"
    >("NONE");

    // Request Change state
    const [proposedDeadline, setProposedDeadline] = useState<dayjs.Dayjs | null>(null);
    const [changeReason, setChangeReason] = useState("");
    const [resolveNote, setResolveNote] = useState("");

    // Submit Review state
    const [completionNote, setCompletionNote] = useState("");
    const [evidenceFiles, setEvidenceFiles] = useState<ITaskAttachment[]>([]);
    const [uploadingEvidence, setUploadingEvidence] = useState(false);

    // Review (Approve / Reject) state
    const [reviewNote, setReviewNote] = useState("");
    const [customKpiScore, setCustomKpiScore] = useState<number | null>(null);

    // Comment state
    const [commentText, setCommentText] = useState("");
    const [commentAttachments, setCommentAttachments] = useState<
        { name: string; url: string }[]
    >([]);
    const [sendingComment, setSendingComment] = useState(false);
    const [activityFilter, setActivityFilter] = useState<"ALL" | "COMMENT" | "SYSTEM_LOG">("ALL");

    const fetchDetail = useCallback(
        async (silent = false) => {
            if (!taskId) return;
            if (!silent) setLoading(true);
            try {
                const data = await getTaskById(taskId);
                setTask(data);
                setLocalProgress(data.progress || 0);
                if (!silent) {
                    setProposedDeadline(
                        data.deadline ? dayjs(data.deadline).add(2, "day") : dayjs().add(2, "day")
                    );
                    setCustomKpiScore(Number((Number(data.kpi_weight || 1) * 10).toFixed(1)));
                }
            } catch (err) {
                if (!silent) {
                    const msg =
                        err instanceof Error
                            ? err.message
                            : "Không thể tải chi tiết công việc";
                    message.error(msg);
                }
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [taskId]
    );

    useEffect(() => {
        if (open && taskId) {
            setActivePanel("NONE");
            setChangeReason("");
            setResolveNote("");
            setCompletionNote("");
            setEvidenceFiles([]);
            setReviewNote("");
            fetchDetail(false);
        }
    }, [open, taskId, fetchDetail]);

    useSocket(currentUser?.user_id, {
        task_updated: (payload: { taskId?: number; action?: string }) => {
            if (
                open &&
                taskId &&
                (!payload?.taskId || Number(payload.taskId) === Number(taskId))
            ) {
                fetchDetail(true);
            }
        },
        dashboard_refresh: () => {
            if (open && taskId) {
                fetchDetail(true);
            }
        },
    });

    if (!open) return null;

    const isAdminOrDirector = ["ADMIN", "DIRECTOR", "HR_MANAGER"].includes(
        String(currentUser?.role || "").toUpperCase()
    );
    const isAssigner =
        Boolean(task && currentUser && task.assigner_id === currentUser.user_id) ||
        isAdminOrDirector;
    const isAssignee =
        Boolean(task && currentUser && task.assignee_id === currentUser.user_id) ||
        isAdminOrDirector;
    const isCollaborator = Boolean(
        task &&
            currentUser &&
            (task.collaborators || []).some(
                (c) => c.user_id === currentUser.user_id && c.role === "COLLABORATOR"
            )
    );
    const canExecute = isAssignee || isCollaborator;

    // ─────────────────────────── WORKFLOW HANDLERS ───────────────────────────

    const handleAcceptTask = async () => {
        if (!task) return;
        setActionLoading(true);
        try {
            const updated = await respondToTask(task.id, { action: "ACCEPT" });
            setTask(updated);
            setLocalProgress(updated.progress);
            emitTaskAlert({
                taskId: updated.id,
                taskCode: updated.code,
                actionType: "TASK_ACCEPTED",
                title: "Tiếp nhận công việc",
                message: `Bạn đã tiếp nhận công việc [${updated.code}] "${updated.title}"`,
            });
            message.success("Đã tiếp nhận công việc! Trạng thái chuyển sang Đang thực hiện.");
            onUpdated();
        } catch (err) {
            message.error(err instanceof Error ? err.message : "Lỗi tiếp nhận");
        } finally {
            setActionLoading(false);
        }
    };

    const handleRequestChange = async () => {
        if (!task) return;
        if (!changeReason.trim()) {
            message.warning("Vui lòng nhập lý do đề nghị điều chỉnh");
            return;
        }
        setActionLoading(true);
        try {
            const updated = await respondToTask(task.id, {
                action: "REQUEST_CHANGE",
                proposed_deadline: proposedDeadline ? proposedDeadline.toISOString() : undefined,
                reason: changeReason.trim(),
            });
            setTask(updated);
            setActivePanel("NONE");
            setChangeReason("");
            emitTaskAlert({
                taskId: updated.id,
                taskCode: updated.code,
                actionType: "REQUEST_CHANGE",
                title: "Đã gửi đề nghị gia hạn",
                message: `Đã gửi đề nghị điều chỉnh thời hạn cho công việc [${updated.code}]`,
            });
            message.success("Đã gửi đề nghị điều chỉnh tới người giao việc");
            onUpdated();
        } catch (err) {
            message.error(err instanceof Error ? err.message : "Lỗi gửi đề nghị");
        } finally {
            setActionLoading(false);
        }
    };

    const handleResolveChange = async (approved: boolean) => {
        if (!task) return;
        setActionLoading(true);
        try {
            const updated = await resolveChangeRequest(task.id, {
                approved,
                new_deadline:
                    approved && task.proposed_deadline ? task.proposed_deadline : undefined,
                note: resolveNote.trim() || undefined,
            });
            setTask(updated);
            setResolveNote("");
            message.success(
                approved
                    ? "Đã chấp thuận gia hạn và chuyển công việc sang Đang thực hiện"
                    : "Đã từ chối gia hạn (giữ hạn cũ) — Chờ người nhận xác nhận Tiếp nhận công việc"
            );
            onUpdated();
        } catch (err) {
            message.error(err instanceof Error ? err.message : "Lỗi xử lý đề nghị");
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleCheckItem = async (itemId: string, checked: boolean) => {
        if (!task) return;
        const currentList = task.checklist || [];
        const updatedList: ITaskChecklistItem[] = currentList.map((item) =>
            item.id === itemId
                ? {
                      ...item,
                      completed: checked,
                      completed_at: checked ? new Date().toISOString() : null,
                      completed_by: checked ? currentUser?.name || "Nhân sự" : null,
                  }
                : item
        );

        try {
            const updated = await updateTaskProgress(task.id, {
                checklist: updatedList,
            });
            setTask(updated);
            setLocalProgress(updated.progress);
            onUpdated();
        } catch (err) {
            message.error(err instanceof Error ? err.message : "Lỗi cập nhật checklist");
        }
    };

    const handleAddCheckItemInline = async () => {
        if (!task || !newCheckText.trim()) return;
        const nextItem: ITaskChecklistItem = {
            id: `chk_${Date.now()}`,
            title: newCheckText.trim(),
            completed: false,
        };
        const updatedList = [...(task.checklist || []), nextItem];
        setNewCheckText("");
        try {
            const updated = await updateTaskProgress(task.id, {
                checklist: updatedList,
            });
            setTask(updated);
            setLocalProgress(updated.progress);
            onUpdated();
        } catch (err) {
            message.error(err instanceof Error ? err.message : "Lỗi thêm checklist");
        }
    };

    const handleSaveProgress = async () => {
        if (!task) return;
        setActionLoading(true);
        try {
            const updated = await updateTaskProgress(task.id, {
                progress: localProgress,
            });
            setTask(updated);
            message.success(`Đã cập nhật tiến độ: ${localProgress}%`);
            onUpdated();
        } catch (err) {
            message.error(err instanceof Error ? err.message : "Lỗi cập nhật tiến độ");
        } finally {
            setActionLoading(false);
        }
    };

    const handleUploadAttachmentOrEvidence = async (
        file: File,
        mode: "ATTACHMENT" | "EVIDENCE" | "COMMENT"
    ) => {
        setUploadingEvidence(true);
        try {
            let fileToUpload = file;
            if (file.type.startsWith("image/")) {
                fileToUpload = await optimizeImageBeforeUpload(file, 1600, 0.82);
            }
            const uploaded = await uploadTaskFile(fileToUpload);

            if (mode === "EVIDENCE") {
                setEvidenceFiles((prev) => [
                    ...prev,
                    {
                        name: uploaded.name || file.name,
                        url: uploaded.url,
                        type: "EVIDENCE",
                        uploaded_at: new Date().toISOString(),
                        uploaded_by: currentUser?.name,
                    },
                ]);
            } else if (mode === "COMMENT") {
                setCommentAttachments((prev) => [
                    ...prev,
                    { name: uploaded.name || file.name, url: uploaded.url },
                ]);
            } else if (task) {
                const nextAttachments: ITaskAttachment[] = [
                    ...(task.attachments || []),
                    {
                        name: uploaded.name || file.name,
                        url: uploaded.url,
                        type: "ATTACHMENT",
                        uploaded_at: new Date().toISOString(),
                        uploaded_by: currentUser?.name,
                    },
                ];
                const updated = await updateTaskProgress(task.id, {
                    attachments: nextAttachments,
                });
                setTask(updated);
                onUpdated();
            }
            message.success(`Đã tải lên: ${file.name}`);
        } catch (err) {
            message.error(err instanceof Error ? err.message : "Lỗi tải tệp");
        } finally {
            setUploadingEvidence(false);
        }
        return false;
    };

    const handleSubmitReview = async () => {
        if (!task) return;
        setActionLoading(true);
        try {
            const updated = await submitTaskForReview(task.id, {
                completion_note: completionNote.trim() || "Đã hoàn thành toàn bộ nội dung công việc.",
                evidence_files: evidenceFiles,
            });
            setTask(updated);
            setLocalProgress(100);
            setActivePanel("NONE");
            setCompletionNote("");
            setEvidenceFiles([]);
            emitTaskAlert({
                taskId: updated.id,
                taskCode: updated.code,
                actionType: "SUBMIT_FOR_REVIEW",
                title: "Báo cáo hoàn thành",
                message: `Đã nộp báo cáo hoàn thành công việc [${updated.code}]. Đang chờ duyệt nghiệm thu.`,
            });
            message.success("Đã gửi báo cáo hoàn thành để chờ nghiệm thu!");
            onUpdated();
        } catch (err) {
            message.error(err instanceof Error ? err.message : "Lỗi gửi báo cáo");
        } finally {
            setActionLoading(false);
        }
    };

    const handleReviewDecision = async (action: "APPROVE" | "REJECT") => {
        if (!task) return;
        if (action === "REJECT" && !reviewNote.trim()) {
            message.warning("Vui lòng nhập lý do trả lại / yêu cầu chỉnh sửa");
            return;
        }
        setActionLoading(true);
        try {
            const updated = await reviewTask(task.id, {
                action,
                review_note: reviewNote.trim() || undefined,
                kpi_score: action === "APPROVE" && customKpiScore !== null ? customKpiScore : undefined,
            });
            setTask(updated);
            setLocalProgress(updated.progress);
            setActivePanel("NONE");
            setReviewNote("");
            emitTaskAlert({
                taskId: updated.id,
                taskCode: updated.code,
                actionType: action === "APPROVE" ? "TASK_APPROVED" : "TASK_REJECTED",
                title: action === "APPROVE" ? "Nghiệm thu hoàn tất" : "Yêu cầu làm lại",
                message:
                    action === "APPROVE"
                        ? `Đã nghiệm thu hoàn tất công việc [${updated.code}]`
                        : `Đã yêu cầu làm lại cho công việc [${updated.code}]`,
            });
            message.success(
                action === "APPROVE"
                    ? "Đã nghiệm thu hoàn thành công việc!"
                    : "Đã trả lại công việc để yêu cầu làm lại"
            );
            onUpdated();
        } catch (err) {
            message.error(err instanceof Error ? err.message : "Lỗi nghiệm thu");
        } finally {
            setActionLoading(false);
        }
    };

    const handleSendComment = async () => {
        if (!task) return;
        if (!commentText.trim() && commentAttachments.length === 0) return;
        setSendingComment(true);
        try {
            await addTaskComment(task.id, {
                content: commentText.trim() || "Đã đính kèm tệp trao đổi",
                attachments: commentAttachments.length > 0 ? commentAttachments : undefined,
            });
            setCommentText("");
            setCommentAttachments([]);
            await fetchDetail(true);
        } catch (err) {
            message.error(err instanceof Error ? err.message : "Không thể gửi bình luận");
        } finally {
            setSendingComment(false);
        }
    };

    const handleDeleteTask = async () => {
        if (!task) return;
        try {
            await deleteTask(task.id);
            message.success(`Đã xóa công việc ${task.code}`);
            onUpdated();
            onClose();
        } catch (err) {
            message.error(err instanceof Error ? err.message : "Không thể xóa công việc");
        }
    };

    const handleNudgeFromDetail = async () => {
        if (!task) return;
        setActionLoading(true);
        try {
            const res = await nudgeTask(task.id);
            setTask(res.data);
            message.success(res.message);
            onUpdated();
        } catch (err) {
            message.error(err instanceof Error ? err.message : "Không thể gửi đôn đốc");
        } finally {
            setActionLoading(false);
        }
    };

    const statusCfg = task
        ? TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.NEW
        : TASK_STATUS_CONFIG.NEW;
    const priorityCfg = task
        ? TASK_PRIORITY_CONFIG[task.priority] || TASK_PRIORITY_CONFIG.NORMAL
        : TASK_PRIORITY_CONFIG.NORMAL;
    const typeCfg = task
        ? TASK_TYPE_CONFIG[task.task_type] || TASK_TYPE_CONFIG.DIRECTIVE
        : TASK_TYPE_CONFIG.DIRECTIVE;
    const deadlineMeta = task ? getDeadlineMeta(task) : null;

    const filteredComments = (task?.comments || []).filter((c) => {
        if (activityFilter === "ALL") return true;
        return c.type === activityFilter;
    });

    return (
        <Modal
            open={open}
            onCancel={onClose}
            width={isMobile ? "100%" : 1180}
            centered={!isMobile}
            style={isMobile ? { top: 0, maxWidth: "100vw", margin: 0, paddingBottom: 0 } : undefined}
            closable={false}
            footer={null}
            styles={{
                container: {
                    padding: 0,
                    borderRadius: isMobile ? 0 : 16,
                    overflow: "hidden",
                    background: "#e8eef5",
                    boxShadow: "0 24px 48px -12px rgba(15, 23, 42, 0.32)",
                },
                body: {
                    padding: 0,
                },
            }}
        >
            {loading || !task ? (
                <div
                    style={{
                        height: 460,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#e8eef5",
                    }}
                >
                    <Spin size="large" tip="Đang tải không gian công việc 360°..." />
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", maxHeight: isMobile ? "100vh" : "90vh" }}>
                    {/* ─────────────── TOP DARK NAVY HEADER ─────────────── */}
                    <div
                        style={{
                            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                            padding: isMobile ? "14px 14px 12px" : "20px 24px 16px",
                            color: "#fff",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: 16,
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        gap: 8,
                                        marginBottom: 8,
                                    }}
                                >
                                    <span
                                        style={{
                                            background: "rgba(59, 130, 246, 0.2)",
                                            border: "1px solid rgba(96, 165, 250, 0.4)",
                                            color: "#93c5fd",
                                            padding: "2px 10px",
                                            borderRadius: 6,
                                            fontSize: 12,
                                            fontWeight: 700,
                                            letterSpacing: 0.4,
                                        }}
                                    >
                                        {task.code}
                                    </span>

                                    <span
                                        style={{
                                            background: statusCfg.bg,
                                            color: statusCfg.color,
                                            padding: "2px 10px",
                                            borderRadius: 999,
                                            fontSize: 12,
                                            fontWeight: 700,
                                        }}
                                    >
                                        ● {statusCfg.label}
                                    </span>

                                    <span
                                        style={{
                                            background: priorityCfg.bg,
                                            color: priorityCfg.color,
                                            padding: "2px 10px",
                                            borderRadius: 999,
                                            fontSize: 12,
                                            fontWeight: 600,
                                        }}
                                    >
                                        Ưu tiên: {priorityCfg.label}
                                    </span>

                                    <span
                                        style={{
                                            background: "rgba(255,255,255,0.1)",
                                            color: "#cbd5e1",
                                            padding: "2px 10px",
                                            borderRadius: 999,
                                            fontSize: 12,
                                        }}
                                    >
                                        {typeCfg.label}
                                    </span>

                                    {task.project && (
                                        <span
                                            style={{
                                                background: "rgba(139, 92, 246, 0.22)",
                                                border: "1px solid rgba(167, 139, 250, 0.35)",
                                                color: "#ddd6fe",
                                                padding: "2px 10px",
                                                borderRadius: 999,
                                                fontSize: 12,
                                            }}
                                        >
                                            <FolderOpenOutlined style={{ marginRight: 4 }} />
                                            {task.project.name}
                                        </span>
                                    )}

                                    {task.device_group && (
                                        <span
                                            style={{
                                                background: "rgba(16, 185, 129, 0.22)",
                                                border: "1px solid rgba(52, 211, 153, 0.4)",
                                                color: "#a7f3d0",
                                                padding: "2px 10px",
                                                borderRadius: 999,
                                                fontSize: 12,
                                                fontWeight: 600,
                                            }}
                                        >
                                            ⚙ Nhóm TB: {task.device_group.name}
                                        </span>
                                    )}

                                    {deadlineMeta && (
                                        <span
                                            style={{
                                                background: deadlineMeta.bg,
                                                color: deadlineMeta.color,
                                                padding: "2px 10px",
                                                borderRadius: 999,
                                                fontSize: 12,
                                                fontWeight: 700,
                                            }}
                                        >
                                            <ClockCircleOutlined style={{ marginRight: 4 }} />
                                            {deadlineMeta.text} (Hạn:{" "}
                                            {dayjs(task.deadline).format("DD/MM/YYYY HH:mm")})
                                        </span>
                                    )}
                                </div>

                                <div
                                    style={{
                                        fontSize: 19,
                                        fontWeight: 700,
                                        color: "#f8fafc",
                                        lineHeight: 1.35,
                                    }}
                                >
                                    {task.title}
                                </div>

                                {task.parent && (
                                    <div style={{ marginTop: 6, fontSize: 12, color: "#94a3b8" }}>
                                        Thuộc công việc cha:{" "}
                                        <span
                                            onClick={() => onSelectTask(task.parent!.id)}
                                            style={{
                                                color: "#60a5fa",
                                                cursor: "pointer",
                                                textDecoration: "underline",
                                            }}
                                        >
                                            [{task.parent.code}] {task.parent.title}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {isAssigner && (
                                    <>
                                        <Tooltip title="Chỉnh sửa thông tin công việc">
                                            <Button
                                                size="small"
                                                icon={<EditOutlined />}
                                                onClick={() => onEditTask(task)}
                                                style={{
                                                    background: "rgba(255,255,255,0.1)",
                                                    border: "1px solid rgba(255,255,255,0.2)",
                                                    color: "#fff",
                                                }}
                                            >
                                                Sửa
                                            </Button>
                                        </Tooltip>
                                        <Popconfirm
                                            title="Xóa công việc này?"
                                            description="Hành động này không thể hoàn tác."
                                            onConfirm={handleDeleteTask}
                                            okText="Xóa"
                                            cancelText="Hủy"
                                        >
                                            <Button
                                                size="small"
                                                danger
                                                icon={<DeleteOutlined />}
                                                style={{
                                                    background: "rgba(239, 68, 68, 0.15)",
                                                    border: "1px solid rgba(239, 68, 68, 0.35)",
                                                    color: "#fca5a5",
                                                }}
                                            />
                                        </Popconfirm>
                                    </>
                                )}
                                <Button
                                    type="text"
                                    icon={<CloseOutlined />}
                                    onClick={onClose}
                                    style={{
                                        color: "#cbd5e1",
                                        background: "rgba(255,255,255,0.08)",
                                        borderRadius: 8,
                                    }}
                                />
                            </div>
                        </div>

                        {/* 5-Step Workflow Progress Bar */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(5, 1fr)",
                                gap: 8,
                                marginTop: 16,
                                paddingTop: 12,
                                borderTop: "1px solid rgba(255,255,255,0.1)",
                            }}
                        >
                            {WORKFLOW_STEPS.map((st, idx) => {
                                const currentStep = statusCfg.stepIndex;
                                const isDone = idx < currentStep || task.status === "COMPLETED";
                                const isCurrent =
                                    idx === currentStep && task.status !== "COMPLETED";
                                return (
                                    <div
                                        key={st.key}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            padding: "6px 10px",
                                            borderRadius: 8,
                                            background: isCurrent
                                                ? "rgba(37, 99, 235, 0.35)"
                                                : isDone
                                                ? "rgba(22, 163, 74, 0.22)"
                                                : "rgba(255,255,255,0.05)",
                                            border: isCurrent
                                                ? "1px solid rgba(96, 165, 250, 0.6)"
                                                : isDone
                                                ? "1px solid rgba(74, 222, 128, 0.35)"
                                                : "1px solid rgba(255,255,255,0.08)",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 12,
                                                fontWeight: isCurrent || isDone ? 700 : 500,
                                                color: isCurrent
                                                    ? "#93c5fd"
                                                    : isDone
                                                    ? "#86efac"
                                                    : "#94a3b8",
                                            }}
                                        >
                                            {isDone ? "✓ " : ""}
                                            {st.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ─────────────── WORKFLOW ACTION BAR (5 STEPS) ─────────────── */}
                    <div
                        style={{
                            background: "#ffffff",
                            padding: "12px 24px",
                            borderBottom: "1px solid #cbd5e1",
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
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
                            {/* Left: Progress summary */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 14,
                                    minWidth: 260,
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: "#334155",
                                    }}
                                >
                                    Tiến độ tổng thể:
                                </span>
                                <div style={{ width: 160 }}>
                                    <Progress
                                        percent={task.progress}
                                        status={
                                            task.status === "COMPLETED"
                                                ? "success"
                                                : task.status === "REJECTED"
                                                ? "exception"
                                                : "active"
                                        }
                                        strokeColor={
                                            task.status === "COMPLETED" ? "#16a34a" : "#2563eb"
                                        }
                                    />
                                </div>
                            </div>

                            {/* Right: Contextual Step CTAs */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                {/* STEP 2: NEW -> ACCEPT OR REQUEST CHANGE */}
                                {task.status === "NEW" && canExecute && (
                                    <>
                                        <Button
                                            type="primary"
                                            icon={<CheckCircleOutlined />}
                                            loading={actionLoading}
                                            onClick={handleAcceptTask}
                                            style={{
                                                background: "#16a34a",
                                                borderColor: "#16a34a",
                                                fontWeight: 600,
                                            }}
                                        >
                                            Tiếp nhận công việc
                                        </Button>
                                        <Button
                                            icon={<ClockCircleOutlined />}
                                            onClick={() =>
                                                setActivePanel(
                                                    activePanel === "REQUEST_CHANGE"
                                                        ? "NONE"
                                                        : "REQUEST_CHANGE"
                                                )
                                            }
                                        >
                                            Đề nghị điều chỉnh hạn / nội dung
                                        </Button>
                                    </>
                                )}

                                {/* STEP 2B: CHANGE_REQUESTED -> ASSIGNER RESOLVES */}
                                {task.status === "CHANGE_REQUESTED" && isAssigner && (
                                    <>
                                        <Button
                                            type="primary"
                                            icon={<CheckCircleOutlined />}
                                            loading={actionLoading}
                                            onClick={() => handleResolveChange(true)}
                                        >
                                            Chấp thuận hạn mới (
                                            {task.proposed_deadline
                                                ? dayjs(task.proposed_deadline).format(
                                                      "DD/MM/YYYY HH:mm"
                                                  )
                                                : ""}
                                            )
                                        </Button>
                                        <Button
                                            danger
                                            loading={actionLoading}
                                            onClick={() => handleResolveChange(false)}
                                        >
                                            Giữ hạn cũ
                                        </Button>
                                    </>
                                )}

                                {/* STEP 3 & 4: IN_PROGRESS / REJECTED -> UPDATE PROGRESS & SUBMIT */}
                                {(task.status === "IN_PROGRESS" ||
                                    task.status === "REJECTED") &&
                                    canExecute && (
                                        <>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    background: "#f8fafc",
                                                    padding: "4px 12px",
                                                    borderRadius: 8,
                                                    border: "1px solid #e2e8f0",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: 12,
                                                        color: "#475569",
                                                    }}
                                                >
                                                    Cập nhật %:
                                                </span>
                                                <div style={{ width: 110 }}>
                                                    <Slider
                                                        min={0}
                                                        max={100}
                                                        step={5}
                                                        value={localProgress}
                                                        onChange={(val) =>
                                                            setLocalProgress(val)
                                                        }
                                                    />
                                                </div>
                                                <span
                                                    style={{
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        color: "#2563eb",
                                                        minWidth: 34,
                                                    }}
                                                >
                                                    {localProgress}%
                                                </span>
                                                <Button
                                                    size="small"
                                                    type="primary"
                                                    ghost
                                                    loading={actionLoading}
                                                    onClick={handleSaveProgress}
                                                >
                                                    Lưu %
                                                </Button>
                                            </div>

                                            <Button
                                                type="primary"
                                                icon={<AuditOutlined />}
                                                onClick={() =>
                                                    setActivePanel(
                                                        activePanel === "SUBMIT_REVIEW"
                                                            ? "NONE"
                                                            : "SUBMIT_REVIEW"
                                                    )
                                                }
                                                style={{
                                                    background: "#7c3aed",
                                                    borderColor: "#7c3aed",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Báo cáo hoàn thành
                                            </Button>
                                        </>
                                    )}

                                {/* STEP 5: PENDING_REVIEW -> ASSIGNER APPROVES OR REJECTS */}
                                {task.status === "PENDING_REVIEW" && isAssigner && (
                                    <>
                                        <Button
                                            type="primary"
                                            icon={<CheckCircleOutlined />}
                                            onClick={() =>
                                                setActivePanel(
                                                    activePanel === "APPROVE"
                                                        ? "NONE"
                                                        : "APPROVE"
                                                )
                                            }
                                            style={{
                                                background: "#16a34a",
                                                borderColor: "#16a34a",
                                                fontWeight: 600,
                                            }}
                                        >
                                            Nghiệm thu & Duyệt hoàn thành
                                        </Button>
                                        <Button
                                            danger
                                            icon={<RollbackOutlined />}
                                            onClick={() =>
                                                setActivePanel(
                                                    activePanel === "REJECT"
                                                        ? "NONE"
                                                        : "REJECT"
                                                )
                                            }
                                        >
                                            Trả lại / Yêu cầu làm lại
                                        </Button>
                                    </>
                                )}

                                {/* Subtask button: Cán bộ (canCreateTask) hoặc Người nhận việc chính (isAssignee) */}
                                {(canCreateTask || isAssignee) &&
                                    task.status !== "COMPLETED" &&
                                    task.status !== "CANCELLED" && (
                                        <Button
                                            icon={<BranchesOutlined />}
                                            onClick={() => onCreateSubtask(task)}
                                        >
                                            Chia việc con
                                        </Button>
                                    )}

                                {/* Nudge button for Assigner / Director on active tasks */}
                                {isAssigner &&
                                    (task.status === "NEW" ||
                                        task.status === "IN_PROGRESS" ||
                                        task.status === "REJECTED") && (
                                        <Button
                                            danger
                                            icon={<ThunderboltOutlined />}
                                            loading={actionLoading}
                                            onClick={handleNudgeFromDetail}
                                        >
                                            Đôn đốc tiến độ
                                        </Button>
                                    )}
                            </div>
                        </div>

                        {/* Banner if CHANGE_REQUESTED */}
                        {task.status === "CHANGE_REQUESTED" && (
                            <div
                                style={{
                                    background:
                                        "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                                    border: "2px solid #f59e0b",
                                    borderLeft: "6px solid #d97706",
                                    borderRadius: 12,
                                    padding: "12px 16px",
                                    fontSize: 13,
                                    color: "#78350f",
                                    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.16)",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        gap: 10,
                                        marginBottom: 8,
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                        }}
                                    >
                                        <Tag
                                            color="warning"
                                            style={{
                                                margin: 0,
                                                fontWeight: 700,
                                                fontSize: 12,
                                                padding: "2px 10px",
                                            }}
                                        >
                                            ⏳ YÊU CẦU GIA HẠN / ĐIỀU CHỈNH THỜI HẠN
                                        </Tag>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 6,
                                                background: "#ffffff",
                                                padding: "3px 10px",
                                                borderRadius: 999,
                                                border: "1px solid #fcd34d",
                                            }}
                                        >
                                            <Avatar
                                                size={22}
                                                src={getBackendImageUrl(
                                                    task.assignee?.avatar
                                                )}
                                                icon={<UserOutlined />}
                                                style={{ backgroundColor: "#d97706" }}
                                            />
                                            <span
                                                style={{
                                                    fontWeight: 700,
                                                    color: "#92400e",
                                                }}
                                            >
                                                Người xin gia hạn:{" "}
                                                {task.assignee?.name ||
                                                    "Nhân sự nhận việc"}
                                            </span>
                                            {task.assignee?.position && (
                                                <span
                                                    style={{
                                                        fontSize: 11.5,
                                                        color: "#b45309",
                                                    }}
                                                >
                                                    ({task.assignee.position})
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <span
                                            style={{
                                                background: "#ffffff",
                                                padding: "3px 10px",
                                                borderRadius: 6,
                                                border: "1px solid #cbd5e1",
                                                fontSize: 12,
                                                color: "#475569",
                                            }}
                                        >
                                            Hạn gốc:{" "}
                                            <strong>
                                                {dayjs(task.deadline).format(
                                                    "DD/MM/YYYY HH:mm"
                                                )}
                                            </strong>
                                        </span>
                                        {task.proposed_deadline && (
                                            <span
                                                style={{
                                                    background: "#dc2626",
                                                    color: "#ffffff",
                                                    padding: "3px 10px",
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                }}
                                            >
                                                ➔ Hạn đề xuất mới:{" "}
                                                {dayjs(task.proposed_deadline).format(
                                                    "DD/MM/YYYY HH:mm"
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div
                                    style={{
                                        background: "rgba(255, 255, 255, 0.78)",
                                        padding: "8px 12px",
                                        borderRadius: 8,
                                        border: "1px dashed #f59e0b",
                                        fontWeight: 500,
                                        color: "#78350f",
                                    }}
                                >
                                    <strong>Lý do xin gia hạn / điều chỉnh:</strong>{" "}
                                    {task.change_request_reason ||
                                        "Xin điều chỉnh hạn hoàn thành"}
                                </div>

                                {isAssigner && (
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            marginTop: 10,
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <Input
                                            size="small"
                                            value={resolveNote}
                                            onChange={(e) =>
                                                setResolveNote(e.target.value)
                                            }
                                            placeholder="Nhập ý kiến chỉ đạo / lý do chấp thuận hoặc từ chối gia hạn (tùy chọn)..."
                                            style={{
                                                flex: 1,
                                                minWidth: 260,
                                                background: "#ffffff",
                                            }}
                                        />
                                        <Button
                                            size="small"
                                            type="primary"
                                            icon={<CheckCircleOutlined />}
                                            loading={actionLoading}
                                            onClick={() => handleResolveChange(true)}
                                            style={{
                                                background: "#16a34a",
                                                borderColor: "#16a34a",
                                                fontWeight: 600,
                                            }}
                                        >
                                            Chấp thuận hạn mới
                                        </Button>
                                        <Button
                                            size="small"
                                            danger
                                            type="primary"
                                            loading={actionLoading}
                                            onClick={() => handleResolveChange(false)}
                                        >
                                            Từ chối gia hạn (Giữ hạn cũ)
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Banner if extension was REJECTED and task returned to NEW waiting for Assignee acceptance */}
                        {task.status === "NEW" &&
                            task.change_request_reason &&
                            task.change_request_reason.startsWith("❌") && (
                                <div
                                    style={{
                                        background:
                                            "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
                                        border: "2px solid #ef4444",
                                        borderLeft: "6px solid #dc2626",
                                        borderRadius: 12,
                                        padding: "10px 16px",
                                        fontSize: 13,
                                        color: "#991b1b",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        gap: 10,
                                    }}
                                >
                                    <div>
                                        <Tag
                                            color="error"
                                            style={{
                                                fontWeight: 700,
                                                marginRight: 8,
                                            }}
                                        >
                                            ❌ TỪ CHỐI GIA HẠN — GIỮ HẠN CŨ
                                        </Tag>
                                        <strong>{task.change_request_reason}</strong>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: "#b91c1c",
                                                marginTop: 4,
                                            }}
                                        >
                                            Hệ thống không tự động nhận việc thay nhân
                                            viên. Người nhận việc (
                                            <strong>
                                                {task.assignee?.name || "Nhân sự"}
                                            </strong>
                                            ) vui lòng bấm{" "}
                                            <strong>&quot;Tiếp nhận công việc&quot;</strong> để
                                            xác nhận thực hiện theo hạn gốc (
                                            {dayjs(task.deadline).format(
                                                "DD/MM/YYYY HH:mm"
                                            )}
                                            ).
                                        </div>
                                    </div>
                                    {canExecute && (
                                        <Button
                                            type="primary"
                                            icon={<CheckCircleOutlined />}
                                            loading={actionLoading}
                                            onClick={handleAcceptTask}
                                            style={{
                                                background: "#16a34a",
                                                borderColor: "#16a34a",
                                                fontWeight: 700,
                                            }}
                                        >
                                            Xác nhận Tiếp nhận theo hạn cũ
                                        </Button>
                                    )}
                                </div>
                            )}

                        {/* Banner if REJECTED */}
                        {task.status === "REJECTED" && task.review_note && (
                            <div
                                style={{
                                    background: "#fef2f2",
                                    border: "1px solid #fecaca",
                                    borderRadius: 10,
                                    padding: "10px 14px",
                                    fontSize: 13,
                                    color: "#991b1b",
                                }}
                            >
                                <strong>
                                    <RollbackOutlined style={{ marginRight: 6 }} />
                                    Yêu cầu chỉnh sửa / làm lại từ người nghiệm thu:
                                </strong>{" "}
                                {task.review_note}
                            </div>
                        )}

                        {/* Banner if PENDING_REVIEW or COMPLETED showing completion report */}
                        {(task.status === "PENDING_REVIEW" ||
                            task.status === "COMPLETED") &&
                            task.completion_note && (
                                <div
                                    style={{
                                        background: "#f0fdf4",
                                        border: "1px solid #bbf7d0",
                                        borderRadius: 10,
                                        padding: "10px 14px",
                                        fontSize: 13,
                                        color: "#166534",
                                    }}
                                >
                                    <strong>
                                        <CheckCircleOutlined style={{ marginRight: 6 }} />
                                        Báo cáo kết quả hoàn thành (
                                        {task.submitted_at
                                            ? dayjs(task.submitted_at).format(
                                                  "DD/MM/YYYY HH:mm"
                                              )
                                            : ""}
                                        ):
                                    </strong>{" "}
                                    {task.completion_note}
                                </div>
                            )}

                        {/* Inline Panel: REQUEST_CHANGE */}
                        {activePanel === "REQUEST_CHANGE" && (
                            <div
                                style={{
                                    background: "#fffbeb",
                                    border: "1px solid #fcd34d",
                                    borderRadius: 10,
                                    padding: 14,
                                }}
                            >
                                <div
                                    style={{
                                        fontWeight: 600,
                                        marginBottom: 8,
                                        color: "#92400e",
                                    }}
                                >
                                    Gửi đề nghị điều chỉnh hạn hoàn thành / phạm vi công việc
                                </div>
                                <Row gutter={12}>
                                    <Col xs={24} sm={8}>
                                        <div style={{ fontSize: 12, marginBottom: 4 }}>
                                            Hạn hoàn thành đề xuất mới:
                                        </div>
                                        <DatePicker
                                            showTime={{ format: "HH:mm" }}
                                            format="DD/MM/YYYY HH:mm"
                                            value={proposedDeadline}
                                            onChange={(val) => setProposedDeadline(val)}
                                            style={{ width: "100%" }}
                                        />
                                    </Col>
                                    <Col xs={24} sm={16}>
                                        <div style={{ fontSize: 12, marginBottom: 4 }}>
                                            Lý do đề nghị điều chỉnh *:
                                        </div>
                                        <Input
                                            value={changeReason}
                                            onChange={(e) => setChangeReason(e.target.value)}
                                            placeholder="Nhập rõ lý do cần gia hạn hoặc điều chỉnh nội dung..."
                                        />
                                    </Col>
                                </Row>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        gap: 8,
                                        marginTop: 10,
                                    }}
                                >
                                    <Button
                                        size="small"
                                        onClick={() => setActivePanel("NONE")}
                                    >
                                        Đóng
                                    </Button>
                                    <Button
                                        size="small"
                                        type="primary"
                                        loading={actionLoading}
                                        onClick={handleRequestChange}
                                    >
                                        Gửi đề nghị
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Inline Panel: SUBMIT_REVIEW */}
                        {activePanel === "SUBMIT_REVIEW" && (
                            <div
                                style={{
                                    background: "#f5f3ff",
                                    border: "1px solid #c4b5fd",
                                    borderRadius: 10,
                                    padding: 14,
                                }}
                            >
                                <div
                                    style={{
                                        fontWeight: 600,
                                        marginBottom: 8,
                                        color: "#5b21b6",
                                    }}
                                >
                                    Báo cáo hoàn thành & Nộp minh chứng nghiệm thu
                                </div>
                                <Input.TextArea
                                    rows={2}
                                    value={completionNote}
                                    onChange={(e) => setCompletionNote(e.target.value)}
                                    placeholder="Tóm tắt kết quả thực hiện, số liệu đạt được hoặc ghi chú bàn giao..."
                                    style={{ marginBottom: 8 }}
                                />
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        gap: 8,
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                        <Upload
                                            beforeUpload={(file) =>
                                                handleUploadAttachmentOrEvidence(
                                                    file,
                                                    "EVIDENCE"
                                                )
                                            }
                                            showUploadList={false}
                                            multiple
                                        >
                                            <Button
                                                size="small"
                                                icon={<UploadOutlined />}
                                                loading={uploadingEvidence}
                                            >
                                                Đính kèm ảnh / biên bản minh chứng
                                            </Button>
                                        </Upload>
                                        {evidenceFiles.map((ev, i) => (
                                            <Tag
                                                key={i}
                                                color="purple"
                                                closable
                                                onClose={() =>
                                                    setEvidenceFiles((prev) =>
                                                        prev.filter((_, idx) => idx !== i)
                                                    )
                                                }
                                            >
                                                {ev.name}
                                            </Tag>
                                        ))}
                                    </div>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <Button
                                            size="small"
                                            onClick={() => setActivePanel("NONE")}
                                        >
                                            Hủy
                                        </Button>
                                        <Button
                                            size="small"
                                            type="primary"
                                            loading={actionLoading}
                                            onClick={handleSubmitReview}
                                            style={{
                                                background: "#7c3aed",
                                                borderColor: "#7c3aed",
                                            }}
                                        >
                                            Xác nhận gửi nghiệm thu (100%)
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Inline Panel: APPROVE */}
                        {activePanel === "APPROVE" && (
                            <div
                                style={{
                                    background: "#f0fdf4",
                                    border: "1px solid #86efac",
                                    borderRadius: 10,
                                    padding: 14,
                                }}
                            >
                                <div
                                    style={{
                                        fontWeight: 600,
                                        marginBottom: 8,
                                        color: "#166534",
                                    }}
                                >
                                    Phê duyệt nghiệm thu & Chấm điểm KPI công việc
                                </div>
                                <Row gutter={12}>
                                    <Col xs={24} sm={7}>
                                        <div style={{ fontSize: 12, marginBottom: 4 }}>
                                            Điểm KPI đạt được (Hệ số {task.kpi_weight}):
                                        </div>
                                        <InputNumber
                                            min={0}
                                            max={100}
                                            step={0.5}
                                            value={customKpiScore}
                                            onChange={(val) => setCustomKpiScore(val)}
                                            style={{ width: "100%" }}
                                        />
                                    </Col>
                                    <Col xs={24} sm={17}>
                                        <div style={{ fontSize: 12, marginBottom: 4 }}>
                                            Nhận xét nghiệm thu (Tùy chọn):
                                        </div>
                                        <Input
                                            value={reviewNote}
                                            onChange={(e) => setReviewNote(e.target.value)}
                                            placeholder="Nhận xét chất lượng công việc hoàn thành..."
                                        />
                                    </Col>
                                </Row>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        gap: 8,
                                        marginTop: 10,
                                    }}
                                >
                                    <Button
                                        size="small"
                                        onClick={() => setActivePanel("NONE")}
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        size="small"
                                        type="primary"
                                        loading={actionLoading}
                                        onClick={() => handleReviewDecision("APPROVE")}
                                        style={{
                                            background: "#16a34a",
                                            borderColor: "#16a34a",
                                        }}
                                    >
                                        Xác nhận duyệt hoàn thành
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Inline Panel: REJECT */}
                        {activePanel === "REJECT" && (
                            <div
                                style={{
                                    background: "#fef2f2",
                                    border: "1px solid #fca5a5",
                                    borderRadius: 10,
                                    padding: 14,
                                }}
                            >
                                <div
                                    style={{
                                        fontWeight: 600,
                                        marginBottom: 8,
                                        color: "#991b1b",
                                    }}
                                >
                                    Trả lại công việc / Yêu cầu bổ sung, làm lại
                                </div>
                                <Input.TextArea
                                    rows={2}
                                    value={reviewNote}
                                    onChange={(e) => setReviewNote(e.target.value)}
                                    placeholder="Nhập rõ nội dung chưa đạt hoặc yêu cầu cần chỉnh sửa..."
                                />
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        gap: 8,
                                        marginTop: 10,
                                    }}
                                >
                                    <Button
                                        size="small"
                                        onClick={() => setActivePanel("NONE")}
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        size="small"
                                        danger
                                        type="primary"
                                        loading={actionLoading}
                                        onClick={() => handleReviewDecision("REJECT")}
                                    >
                                        Gửi yêu cầu làm lại
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ─────────────── BODY: 2-COLUMN BENTO WORKSPACE ─────────────── */}
                    <div
                        style={{
                            padding: 20,
                            overflowY: "auto",
                            flex: 1,
                        }}
                    >
                        <Row gutter={[16, 16]}>
                            {/* LEFT COLUMN: Task Content, Checklist, Subtasks, Attachments */}
                            <Col xs={24} lg={14}>
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 16,
                                    }}
                                >
                                    {/* CARD 1: Description & People Assignment */}
                                    <div
                                        style={{
                                            background: "#ffffff",
                                            borderRadius: 14,
                                            padding: 18,
                                            border: "1px solid #dbe3ee",
                                            boxShadow: "0 2px 6px rgba(15, 23, 42, 0.04)",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                fontWeight: 700,
                                                fontSize: 14,
                                                color: "#0f172a",
                                                marginBottom: 10,
                                            }}
                                        >
                                            <FileTextOutlined style={{ color: "#2563eb" }} />
                                            <span>Nội dung chỉ đạo & Yêu cầu đầu ra</span>
                                        </div>

                                        <div
                                            style={{
                                                background: "#f8fafc",
                                                border: "1px solid #e2e8f0",
                                                borderRadius: 10,
                                                padding: 12,
                                                fontSize: 13.5,
                                                color: "#1e293b",
                                                whiteSpace: "pre-wrap",
                                                marginBottom: 14,
                                                minHeight: 54,
                                            }}
                                        >
                                            {task.description || (
                                                <span style={{ color: "#94a3b8" }}>
                                                    Không có mô tả chi tiết.
                                                </span>
                                            )}
                                        </div>

                                        {/* People & Metadata Grid */}
                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "repeat(2, 1fr)",
                                                gap: 10,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    background: "#f8fafc",
                                                    borderRadius: 10,
                                                    padding: "8px 12px",
                                                    border: "1px solid #e2e8f0",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: "#64748b",
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    NGƯỜI GIAO VIỆC
                                                </div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 8,
                                                    }}
                                                >
                                                    <Avatar
                                                        size={26}
                                                        src={getBackendImageUrl(
                                                            task.assigner?.avatar
                                                        )}
                                                        icon={<UserOutlined />}
                                                        style={{ backgroundColor: "#1d4ed8" }}
                                                    />
                                                    <div>
                                                        <div
                                                            style={{
                                                                fontSize: 13,
                                                                fontWeight: 600,
                                                                color: "#0f172a",
                                                            }}
                                                        >
                                                            {task.assigner?.name || "—"}
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontSize: 11,
                                                                color: "#64748b",
                                                            }}
                                                        >
                                                            {task.assigner?.position ||
                                                                task.assigner?.role}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                style={{
                                                    background: "#f8fafc",
                                                    borderRadius: 10,
                                                    padding: "8px 12px",
                                                    border: "1px solid #e2e8f0",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: "#64748b",
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    NGƯỜI CHỊU TRÁCH NHIỆM CHÍNH
                                                </div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 8,
                                                    }}
                                                >
                                                    <Avatar
                                                        size={26}
                                                        src={getBackendImageUrl(
                                                            task.assignee?.avatar
                                                        )}
                                                        icon={<UserOutlined />}
                                                        style={{ backgroundColor: "#059669" }}
                                                    />
                                                    <div>
                                                        <div
                                                            style={{
                                                                fontSize: 13,
                                                                fontWeight: 600,
                                                                color: "#0f172a",
                                                            }}
                                                        >
                                                            {task.assignee?.name || "—"}
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontSize: 11,
                                                                color: "#64748b",
                                                            }}
                                                        >
                                                            {task.department?.name ||
                                                                task.assignee?.position ||
                                                                ""}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                style={{
                                                    background: "#f8fafc",
                                                    borderRadius: 10,
                                                    padding: "8px 12px",
                                                    border: "1px solid #e2e8f0",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: "#64748b",
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    NGƯỜI PHỐI HỢP / THEO DÕI
                                                </div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        flexWrap: "wrap",
                                                        gap: 4,
                                                    }}
                                                >
                                                    {(task.collaborators || []).length === 0 ? (
                                                        <span
                                                            style={{
                                                                fontSize: 12,
                                                                color: "#94a3b8",
                                                            }}
                                                        >
                                                            Không có
                                                        </span>
                                                    ) : (
                                                        (task.collaborators || []).map((c) => (
                                                            <Tag
                                                                key={c.user_id}
                                                                color={
                                                                    c.role === "COLLABORATOR"
                                                                        ? "cyan"
                                                                        : "default"
                                                                }
                                                                style={{ margin: 0, fontSize: 11 }}
                                                            >
                                                                {c.name} (
                                                                {c.role === "COLLABORATOR"
                                                                    ? "Phối hợp"
                                                                    : "Theo dõi"}
                                                                )
                                                            </Tag>
                                                        ))
                                                    )}
                                                </div>
                                            </div>

                                            <div
                                                style={{
                                                    background: "#f8fafc",
                                                    borderRadius: 10,
                                                    padding: "8px 12px",
                                                    border: "1px solid #e2e8f0",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: "#64748b",
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    TRỌNG SỐ & ĐIỂM KPI
                                                </div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 10,
                                                    }}
                                                >
                                                    <Tag color="gold" icon={<TrophyOutlined />}>
                                                        Hệ số: {task.kpi_weight}
                                                    </Tag>
                                                    {task.kpi_score !== null &&
                                                    task.kpi_score !== undefined ? (
                                                        <Tag color="green">
                                                            Điểm đạt: {task.kpi_score} điểm
                                                        </Tag>
                                                    ) : (
                                                        <span
                                                            style={{
                                                                fontSize: 12,
                                                                color: "#64748b",
                                                            }}
                                                        >
                                                            Chưa chấm điểm
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CARD 2: Interactive Checklist */}
                                    <div
                                        style={{
                                            background: "#ffffff",
                                            borderRadius: 14,
                                            padding: 18,
                                            border: "1px solid #dbe3ee",
                                            boxShadow: "0 2px 6px rgba(15, 23, 42, 0.04)",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                marginBottom: 12,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    fontWeight: 700,
                                                    fontSize: 14,
                                                    color: "#0f172a",
                                                }}
                                            >
                                                <CheckSquareOutlined
                                                    style={{ color: "#2563eb" }}
                                                />
                                                <span>
                                                    Checklist các bước thực hiện (
                                                    {
                                                        (task.checklist || []).filter(
                                                            (c) => c.completed
                                                        ).length
                                                    }
                                                    /{(task.checklist || []).length})
                                                </span>
                                            </div>
                                        </div>

                                        {(task.status === "NEW" ||
                                            task.status === "CHANGE_REQUESTED") &&
                                            canExecute && (
                                                <div
                                                    style={{
                                                        marginBottom: 10,
                                                        padding: "6px 10px",
                                                        borderRadius: 8,
                                                        background: "#fffbeb",
                                                        border: "1px solid #fde68a",
                                                        color: "#92400e",
                                                        fontSize: 12,
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    💡 Vui lòng bấm nút{" "}
                                                    <strong>
                                                        &ldquo;✓ Tiếp nhận công việc&rdquo;
                                                    </strong>{" "}
                                                    trên thanh công cụ trước khi tích chọn
                                                    Checklist hoặc cập nhật tiến độ %.
                                                </div>
                                            )}

                                        {(task.checklist || []).length === 0 ? (
                                            <div
                                                style={{
                                                    color: "#94a3b8",
                                                    fontSize: 13,
                                                    marginBottom: 10,
                                                }}
                                            >
                                                Chưa có checklist chi tiết.
                                            </div>
                                        ) : (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 8,
                                                    marginBottom: 12,
                                                }}
                                            >
                                                {(task.checklist || []).map((item) => (
                                                    <div
                                                        key={item.id}
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                            padding: "8px 12px",
                                                            borderRadius: 8,
                                                            background: item.completed
                                                                ? "#f0fdf4"
                                                                : "#f8fafc",
                                                            border: item.completed
                                                                ? "1px solid #bbf7d0"
                                                                : "1px solid #e2e8f0",
                                                        }}
                                                    >
                                                        <Checkbox
                                                            checked={item.completed}
                                                            disabled={
                                                                !canExecute ||
                                                                task.status === "NEW" ||
                                                                task.status ===
                                                                    "CHANGE_REQUESTED" ||
                                                                task.status ===
                                                                    "PENDING_REVIEW" ||
                                                                task.status === "COMPLETED"
                                                            }
                                                            onChange={(e) =>
                                                                handleToggleCheckItem(
                                                                    item.id,
                                                                    e.target.checked
                                                                )
                                                            }
                                                        >
                                                            <span
                                                                style={{
                                                                    fontSize: 13,
                                                                    textDecoration:
                                                                        item.completed
                                                                            ? "line-through"
                                                                            : "none",
                                                                    color: item.completed
                                                                        ? "#15803d"
                                                                        : "#1e293b",
                                                                    fontWeight: item.completed
                                                                        ? 500
                                                                        : 600,
                                                                }}
                                                            >
                                                                {item.title}
                                                            </span>
                                                        </Checkbox>
                                                        {item.completed && item.completed_by && (
                                                            <span
                                                                style={{
                                                                    fontSize: 11,
                                                                    color: "#16a34a",
                                                                }}
                                                            >
                                                                ✓ {item.completed_by}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {canExecute &&
                                            (task.status === "IN_PROGRESS" ||
                                                task.status === "REJECTED") && (
                                                <div style={{ display: "flex", gap: 8 }}>
                                                    <Input
                                                        size="small"
                                                        value={newCheckText}
                                                        onChange={(e) =>
                                                            setNewCheckText(e.target.value)
                                                        }
                                                        onPressEnter={handleAddCheckItemInline}
                                                        placeholder="Thêm đầu mục công việc cần kiểm tra..."
                                                    />
                                                    <Button
                                                        size="small"
                                                        icon={<PlusOutlined />}
                                                        onClick={handleAddCheckItemInline}
                                                    >
                                                        Thêm
                                                    </Button>
                                                </div>
                                            )}
                                    </div>

                                    {/* CARD 3: Subtasks (Phân rã công việc con) */}
                                    <div
                                        style={{
                                            background: "#ffffff",
                                            borderRadius: 14,
                                            padding: 18,
                                            border: "1px solid #dbe3ee",
                                            boxShadow: "0 2px 6px rgba(15, 23, 42, 0.04)",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                marginBottom: 12,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    fontWeight: 700,
                                                    fontSize: 14,
                                                    color: "#0f172a",
                                                }}
                                            >
                                                <BranchesOutlined
                                                    style={{ color: "#7c3aed" }}
                                                />
                                                <span>
                                                    Công việc con / Phân rã nhiệm vụ (
                                                    {(task.subtasks || []).length})
                                                </span>
                                            </div>
                                            {(canCreateTask || isAssignee) &&
                                                task.status !== "COMPLETED" &&
                                                task.status !== "CANCELLED" && (
                                                    <Button
                                                        size="small"
                                                        type="primary"
                                                        ghost
                                                        icon={<PlusOutlined />}
                                                        onClick={() => onCreateSubtask(task)}
                                                    >
                                                        Chia việc con
                                                    </Button>
                                                )}
                                        </div>

                                        {(task.subtasks || []).length === 0 ? (
                                            <div style={{ fontSize: 13, color: "#94a3b8" }}>
                                                Chưa có công việc con. Bạn hoặc Cán bộ quản lý có thể
                                                bấm &ldquo;Chia việc con&rdquo; để phân rã nhiệm vụ cho
                                                từng thành viên.
                                            </div>
                                        ) : (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 8,
                                                }}
                                            >
                                                {(task.subtasks || []).map((sub) => {
                                                    const subStatus =
                                                        TASK_STATUS_CONFIG[sub.status] ||
                                                        TASK_STATUS_CONFIG.NEW;
                                                    return (
                                                        <div
                                                            key={sub.id}
                                                            onClick={() => onSelectTask(sub.id)}
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "space-between",
                                                                padding: "10px 12px",
                                                                borderRadius: 10,
                                                                background: "#f8fafc",
                                                                border: "1px solid #e2e8f0",
                                                                cursor: "pointer",
                                                            }}
                                                        >
                                                            <div>
                                                                <div
                                                                    style={{
                                                                        fontWeight: 600,
                                                                        fontSize: 13,
                                                                        color: "#0f172a",
                                                                    }}
                                                                >
                                                                    <Tag
                                                                        color="purple"
                                                                        style={{
                                                                            marginRight: 6,
                                                                        }}
                                                                    >
                                                                        {sub.code}
                                                                    </Tag>
                                                                    {sub.title}
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        fontSize: 12,
                                                                        color: "#64748b",
                                                                        marginTop: 2,
                                                                    }}
                                                                >
                                                                    Thực hiện:{" "}
                                                                    <strong>
                                                                        {sub.assignee?.name ||
                                                                            "—"}
                                                                    </strong>{" "}
                                                                    • Hạn:{" "}
                                                                    {dayjs(
                                                                        sub.deadline
                                                                    ).format("DD/MM/YYYY")}
                                                                </div>
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
                                                                        fontSize: 12,
                                                                        fontWeight: 700,
                                                                        color: subStatus.color,
                                                                        background: subStatus.bg,
                                                                        padding: "2px 8px",
                                                                        borderRadius: 999,
                                                                    }}
                                                                >
                                                                    {subStatus.label} (
                                                                    {sub.progress}%)
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* CARD 4: Attachments & Evidence */}
                                    <div
                                        style={{
                                            background: "#ffffff",
                                            borderRadius: 14,
                                            padding: 18,
                                            border: "1px solid #dbe3ee",
                                            boxShadow: "0 2px 6px rgba(15, 23, 42, 0.04)",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                marginBottom: 12,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    fontWeight: 700,
                                                    fontSize: 14,
                                                    color: "#0f172a",
                                                }}
                                            >
                                                <PaperClipOutlined
                                                    style={{ color: "#2563eb" }}
                                                />
                                                <span>
                                                    Tài liệu đính kèm & Minh chứng nghiệm thu (
                                                    {(task.attachments || []).length})
                                                </span>
                                            </div>
                                            <Upload
                                                beforeUpload={(file) =>
                                                    handleUploadAttachmentOrEvidence(
                                                        file,
                                                        "ATTACHMENT"
                                                    )
                                                }
                                                showUploadList={false}
                                            >
                                                <Button
                                                    size="small"
                                                    icon={<UploadOutlined />}
                                                    loading={uploadingEvidence}
                                                >
                                                    Thêm tệp
                                                </Button>
                                            </Upload>
                                        </div>

                                        {(task.attachments || []).length === 0 ? (
                                            <div style={{ fontSize: 13, color: "#94a3b8" }}>
                                                Chưa có tệp đính kèm hoặc minh chứng.
                                            </div>
                                        ) : (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: 8,
                                                }}
                                            >
                                                {(task.attachments || []).map((att, idx) => (
                                                    <a
                                                        key={`${att.url}_${idx}`}
                                                        href={getBackendImageUrl(att.url)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: 6,
                                                            padding: "6px 12px",
                                                            borderRadius: 8,
                                                            background:
                                                                att.type === "EVIDENCE"
                                                                    ? "#f0fdf4"
                                                                    : "#f8fafc",
                                                            border:
                                                                att.type === "EVIDENCE"
                                                                    ? "1px solid #bbf7d0"
                                                                    : "1px solid #e2e8f0",
                                                            color:
                                                                att.type === "EVIDENCE"
                                                                    ? "#15803d"
                                                                    : "#2563eb",
                                                            fontSize: 12.5,
                                                            fontWeight: 500,
                                                            textDecoration: "none",
                                                        }}
                                                    >
                                                        <PaperClipOutlined />
                                                        <span>{att.name}</span>
                                                        {att.type === "EVIDENCE" && (
                                                            <Tag
                                                                color="green"
                                                                style={{
                                                                    margin: 0,
                                                                    fontSize: 10,
                                                                }}
                                                            >
                                                                Minh chứng
                                                            </Tag>
                                                        )}
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Col>

                            {/* RIGHT COLUMN: Activity Log & Discussion */}
                            <Col xs={24} lg={10}>
                                <div
                                    style={{
                                        background: "#ffffff",
                                        borderRadius: 14,
                                        padding: 18,
                                        border: "1px solid #dbe3ee",
                                        boxShadow: "0 2px 6px rgba(15, 23, 42, 0.04)",
                                        display: "flex",
                                        flexDirection: "column",
                                        height: "100%",
                                        minHeight: 520,
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            marginBottom: 12,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                fontWeight: 700,
                                                fontSize: 14,
                                                color: "#0f172a",
                                            }}
                                        >
                                            <CommentOutlined style={{ color: "#2563eb" }} />
                                            <span>Trao đổi & Nhật ký xử lý</span>
                                        </div>

                                        <div style={{ display: "flex", gap: 4 }}>
                                            {(
                                                [
                                                    { key: "ALL", label: "Tất cả" },
                                                    { key: "COMMENT", label: "Trao đổi" },
                                                    { key: "SYSTEM_LOG", label: "Nhật ký" },
                                                ] as const
                                            ).map((tab) => (
                                                <Button
                                                    key={tab.key}
                                                    size="small"
                                                    type={
                                                        activityFilter === tab.key
                                                            ? "primary"
                                                            : "text"
                                                    }
                                                    onClick={() => setActivityFilter(tab.key)}
                                                    style={{ fontSize: 12 }}
                                                >
                                                    {tab.label}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Comment Input Box */}
                                    <div
                                        style={{
                                            background: "#f8fafc",
                                            border: "1px solid #e2e8f0",
                                            borderRadius: 10,
                                            padding: 10,
                                            marginBottom: 14,
                                        }}
                                    >
                                        <Input.TextArea
                                            rows={2}
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            placeholder="Nhập nội dung trao đổi, báo cáo vướng mắc hoặc chỉ đạo bổ sung..."
                                            style={{
                                                marginBottom: 8,
                                                background: "#fff",
                                            }}
                                        />
                                        {commentAttachments.length > 0 && (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: 4,
                                                    marginBottom: 8,
                                                }}
                                            >
                                                {commentAttachments.map((att, i) => (
                                                    <Tag
                                                        key={i}
                                                        closable
                                                        onClose={() =>
                                                            setCommentAttachments((prev) =>
                                                                prev.filter(
                                                                    (_, idx) => idx !== i
                                                                )
                                                            )
                                                        }
                                                    >
                                                        {att.name}
                                                    </Tag>
                                                ))}
                                            </div>
                                        )}
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                            }}
                                        >
                                            <Upload
                                                beforeUpload={(file) =>
                                                    handleUploadAttachmentOrEvidence(
                                                        file,
                                                        "COMMENT"
                                                    )
                                                }
                                                showUploadList={false}
                                            >
                                                <Button
                                                    size="small"
                                                    icon={<PaperClipOutlined />}
                                                >
                                                    Đính kèm
                                                </Button>
                                            </Upload>
                                            <Button
                                                size="small"
                                                type="primary"
                                                icon={<SendOutlined />}
                                                loading={sendingComment}
                                                onClick={handleSendComment}
                                            >
                                                Gửi phản hồi
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Stream of Comments & System Logs */}
                                    <div
                                        style={{
                                            flex: 1,
                                            overflowY: "auto",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 10,
                                            maxHeight: 420,
                                            paddingRight: 4,
                                        }}
                                    >
                                        {filteredComments.length === 0 ? (
                                            <Empty
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                description="Chưa có trao đổi nào"
                                            />
                                        ) : (
                                            filteredComments.map((item) => {
                                                const isSystem = item.type === "SYSTEM_LOG";
                                                const actType = item.action_type || "";
                                                const contentLower = (
                                                    item.content || ""
                                                ).toLowerCase();

                                                // Detect extension / change request events (both new action_types & legacy logs)
                                                const isChangeRequest =
                                                    actType === "CHANGE_REQUEST" ||
                                                    contentLower.includes("xin gia hạn") ||
                                                    contentLower.includes(
                                                        "đề nghị điều chỉnh"
                                                    );
                                                const isChangeApproved =
                                                    actType === "CHANGE_APPROVED" ||
                                                    contentLower.includes(
                                                        "chấp thuận gia hạn"
                                                    ) ||
                                                    contentLower.includes(
                                                        "chấp thuận điều chỉnh thời hạn"
                                                    );
                                                const isChangeRejected =
                                                    actType === "CHANGE_REJECTED" ||
                                                    contentLower.includes(
                                                        "từ chối gia hạn"
                                                    ) ||
                                                    contentLower.includes(
                                                        "giữ nguyên thời hạn ban đầu"
                                                    );
                                                const isApprovedReview =
                                                    actType === "APPROVED";
                                                const isRejectedReview =
                                                    actType === "REJECTED";
                                                const isReminder = actType === "REMINDER";

                                                let itemBg = isSystem ? "#f1f5f9" : "#eff6ff";
                                                let itemBorder = isSystem
                                                    ? "1px dashed #cbd5e1"
                                                    : "1px solid #bfdbfe";
                                                let itemBorderLeft = isSystem
                                                    ? "3px solid #94a3b8"
                                                    : "3px solid #3b82f6";
                                                let highlightTag: {
                                                    color: string;
                                                    text: string;
                                                } | null = null;

                                                if (isChangeRequest) {
                                                    itemBg = "#fffbeb";
                                                    itemBorder = "1.5px solid #f59e0b";
                                                    itemBorderLeft = "5px solid #d97706";
                                                    highlightTag = {
                                                        color: "warning",
                                                        text: "⏳ XIN GIA HẠN / ĐIỀU CHỈNH",
                                                    };
                                                } else if (isChangeApproved) {
                                                    itemBg = "#ecfdf5";
                                                    itemBorder = "1.5px solid #10b981";
                                                    itemBorderLeft = "5px solid #059669";
                                                    highlightTag = {
                                                        color: "success",
                                                        text: "✅ ĐÃ DUYỆT GIA HẠN",
                                                    };
                                                } else if (isChangeRejected) {
                                                    itemBg = "#fef2f2";
                                                    itemBorder = "1.5px solid #f87171";
                                                    itemBorderLeft = "5px solid #dc2626";
                                                    highlightTag = {
                                                        color: "error",
                                                        text: "❌ TỪ CHỐI GIA HẠN (GIỮ HẠN CŨ)",
                                                    };
                                                } else if (isApprovedReview) {
                                                    itemBg = "#f0fdf4";
                                                    itemBorder = "1px solid #86efac";
                                                    itemBorderLeft = "4px solid #16a34a";
                                                    highlightTag = {
                                                        color: "green",
                                                        text: "🎉 ĐÃ NGHIỆM THU",
                                                    };
                                                } else if (isRejectedReview) {
                                                    itemBg = "#fef2f2";
                                                    itemBorder = "1px solid #fecaca";
                                                    itemBorderLeft = "4px solid #dc2626";
                                                    highlightTag = {
                                                        color: "volcano",
                                                        text: "🔄 YÊU CẦU LÀM LẠI",
                                                    };
                                                } else if (isReminder) {
                                                    itemBg = "#fff7ed";
                                                    itemBorder = "1px solid #fed7aa";
                                                    itemBorderLeft = "4px solid #ea580c";
                                                    highlightTag = {
                                                        color: "orange",
                                                        text: "⚡ ĐÔN ĐỐC TIẾN ĐỘ",
                                                    };
                                                }

                                                return (
                                                    <div
                                                        key={item.id}
                                                        style={{
                                                            padding: "10px 12px",
                                                            borderRadius: 10,
                                                            background: itemBg,
                                                            border: itemBorder,
                                                            borderLeft: itemBorderLeft,
                                                            boxShadow:
                                                                isChangeRequest ||
                                                                isChangeApproved ||
                                                                isChangeRejected
                                                                    ? "0 2px 8px rgba(15, 23, 42, 0.06)"
                                                                    : undefined,
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                justifyContent:
                                                                    "space-between",
                                                                alignItems: "center",
                                                                flexWrap: "wrap",
                                                                gap: 6,
                                                                marginBottom: 4,
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    flexWrap: "wrap",
                                                                    gap: 6,
                                                                }}
                                                            >
                                                                {isSystem ? (
                                                                    <HistoryOutlined
                                                                        style={{
                                                                            color: "#64748b",
                                                                            fontSize: 12,
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <Avatar
                                                                        size={20}
                                                                        src={getBackendImageUrl(
                                                                            item.user?.avatar
                                                                        )}
                                                                        icon={<UserOutlined />}
                                                                    />
                                                                )}
                                                                <span
                                                                    style={{
                                                                        fontSize: 12,
                                                                        fontWeight: 700,
                                                                        color: isSystem
                                                                            ? "#334155"
                                                                            : "#1e3a8a",
                                                                    }}
                                                                >
                                                                    {item.user?.name ||
                                                                        "Hệ thống"}
                                                                </span>
                                                                {highlightTag && (
                                                                    <Tag
                                                                        color={
                                                                            highlightTag.color
                                                                        }
                                                                        style={{
                                                                            margin: 0,
                                                                            fontSize: 10.5,
                                                                            fontWeight: 700,
                                                                            lineHeight:
                                                                                "18px",
                                                                        }}
                                                                    >
                                                                        {highlightTag.text}
                                                                    </Tag>
                                                                )}
                                                            </div>
                                                            <span
                                                                style={{
                                                                    fontSize: 11,
                                                                    color: "#64748b",
                                                                }}
                                                            >
                                                                {dayjs(
                                                                    item.created_at
                                                                ).format("DD/MM/YYYY HH:mm")}
                                                            </span>
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontSize: 13,
                                                                fontWeight:
                                                                    isChangeRequest ||
                                                                    isChangeApproved ||
                                                                    isChangeRejected
                                                                        ? 600
                                                                        : 400,
                                                                color: "#0f172a",
                                                                whiteSpace: "pre-wrap",
                                                            }}
                                                        >
                                                            {item.content}
                                                        </div>
                                                        {(item.attachments || []).length >
                                                            0 && (
                                                            <div
                                                                style={{
                                                                    display: "flex",
                                                                    flexWrap: "wrap",
                                                                    gap: 6,
                                                                    marginTop: 6,
                                                                }}
                                                            >
                                                                {(
                                                                    item.attachments || []
                                                                ).map((att, idx) => (
                                                                    <a
                                                                        key={idx}
                                                                        href={getBackendImageUrl(
                                                                            att.url
                                                                        )}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        style={{
                                                                            fontSize: 12,
                                                                            color: "#2563eb",
                                                                        }}
                                                                    >
                                                                        <PaperClipOutlined />{" "}
                                                                        {att.name}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default TaskDetailModal;
