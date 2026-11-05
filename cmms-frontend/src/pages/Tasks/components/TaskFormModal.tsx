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
    message,
} from "antd";
import {
    PlusOutlined,
    DeleteOutlined,
    UploadOutlined,
    PaperClipOutlined,
    BranchesOutlined,
    CheckSquareOutlined,
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
    assignee_id: number;
    collaborator_ids?: number[];
    watcher_ids?: number[];
    start_date?: dayjs.Dayjs;
    deadline: dayjs.Dayjs;
    kpi_weight: number;
    tags?: string[];
}

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
                collaborator_ids: collabs,
                watcher_ids: watchers,
                start_date: editingTask.start_date ? dayjs(editingTask.start_date) : dayjs(),
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
            const errorMsg = err instanceof Error ? err.message : "Tải tệp thất bại";
            message.error(errorMsg);
        } finally {
            setUploading(false);
        }
        return false;
    };

    const handleFinish = async (values: TaskFormValues) => {
        setSubmitting(true);
        try {
            const collaborators: ITaskCollaborator[] = [];
            const userMap = new Map(users.map((u) => [u.user_id, u.name]));

            (values.collaborator_ids || []).forEach((uid) => {
                if (uid !== values.assignee_id) {
                    collaborators.push({
                        user_id: uid,
                        name: userMap.get(uid) || `NV #${uid}`,
                        role: "COLLABORATOR",
                    });
                }
            });

            (values.watcher_ids || []).forEach((uid) => {
                if (
                    uid !== values.assignee_id &&
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
                parent_id: parentTask ? parentTask.id : editingTask?.parent_id || null,
                dept_id: values.dept_id || null,
                device_group_id: values.device_group_id || null,
                assignee_id: values.assignee_id,
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
                message.success(
                    parentTask
                        ? `Đã chia việc con cho công việc ${parentTask.code}`
                        : "Đã giao công việc mới thành công"
                );
            }

            onSuccess(result);
            onClose();
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Lỗi lưu công việc";
            message.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const selectedDeptId = Form.useWatch("dept_id", form);
    const selectedDeviceGroupId = Form.useWatch("device_group_id", form);

    // Lọc danh sách nhân sự được phép giao việc theo cấp bậc (Ban Giám đốc -> Đội -> Tổ -> Nhân viên)
    const allowedUsers = React.useMemo(() => {
        if (!assignmentContext || assignmentContext.hierarchyTier === "DIRECTOR") {
            return users;
        }
        const allowedSet = new Set<number>(assignmentContext.assignableUserIds || []);
        return users.filter((u) => allowedSet.has(u.user_id));
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

    const assigneeOptions = (
        filteredUsers.length > 0 ? filteredUsers : allowedUsers
    ).map((u) => ({
        value: u.user_id,
        label: `${u.name}${u.position ? ` — ${u.position}` : ""}${
            u.department?.name ? ` (${u.department.name})` : ""
        }`,
    }));

    const allUserOptions = users.map((u) => ({
        value: u.user_id,
        label: `${u.name}${u.position ? ` — ${u.position}` : ""}`,
    }));

    return (
        <Modal
            open={open}
            onCancel={onClose}
            width={820}
            destroyOnClose
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {parentTask ? (
                        <>
                            <BranchesOutlined style={{ color: "#7c3aed", fontSize: 18 }} />
                            <span>
                                Chia việc con (Subtask) thuộc:{" "}
                                <Tag color="purple" style={{ marginLeft: 4 }}>
                                    {parentTask.code} — {parentTask.title}
                                </Tag>
                            </span>
                        </>
                    ) : (
                        <span>
                            {editingTask
                                ? `Chỉnh sửa công việc: ${editingTask.code}`
                                : "Giao việc mới"}
                        </span>
                    )}
                </div>
            }
            footer={
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <Button onClick={onClose}>Hủy</Button>
                    <Button
                        type="primary"
                        loading={submitting}
                        onClick={() => form.submit()}
                    >
                        {editingTask
                            ? "Lưu thay đổi"
                            : parentTask
                            ? "Giao việc con"
                            : "Giao việc ngay"}
                    </Button>
                </div>
            }
        >
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
                        <Tag color="blue" style={{ marginLeft: 4, fontWeight: 600 }}>
                            {assignmentContext.hierarchyLabel}
                        </Tag>
                    </span>
                    <span style={{ color: "#475569", fontSize: 12 }}>
                        Luồng chuẩn: Ban Giám đốc ➔ Đội (phó) trưởng ➔ Tổ (phó) trưởng ➔ Nhân
                        viên ({allowedUsers.length} nhân sự trong phạm vi nhận việc)
                    </span>
                </div>
            )}

            <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Row gutter={12}>
                    <Col span={24}>
                        <Form.Item
                            name="title"
                            label="Tên công việc / Nhiệm vụ"
                            rules={[
                                { required: true, message: "Vui lòng nhập tên công việc" },
                            ]}
                        >
                            <Input
                                size="large"
                                placeholder="VD: Kiểm tra kỹ thuật hệ thống xe thang định kỳ tháng 11"
                            />
                        </Form.Item>
                    </Col>

                    <Col xs={24} sm={8}>
                        <Form.Item name="task_type" label="Phân loại công việc">
                            <Select
                                options={Object.entries(TASK_TYPE_CONFIG).map(([k, v]) => ({
                                    value: k,
                                    label: v.label,
                                }))}
                            />
                        </Form.Item>
                    </Col>

                    <Col xs={24} sm={8}>
                        <Form.Item name="priority" label="Mức độ ưu tiên">
                            <Select
                                options={Object.entries(TASK_PRIORITY_CONFIG).map(
                                    ([k, v]) => ({
                                        value: k,
                                        label: v.label,
                                    })
                                )}
                            />
                        </Form.Item>
                    </Col>

                    <Col xs={24} sm={8}>
                        <Form.Item name="project_id" label="Thuộc Dự án / Chiến dịch">
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

                    <Col xs={24} sm={8}>
                        <Form.Item name="dept_id" label="Đơn vị / Tổ Đội thực hiện">
                            <Select
                                allowClear
                                showSearch
                                optionFilterProp="label"
                                placeholder="Chọn Đội / Tổ để lọc"
                                options={filteredDepartments.map((d) => ({
                                    value: d.dept_id,
                                    label: d.name,
                                }))}
                            />
                        </Form.Item>
                    </Col>

                    <Col xs={24} sm={8}>
                        <Form.Item
                            name="device_group_id"
                            label="Nhóm trang thiết bị (Cùng nhóm thấy task)"
                            tooltip="Các nhân sự thuộc cùng Nhóm trang thiết bị sẽ nhìn thấy công việc của nhau để phối hợp"
                        >
                            <Select
                                allowClear
                                showSearch
                                optionFilterProp="label"
                                placeholder="-- Tự động theo người nhận --"
                                options={availableDeviceGroups.map((dg) => ({
                                    value: dg.id,
                                    label: `${dg.name}${
                                        dg.dept_name ? ` (${dg.dept_name})` : ""
                                    }`,
                                }))}
                            />
                        </Form.Item>
                    </Col>

                    <Col xs={24} sm={8}>
                        <Form.Item
                            name="assignee_id"
                            label="Người chịu trách nhiệm chính (Main Assignee)"
                            rules={[
                                {
                                    required: true,
                                    message: "Vui lòng chọn người nhận việc chính",
                                },
                            ]}
                        >
                            <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder="Chọn cấp dưới thực hiện"
                                options={assigneeOptions}
                            />
                        </Form.Item>
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
                                optionFilterProp="label"
                                placeholder="Chọn người theo dõi..."
                                options={allUserOptions}
                            />
                        </Form.Item>
                    </Col>

                    <Col xs={24} sm={9}>
                        <Form.Item name="start_date" label="Thời điểm bắt đầu">
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
                                { required: true, message: "Vui lòng chọn hạn hoàn thành" },
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
                            label="Trọng số KPI (Hệ số)"
                            tooltip="Hệ số điểm KPI (từ 0.5 đến 5.0) dùng để quy đổi điểm đánh giá khi nghiệm thu"
                        >
                            <InputNumber
                                min={0.5}
                                max={10}
                                step={0.5}
                                style={{ width: "100%" }}
                            />
                        </Form.Item>
                    </Col>

                    <Col span={24}>
                        <Form.Item
                            name="description"
                            label="Mô tả chi tiết & Yêu cầu đầu ra (Output cần đạt)"
                        >
                            <Input.TextArea
                                rows={3}
                                placeholder="Mô tả nội dung công việc, tiêu chuẩn nghiệm thu, tài liệu minh chứng cần nộp..."
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
                                marginBottom: 14,
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    fontWeight: 600,
                                    color: "#1e293b",
                                    marginBottom: 8,
                                }}
                            >
                                <CheckSquareOutlined style={{ color: "#2563eb" }} />
                                <span>Checklist các bước thực hiện ({checklist.length})</span>
                            </div>

                            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                <Input
                                    value={newCheckItemTitle}
                                    onChange={(e) => setNewCheckItemTitle(e.target.value)}
                                    onPressEnter={(e) => {
                                        e.preventDefault();
                                        handleAddCheckItem();
                                    }}
                                    placeholder="Nhập đầu mục kiểm tra rồi nhấn Enter hoặc Thêm..."
                                />
                                <Button
                                    icon={<PlusOutlined />}
                                    onClick={handleAddCheckItem}
                                >
                                    Thêm mục
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
                                                justifyContent: "space-between",
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
                                                                          e.target.checked,
                                                                  }
                                                                : c
                                                        )
                                                    )
                                                }
                                            >
                                                <span style={{ fontSize: 13 }}>
                                                    {idx + 1}. {item.title}
                                                </span>
                                            </Checkbox>
                                            <Button
                                                size="small"
                                                type="text"
                                                danger
                                                icon={<DeleteOutlined />}
                                                onClick={() => handleRemoveCheckItem(item.id)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Col>

                    <Col xs={24} sm={12}>
                        <Form.Item name="tags" label="Nhãn phân loại (Tags)">
                            <Select
                                mode="tags"
                                placeholder="Nhập nhãn rồi Enter (VD: An toàn, Khẩn, Quý 4)"
                                options={[
                                    { value: "An toàn", label: "An toàn" },
                                    { value: "Kỹ thuật", label: "Kỹ thuật" },
                                    { value: "Báo cáo", label: "Báo cáo" },
                                    { value: "Kiểm định", label: "Kiểm định" },
                                    { value: "Nội bộ", label: "Nội bộ" },
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
                                <Button icon={<UploadOutlined />} loading={uploading}>
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
                                                    prev.filter((_, i) => i !== idx)
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
            </Form>
        </Modal>
    );
};

export default TaskFormModal;
