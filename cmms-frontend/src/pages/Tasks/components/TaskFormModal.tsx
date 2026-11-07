import React, { useEffect, useState } from "react";
import {
    Modal,
    Form,
    Input,
    Select,
    DatePicker,
    InputNumber,
    Button,
    Row,
    Col,
    Tag,
    Upload,
    Checkbox,
    Alert,
    Space,
    Grid,
    message,
} from "antd";
import {
    PlusOutlined,
    DeleteOutlined,
    UploadOutlined,
    PaperClipOutlined,
    BranchesOutlined,
    CheckSquareOutlined,
    ThunderboltOutlined,
    RocketOutlined,
    ClearOutlined,
    UsergroupAddOutlined,
    ClockCircleOutlined,
    TrophyOutlined,
    TeamOutlined,
    FolderOpenOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
    ICreateTaskPayload,
    ITaskAssignmentContext,
    ITaskAttachment,
    ITaskChecklistItem,
    ITaskCollaborator,
    ITaskProject,
    IWorkTask,
    WorkTaskPriority,
    WorkTaskType,
} from "../../../types/tasks.types";
import { IDepartment, IUser } from "../../../types/user.types";
import { createTask, updateTask, uploadTaskFile } from "../../../apis/tasks";
import { optimizeImageBeforeUpload } from "../../../utils/imageOptimizer";
import { TASK_PRIORITY_CONFIG, TASK_TYPE_CONFIG } from "../taskConstants";
import { emitTaskAlert } from "../../../components/TaskNotificationPopup";

interface TaskFormModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (task: IWorkTask) => void;
    editingTask?: IWorkTask | null;
    parentTask?: IWorkTask | null;
    projects: ITaskProject[];
    departments: IDepartment[];
    users: IUser[];
    assignmentContext?: ITaskAssignmentContext | null;
}

interface TaskFormValues {
    title: string;
    description?: string;
    task_type: WorkTaskType;
    priority: WorkTaskPriority;
    project_id?: number;
    dept_id?: number;
    device_group_id?: number;
    assignee_id?: number;
    assignee_ids?: number[];
    collaborator_ids?: number[];
    watcher_ids?: number[];
    start_date?: dayjs.Dayjs;
    deadline: dayjs.Dayjs;
    kpi_weight: number;
    tags?: string[];
}

const sectionBoxStyle: React.CSSProperties = {
    background: "#ffffff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: "14px 16px",
    marginBottom: 16,
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
};

const sectionTitleStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13.5,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 12,
    paddingBottom: 6,
    borderBottom: "1px solid #f1f5f9",
};

const TaskFormModal: React.FC<TaskFormModalProps> = ({
    open,
    onClose,
    onSuccess,
    editingTask,
    parentTask,
    projects,
    departments,
    users,
    assignmentContext,
}) => {
    const [form] = Form.useForm<TaskFormValues>();
    const [checklist, setChecklist] = useState<ITaskChecklistItem[]>([]);
    const [newCheckItemTitle, setNewCheckItemTitle] = useState("");
    const [attachments, setAttachments] = useState<ITaskAttachment[]>([]);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;

        if (editingTask) {
            const collabs = (editingTask.collaborators || [])
                .filter((c) => c.role === "COLLABORATOR")
                .map((c) => c.user_id);
            const watchers = (editingTask.collaborators || [])
                .filter((c) => c.role === "WATCHER")
                .map((c) => c.user_id);

            form.setFieldsValue({
                title: editingTask.title,
                description: editingTask.description || undefined,
                task_type: editingTask.task_type,
                priority: editingTask.priority,
                project_id: editingTask.project_id || undefined,
                dept_id: editingTask.dept_id || undefined,
                device_group_id: editingTask.device_group_id || undefined,
                assignee_id: editingTask.assignee_id,
                assignee_ids: [editingTask.assignee_id],
                collaborator_ids: collabs,
                watcher_ids: watchers,
                start_date: editingTask.start_date
                    ? dayjs(editingTask.start_date)
                    : dayjs(),
                deadline: dayjs(editingTask.deadline),
                kpi_weight: Number(editingTask.kpi_weight || 1),
                tags: editingTask.tags || [],
            });
            setChecklist(editingTask.checklist || []);
            setAttachments(editingTask.attachments || []);
        } else {
            form.resetFields();
            form.setFieldsValue({
                task_type: parentTask?.task_type || "DIRECTIVE",
                priority: parentTask?.priority || "NORMAL",
                project_id: parentTask?.project_id || undefined,
                dept_id: parentTask?.dept_id || undefined,
                device_group_id: parentTask?.device_group_id || undefined,
                assignee_ids: [],
                start_date: dayjs(),
                deadline: parentTask?.deadline
                    ? dayjs(parentTask.deadline)
                    : dayjs().add(3, "day").hour(17).minute(0),
                kpi_weight: 1,
                tags: [],
            });
            setChecklist([]);
            setAttachments([]);
        }
        setNewCheckItemTitle("");
    }, [open, editingTask, parentTask, form]);

    const handleAddCheckItem = () => {
        const trimmed = newCheckItemTitle.trim();
        if (!trimmed) return;
        const item: ITaskChecklistItem = {
            id: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            title: trimmed,
            completed: false,
        };
        setChecklist((prev) => [...prev, item]);
        setNewCheckItemTitle("");
    };

    const handleRemoveCheckItem = (id: string) => {
        setChecklist((prev) => prev.filter((item) => item.id !== id));
    };

    const handleUploadFile = async (file: File) => {
        setUploading(true);
        try {
            let fileToUpload = file;
            if (file.type.startsWith("image/")) {
                fileToUpload = await optimizeImageBeforeUpload(file, 1600, 0.82);
            }
            const uploaded = await uploadTaskFile(fileToUpload);
            setAttachments((prev) => [
                ...prev,
                {
                    name: uploaded.name || file.name,
                    url: uploaded.url,
                    type: "ATTACHMENT",
                    uploaded_at: new Date().toISOString(),
                },
            ]);
            message.success(`Đã đính kèm: ${file.name}`);
        } catch (err) {
            const errorMsg =
                err instanceof Error ? err.message : "Tải tệp thất bại";
            message.error(errorMsg);
        } finally {
            setUploading(false);
        }
        return false;
    };

    // Watch fields
    const selectedDeptId = Form.useWatch("dept_id", form);
    const selectedDeviceGroupId = Form.useWatch("device_group_id", form);
    const selectedAssigneeIds = Form.useWatch("assignee_ids", form) || [];

    // Lọc danh sách nhân sự được phép giao việc theo cấp bậc (Ban Giám đốc -> Đội -> Tổ -> Nhân viên)
    // BẮT BUỘC loại bỏ mọi tài khoản ngưng hoạt động / đã khóa
    const allowedUsers = React.useMemo(() => {
        const activeUsers = users.filter(
            (u) => !u.status || u.status.trim().toLowerCase() === "active"
        );
        if (!assignmentContext || assignmentContext.hierarchyTier === "DIRECTOR") {
            return activeUsers;
        }
        const allowedSet = new Set<number>(assignmentContext.assignableUserIds || []);
        return activeUsers.filter((u) => allowedSet.has(u.user_id));
    }, [users, assignmentContext]);

    const filteredDepartments = React.useMemo(() => {
        if (!assignmentContext || assignmentContext.hierarchyTier === "DIRECTOR") {
            return departments;
        }
        const managedSet = new Set<number>(assignmentContext.managedDeptIds || []);
        const list = departments.filter((d) => managedSet.has(d.dept_id));
        return list.length > 0 ? list : departments;
    }, [departments, assignmentContext]);

    const availableDeviceGroups = React.useMemo(() => {
        if (!assignmentContext) return [];
        if (assignmentContext.hierarchyTier === "DIRECTOR") {
            return assignmentContext.allDeviceGroups || [];
        }
        const myGroupIds = new Set<number>(
            (assignmentContext.myDeviceGroups || []).map((g) => g.id)
        );
        return (assignmentContext.allDeviceGroups || []).filter((g) =>
            myGroupIds.has(g.id)
        );
    }, [assignmentContext]);

    const filteredUsers = React.useMemo(() => {
        let base = allowedUsers;
        if (selectedDeptId) {
            base = base.filter(
                (u) =>
                    u.department?.dept_id === selectedDeptId ||
                    u.user_departments?.some((ud) => ud.dept_id === selectedDeptId)
            );
        }
        if (selectedDeviceGroupId && assignmentContext) {
            const groupObj = (assignmentContext.allDeviceGroups || []).find(
                (g) => g.id === selectedDeviceGroupId
            );
            if (groupObj && groupObj.member_ids && groupObj.member_ids.length > 0) {
                const memberSet = new Set<number>(groupObj.member_ids);
                base = base.filter((u) => memberSet.has(u.user_id));
            }
        }
        return base;
    }, [allowedUsers, selectedDeptId, selectedDeviceGroupId, assignmentContext]);

    // Danh sách Nhóm trưởng trang thiết bị khả dụng
    const deviceGroupLeads = React.useMemo(() => {
        const leadUserIds = new Set<number>();
        (assignmentContext?.allDeviceGroups || []).forEach((dg) => {
            if (dg.leader_id) leadUserIds.add(dg.leader_id);
        });
        (assignmentContext?.myDeviceGroups || []).forEach((dg) => {
            if (dg.is_lead && assignmentContext?.userId) {
                leadUserIds.add(assignmentContext.userId);
            }
        });
        return allowedUsers.filter((u) => leadUserIds.has(u.user_id));
    }, [allowedUsers, assignmentContext]);

    // Quick Action Handlers
    const handleSelectAllDeviceLeads = () => {
        const leadIds = deviceGroupLeads.map((u) => u.user_id);
        if (leadIds.length === 0) {
            message.warning("Không tìm thấy Nhóm trưởng trang thiết bị nào trong phạm vi quản lý");
            return;
        }
        form.setFieldsValue({ assignee_ids: leadIds });
        message.success(`Đã chọn ${leadIds.length} Nhóm trưởng trang thiết bị`);
    };

    const handleSelectAllFilteredUsers = () => {
        const targetList = filteredUsers.length > 0 ? filteredUsers : allowedUsers;
        const allIds = targetList.map((u) => u.user_id);
        if (allIds.length === 0) {
            message.warning("Không có nhân sự nào trong danh sách hiện tại");
            return;
        }
        form.setFieldsValue({ assignee_ids: allIds });
        message.success(`Đã chọn toàn bộ ${allIds.length} nhân sự`);
    };

    const handleClearAllAssignees = () => {
        form.setFieldsValue({ assignee_ids: [] });
    };

    // Quick Deadline Presets
    const handleSetDeadlinePreset = (
        type: "TODAY_17" | "TOMORROW_17" | "PLUS_3_DAYS" | "WEEKEND" | "MONTH_END"
    ) => {
        let target = dayjs().hour(17).minute(0).second(0);
        if (type === "TODAY_17") {
            target = dayjs().hour(17).minute(0).second(0);
            if (target.isBefore(dayjs())) {
                target = target.add(1, "day");
            }
        } else if (type === "TOMORROW_17") {
            target = dayjs().add(1, "day").hour(17).minute(0).second(0);
        } else if (type === "PLUS_3_DAYS") {
            target = dayjs().add(3, "day").hour(17).minute(0).second(0);
        } else if (type === "WEEKEND") {
            const daysToSunday = (7 - dayjs().day()) % 7 || 7;
            target = dayjs().add(daysToSunday, "day").hour(17).minute(0).second(0);
        } else if (type === "MONTH_END") {
            target = dayjs().endOf("month").hour(17).minute(0).second(0);
        }
        form.setFieldsValue({ deadline: target });
        message.info(`Đã đặt hạn hoàn thành: ${target.format("DD/MM/YYYY HH:mm")}`);
    };

    const handleFinish = async (values: TaskFormValues) => {
        setSubmitting(true);
        try {
            const targetAssigneeIds: number[] = editingTask
                ? values.assignee_id
                    ? [values.assignee_id]
                    : []
                : values.assignee_ids && values.assignee_ids.length > 0
                ? values.assignee_ids
                : values.assignee_id
                ? [values.assignee_id]
                : [];

            if (targetAssigneeIds.length === 0) {
                message.warning("Vui lòng chọn ít nhất một người chịu trách nhiệm chính");
                setSubmitting(false);
                return;
            }

            const collaborators: ITaskCollaborator[] = [];
            const userMap = new Map(users.map((u) => [u.user_id, u.name]));

            (values.collaborator_ids || []).forEach((uid) => {
                if (!targetAssigneeIds.includes(uid)) {
                    collaborators.push({
                        user_id: uid,
                        name: userMap.get(uid) || `NV #${uid}`,
                        role: "COLLABORATOR",
                    });
                }
            });

            (values.watcher_ids || []).forEach((uid) => {
                if (
                    !targetAssigneeIds.includes(uid) &&
                    !collaborators.some((c) => c.user_id === uid)
                ) {
                    collaborators.push({
                        user_id: uid,
                        name: userMap.get(uid) || `NV #${uid}`,
                        role: "WATCHER",
                    });
                }
            });

            const payload: ICreateTaskPayload = {
                title: values.title.trim(),
                description: values.description?.trim() || undefined,
                task_type: values.task_type,
                priority: values.priority,
                project_id: values.project_id || null,
                parent_id: parentTask
                    ? parentTask.id
                    : editingTask?.parent_id || null,
                dept_id: values.dept_id || null,
                device_group_id: values.device_group_id || null,
                assignee_id: targetAssigneeIds[0],
                assignee_ids: targetAssigneeIds,
                collaborators,
                start_date: values.start_date
                    ? values.start_date.toISOString()
                    : new Date().toISOString(),
                deadline: values.deadline.toISOString(),
                kpi_weight: values.kpi_weight || 1,
                checklist,
                attachments,
                tags: values.tags || [],
            };

            let result: IWorkTask;
            if (editingTask) {
                result = await updateTask(editingTask.id, payload);
                message.success("Đã cập nhật thông tin công việc");
            } else {
                result = await createTask(payload);
                emitTaskAlert({
                    message: parentTask
                        ? `Đã chia việc con [${result.code}] "${result.title}"`
                        : `Đã giao thành công công việc [${result.code}] "${result.title}"`,
                    title: "Giao việc thành công",
                    taskId: result.id,
                    taskCode: result.code,
                    actionType: "TASK_DISPATCHED",
                });
                if (targetAssigneeIds.length > 1) {
                    message.success(
                        `🚀 Đã giao việc hàng loạt thành công cho ${targetAssigneeIds.length} nhân sự!`
                    );
                } else {
                    message.success(
                        parentTask
                            ? `Đã chia việc con cho công việc ${parentTask.code}`
                            : "Đã giao công việc mới thành công"
                    );
                }
            }

            onSuccess(result);
            onClose();
        } catch (err) {
            const errorMsg =
                err instanceof Error ? err.message : "Lỗi lưu công việc";
            message.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    // Assignee dropdown options with rich labels
    const assigneeOptions = (
        filteredUsers.length > 0 ? filteredUsers : allowedUsers
    ).map((u) => {
        const isDeviceLead = (assignmentContext?.allDeviceGroups || []).some(
            (dg) => dg.leader_id === u.user_id
        );
        const primaryDept =
            u.department?.name || u.user_departments?.[0]?.dept_id
                ? departments.find(
                      (d) => d.dept_id === u.user_departments?.[0]?.dept_id
                  )?.name
                : undefined;

        return {
            value: u.user_id,
            label: `${u.name}${isDeviceLead ? " ⚙[Nhóm trưởng]" : ""}${
                u.position ? ` — ${u.position}` : ""
            }${primaryDept ? ` (${primaryDept})` : ""}`,
        };
    });

    const allUserOptions = React.useMemo(() => {
        return users
            .filter((u) => !u.status || u.status.trim().toLowerCase() === "active")
            .map((u) => ({
                value: u.user_id,
                label: `${u.name}${u.position ? ` — ${u.position}` : ""}`,
            }));
    }, [users]);

    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const isBatchMode = !editingTask && selectedAssigneeIds.length > 1;

    return (
        <Modal
            open={open}
            onCancel={onClose}
            width={isMobile ? "100%" : 880}
            destroyOnClose
            style={isMobile ? { top: 0, maxWidth: "100vw", margin: 0, paddingBottom: 0 } : { top: 20 }}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {parentTask ? (
                        <>
                            <BranchesOutlined
                                style={{ color: "#7c3aed", fontSize: 20 }}
                            />
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700 }}>
                                    Chia việc con (Subtask)
                                </div>
                                <div style={{ fontSize: 12, color: "#64748b" }}>
                                    Thuộc công việc gốc:{" "}
                                    <Tag color="purple" style={{ margin: 0 }}>
                                        {parentTask.code} — {parentTask.title}
                                    </Tag>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <RocketOutlined
                                style={{ color: "#2563eb", fontSize: 20 }}
                            />
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700 }}>
                                    {editingTask
                                        ? `Chỉnh sửa công việc: ${editingTask.code}`
                                        : "Giao việc mới (Đơn lẻ & Hàng loạt)"}
                                </div>
                                <div style={{ fontSize: 12, color: "#64748b" }}>
                                    Nhập form 1 lần — Giao độc lập cho 1 hoặc
                                    nhiều nhân sự cùng lúc
                                </div>
                            </div>
                        </>
                    )}
                </div>
            }
            footer={
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <div style={{ fontSize: 12.5, color: "#475569" }}>
                        {isBatchMode ? (
                            <span style={{ color: "#2563eb", fontWeight: 600 }}>
                                🚀 Chế độ hàng loạt: Sẽ sinh{" "}
                                <strong>{selectedAssigneeIds.length}</strong>{" "}
                                công việc độc lập
                            </span>
                        ) : (
                            <span>
                                Người nhận:{" "}
                                <strong>
                                    {selectedAssigneeIds.length === 1
                                        ? users.find(
                                              (u) =>
                                                  u.user_id ===
                                                  selectedAssigneeIds[0]
                                          )?.name || "1 người"
                                        : "Chưa chọn"}
                                </strong>
                            </span>
                        )}
                    </div>

                    <Space>
                        <Button onClick={onClose}>Hủy</Button>
                        <Button
                            type="primary"
                            size="large"
                            loading={submitting}
                            onClick={() => form.submit()}
                            style={{
                                background: isBatchMode
                                    ? "linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)"
                                    : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                                fontWeight: 600,
                                minWidth: 140,
                            }}
                        >
                            {editingTask
                                ? "Lưu thay đổi"
                                : parentTask
                                ? "Giao việc con"
                                : isBatchMode
                                ? `🚀 Giao hàng loạt (${selectedAssigneeIds.length} người)`
                                : "Giao việc ngay"}
                        </Button>
                    </Space>
                </div>
            }
        >
            {/* Context Badge */}
            {assignmentContext && (
                <div
                    style={{
                        marginBottom: 14,
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        fontSize: 12.5,
                        color: "#1e3a8a",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 8,
                    }}
                >
                    <span>
                        <strong>Cấp phân quyền của bạn:</strong>{" "}
                        <Tag
                            color="blue"
                            style={{ marginLeft: 4, fontWeight: 600 }}
                        >
                            {assignmentContext.hierarchyLabel}
                        </Tag>
                    </span>
                    <span style={{ color: "#475569", fontSize: 12 }}>
                        {parentTask
                            ? `Phân rã việc con cho đồng đội cùng Tổ / cùng Nhóm trang thiết bị (${allowedUsers.length} nhân sự)`
                            : `Phạm vi giao việc: ${allowedUsers.length} nhân sự (Ban Giám đốc ➔ Đội trưởng ➔ Tổ trưởng ➔ Nhân viên)`}
                    </span>
                </div>
            )}

            <Form form={form} layout="vertical" onFinish={handleFinish}>
                {/* SECTION 1: THÔNG TIN CÔNG VIỆC */}
                <div style={sectionBoxStyle}>
                    <div style={sectionTitleStyle}>
                        <FolderOpenOutlined style={{ color: "#2563eb" }} />
                        <span>1. Thông tin công việc & Phân loại</span>
                    </div>

                    <Row gutter={12}>
                        <Col span={24}>
                            <Form.Item
                                name="title"
                                label="Tên công việc / Nhiệm vụ"
                                rules={[
                                    {
                                        required: true,
                                        message: "Vui lòng nhập tên công việc",
                                    },
                                ]}
                            >
                                <Input
                                    size="large"
                                    placeholder="VD: Kiểm tra kỹ thuật hệ thống xe thang định kỳ tháng 11"
                                    style={{ fontWeight: 600 }}
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={8}>
                            <Form.Item
                                name="task_type"
                                label="Phân loại công việc"
                            >
                                <Select
                                    options={Object.entries(
                                        TASK_TYPE_CONFIG
                                    ).map(([k, v]) => ({
                                        value: k,
                                        label: v.label,
                                    }))}
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={8}>
                            <Form.Item
                                name="priority"
                                label="Mức độ ưu tiên"
                            >
                                <Select
                                    options={Object.entries(
                                        TASK_PRIORITY_CONFIG
                                    ).map(([k, v]) => ({
                                        value: k,
                                        label: v.label,
                                    }))}
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={8}>
                            <Form.Item
                                name="project_id"
                                label="Thuộc Dự án / Chiến dịch"
                            >
                                <Select
                                    allowClear
                                    showSearch
                                    optionFilterProp="label"
                                    placeholder="-- Không thuộc dự án --"
                                    options={projects.map((p) => ({
                                        value: p.id,
                                        label: `[${p.code}] ${p.name}`,
                                    }))}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </div>

                {/* SECTION 2: PHÂN CÔNG TRÁCH NHIỆM & GIAO HÀNG LOẠT */}
                <div style={sectionBoxStyle}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 8,
                            marginBottom: 10,
                            paddingBottom: 6,
                            borderBottom: "1px solid #f1f5f9",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 13.5,
                                fontWeight: 700,
                                color: "#0f172a",
                            }}
                        >
                            <TeamOutlined style={{ color: "#2563eb" }} />
                            <span>
                                2. Phân công trách nhiệm (Hỗ trợ Giao hàng loạt)
                            </span>
                        </div>

                        {!editingTask && (
                            <Space size={6} wrap>
                                <Button
                                    size="small"
                                    icon={<ThunderboltOutlined />}
                                    onClick={handleSelectAllDeviceLeads}
                                    style={{
                                        color: "#0369a1",
                                        background: "#e0f2fe",
                                        borderColor: "#bae6fd",
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                    }}
                                >
                                    ⚡ Tất cả Nhóm trưởng TB (
                                    {deviceGroupLeads.length})
                                </Button>
                                <Button
                                    size="small"
                                    icon={<UsergroupAddOutlined />}
                                    onClick={handleSelectAllFilteredUsers}
                                    style={{
                                        color: "#4338ca",
                                        background: "#e0e7ff",
                                        borderColor: "#c7d2fe",
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                    }}
                                >
                                    ⚡ Toàn bộ nhân sự (
                                    {filteredUsers.length || allowedUsers.length}
                                    )
                                </Button>
                                {selectedAssigneeIds.length > 0 && (
                                    <Button
                                        size="small"
                                        danger
                                        type="text"
                                        icon={<ClearOutlined />}
                                        onClick={handleClearAllAssignees}
                                        style={{ fontSize: 11.5 }}
                                    >
                                        Bỏ chọn
                                    </Button>
                                )}
                            </Space>
                        )}
                    </div>

                    <Row gutter={12}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="dept_id"
                                label="Lọc theo Đơn vị / Tổ Đội"
                            >
                                <Select
                                    allowClear
                                    showSearch
                                    optionFilterProp="label"
                                    placeholder="Chọn Đội / Tổ để lọc danh sách"
                                    options={filteredDepartments.map((d) => ({
                                        value: d.dept_id,
                                        label: d.name,
                                    }))}
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="device_group_id"
                                label="Nhóm trang thiết bị"
                                tooltip="Gán vào Nhóm trang thiết bị để các thành viên trong nhóm thấy và phối hợp"
                            >
                                <Select
                                    allowClear
                                    showSearch
                                    optionFilterProp="label"
                                    placeholder="-- Tự động theo người nhận --"
                                    options={availableDeviceGroups.map((dg) => ({
                                        value: dg.id,
                                        label: `${dg.name}${
                                            dg.dept_name
                                                ? ` (${dg.dept_name})`
                                                : ""
                                        }`,
                                    }))}
                                />
                            </Form.Item>
                        </Col>

                        {/* Người chịu trách nhiệm chính */}
                        <Col span={24}>
                            {editingTask ? (
                                <Form.Item
                                    name="assignee_id"
                                    label="Người chịu trách nhiệm chính"
                                    rules={[
                                        {
                                            required: true,
                                            message:
                                                "Vui lòng chọn người nhận việc",
                                        },
                                    ]}
                                >
                                    <Select
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder="Chọn nhân sự thực hiện..."
                                        options={assigneeOptions}
                                    />
                                </Form.Item>
                            ) : (
                                <Form.Item
                                    name="assignee_ids"
                                    label={
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                            }}
                                        >
                                            <span style={{ fontWeight: 600 }}>
                                                Người chịu trách nhiệm chính
                                                (Chọn 1 hoặc nhiều người)
                                            </span>
                                            {selectedAssigneeIds.length > 0 && (
                                                <Tag
                                                    color={
                                                        selectedAssigneeIds.length >
                                                        1
                                                            ? "purple"
                                                            : "blue"
                                                    }
                                                    style={{
                                                        margin: 0,
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    Đã chọn:{" "}
                                                    {selectedAssigneeIds.length}{" "}
                                                    người
                                                </Tag>
                                            )}
                                        </div>
                                    }
                                    rules={[
                                        {
                                            required: true,
                                            message:
                                                "Vui lòng chọn ít nhất một người chịu trách nhiệm chính",
                                        },
                                    ]}
                                >
                                    <Select
                                        mode="multiple"
                                        allowClear
                                        showSearch
                                        maxTagCount="responsive"
                                        optionFilterProp="label"
                                        placeholder="Tìm theo tên, chức vụ, tổ, nhóm trang thiết bị... (chọn nhiều người)"
                                        options={assigneeOptions}
                                    />
                                </Form.Item>
                            )}

                            {isBatchMode && (
                                <Alert
                                    type="info"
                                    showIcon
                                    icon={<RocketOutlined />}
                                    style={{
                                        marginBottom: 12,
                                        borderRadius: 8,
                                        background: "#f0fdf4",
                                        border: "1px solid #bbf7d0",
                                    }}
                                    message={
                                        <span
                                            style={{
                                                fontSize: 12.5,
                                                color: "#166534",
                                                fontWeight: 600,
                                            }}
                                        >
                                            Đang bật Giao việc hàng loạt: Hệ
                                            thống sẽ tự động tạo riêng{" "}
                                            <strong>
                                                {selectedAssigneeIds.length}
                                            </strong>{" "}
                                            công việc độc lập cho{" "}
                                            <strong>
                                                {selectedAssigneeIds.length}
                                            </strong>{" "}
                                            nhân sự đã chọn với cùng nội dung,
                                            hạn chót và checklist này.
                                        </span>
                                    }
                                />
                            )}
                        </Col>

                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="collaborator_ids"
                                label="Người phối hợp thực hiện (Collaborators)"
                            >
                                <Select
                                    mode="multiple"
                                    allowClear
                                    showSearch
                                    maxTagCount="responsive"
                                    optionFilterProp="label"
                                    placeholder="Chọn nhân sự phối hợp..."
                                    options={allUserOptions}
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="watcher_ids"
                                label="Người theo dõi / Giám sát (Watchers)"
                            >
                                <Select
                                    mode="multiple"
                                    allowClear
                                    showSearch
                                    maxTagCount="responsive"
                                    optionFilterProp="label"
                                    placeholder="Chọn người theo dõi..."
                                    options={allUserOptions}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </div>

                {/* SECTION 3: THỜI HẠN & ĐÁNH GIÁ KPI */}
                <div style={sectionBoxStyle}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 8,
                            marginBottom: 10,
                            paddingBottom: 6,
                            borderBottom: "1px solid #f1f5f9",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 13.5,
                                fontWeight: 700,
                                color: "#0f172a",
                            }}
                        >
                            <ClockCircleOutlined style={{ color: "#2563eb" }} />
                            <span>3. Thời hạn & Trọng số KPI</span>
                        </div>

                        <Space size={4} wrap>
                            <span
                                style={{
                                    fontSize: 11.5,
                                    color: "#64748b",
                                    marginRight: 4,
                                }}
                            >
                                Đặt nhanh hạn:
                            </span>
                            <Button
                                size="small"
                                onClick={() =>
                                    handleSetDeadlinePreset("TODAY_17")
                                }
                                style={{ fontSize: 11 }}
                            >
                                Hôm nay 17h
                            </Button>
                            <Button
                                size="small"
                                onClick={() =>
                                    handleSetDeadlinePreset("TOMORROW_17")
                                }
                                style={{ fontSize: 11 }}
                            >
                                Ngày mai 17h
                            </Button>
                            <Button
                                size="small"
                                onClick={() =>
                                    handleSetDeadlinePreset("PLUS_3_DAYS")
                                }
                                style={{ fontSize: 11 }}
                            >
                                +3 ngày
                            </Button>
                            <Button
                                size="small"
                                onClick={() =>
                                    handleSetDeadlinePreset("WEEKEND")
                                }
                                style={{ fontSize: 11 }}
                            >
                                Cuối tuần
                            </Button>
                            <Button
                                size="small"
                                onClick={() =>
                                    handleSetDeadlinePreset("MONTH_END")
                                }
                                style={{ fontSize: 11 }}
                            >
                                Cuối tháng
                            </Button>
                        </Space>
                    </div>

                    <Row gutter={12}>
                        <Col xs={24} sm={9}>
                            <Form.Item
                                name="start_date"
                                label="Thời điểm bắt đầu"
                            >
                                <DatePicker
                                    showTime={{ format: "HH:mm" }}
                                    format="DD/MM/YYYY HH:mm"
                                    style={{ width: "100%" }}
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={9}>
                            <Form.Item
                                name="deadline"
                                label="Hạn hoàn thành (Deadline)"
                                rules={[
                                    {
                                        required: true,
                                        message: "Vui lòng chọn hạn hoàn thành",
                                    },
                                ]}
                            >
                                <DatePicker
                                    showTime={{ format: "HH:mm" }}
                                    format="DD/MM/YYYY HH:mm"
                                    style={{ width: "100%" }}
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={6}>
                            <Form.Item
                                name="kpi_weight"
                                label={
                                    <span>
                                        <TrophyOutlined
                                            style={{
                                                color: "#eab308",
                                                marginRight: 4,
                                            }}
                                        />
                                        Hệ số KPI
                                    </span>
                                }
                                tooltip="Hệ số điểm KPI (từ 0.5 đến 5.0) dùng để tính điểm đánh giá thi đua khi nghiệm thu"
                            >
                                <InputNumber
                                    min={0.5}
                                    max={10}
                                    step={0.5}
                                    style={{ width: "100%" }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </div>

                {/* SECTION 4: MÔ TẢ & CHECKLIST */}
                <div style={sectionBoxStyle}>
                    <div style={sectionTitleStyle}>
                        <CheckSquareOutlined style={{ color: "#2563eb" }} />
                        <span>4. Yêu cầu chi tiết & Checklist các bước</span>
                    </div>

                    <Row gutter={12}>
                        <Col span={24}>
                            <Form.Item
                                name="description"
                                label="Mô tả chi tiết & Yêu cầu đầu ra (Output)"
                            >
                                <Input.TextArea
                                    rows={3}
                                    placeholder="Mô tả rõ yêu cầu công việc, tiêu chuẩn kỹ thuật, an toàn và biên bản cần nộp..."
                                />
                            </Form.Item>
                        </Col>

                        {/* Checklist Builder */}
                        <Col span={24}>
                            <div
                                style={{
                                    background: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 10,
                                    padding: 12,
                                    marginBottom: 10,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 8,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontWeight: 600,
                                            fontSize: 13,
                                            color: "#334155",
                                        }}
                                    >
                                        Các bước / Hạng mục kiểm tra (
                                        {checklist.length} mục)
                                    </span>
                                    {checklist.length > 0 && (
                                        <span
                                            style={{
                                                fontSize: 11.5,
                                                color: "#64748b",
                                            }}
                                        >
                                            Checklist này sẽ được sao chép đầy
                                            đủ cho từng người nhận
                                        </span>
                                    )}
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        gap: 8,
                                        marginBottom: 8,
                                    }}
                                >
                                    <Input
                                        value={newCheckItemTitle}
                                        onChange={(e) =>
                                            setNewCheckItemTitle(e.target.value)
                                        }
                                        onPressEnter={(e) => {
                                            e.preventDefault();
                                            handleAddCheckItem();
                                        }}
                                        placeholder="Nhập hạng mục kiểm tra rồi bấm Enter hoặc Thêm..."
                                    />
                                    <Button
                                        icon={<PlusOutlined />}
                                        onClick={handleAddCheckItem}
                                    >
                                        Thêm
                                    </Button>
                                </div>

                                {checklist.length > 0 && (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 6,
                                            maxHeight: 160,
                                            overflowY: "auto",
                                        }}
                                    >
                                        {checklist.map((item, idx) => (
                                            <div
                                                key={item.id}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent:
                                                        "space-between",
                                                    background: "#fff",
                                                    padding: "6px 10px",
                                                    borderRadius: 6,
                                                    border: "1px solid #e2e8f0",
                                                }}
                                            >
                                                <Checkbox
                                                    checked={item.completed}
                                                    onChange={(e) =>
                                                        setChecklist((prev) =>
                                                            prev.map((c) =>
                                                                c.id === item.id
                                                                    ? {
                                                                          ...c,
                                                                          completed:
                                                                              e
                                                                                  .target
                                                                                  .checked,
                                                                      }
                                                                    : c
                                                            )
                                                        )
                                                    }
                                                >
                                                    <span
                                                        style={{ fontSize: 13 }}
                                                    >
                                                        {idx + 1}. {item.title}
                                                    </span>
                                                </Checkbox>
                                                <Button
                                                    size="small"
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() =>
                                                        handleRemoveCheckItem(
                                                            item.id
                                                        )
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Col>
                    </Row>
                </div>

                {/* SECTION 5: TÀI LIỆU & NHÃN */}
                <div style={sectionBoxStyle}>
                    <div style={sectionTitleStyle}>
                        <PaperClipOutlined style={{ color: "#2563eb" }} />
                        <span>5. Tài liệu đính kèm & Nhãn phân loại</span>
                    </div>

                    <Row gutter={12}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="tags"
                                label="Nhãn phân loại (Tags)"
                            >
                                <Select
                                    mode="tags"
                                    placeholder="Nhập nhãn rồi Enter (VD: An toàn, Khẩn, Định kỳ)"
                                    options={[
                                        { value: "An toàn", label: "An toàn" },
                                        {
                                            value: "Kỹ thuật",
                                            label: "Kỹ thuật",
                                        },
                                        {
                                            value: "Định kỳ",
                                            label: "Định kỳ",
                                        },
                                        {
                                            value: "Báo cáo",
                                            label: "Báo cáo",
                                        },
                                        {
                                            value: "Kiểm định",
                                            label: "Kiểm định",
                                        },
                                        {
                                            value: "Khẩn cấp",
                                            label: "Khẩn cấp",
                                        },
                                    ]}
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={12}>
                            <Form.Item label="Tài liệu / Biểu mẫu đính kèm">
                                <Upload
                                    beforeUpload={handleUploadFile}
                                    showUploadList={false}
                                    multiple
                                >
                                    <Button
                                        icon={<UploadOutlined />}
                                        loading={uploading}
                                    >
                                        Đính kèm tệp / hình ảnh
                                    </Button>
                                </Upload>
                                {attachments.length > 0 && (
                                    <div
                                        style={{
                                            marginTop: 8,
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 6,
                                        }}
                                    >
                                        {attachments.map((att, idx) => (
                                            <Tag
                                                key={`${att.url}_${idx}`}
                                                closable
                                                onClose={() =>
                                                    setAttachments((prev) =>
                                                        prev.filter(
                                                            (_, i) => i !== idx
                                                        )
                                                    )
                                                }
                                                icon={<PaperClipOutlined />}
                                                color="blue"
                                            >
                                                {att.name}
                                            </Tag>
                                        ))}
                                    </div>
                                )}
                            </Form.Item>
                        </Col>
                    </Row>
                </div>
            </Form>
        </Modal>
    );
};

export default TaskFormModal;
