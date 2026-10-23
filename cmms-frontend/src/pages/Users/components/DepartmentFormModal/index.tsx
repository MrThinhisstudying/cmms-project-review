import React, { useEffect, useState, useMemo } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  Checkbox,
  Row,
  Col,
  Typography,
  message,
  Select,
  Space,
  Switch,
  Tabs,
  Card,
  Tag,
  Badge,
} from "antd";
import {
  ApartmentOutlined,
  EditOutlined,
  CrownOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useDepartmentsContext } from "../../../../context/DepartmentsContext/DepartmentsContext";
import { useUsersContext } from "../../../../context/UsersContext/UsersContext";
import { DEPARTMENT_PERMISSIONS } from "../../../../constants/user";
import { IDepartment } from "../../../../types/user.types";

interface Props {
  open: boolean;
  onClose: (changed?: boolean) => void;
  editingId: number | null;
  defaultParentId?: number | null;
}

const { Text } = Typography;

const DepartmentFormModal: React.FC<Props> = ({
  open,
  onClose,
  editingId,
  defaultParentId,
}) => {
  const { departments, addDepartment, editDepartment } = useDepartmentsContext();
  const { users, fetchUsers } = useUsersContext();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("info");
  const [currentDept, setCurrentDept] = useState<IDepartment | null>(null);

  // Watch dynamic form fields for reactive UI
  const watchedLevel = Form.useWatch("level", form) || (defaultParentId ? "TO" : "DOI");
  const watchedPermissions = Form.useWatch("permissions", form) || [];

  const isInitializedRef = React.useRef(false);

  // Nhóm các quyền theo nghiệp vụ chuyên biệt
  const devicePermissions = useMemo(
    () => DEPARTMENT_PERMISSIONS.filter((p) => p.code.includes("DEVICE")),
    []
  );

  const repairPermissions = useMemo(
    () =>
      DEPARTMENT_PERMISSIONS.filter(
        (p) =>
          p.code.includes("REPAIR") ||
          p.code.includes("approve") ||
          p.code.includes("sign") ||
          p.code.includes("create_inspection")
      ),
    []
  );

  const otherPermissions = useMemo(
    () =>
      DEPARTMENT_PERMISSIONS.filter(
        (p) =>
          !p.code.includes("DEVICE") &&
          !p.code.includes("REPAIR") &&
          !p.code.includes("approve") &&
          !p.code.includes("sign") &&
          !p.code.includes("create_inspection")
      ),
    []
  );

  // Danh sách các Đội khả dụng làm cấp trên
  const parentOptions = useMemo(() => {
    return departments.filter(
      (d) => (!editingId || d.dept_id !== editingId) && d.level === "DOI"
    );
  }, [departments, editingId]);

  useEffect(() => {
    if (!open) {
      isInitializedRef.current = false;
      return;
    }

    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    setActiveTab("info");
    if (users.length === 0) fetchUsers();

    if (editingId) {
      const dept = departments.find((d) => d.dept_id === editingId);
      if (dept) {
        setCurrentDept(dept);
        form.setFieldsValue({
          name: dept.name,
          description: dept.description,
          permissions: dept.permissions || [],
          manager_id: dept.manager_id || (dept.manager as any)?.user_id,
          deputy_id: dept.deputy_id || (dept.deputy as any)?.user_id,
          parent_id: dept.parent_id || (dept as any).parent?.dept_id,
          level: dept.level || "TO",
          is_technical: dept.is_technical || false,
          scope: dept.scope || "DEPARTMENT",
        });
      }
    } else {
      setCurrentDept(null);
      form.resetFields();
      if (defaultParentId) {
        const parentDept = departments.find((d) => d.dept_id === defaultParentId);
        form.setFieldsValue({
          name: "",
          parent_id: defaultParentId,
          level: "TO",
          is_technical: parentDept?.is_technical ?? true,
          scope: "DEPARTMENT",
          permissions: [
            "CREATE_REPAIR",
            "VIEW_REPAIR",
            "UPDATE_REPAIR",
            "PERFORM_MAINTENANCE",
          ],
        });
      } else {
        form.setFieldsValue({
          name: "",
          level: "DOI",
          is_technical: false,
          scope: "DEPARTMENT",
          permissions: [],
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId, defaultParentId]);

  // Khi người dùng đổi cấp (Đội <-> Tổ)
  const handleLevelChange = (level: string) => {
    if (level === "DOI") {
      form.setFieldsValue({ parent_id: null });
    } else if (level === "TO" && !form.getFieldValue("parent_id") && parentOptions.length > 0) {
      form.setFieldsValue({ parent_id: parentOptions[0].dept_id });
    }
  };

  // Các thao tác chọn nhanh quyền
  const handleSelectAllPerms = () => {
    const allCodes = DEPARTMENT_PERMISSIONS.map((p) => p.code);
    form.setFieldsValue({ permissions: allCodes });
  };

  const handleClearAllPerms = () => {
    form.setFieldsValue({ permissions: [] });
  };

  const handleDefaultTechPerms = () => {
    const techCodes = [
      "ADD_DEVICE",
      "UPDATE_DEVICE",
      "CREATE_REPAIR",
      "VIEW_REPAIR",
      "UPDATE_REPAIR",
      "APPROVE_REPAIR",
      "EXPORT_REPAIR",
      "EXPORT_MAINTENANCE",
      "PERFORM_MAINTENANCE",
    ];
    form.setFieldsValue({ permissions: techCodes });
  };

  // Lưu thông tin đơn vị (Xử lý trực tiếp, không phụ thuộc form submit native)
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        name: values.name.trim(),
        description: values.description ? values.description.trim() : null,
        permissions: values.permissions || [],
        manager_id: values.manager_id || null,
        deputy_id: values.deputy_id || null,
        parent_id: values.level === "DOI" ? null : (values.parent_id || null),
        level: values.level,
        is_technical: values.is_technical || false,
        scope: values.scope || "DEPARTMENT",
      };

      if (editingId) {
        await editDepartment(editingId, payload);
        message.success("Cập nhật đơn vị thành công");
      } else {
        await addDepartment(payload);
        message.success("Thêm đơn vị thành công");
      }
      onClose(true);
    } catch (err: any) {
      if (err.errorFields) {
        setActiveTab("info");
        message.warning("Vui lòng kiểm tra lại các trường bắt buộc");
      } else {
        message.error(err.message || "Thao tác thất bại");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: editingId ? "#e6f7ff" : "#f0f5ff",
              border: `1px solid ${editingId ? "#91d5ff" : "#adc6ff"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1890ff",
              fontSize: 20,
            }}
          >
            {editingId ? <EditOutlined /> : <ApartmentOutlined />}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1f1f1f" }}>
              {editingId
                ? `Cập nhật: ${currentDept?.name || "Đơn vị tổ chức"}`
                : defaultParentId
                ? "Thêm Tổ con trực thuộc Đội"
                : "Thêm Đơn vị Tổ chức mới"}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c", fontWeight: 400 }}>
              {editingId
                ? `ID: #${editingId} • Cấp bậc: ${
                    watchedLevel === "DOI" ? "🏢 Đội quản lý" : "👥 Tổ chuyên môn"
                  }`
                : "Phân cấp cơ cấu chuẩn: 🏢 Đội (Trưởng/Phó) → 👥 Tổ (Trưởng/Phó) → ⚙️ Nhóm Kỹ thuật"}
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={() => onClose(false)}
      width={840}
      destroyOnClose
      style={{ top: 24 }}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <InfoCircleOutlined style={{ marginRight: 4 }} />
            Đơn vị kỹ thuật sẽ được liên kết trực tiếp vào cây phân cấp thiết bị & sửa chữa.
          </Text>
          <Space>
            <Button onClick={() => onClose(false)}>Hủy</Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={loading}
              icon={editingId ? <CheckCircleOutlined /> : <ApartmentOutlined />}
              style={{ minWidth: 120, height: 38, fontWeight: 500 }}
            >
              {editingId ? "Lưu cập nhật" : "Tạo đơn vị mới"}
            </Button>
          </Space>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 8 }}
        onSubmitCapture={(e) => {
          e.preventDefault();
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "info",
              label: (
                <span style={{ fontWeight: 500 }}>
                  <ApartmentOutlined /> 1. Cơ cấu & Lãnh đạo
                </span>
              ),
              children: (
                <div style={{ marginTop: 8 }}>
                  {/* Hàng 1: Tên đơn vị & Cấp bậc */}
                  <Row gutter={16}>
                    <Col span={15}>
                      <Form.Item
                        name="name"
                        label="Tên đơn vị"
                        rules={[{ required: true, message: "Vui lòng nhập tên đơn vị" }]}
                      >
                        <Input
                          placeholder={
                            watchedLevel === "DOI"
                              ? "Ví dụ: Đội kỹ thuật, Đội vận hành, Ban giám đốc..."
                              : "Ví dụ: Tổ kỹ thuật, Tổ VHTTBMĐ, Tổ bảo dưỡng..."
                          }
                          size="large"
                          style={{ borderRadius: 6 }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={9}>
                      <Form.Item
                        name="level"
                        label="Cấp bậc đơn vị"
                        rules={[{ required: true }]}
                        tooltip="Đội là đơn vị cấp cao nhất. Tổ trực thuộc 1 Đội."
                      >
                        <Select
                          size="large"
                          onChange={handleLevelChange}
                          style={{ borderRadius: 6 }}
                        >
                          <Select.Option value="DOI">
                            <Space>
                              <span>🏢</span>
                              <strong>Đội (Cấp 1)</strong>
                            </Space>
                          </Select.Option>
                          <Select.Option value="TO">
                            <Space>
                              <span>👥</span>
                              <strong>Tổ (Cấp 2)</strong>
                            </Space>
                          </Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  {/* Hàng 2: Cấp trên & Switch Kỹ thuật */}
                  <Row gutter={16} align="middle">
                    <Col span={15}>
                      <Form.Item
                        name="parent_id"
                        label="Đơn vị quản lý cấp trên (Đội)"
                        rules={[
                          {
                            required: watchedLevel === "TO",
                            message: "Tổ chuyên môn bắt buộc phải thuộc 1 Đội cấp trên",
                          },
                        ]}
                      >
                        <Select
                          placeholder={
                            watchedLevel === "DOI"
                              ? "— Đội là cấp cao nhất (không có cấp trên) —"
                              : "Chọn Đội quản lý trực tiếp..."
                          }
                          disabled={watchedLevel === "DOI"}
                          allowClear={watchedLevel !== "TO"}
                          showSearch
                          optionFilterProp="children"
                          size="large"
                        >
                          {parentOptions.map((d) => (
                            <Select.Option key={d.dept_id} value={d.dept_id}>
                              🏢 {d.name} {d.is_technical ? "(Kỹ thuật)" : ""}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>

                    <Col span={9}>
                      <Form.Item
                        label="Tính chất kỹ thuật"
                        style={{ marginBottom: 24 }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "#fafafa",
                            border: "1px solid #e8e8e8",
                            borderRadius: 6,
                            padding: "6px 12px",
                            height: 40,
                          }}
                        >
                          <Space size={6}>
                            <ToolOutlined style={{ color: "#1890ff" }} />
                            <span style={{ fontSize: 13, fontWeight: 500 }}>Đơn vị Kỹ thuật</span>
                          </Space>
                          <Form.Item
                            name="is_technical"
                            valuePropName="checked"
                            noStyle
                          >
                            <Switch
                              checkedChildren="KT"
                              unCheckedChildren="Ko"
                            />
                          </Form.Item>
                        </div>
                      </Form.Item>
                    </Col>
                  </Row>

                  {/* Hàng 3: Lãnh đạo Đội/Tổ */}
                  <Card
                    size="small"
                    title={
                      <Space>
                        <CrownOutlined style={{ color: "#faad14" }} />
                        <span>
                          Nhân sự Lãnh đạo {watchedLevel === "DOI" ? "Đội" : "Tổ"}
                        </span>
                      </Space>
                    }
                    style={{
                      background: "#fcfcff",
                      borderColor: "#d6e4ff",
                      marginBottom: 16,
                      borderRadius: 8,
                    }}
                  >
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="manager_id"
                          label={
                            watchedLevel === "DOI" ? "👑 Đội trưởng" : "👑 Tổ trưởng"
                          }
                          style={{ marginBottom: 8 }}
                          tooltip="Người đứng đầu chịu trách nhiệm ký duyệt và phân công nhiệm vụ"
                        >
                          <Select
                            placeholder={`Chọn ${
                              watchedLevel === "DOI" ? "Đội trưởng" : "Tổ trưởng"
                            }`}
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            size="middle"
                          >
                            {users.map((u) => (
                              <Select.Option key={u.user_id} value={u.user_id}>
                                {u.name} {u.employee_code ? `[${u.employee_code}]` : ""} {u.position ? `— ${u.position}` : ""}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>

                      <Col span={12}>
                        <Form.Item
                          name="deputy_id"
                          label={
                            watchedLevel === "DOI" ? "🛡️ Đội phó" : "🛡️ Tổ phó"
                          }
                          style={{ marginBottom: 8 }}
                          tooltip="Phó đơn vị hỗ trợ điều hành và thay mặt ký khi vắng mặt"
                        >
                          <Select
                            placeholder={`Chọn ${
                              watchedLevel === "DOI" ? "Đội phó" : "Tổ phó"
                            }`}
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            size="middle"
                          >
                            {users.map((u) => (
                              <Select.Option key={u.user_id} value={u.user_id}>
                                {u.name} {u.employee_code ? `[${u.employee_code}]` : ""} {u.position ? `— ${u.position}` : ""}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>

                  {/* Hàng 4: Phạm vi & Mô tả */}
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="scope"
                        label="Phạm vi hiển thị & Dữ liệu"
                        initialValue="DEPARTMENT"
                        tooltip="Quy định tầm nhìn phiếu sửa chữa, bảo dưỡng mà thành viên đơn vị nhìn thấy"
                      >
                        <Select size="middle">
                          <Select.Option value="DEPARTMENT">
                            🏢 Theo phòng ban (Thấy phiếu cùng phòng/đơn vị)
                          </Select.Option>
                          <Select.Option value="GROUP">
                            ⚙️ Theo nhóm (Chỉ thấy phiếu thuộc Nhóm TTB)
                          </Select.Option>
                          <Select.Option value="PERSONAL">
                            👤 Cá nhân (Chỉ thấy phiếu do chính mình tạo)
                          </Select.Option>
                          <Select.Option value="ALL">
                            🌐 Toàn hệ thống (Admin / Ban giám đốc)
                          </Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="description" label="Mô tả chức năng & nhiệm vụ">
                        <Input.TextArea
                          rows={2}
                          placeholder="Mô tả chức năng, nhiệm vụ phụ trách chính của đơn vị..."
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              ),
            },
            {
              key: "permissions",
              label: (
                <span style={{ fontWeight: 500 }}>
                  <SafetyCertificateOutlined /> 2. Phân quyền chức năng (
                  <Badge
                    count={watchedPermissions.length}
                    style={{
                      backgroundColor: watchedPermissions.length > 0 ? "#1890ff" : "#d9d9d9",
                    }}
                  />
                  )
                </span>
              ),
              children: (
                <div style={{ marginTop: 8 }}>
                  {/* Toolbar hành động nhanh */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                      padding: "8px 12px",
                      background: "#f0f5ff",
                      borderRadius: 6,
                      border: "1px solid #d6e4ff",
                    }}
                  >
                    <div>
                      <Text strong style={{ color: "#1d39c4", fontSize: 13 }}>
                        🔐 Danh sách quyền được cấp:
                      </Text>{" "}
                      <Tag color="blue">{watchedPermissions.length} / {DEPARTMENT_PERMISSIONS.length} quyền</Tag>
                    </div>

                    <Space size={8}>
                      <Button
                        size="small"
                        icon={<ThunderboltOutlined />}
                        onClick={handleDefaultTechPerms}
                        style={{ color: "#722ed1", borderColor: "#d3adf7" }}
                      >
                        Mặc định Kỹ thuật
                      </Button>
                      <Button
                        size="small"
                        icon={<CheckCircleOutlined />}
                        onClick={handleSelectAllPerms}
                      >
                        Chọn tất cả
                      </Button>
                      <Button
                        size="small"
                        icon={<CloseCircleOutlined />}
                        onClick={handleClearAllPerms}
                      >
                        Bỏ chọn
                      </Button>
                    </Space>
                  </div>

                  <Form.Item name="permissions" noStyle>
                    <Checkbox.Group style={{ width: "100%" }}>
                      {/* Nhóm 1: Quản lý thiết bị */}
                      <Card
                        size="small"
                        title={
                          <Space>
                            <ToolOutlined style={{ color: "#1890ff" }} />
                            <span style={{ fontWeight: 600 }}>Quản lý Trang thiết bị</span>
                          </Space>
                        }
                        style={{ marginBottom: 12, borderRadius: 6 }}
                      >
                        <Row gutter={[12, 10]}>
                          {devicePermissions.map((perm) => (
                            <Col span={12} key={perm.code}>
                              <Checkbox value={perm.code} style={{ alignItems: "flex-start" }}>
                                <div>
                                  <div style={{ fontWeight: 500, fontSize: 13 }}>{perm.name}</div>
                                  <div style={{ fontSize: 11, color: "#8c8c8c" }}>{perm.description}</div>
                                </div>
                              </Checkbox>
                            </Col>
                          ))}
                        </Row>
                      </Card>

                      {/* Nhóm 2: Quy trình sửa chữa */}
                      <Card
                        size="small"
                        title={
                          <Space>
                            <SafetyCertificateOutlined style={{ color: "#fa8c16" }} />
                            <span style={{ fontWeight: 600 }}>Quy trình Sửa chữa & Phê duyệt</span>
                          </Space>
                        }
                        style={{ marginBottom: 12, borderRadius: 6 }}
                      >
                        <Row gutter={[12, 10]}>
                          {repairPermissions.map((perm) => (
                            <Col span={12} key={perm.code}>
                              <Checkbox value={perm.code} style={{ alignItems: "flex-start" }}>
                                <div>
                                  <div style={{ fontWeight: 500, fontSize: 13 }}>{perm.name}</div>
                                  <div style={{ fontSize: 11, color: "#8c8c8c" }}>{perm.description}</div>
                                </div>
                              </Checkbox>
                            </Col>
                          ))}
                        </Row>
                      </Card>

                      {/* Nhóm 3: Bảo dưỡng & Báo cáo */}
                      <Card
                        size="small"
                        title={
                          <Space>
                            <CheckCircleOutlined style={{ color: "#52c41a" }} />
                            <span style={{ fontWeight: 600 }}>Bảo dưỡng & Báo cáo</span>
                          </Space>
                        }
                        style={{ borderRadius: 6 }}
                      >
                        <Row gutter={[12, 10]}>
                          {otherPermissions.map((perm) => (
                            <Col span={12} key={perm.code}>
                              <Checkbox value={perm.code} style={{ alignItems: "flex-start" }}>
                                <div>
                                  <div style={{ fontWeight: 500, fontSize: 13 }}>{perm.name}</div>
                                  <div style={{ fontSize: 11, color: "#8c8c8c" }}>{perm.description}</div>
                                </div>
                              </Checkbox>
                            </Col>
                          ))}
                        </Row>
                      </Card>
                    </Checkbox.Group>
                  </Form.Item>
                </div>
              ),
            },
          ]}
        />
      </Form>
    </Modal>
  );
};

export default DepartmentFormModal;
