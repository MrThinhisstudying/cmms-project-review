import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Button, Checkbox, Row, Col, Typography, message, Select, Space, Switch, Divider } from "antd";
import { useDepartmentsContext } from "../../../../context/DepartmentsContext/DepartmentsContext";
import { useUsersContext } from "../../../../context/UsersContext/UsersContext";
import { DEPARTMENT_PERMISSIONS } from "../../../../constants/user";

interface Props {
  open: boolean;
  onClose: (changed?: boolean) => void;
  editingId: number | null;
  defaultParentId?: number | null;
}

const DepartmentFormModal: React.FC<Props> = ({ open, onClose, editingId, defaultParentId }) => {
  const { departments, addDepartment, editDepartment } = useDepartmentsContext();
  const { users, fetchUsers } = useUsersContext();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
        if (users.length === 0) fetchUsers();

        if (editingId) {
            const dept = departments.find((d) => d.dept_id === editingId);
            if (dept) {
                form.setFieldsValue({
                    name: dept.name,
                    description: dept.description,
                    permissions: dept.permissions || [],
                    manager_id: dept.manager_id || (dept.manager as any)?.user_id,
                    parent_id: dept.parent_id || (dept as any).parent?.dept_id,
                    level: dept.level || 'TO',
                    is_technical: dept.is_technical || false,
                    scope: dept.scope || 'DEPARTMENT',
                });
            }
        } else {
            form.resetFields();
            // Nếu tạo Tổ con từ nút "+" → auto-set parent + level + is_technical
            if (defaultParentId) {
                const parentDept = departments.find(d => d.dept_id === defaultParentId);
                form.setFieldsValue({
                    parent_id: defaultParentId,
                    level: 'TO',
                    is_technical: parentDept?.is_technical || false,
                    scope: 'DEPARTMENT',
                });
            } else {
                form.setFieldsValue({ level: 'DOI', is_technical: false, scope: 'DEPARTMENT' });
            }
        }
    }
  }, [open, editingId, defaultParentId, departments, form, users.length, fetchUsers]);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
          name: values.name,
          description: values.description,
          permissions: values.permissions,
          manager_id: values.manager_id,
          parent_id: values.parent_id || null,
          level: values.level,
          is_technical: values.is_technical || false,
          scope: values.scope,
      };

      if (editingId) {
        await editDepartment(editingId, payload);
        message.success("Cập nhật đơn vị thành công");
      } else {
        await addDepartment(payload);
        message.success("Thêm đơn vị thành công");
      }
      onClose(true);
    } catch (e) {
      message.error("Thao tác thất bại");
    } finally {
      setLoading(false);
    }
  };

  // Khi đổi level → auto-suggest parent
  const handleLevelChange = (level: string) => {
    if (level === 'TO' && !form.getFieldValue('parent_id')) {
        // Gợi ý chọn parent nếu chuyển thành Tổ
    }
    if (level === 'DOI') {
        form.setFieldValue('parent_id', null);
    }
  };

  return (
    <Modal
      title={editingId ? "Cập nhật đơn vị" : (defaultParentId ? "Thêm Tổ con" : "Thêm đơn vị mới")}
      open={open}
      onCancel={() => onClose(false)}
      footer={null}
      width={700}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="name" label="Tên đơn vị" rules={[{ required: true, message: 'Nhập tên đơn vị' }]}>
          <Input placeholder="Ví dụ: Tổ kỹ thuật" />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <Input.TextArea placeholder="Mô tả chức năng, nhiệm vụ..." rows={2} />
        </Form.Item>

        <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="level" label="Cấp đơn vị" style={{ flex: 1 }} rules={[{ required: true }]}>
                <Select onChange={handleLevelChange}>
                    <Select.Option value="DOI">
                        <Space>🏢 Đội</Space>
                    </Select.Option>
                    <Select.Option value="TO">
                        <Space>👥 Tổ</Space>
                    </Select.Option>
                </Select>
            </Form.Item>

            <Form.Item name="is_technical" label="Đơn vị kỹ thuật" valuePropName="checked" style={{ flex: 1 }}>
                <Switch checkedChildren="Kỹ thuật" unCheckedChildren="Không" />
            </Form.Item>
        </div>

        <Form.Item
            name="parent_id"
            label="Đơn vị cấp trên"
            tooltip="Tổ phải thuộc 1 Đội cấp trên"
        >
            <Select placeholder="Chọn đơn vị cấp trên (nếu có)" allowClear>
                {departments
                    .filter(d => (!editingId || d.dept_id !== editingId) && d.level !== 'TO')
                    .map(d => (
                    <Select.Option key={d.dept_id} value={d.dept_id}>
                        {d.name} ({d.level === 'DOI' ? 'Đội' : d.level === 'PHONG_BAN' ? 'PB' : d.level})
                    </Select.Option>
                ))}
            </Select>
        </Form.Item>

        <Form.Item name="manager_id" label="Trưởng đơn vị">
            <Select
                placeholder="Chọn trưởng đơn vị"
                allowClear
                showSearch
                optionFilterProp="children"
            >
                {users.map(u => (
                    <Select.Option key={u.user_id} value={u.user_id}>
                        {u.name} ({u.email})
                    </Select.Option>
                ))}
            </Select>
        </Form.Item>

        <Form.Item name="scope" label="Phạm vi hoạt động" initialValue="DEPARTMENT">
            <Select>
                <Select.Option value="PERSONAL">Cá nhân (Chỉ thấy phiếu mình tạo)</Select.Option>
                <Select.Option value="GROUP">Theo nhóm (Thấy phiếu cùng nhóm thiết bị)</Select.Option>
                <Select.Option value="DEPARTMENT">Theo phòng ban (Thấy phiếu cùng phòng)</Select.Option>
                <Select.Option value="ALL">Toàn hệ thống (Admin/Director)</Select.Option>
            </Select>
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        <Typography.Title level={5}>Phân quyền</Typography.Title>
        <Form.Item name="permissions">
           <Checkbox.Group style={{ width: '100%' }}>
              <Row gutter={[16, 16]}>
                  <Col span={24}>
                      <Typography.Text strong>Quản lý thiết bị</Typography.Text>
                      <Row>
                        {DEPARTMENT_PERMISSIONS.filter(p => p.code.includes('DEVICE')).map(perm => (
                            <Col span={12} key={perm.code}>
                                <Checkbox value={perm.code}>{perm.name}</Checkbox>
                            </Col>
                        ))}
                      </Row>
                  </Col>
                   <Col span={24}>
                      <Typography.Text strong>Quy trình sửa chữa</Typography.Text>
                      <Row>
                        {DEPARTMENT_PERMISSIONS.filter(p => p.code.includes('REPAIR') || p.code.includes('approve') || p.code.includes('sign') || p.code.includes('create_inspection')).map(perm => (
                            <Col span={12} key={perm.code}>
                                <Checkbox value={perm.code}>
                                    <div style={{display: 'flex', flexDirection: 'column'}}>
                                        <span>{perm.name}</span>
                                        <Typography.Text type="secondary" style={{fontSize: '11px'}}>{perm.description}</Typography.Text>
                                    </div>
                                </Checkbox>
                            </Col>
                        ))}
                      </Row>
                  </Col>
                   <Col span={24}>
                      <Typography.Text strong>Báo cáo & Khác</Typography.Text>
                      <Row>
                        {DEPARTMENT_PERMISSIONS.filter(p => !p.code.includes('DEVICE') && !p.code.includes('REPAIR') && !p.code.includes('approve') && !p.code.includes('sign') && !p.code.includes('create_inspection')).map(perm => (
                            <Col span={12} key={perm.code}>
                                <Checkbox value={perm.code}>{perm.name}</Checkbox>
                            </Col>
                        ))}
                      </Row>
                  </Col>
              </Row>
           </Checkbox.Group>
        </Form.Item>

        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Space>
            <Button onClick={() => onClose(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {editingId ? "Cập nhật" : "Thêm mới"}
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
};

export default DepartmentFormModal;
