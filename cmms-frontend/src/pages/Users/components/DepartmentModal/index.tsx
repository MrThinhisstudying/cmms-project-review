import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Modal, Table, Button, Space, Tag, Popconfirm, message, Tooltip, Badge, Input, Card, Row, Col, Typography, Popover, List, Avatar } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  TeamOutlined,
  ToolOutlined,
  ApartmentOutlined,
  CrownOutlined,
  SafetyCertificateOutlined,
  StarFilled,
  SearchOutlined,
  ReloadOutlined,
  CarOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useDepartmentsContext } from "../../../../context/DepartmentsContext/DepartmentsContext";
import DepartmentFormModal from "../DepartmentFormModal";
import DeviceGroupFormModal from "../DeviceGroupFormModal";
import { deleteDeviceGroup } from "../../../../apis/device-groups";
import { getToken } from "../../../../utils/auth";

const { Text } = Typography;
const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:3000/api';

const DepartmentModal: React.FC<{
  open: boolean;
  onClose: (changed?: boolean) => void;
}> = ({ open, onClose }) => {
  const { departments, removeDepartment } = useDepartmentsContext();
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<number | null>(null);

  // Nhóm thiết bị Modal state
  const [openGroupModal, setOpenGroupModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [defaultDeptIdForGroup, setDefaultDeptIdForGroup] = useState<number | null>(null);

  const [treeData, setTreeData] = useState<any[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  const hasChangesRef = React.useRef(false);

  // Fetch tree data khi modal mở
  const fetchTree = useCallback(async () => {
    setTreeLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/department/tree`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setTreeData(json.data || []);
    } catch {
      // Fallback: dùng flat list từ context
      setTreeData(departments as any[]);
    } finally {
      setTreeLoading(false);
    }
  }, [departments]);

  useEffect(() => {
    if (open) {
      hasChangesRef.current = false;
      fetchTree();
    }
  }, [open, fetchTree]);

  // Thao tác cho Đội & Tổ
  const handleOpenAddDept = () => {
    setEditingId(null);
    setParentIdForNew(null);
    setOpenForm(true);
  };

  const handleAddChildTo = (parentId: number) => {
    setEditingId(null);
    setParentIdForNew(parentId);
    setOpenForm(true);
  };

  const handleOpenEditDept = (id: number) => {
    setEditingId(id);
    setParentIdForNew(null);
    setOpenForm(true);
  };

  const handleDeleteDept = async (id: number) => {
    try {
      await removeDepartment(id);
      message.success("Xóa đơn vị thành công");
      hasChangesRef.current = true;
      fetchTree();
    } catch (e) {
      message.error("Xóa đơn vị thất bại");
    }
  };

  // Thao tác cho Nhóm thiết bị
  const handleOpenAddGroup = (deptId?: number) => {
    setEditingGroupId(null);
    setDefaultDeptIdForGroup(deptId || null);
    setOpenGroupModal(true);
  };

  const handleOpenEditGroup = (groupId: number) => {
    setEditingGroupId(groupId);
    setDefaultDeptIdForGroup(null);
    setOpenGroupModal(true);
  };

  const handleDeleteGroup = async (groupId: number) => {
    try {
      await deleteDeviceGroup(groupId);
      message.success("Xóa nhóm thiết bị thành công");
      hasChangesRef.current = true;
      fetchTree();
    } catch (e) {
      message.error("Xóa nhóm thiết bị thất bại");
    }
  };

  const handleFormClose = (isChanged?: boolean) => {
    setOpenForm(false);
    if (isChanged) {
      hasChangesRef.current = true;
      fetchTree();
    }
  };

  const handleGroupModalClose = (isChanged?: boolean) => {
    setOpenGroupModal(false);
    if (isChanged) {
      hasChangesRef.current = true;
      fetchTree();
    }
  };

  // Thống kê nhanh toàn bộ hệ thống
  const metrics = useMemo(() => {
    let doiCount = 0;
    let toCount = 0;
    let nhomCount = 0;
    let totalDevices = 0;

    const countNodes = (nodes: any[]) => {
      nodes.forEach(node => {
        if (node.level === 'DOI') doiCount++;
        else if (node.level === 'TO') toCount++;
        else if (node.level === 'NHOM') {
          nhomCount++;
          totalDevices += (node.devices_count || node.devices?.length || 0);
        }

        if (node.children && node.children.length > 0) {
          countNodes(node.children);
        }
      });
    };

    countNodes(treeData);
    return { doiCount, toCount, nhomCount, totalDevices };
  }, [treeData]);

  // Lọc cây theo từ khóa tìm kiếm
  const filteredTreeData = useMemo(() => {
    if (!searchText.trim()) return treeData;
    const term = searchText.toLowerCase().trim();

    const filterNode = (node: any): any => {
      const matchName = (node.name || "").toLowerCase().includes(term);
      const matchManager = (node.manager?.name || "").toLowerCase().includes(term);
      const matchDeputy = (node.deputy?.name || "").toLowerCase().includes(term);
      const matchLeader = (node.leader?.name || "").toLowerCase().includes(term);
      const matchDevices = (node.devices || []).some((d: any) =>
        (d.name || "").toLowerCase().includes(term) || (d.reg_number || "").toLowerCase().includes(term)
      );

      const filteredChildren = (node.children || [])
        .map((child: any) => filterNode(child))
        .filter((child: any) => child !== null);

      if (matchName || matchManager || matchDeputy || matchLeader || matchDevices || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      return null;
    };

    return treeData.map(node => filterNode(node)).filter(node => node !== null);
  }, [treeData, searchText]);

  // Tag hiển thị cấp bậc
  const getLevelTag = (level: string) => {
    switch (level) {
      case 'DOI':
        return <Tag color="blue" style={{ fontWeight: 600 }}>🏢 Đội</Tag>;
      case 'TO':
        return <Tag color="cyan" style={{ fontWeight: 600 }}>👥 Tổ</Tag>;
      case 'NHOM':
        return <Tag color="purple" style={{ fontWeight: 600 }}>⚙️ Nhóm TTB</Tag>;
      case 'PHONG_BAN':
        return <Tag color="geekblue">Phòng ban</Tag>;
      case 'UNASSIGNED':
        return <Tag color="orange">Chưa phân Tổ</Tag>;
      default:
        return <Tag>{level}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Tên đơn vị / Nhóm kỹ thuật',
      dataIndex: 'name',
      key: 'name',
      width: 280,
      render: (name: string, record: any) => {
        const isDoi = record.level === 'DOI';
        const isTo = record.level === 'TO';
        const isNhom = record.level === 'NHOM';

        return (
          <Space align="center">
            {isDoi && <ApartmentOutlined style={{ color: '#1890ff', fontSize: 16 }} />}
            {isTo && <TeamOutlined style={{ color: '#13c2c2', fontSize: 15 }} />}
            {isNhom && <ToolOutlined style={{ color: '#722ed1', fontSize: 15 }} />}
            <span
              style={{
                fontWeight: isDoi ? 700 : isTo ? 600 : 500,
                color: isDoi ? '#003a8c' : isTo ? '#00474f' : '#22075e',
                fontSize: isDoi ? 14 : 13,
              }}
            >
              {name}
            </span>
            {record.is_technical && (
              <Tooltip title="Đơn vị / Nhóm kỹ thuật hàng không">
                <Tag color="processing" style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>KT</Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Cấp bậc',
      dataIndex: 'level',
      key: 'level',
      width: 110,
      render: (level: string) => getLevelTag(level),
    },
    {
      title: 'Lãnh đạo & Phụ trách',
      key: 'leadership',
      width: 250,
      render: (_: any, record: any) => {
        if (record.level === 'NHOM') {
          return record.leader?.name ? (
            <Space>
              <Tag color="gold" icon={<StarFilled />} style={{ padding: '2px 8px', fontSize: 12 }}>
                Nhóm trưởng: <strong>{record.leader.name}</strong>
              </Tag>
            </Space>
          ) : (
            <span style={{ color: '#bbb' }}>— Chưa bầu nhóm trưởng —</span>
          );
        }

        const isDoi = record.level === 'DOI';
        const leadTitle = isDoi ? 'Đội trưởng' : 'Tổ trưởng';
        const deputyTitle = isDoi ? 'Đội phó' : 'Tổ phó';

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
            <div>
              <CrownOutlined style={{ color: '#faad14', marginRight: 4 }} />
              <Text type="secondary">{leadTitle}:</Text>{' '}
              <span style={{ fontWeight: record.manager?.name ? 600 : 400 }}>
                {record.manager?.name || <Text type="secondary">—</Text>}
              </span>
            </div>
            {record.deputy?.name && (
              <div>
                <SafetyCertificateOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                <Text type="secondary">{deputyTitle}:</Text>{' '}
                <span style={{ fontWeight: 500 }}>{record.deputy.name}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Nhân sự',
      key: 'member_count',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const count = record.member_count || (record.members ? record.members.length : 0);
        if (count === 0) return <span style={{ color: '#ccc' }}>0</span>;

        // Popover xem danh sách thành viên nếu có
        const membersList = record.members || [];
        const content = membersList.length > 0 ? (
          <List
            size="small"
            style={{ maxHeight: 250, overflowY: 'auto', width: 260 }}
            dataSource={membersList}
            renderItem={(m: any) => (
              <List.Item style={{ padding: '6px 0' }}>
                <List.Item.Meta
                  avatar={<Avatar size="small" icon={<UserOutlined />} />}
                  title={
                    <Space size={4}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{m.name}</span>
                      {m.is_group_lead && <Tag color="gold" style={{ fontSize: 10 }}>Trưởng</Tag>}
                    </Space>
                  }
                  description={
                    <div style={{ fontSize: 11, color: '#888' }}>
                      {m.phone_number || m.email || m.position || ''}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <span>Tổng số thành viên: {count}</span>
        );

        return (
          <Popover content={content} title="Danh sách thành viên" trigger="hover">
            <Badge count={count} style={{ backgroundColor: record.level === 'NHOM' ? '#722ed1' : '#52c41a', cursor: 'pointer' }} overflowCount={99} />
          </Popover>
        );
      },
    },
    {
      title: 'Thiết bị phụ trách',
      key: 'devices_count',
      width: 140,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const devCount = record.devices_count || (record.devices ? record.devices.length : 0);
        if (record.level === 'NHOM') {
          if (devCount === 0) {
            return (
              <Tag color="default" style={{ fontSize: 11 }}>
                0 thiết bị
              </Tag>
            );
          }

          const devList = record.devices || [];
          const content = (
            <List
              size="small"
              style={{ maxHeight: 250, overflowY: 'auto', width: 280 }}
              dataSource={devList}
              renderItem={(d: any) => (
                <List.Item style={{ padding: '4px 0' }}>
                  <Space>
                    <CarOutlined style={{ color: '#1890ff' }} />
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{d.name}</span>
                    {d.reg_number && <Tag color="blue" style={{ fontSize: 10 }}>{d.reg_number}</Tag>}
                  </Space>
                </List.Item>
              )}
            />
          );

          return (
            <Popover content={content} title="Danh mục trang thiết bị phụ trách" trigger="hover">
              <Tag color="cyan" style={{ cursor: 'pointer', fontWeight: 600, padding: '2px 8px' }}>
                <CarOutlined style={{ marginRight: 4 }} />
                {devCount} xe/máy móc
              </Tag>
            </Popover>
          );
        }

        // Với Tổ hoặc Đội
        if (devCount > 0) {
          return (
            <Tooltip title={`Tổng thiết bị các Nhóm trực thuộc ${record.name}`}>
              <Tag color="geekblue" style={{ fontSize: 11 }}>
                {devCount} thiết bị
              </Tag>
            </Tooltip>
          );
        }
        return <span style={{ color: '#ccc' }}>—</span>;
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 180,
      render: (_: any, record: any) => {
        if (record.level === 'UNASSIGNED') return null;

        // Nếu là NHOM
        if (record.level === 'NHOM') {
          const groupId = record.group_id || parseInt(record.dept_id.replace('group-', ''), 10);
          return (
            <Space size={4}>
              <Tooltip title="Quản lý Nhóm: Thành viên, Nhóm trưởng, Thiết bị">
                <Button
                  size="small"
                  type="primary"
                  icon={<ToolOutlined />}
                  style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
                  onClick={() => handleOpenEditGroup(groupId)}
                >
                  Quản lý
                </Button>
              </Tooltip>
              <Tooltip title="Sửa thông tin cơ bản">
                <Button icon={<EditOutlined />} size="small" onClick={() => handleOpenEditGroup(groupId)} />
              </Tooltip>
              <Popconfirm
                title="Xóa nhóm thiết bị này?"
                description="Các thiết bị trong nhóm sẽ chuyển về trạng thái Chưa gán nhóm."
                onConfirm={() => handleDeleteGroup(groupId)}
              >
                <Button icon={<DeleteOutlined />} size="small" danger />
              </Popconfirm>
            </Space>
          );
        }

        // Nếu là DOI hoặc TO
        return (
          <Space size={4}>
            <Tooltip title="Sửa thông tin đơn vị">
              <Button icon={<EditOutlined />} size="small" onClick={() => handleOpenEditDept(record.dept_id)} />
            </Tooltip>

            {/* Đội có thể thêm Tổ con */}
            {record.level === 'DOI' && (
              <Tooltip title="Thêm Tổ con trực thuộc Đội">
                <Button
                  icon={<PlusOutlined />}
                  size="small"
                  type="dashed"
                  style={{ color: '#13c2c2', borderColor: '#13c2c2' }}
                  onClick={() => handleAddChildTo(record.dept_id)}
                >
                  Tổ
                </Button>
              </Tooltip>
            )}

            {/* Tổ có thể thêm Nhóm thiết bị */}
            {record.level === 'TO' && (
              <Tooltip title="Thêm Nhóm thiết bị trực thuộc Tổ">
                <Button
                  icon={<PlusOutlined />}
                  size="small"
                  type="dashed"
                  style={{ color: '#722ed1', borderColor: '#722ed1' }}
                  onClick={() => handleOpenAddGroup(record.dept_id)}
                >
                  Nhóm
                </Button>
              </Tooltip>
            )}

            <Popconfirm
              title="Xóa đơn vị này?"
              description={record.children?.length > 0 ? "⚠️ Đơn vị này có cấp con (Tổ/Nhóm), xóa sẽ mất các cấp con!" : undefined}
              onConfirm={() => handleDeleteDept(record.dept_id)}
            >
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 18,
              }}
            >
              <ApartmentOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Quản lý Cơ cấu Tổ chức & Nhóm Kỹ thuật</div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>
                Phân cấp chuẩn hóa 3 tầng: <strong>🏢 Đội (Trưởng/Phó)</strong> → <strong>👥 Tổ (Trưởng/Phó)</strong> → <strong>⚙️ Nhóm (Nhóm trưởng ⭐ / Quản lý trang thiết bị)</strong>
              </div>
            </div>
          </div>
        }
        open={open}
        onCancel={() => onClose(hasChangesRef.current)}
        footer={null}
        width={1160}
        destroyOnClose
        style={{ top: 20 }}
      >
        {/* KPI Summary Cards */}
        <Row gutter={12} style={{ marginTop: 12, marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small" style={{ background: '#f0f5ff', borderColor: '#adc6ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#2f54eb' }}>Tổng số Đội</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1d39c4' }}>{metrics.doiCount}</div>
                </div>
                <ApartmentOutlined style={{ fontSize: 28, color: '#597ef7' }} />
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ background: '#e6fffb', borderColor: '#87e8de' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#08979c' }}>Tổng số Tổ</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#006d75' }}>{metrics.toCount}</div>
                </div>
                <TeamOutlined style={{ fontSize: 28, color: '#36cfc9' }} />
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ background: '#f9f0ff', borderColor: '#d3adf7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#531dab' }}>Nhóm quản lý thiết bị</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#391085' }}>{metrics.nhomCount}</div>
                </div>
                <ToolOutlined style={{ fontSize: 28, color: '#9254de' }} />
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#389e0d' }}>Thiết bị đã phân nhóm</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#237804' }}>{metrics.totalDevices} xe/máy</div>
                </div>
                <CarOutlined style={{ fontSize: 28, color: '#73d13d' }} />
              </div>
            </Card>
          </Col>
        </Row>

        {/* Toolbar */}
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#aaa' }} />}
            placeholder="Tìm kiếm theo Đội, Tổ, Nhóm, Lãnh đạo hoặc Thiết bị..."
            allowClear
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 380 }}
          />

          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchTree} loading={treeLoading}>
              Làm mới
            </Button>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => handleOpenAddGroup()}
              style={{ color: '#722ed1', borderColor: '#722ed1' }}
            >
              + Thêm Nhóm TTB
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddDept}>
              + Thêm Đội mới
            </Button>
          </Space>
        </div>

        {/* Cây phân cấp Đội -> Tổ -> Nhóm */}
        <Table
          columns={columns}
          dataSource={filteredTreeData}
          rowKey="dept_id"
          loading={treeLoading}
          pagination={false}
          expandable={{
            childrenColumnName: 'children',
            defaultExpandAllRows: true,
            indentSize: 22,
          }}
          size="middle"
          bordered
          scroll={{ y: 480 }}
        />
      </Modal>

      {/* Modal tạo/sửa Đội hoặc Tổ */}
      <DepartmentFormModal
        open={openForm}
        onClose={handleFormClose}
        editingId={editingId}
        defaultParentId={parentIdForNew}
      />

      {/* Modal tạo/sửa Nhóm thiết bị kỹ thuật */}
      <DeviceGroupFormModal
        open={openGroupModal}
        onClose={handleGroupModalClose}
        groupId={editingGroupId}
        defaultDeptId={defaultDeptIdForGroup}
      />
    </>
  );
};

export default DepartmentModal;
