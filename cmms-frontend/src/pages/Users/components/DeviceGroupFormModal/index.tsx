import React, { useState, useEffect, useMemo } from "react";
import { Modal, Form, Input, Select, Button, Space, Tabs, Table, Tag, Switch, message, Transfer, Typography, Tooltip, Row, Col } from "antd";
import { StarFilled, TeamOutlined, ToolOutlined, InfoCircleOutlined, CrownOutlined } from "@ant-design/icons";
import { IDeviceGroup, createDeviceGroup, updateDeviceGroup, setGroupDevices, setGroupMembers, getDeviceGroup } from "../../../../apis/device-groups";
import { getAllDevices } from "../../../../apis/devices";
import { useUsersContext } from "../../../../context/UsersContext/UsersContext";
import { useDepartmentsContext } from "../../../../context/DepartmentsContext/DepartmentsContext";
import { getToken } from "../../../../utils/auth";
import { IDevice } from "../../../../types/devicesManagement.types";

interface Props {
  open: boolean;
  onClose: (changed?: boolean) => void;
  groupId?: number | null;
  defaultDeptId?: number | null;
}

const { Text } = Typography;

const DeviceGroupFormModal: React.FC<Props> = ({ open, onClose, groupId, defaultDeptId }) => {
  const [form] = Form.useForm();
  const { users, fetchUsers } = useUsersContext();
  const { departments } = useDepartmentsContext();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("info");
  const [currentGroup, setCurrentGroup] = useState<IDeviceGroup | null>(null);

  // Danh sách thành viên trong nhóm đang chỉnh sửa
  const [selectedMembers, setSelectedMembers] = useState<{ userId: number; is_group_lead: boolean }[]>([]);
  // Danh sách thiết bị
  const [allDevices, setAllDevices] = useState<IDevice[]>([]);
  const [targetDeviceKeys, setTargetDeviceKeys] = useState<string[]>([]);

  // Lọc các đơn vị cấp Tổ
  const toDepartments = useMemo(() => {
    return departments.filter(d => d.level === 'TO' || d.parent_id);
  }, [departments]);

  // Flag để đảm bảo chỉ khởi tạo form duy nhất 1 lần khi mở modal, không bị reset khi background data tải xong
  const isInitializedRef = React.useRef(false);

  // Load chi tiết nhóm và thiết bị khi modal mở
  useEffect(() => {
    if (!open) {
      isInitializedRef.current = false;
      return;
    }

    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    setActiveTab("info");

    // 1. Reset/khởi tạo form ĐỒNG BỘ ngay lập tức khi mở modal tạo mới, KHÔNG chờ async
    if (!groupId) {
      setCurrentGroup(null);
      form.resetFields();
      form.setFieldsValue({
        dept_id: defaultDeptId || undefined,
      });
      setSelectedMembers([]);
      setTargetDeviceKeys([]);
    }

    // 2. Tải thiết bị và chi tiết nhóm bất đồng bộ trong background (tuyệt đối không gọi resetFields khi data về)
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const token = getToken();

        // Tải danh sách thiết bị
        getAllDevices(token)
          .then(devices => {
            if (isMounted) setAllDevices(devices || []);
          })
          .catch(() => {});

        // Tải danh sách user nếu chưa có
        if (users.length === 0) {
          fetchUsers();
        }

        // Nếu là sửa nhóm: nạp thông tin chi tiết
        if (groupId) {
          const detail = await getDeviceGroup(groupId);
          if (isMounted && detail) {
            setCurrentGroup(detail);
            form.setFieldsValue({
              name: detail.name,
              description: detail.description,
              dept_id: detail.dept_id,
              leader_id: detail.leader_id,
            });

            // Map members
            const memberList = (detail.user_device_groups || []).map((udg: any) => ({
              userId: udg.user_id,
              is_group_lead: !!udg.is_group_lead || udg.user_id === detail.leader_id,
            }));
            setSelectedMembers(memberList);

            // Map devices
            const devKeys = (detail.devices || []).map((d: any) => d.device_id.toString());
            setTargetDeviceKeys(devKeys);
          }
        }
      } catch (err) {
        message.error("Lỗi khi tải thông tin nhóm");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, groupId, defaultDeptId]);

  // Chọn hoặc thay đổi Nhóm trưởng
  const handleSelectLeader = (leaderId?: number | null) => {
    form.setFieldsValue({ leader_id: leaderId || undefined });
    if (!leaderId) {
      setSelectedMembers(prev => prev.map(m => ({ ...m, is_group_lead: false })));
      return;
    }
    setSelectedMembers(prev => {
      const exists = prev.some(m => m.userId === leaderId);
      if (exists) {
        return prev.map(m => ({
          ...m,
          is_group_lead: m.userId === leaderId,
        }));
      }
      return [
        ...prev.map(m => ({ ...m, is_group_lead: false })),
        { userId: leaderId, is_group_lead: true },
      ];
    });
  };

  // Cập nhật hoặc Bầu Nhóm trưởng từ Tab Thành viên
  const handleToggleLeader = (userId: number, makeLeader: boolean) => {
    setSelectedMembers(prev =>
      prev.map(m => ({
        userId: m.userId,
        is_group_lead: makeLeader ? m.userId === userId : (m.userId === userId ? false : m.is_group_lead),
      }))
    );
    if (makeLeader) {
      form.setFieldsValue({ leader_id: userId });
    } else {
      const currentFormLeader = form.getFieldValue("leader_id");
      if (currentFormLeader === userId) {
        form.setFieldsValue({ leader_id: undefined });
      }
    }
  };

  // Thêm thành viên vào nhóm
  const handleAddMember = (userId: number) => {
    setSelectedMembers(prev => {
      if (prev.some(m => m.userId === userId)) return prev;
      const isFirst = prev.length === 0;
      if (isFirst) {
        form.setFieldsValue({ leader_id: userId });
      }
      return [...prev, { userId, is_group_lead: isFirst }];
    });
  };

  // Xóa thành viên khỏi nhóm
  const handleRemoveMember = (userId: number) => {
    setSelectedMembers(prev => {
      const updated = prev.filter(m => m.userId !== userId);
      if (form.getFieldValue("leader_id") === userId) {
        const newLead = updated[0]?.userId;
        form.setFieldsValue({ leader_id: newLead || undefined });
        if (newLead) {
          return updated.map(m => ({ ...m, is_group_lead: m.userId === newLead }));
        }
      }
      return updated;
    });
  };

  // Chuyển thiết bị qua lại giữa các cột
  const handleDeviceTransfer = (nextTargetKeys: string[]) => {
    setTargetDeviceKeys(nextTargetKeys);
  };

  // Lưu toàn bộ thông tin
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        name: values.name,
        description: values.description,
        dept_id: values.dept_id || null,
        leader_id: values.leader_id || null,
      };

      let savedGroupId = groupId;
      if (groupId) {
        await updateDeviceGroup(groupId, payload);
      } else {
        const created = await createDeviceGroup(payload);
        savedGroupId = created.id;
      }

      if (savedGroupId) {
        // Cập nhật danh sách thành viên & nhóm trưởng
        await setGroupMembers(savedGroupId, selectedMembers);

        // Cập nhật danh sách thiết bị phụ trách
        const devIds = targetDeviceKeys.map(k => parseInt(k, 10)).filter(k => !isNaN(k));
        await setGroupDevices(savedGroupId, devIds);
      }

      message.success(groupId ? "Cập nhật Nhóm thiết bị thành công" : "Tạo Nhóm thiết bị mới thành công");
      onClose(true);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || "Lưu nhóm thất bại");
    } finally {
      setLoading(false);
    }
  };

  // Render danh sách thành viên
  const memberColumns = [
    {
      title: "Họ và tên",
      key: "name",
      render: (_: any, record: { userId: number; is_group_lead: boolean }) => {
        const u = users.find(user => user.user_id === record.userId);
        return (
          <Space>
            <span style={{ fontWeight: 500 }}>{u?.name || `ID: ${record.userId}`}</span>
            {record.is_group_lead && (
              <Tag color="gold" icon={<StarFilled />}>
                Nhóm trưởng
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: "Mã NV / Chức vụ",
      key: "info",
      render: (_: any, record: { userId: number }) => {
        const u = users.find(user => user.user_id === record.userId);
        return (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>{u?.employee_code || "—"}</Text>
            {u?.position && <div style={{ fontSize: 12 }}>{u.position}</div>}
          </div>
        );
      },
    },
    {
      title: "Liên hệ",
      key: "contact",
      render: (_: any, record: { userId: number }) => {
        const u = users.find(user => user.user_id === record.userId);
        return (
          <div style={{ fontSize: 12 }}>
            <div>{u?.phone_number || "—"}</div>
            <div style={{ color: "#888" }}>{u?.email}</div>
          </div>
        );
      },
    },
    {
      title: "⭐ Bầu Nhóm trưởng",
      key: "lead",
      width: 140,
      align: "center" as const,
      render: (_: any, record: { userId: number; is_group_lead: boolean }) => (
        <Switch
          checked={record.is_group_lead}
          checkedChildren="Trưởng"
          unCheckedChildren="Thành viên"
          onChange={checked => handleToggleLeader(record.userId, checked)}
        />
      ),
    },
    {
      title: "Hành động",
      key: "action",
      width: 80,
      align: "center" as const,
      render: (_: any, record: { userId: number }) => (
        <Button danger type="link" size="small" onClick={() => handleRemoveMember(record.userId)}>
          Xóa
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <ToolOutlined style={{ color: "#722ed1" }} />
          <span>{groupId ? `Chỉnh sửa Nhóm: ${currentGroup?.name || ""}` : "Thêm Nhóm thiết bị kỹ thuật mới"}</span>
        </Space>
      }
      open={open}
      onCancel={() => onClose(false)}
      width={860}
      destroyOnClose
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <InfoCircleOutlined /> Thành viên trong nhóm sẽ tự động được gán là "Nhân viên QL" của thiết bị thuộc nhóm.
          </Text>
          <Space>
            <Button onClick={() => onClose(false)}>Hủy</Button>
            <Button type="primary" onClick={handleSave} loading={loading} style={{ backgroundColor: "#722ed1" }}>
              {groupId ? "Lưu thay đổi" : "Tạo nhóm"}
            </Button>
          </Space>
        </div>
      }
    >
      <Tabs
        activeKey={activeKeyTabs(activeTab)}
        onChange={setActiveTab}
        items={[
          {
            key: "info",
            label: (
              <span>
                <InfoCircleOutlined /> Thông tin chung
              </span>
            ),
            children: (
              <Form
                form={form}
                layout="vertical"
                style={{ marginTop: 8 }}
                onSubmitCapture={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <Row gutter={16}>
                  <Col span={14}>
                    <Form.Item
                      name="name"
                      label="Tên nhóm thiết bị"
                      rules={[{ required: true, message: "Vui lòng nhập tên nhóm (Ví dụ: Nhóm Xe cấp điện)" }]}
                    >
                      <Input placeholder="Ví dụ: Nhóm Xe cấp điện tàu bay, Nhóm Xe kéo đẩy..." />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item
                      name="dept_id"
                      label="Thuộc Tổ trực thuộc"
                      rules={[{ required: true, message: "Vui lòng chọn Tổ trực thuộc" }]}
                      tooltip="Nhóm thiết bị phải trực thuộc 1 Tổ kỹ thuật theo đúng phân cấp"
                    >
                      <Select placeholder="Chọn Tổ trực thuộc" allowClear showSearch optionFilterProp="children">
                        {toDepartments.map(dept => {
                          const parentName = departments.find(d => d.dept_id === dept.parent_id)?.name;
                          return (
                            <Select.Option key={dept.dept_id} value={dept.dept_id}>
                              {dept.name} {parentName ? `(Thuộc: ${parentName})` : ""}
                            </Select.Option>
                          );
                        })}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="description" label="Mô tả chức năng & nhiệm vụ nhóm">
                  <Input.TextArea rows={2} placeholder="Mô tả phạm vi quản lý xe/máy móc, ca trực phụ trách..." />
                </Form.Item>

                <Form.Item
                  name="leader_id"
                  label={
                    <Space>
                      <CrownOutlined style={{ color: "#faad14" }} />
                      <span>Nhóm trưởng phụ trách</span>
                    </Space>
                  }
                  tooltip="Nhóm trưởng sẽ là đầu mối chịu trách nhiệm trực tiếp trang thiết bị và ký duyệt sửa chữa"
                >
                  <Select
                    placeholder="Chỉ định Nhóm trưởng (hoặc chọn ở Tab Thành viên)"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    onChange={handleSelectLeader}
                  >
                    {users.map(u => (
                      <Select.Option key={u.user_id} value={u.user_id}>
                        ⭐ {u.name} {u.employee_code ? `(${u.employee_code})` : `(${u.email})`}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Form>
            ),
          },
          {
            key: "members",
            label: (
              <span>
                <TeamOutlined /> Thành viên ({selectedMembers.length})
              </span>
            ),
            children: (
              <div style={{ marginTop: 8 }}>
                <div style={{ marginBottom: 12, display: "flex", gap: 12, alignItems: "center" }}>
                  <Select
                    style={{ flex: 1 }}
                    placeholder="+ Chọn nhân viên để thêm vào nhóm kỹ thuật này..."
                    showSearch
                    optionFilterProp="children"
                    onSelect={(val: number) => handleAddMember(val)}
                    value={undefined}
                  >
                    {users
                      .filter(u => !selectedMembers.some(m => m.userId === u.user_id))
                      .map(u => (
                        <Select.Option key={u.user_id} value={u.user_id}>
                          {u.name} {u.employee_code ? `[${u.employee_code}]` : ""} - {u.email}
                        </Select.Option>
                      ))}
                  </Select>
                </div>

                <Table
                  columns={memberColumns}
                  dataSource={selectedMembers}
                  rowKey="userId"
                  size="small"
                  pagination={false}
                  bordered
                  locale={{ emptyText: "Chưa có thành viên nào trong nhóm. Hãy thêm nhân viên ở trên." }}
                />
              </div>
            ),
          },
          {
            key: "devices",
            label: (
              <span>
                <ToolOutlined /> Thiết bị phụ trách ({targetDeviceKeys.length})
              </span>
            ),
            children: (
              <div style={{ marginTop: 8 }}>
                <Transfer
                  dataSource={allDevices
                    .filter(d => !d.device_group || d.device_group.id === groupId)
                    .map(d => ({
                      key: d.device_id.toString(),
                      title: `${d.name} (${d.reg_number || d.device_code || "Chưa có BS"})`,
                      description: `${d.brand || ""} - ${d.status || ""}`,
                    }))}
                  titles={["Thiết bị khả dụng", "Thiết bị thuộc Nhóm này"]}
                  targetKeys={targetDeviceKeys}
                  onChange={handleDeviceTransfer}
                  render={item => (
                    <Tooltip title={`${item.title} - ${item.description}`}>
                      <span>{item.title}</span>
                    </Tooltip>
                  )}
                  showSearch
                  filterOption={(input, item) =>
                    item.title.toLowerCase().includes(input.toLowerCase()) ||
                    item.description.toLowerCase().includes(input.toLowerCase())
                  }
                  listStyle={{
                    width: "48%",
                    height: 340,
                  }}
                />
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
};

function activeKeyTabs(tab: string) {
  return tab;
}

export default DeviceGroupFormModal;
