import React, { useState } from "react";
import {
    Modal,
    Form,
    Input,
    Select,
    DatePicker,
    Button,
    Table,
    Tag,
    Space,
    Popconfirm,
    message,
    Row,
    Col,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    FolderOpenOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
    ICreateProjectPayload,
    ITaskProject,
    TaskProjectStatus,
} from "../../../types/tasks.types";
import { IDepartment, IUser } from "../../../types/user.types";
import {
    createTaskProject,
    updateTaskProject,
    deleteTaskProject,
} from "../../../apis/tasks";
import { PROJECT_STATUS_CONFIG } from "../taskConstants";

interface ProjectModalProps {
    open: boolean;
    onClose: () => void;
    projects: ITaskProject[];
    departments: IDepartment[];
    users: IUser[];
    onRefresh: () => void;
}

interface ProjectFormValues {
    name: string;
    description?: string;
    status: TaskProjectStatus;
    dept_id?: number;
    manager_id?: number;
    date_range?: [dayjs.Dayjs, dayjs.Dayjs];
}

const ProjectModal: React.FC<ProjectModalProps> = ({
    open,
    onClose,
    projects,
    departments,
    users,
    onRefresh,
}) => {
    const [form] = Form.useForm<ProjectFormValues>();
    const [editingProject, setEditingProject] = useState<ITaskProject | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleOpenCreate = () => {
        setEditingProject(null);
        form.resetFields();
        form.setFieldsValue({ status: "ACTIVE" });
        setShowForm(true);
    };

    const handleOpenEdit = (project: ITaskProject) => {
        setEditingProject(project);
        form.setFieldsValue({
            name: project.name,
            description: project.description || undefined,
            status: project.status,
            dept_id: project.dept_id || undefined,
            manager_id: project.manager_id || undefined,
            date_range:
                project.start_date && project.end_date
                    ? [dayjs(project.start_date), dayjs(project.end_date)]
                    : undefined,
        });
        setShowForm(true);
    };

    const handleSubmit = async (values: ProjectFormValues) => {
        setSubmitting(true);
        try {
            const payload: ICreateProjectPayload = {
                name: values.name.trim(),
                description: values.description?.trim() || undefined,
                status: values.status,
                dept_id: values.dept_id || null,
                manager_id: values.manager_id || null,
                start_date: values.date_range?.[0]
                    ? values.date_range[0].format("YYYY-MM-DD")
                    : null,
                end_date: values.date_range?.[1]
                    ? values.date_range[1].format("YYYY-MM-DD")
                    : null,
            };

            if (editingProject) {
                await updateTaskProject(editingProject.id, payload);
                message.success("Đã cập nhật dự án / chiến dịch");
            } else {
                await createTaskProject(payload);
                message.success("Đã tạo dự án / chiến dịch mới");
            }
            setShowForm(false);
            setEditingProject(null);
            form.resetFields();
            onRefresh();
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Lỗi xử lý dự án";
            message.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteTaskProject(id);
            message.success("Đã xóa dự án");
            onRefresh();
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Không thể xóa dự án";
            message.error(errorMsg);
        }
    };

    const columns: ColumnsType<ITaskProject> = [
        {
            title: "Mã DA",
            dataIndex: "code",
            key: "code",
            width: 120,
            render: (code: string) => (
                <Tag color="geekblue" style={{ fontWeight: 600 }}>
                    {code}
                </Tag>
            ),
        },
        {
            title: "Tên dự án / Chiến dịch",
            dataIndex: "name",
            key: "name",
            render: (name: string, record: ITaskProject) => (
                <div>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{name}</div>
                    {record.description && (
                        <div style={{ fontSize: 12, color: "#64748b" }}>{record.description}</div>
                    )}
                </div>
            ),
        },
        {
            title: "Đơn vị chủ trì",
            key: "department",
            width: 160,
            render: (_: unknown, record: ITaskProject) =>
                record.department?.name || <span style={{ color: "#94a3b8" }}>Toàn công ty</span>,
        },
        {
            title: "Người phụ trách",
            key: "manager",
            width: 160,
            render: (_: unknown, record: ITaskProject) =>
                record.manager?.name || <span style={{ color: "#94a3b8" }}>—</span>,
        },
        {
            title: "Thời gian",
            key: "dates",
            width: 170,
            render: (_: unknown, record: ITaskProject) => {
                if (!record.start_date && !record.end_date) {
                    return <span style={{ color: "#94a3b8" }}>—</span>;
                }
                return (
                    <span style={{ fontSize: 12, color: "#475569" }}>
                        {record.start_date ? dayjs(record.start_date).format("DD/MM/YYYY") : "..."} →{" "}
                        {record.end_date ? dayjs(record.end_date).format("DD/MM/YYYY") : "..."}
                    </span>
                );
            },
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            width: 140,
            render: (status: TaskProjectStatus) => {
                const cfg = PROJECT_STATUS_CONFIG[status] || PROJECT_STATUS_CONFIG.ACTIVE;
                return <Tag color={cfg.color}>{cfg.label}</Tag>;
            },
        },
        {
            title: "Thao tác",
            key: "actions",
            width: 100,
            align: "center",
            render: (_: unknown, record: ITaskProject) => (
                <Space size={4}>
                    <Button
                        size="small"
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleOpenEdit(record)}
                    />
                    <Popconfirm
                        title="Xóa dự án này?"
                        description="Các công việc thuộc dự án sẽ được chuyển sang không thuộc dự án."
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Modal
            open={open}
            onCancel={onClose}
            width={920}
            footer={null}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FolderOpenOutlined style={{ color: "#2563eb", fontSize: 18 }} />
                    <span>Quản lý Dự án & Chiến dịch công việc</span>
                </div>
            }
        >
            {showForm ? (
                <div
                    style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 16,
                    }}
                >
                    <div
                        style={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: "#0f172a",
                            marginBottom: 12,
                        }}
                    >
                        {editingProject
                            ? `Chỉnh sửa dự án: ${editingProject.code}`
                            : "Thêm Dự án / Chiến dịch mới"}
                    </div>
                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                        <Row gutter={12}>
                            <Col span={14}>
                                <Form.Item
                                    name="name"
                                    label="Tên dự án / Chiến dịch"
                                    rules={[{ required: true, message: "Nhập tên dự án" }]}
                                >
                                    <Input placeholder="VD: Chiến dịch bảo dưỡng định kỳ Quý II/2026" />
                                </Form.Item>
                            </Col>
                            <Col span={10}>
                                <Form.Item name="status" label="Trạng thái">
                                    <Select
                                        options={Object.entries(PROJECT_STATUS_CONFIG).map(
                                            ([k, v]) => ({
                                                value: k,
                                                label: v.label,
                                            })
                                        )}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="dept_id" label="Đơn vị chủ trì">
                                    <Select
                                        allowClear
                                        placeholder="Chọn phòng ban / đội"
                                        options={departments.map((d) => ({
                                            value: d.dept_id,
                                            label: d.name,
                                        }))}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="manager_id" label="Người phụ trách">
                                    <Select
                                        allowClear
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder="Chọn người phụ trách"
                                        options={users.map((u) => ({
                                            value: u.user_id,
                                            label: `${u.name} (${u.position || u.role})`,
                                        }))}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="date_range" label="Thời gian thực hiện">
                                    <DatePicker.RangePicker
                                        style={{ width: "100%" }}
                                        format="DD/MM/YYYY"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item name="description" label="Mô tả mục tiêu">
                                    <Input.TextArea
                                        rows={2}
                                        placeholder="Mô tả phạm vi, mục tiêu cần đạt của dự án..."
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <Button
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingProject(null);
                                }}
                            >
                                Hủy
                            </Button>
                            <Button type="primary" htmlType="submit" loading={submitting}>
                                {editingProject ? "Lưu cập nhật" : "Tạo dự án"}
                            </Button>
                        </div>
                    </Form>
                </div>
            ) : (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                    }}
                >
                    <span style={{ color: "#64748b", fontSize: 13 }}>
                        Nhóm các công việc theo Dự án hoặc Chiến dịch để theo dõi tiến độ tổng thể.
                    </span>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleOpenCreate}
                    >
                        Thêm Dự án / Chiến dịch
                    </Button>
                </div>
            )}

            <Table
                rowKey="id"
                columns={columns}
                dataSource={projects}
                size="small"
                pagination={{ pageSize: 6 }}
            />
        </Modal>
    );
};

export default ProjectModal;

