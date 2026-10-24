import React, { useEffect, useState } from "react";
import { Drawer, Tabs, Descriptions, Tag, Row, Col, Space, Table, Empty, Card, Button, notification, Select, Popover, message, Avatar, Typography } from "antd";
import {
  StarFilled,
  ToolOutlined,
  TeamOutlined,
  ApartmentOutlined,
  SwapOutlined,
  PhoneOutlined,
  MailOutlined,
  UserOutlined,
  CarOutlined,
} from "@ant-design/icons";

import { getToken } from "../../../../utils/auth";
import { getMaintenancesByDevice } from "../../../../apis/maintenance";
import { getRepairsByDevice } from "../../../../apis/repairs";
import { IMaintenance } from "../../../../types/maintenance.types";
import { IRepair } from "../../../../types/repairs.types";
import MaintenanceHistoryTab from "./MaintenanceHistoryTab";
import RepairHistoryTab from "./RepairHistoryTab";
import { getAllUsers } from "../../../../apis/users";
import { IUser } from "../../../../types/user.types";
import LicenseModal from "./LicenseModal";
import { updateDevice } from "../../../../apis/devices";
import { IDevice } from "../../../../types/devicesManagement.types";
import { IDeviceGroup, getDeviceGroups, getDeviceGroup, assignDeviceToGroup } from "../../../../apis/device-groups";
import dayjs from "dayjs";

const { Text } = Typography;

type Props = {
  open: boolean;
  onClose: () => void;
  device: IDevice | null;
};

export default function DeviceDetailDrawer({
  open,
  onClose,
  device,
}: Props) {
  const [maintenances, setMaintenances] = useState<IMaintenance[]>([]);
  const [repairs, setRepairs] = useState<IRepair[]>([]);
  const [loadingMaint, setLoadingMaint] = useState(false);
  const [loadingRepair, setLoadingRepair] = useState(false);

  const [users, setUsers] = useState<IUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);

  // Pagination for repairs
  const [repairPage, setRepairPage] = useState(1);
  const [repairPageSize, setRepairPageSize] = useState(10);
  const [repairTotal, setRepairTotal] = useState(0);

  // Quản lý Nhóm thiết bị & Cấp bậc tổ chức
  const [currentGroup, setCurrentGroup] = useState<IDeviceGroup | null>(null);
  const [allGroups, setAllGroups] = useState<IDeviceGroup[]>([]);
  const [changingGroup, setChangingGroup] = useState(false);
  const [changeGroupOpen, setChangeGroupOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const fetchGroupDetails = React.useCallback(async (groupId?: number | null) => {
    if (!groupId) {
      setCurrentGroup(null);
      setUsers([]);
      return;
    }
    const token = getToken();
    setLoadingUsers(true);
    try {
      const [groupData, groupUsers] = await Promise.all([
        getDeviceGroup(groupId),
        getAllUsers(token, { groupId }),
      ]);
      setCurrentGroup(groupData);
      setUsers(groupUsers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      getDeviceGroups().then(setAllGroups).catch(() => {});
      fetchGroupDetails(device?.device_group?.id);
      setSelectedGroupId(device?.device_group?.id || null);
    }
  }, [open, device?.device_group?.id, fetchGroupDetails]);

  const handleAssignGroup = async (newGroupId: number | null) => {
    if (!device?.device_id) return;
    setChangingGroup(true);
    try {
      await assignDeviceToGroup(device.device_id, newGroupId);
      message.success("Cập nhật nhóm quản lý thiết bị thành công");
      setChangeGroupOpen(false);
      await fetchGroupDetails(newGroupId);
      if (device) {
        if (newGroupId) {
          const matched = allGroups.find(g => g.id === newGroupId);
          device.device_group = matched || ({ id: newGroupId } as any);
        } else {
          device.device_group = undefined;
        }
      }
    } catch (e) {
      message.error("Gán nhóm thiết bị thất bại");
    } finally {
      setChangingGroup(false);
    }
  };

  const fetchMaintenances = React.useCallback(async () => {
    if (!device?.device_id) return;
    const token = getToken();
    setLoadingMaint(true);
    try {
      const res = await getMaintenancesByDevice(device.device_id!, token ?? "");
      setMaintenances(res || []);
    } finally {
      setLoadingMaint(false);
    }
  }, [device?.device_id]);

  useEffect(() => {
    if (open) fetchMaintenances();
  }, [open, fetchMaintenances]);

  useEffect(() => {
    if (!open || !device?.device_id) return;
    const token = getToken();

    (async () => {
      setLoadingRepair(true);
      try {
        const res = await getRepairsByDevice(device.device_id!, token ?? "", {
            page: repairPage,
            limit: repairPageSize
        });
        setRepairs(res.repairs || []);
        setRepairTotal(res.total || 0);
      } finally {
        setLoadingRepair(false);
      }
    })();
  }, [open, device?.device_id, repairPage, repairPageSize]);

  const handleAddLicense = async (data: any) => {
      if (!device) return;
      try {
          const currentLicenses = Array.isArray(device.license_info) ? device.license_info : [];
          
          let typeStr = data.type;
          if (Array.isArray(data.type)) {
              typeStr = data.type.join(', ');
          }

          const newLicense = {
              type: typeStr,
              number: data.number,
              issuer: data.issuer,
              expiry: data.expiry,
              note: data.note,
          };
          const updatedLicenses = [...currentLicenses, newLicense];
          
          await updateDevice(device.device_id, getToken(), { license_info: updatedLicenses });
          
          notification.success({ message: "Thêm giấy phép thành công", title: "Thành công" });
          setShowLicenseModal(false);
          onClose(); 
      } catch (error) {
          notification.error({ message: "Thêm giấy phép thất bại", title: "Thất bại" });
      }
  };

  if (!device) return null;

  // Helper for status translation
  const STATUS_LABELS: Record<string, string> = {
      MOI: "Mới",
      DANG_SU_DUNG: "Đang sử dụng",
      SU_DUNG_HAN_CHE: "Sử dụng hạn chế",
      DANG_SUA_CHUA: "Đang sửa chữa",
      THANH_LY: "Thanh lý",
      HUY_BO: "Huỷ bỏ",
  };

  // Helper for displaying values with newline preservation
  const display = (val: any) => {
      if (val === 0) return 0;
      if (!val) return "NIL";
      return <span style={{ whiteSpace: 'pre-wrap' }}>{val}</span>;
  };

  // --- Tab 1: Lý lịch (Profile) ---
  const renderProfile = () => (
    <Row gutter={24}>
        <Col span={24}>
            <Card title="I. Thông tin chung" size="small" style={{ marginBottom: 16 }}>
                <Descriptions bordered column={{ xs: 1, sm: 2, md: 2 }} size="small">
                    <Descriptions.Item label="Tên thiết bị">{display(device.name)}</Descriptions.Item>
                    <Descriptions.Item label="Mã thiết bị">{display(device.device_code)}</Descriptions.Item>
                    <Descriptions.Item label="Biển số">{display(device.reg_number)}</Descriptions.Item>
                    <Descriptions.Item label="Loại thiết bị">{display(device.deviceType?.name)}</Descriptions.Item>
                    <Descriptions.Item label="Nhãn hiệu">{display(device.brand)}</Descriptions.Item>
                    <Descriptions.Item label="Số máy">{display(device.serial_number)}</Descriptions.Item>
                    <Descriptions.Item label="Nước sản xuất">{display(device.country_of_origin)}</Descriptions.Item>
                    <Descriptions.Item label="Năm sản xuất">{display(device.manufacture_year)}</Descriptions.Item>
                    <Descriptions.Item label="Năm đưa vào SD">{display(device.usage_start_year)}</Descriptions.Item>
                    <Descriptions.Item label="Mục đích SD" span={2}>{display(device.usage_purpose)}</Descriptions.Item>
                    <Descriptions.Item label="Phạm vi hoạt động" span={2}>{display(device.operating_scope)}</Descriptions.Item>
                    <Descriptions.Item label="Địa điểm/ Toạ độ đặt TTB" span={2}>{display(device.location_coordinates)}</Descriptions.Item>
                    <Descriptions.Item label="Trạng thái">
                        <Tag color="cyan">{STATUS_LABELS[device.status] || device.status}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Đơn vị sử dụng">{display(device.using_department)}</Descriptions.Item>
                    <Descriptions.Item label="Xuất xứ khi di dời">{display(device.relocation_origin)}</Descriptions.Item>
                    <Descriptions.Item label="Năm di dời">{display(device.relocation_year)}</Descriptions.Item>
                </Descriptions>
            </Card>

            <Card title="II. Thông số kỹ thuật" size="small">
                <Descriptions bordered column={{ xs: 1, sm: 2, md: 2 }} size="small">
                    <Descriptions.Item label="Kích thước (D x R x C)">
                        {device.length || 'NIL'} x {device.width || 'NIL'} x {device.height || 'NIL'} (mm)
                    </Descriptions.Item>
                    <Descriptions.Item label="Khối lượng bản thân">{device.weight ? `${device.weight} (kg)` : "NIL"}</Descriptions.Item>
                    <Descriptions.Item label="Nguồn điện">{display(device.power_source)}</Descriptions.Item>
                    <Descriptions.Item label="Công suất tiêu thụ">{display(device.power_consumption)}</Descriptions.Item>
                    <Descriptions.Item label="Đặc điểm khác" span={2}>{display(device.other_specifications)}</Descriptions.Item>
                </Descriptions>
            </Card>


            {/* Inventory List if exists */}
            {device.components_inventory && (
                <Card title="Phụ tùng kèm theo" size="small" style={{ marginTop: 16 }}>
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                       {(Array.isArray(device.components_inventory) ? device.components_inventory : []).map((item: any, idx: number) => (
                           <li key={idx} style={{ fontSize: 13 }}>{item.name} ({item.qty} {item.unit})</li>
                       ))}
                    </ul>
                </Card>
            )}
        </Col>
    </Row>
  );

  // --- Tab 2: Nhân viên QL ---
  const renderManagement = () => {
      const parentDoi = currentGroup?.department?.parent;
      const parentTo = currentGroup?.department;
      const groupLeader = currentGroup?.leader || users.find(u => 
          u.user_device_groups?.some(g => g.group_id === currentGroup?.id && g.is_group_lead)
      );

      const changeGroupContent = (
          <div style={{ width: 300, padding: 4 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>
                  <SwapOutlined /> Chọn Nhóm kỹ thuật phụ trách:
              </div>
              <Select
                  style={{ width: '100%', marginBottom: 12 }}
                  placeholder="-- Chọn nhóm quản lý --"
                  value={selectedGroupId}
                  onChange={val => setSelectedGroupId(val)}
                  allowClear
              >
                  {allGroups.map(g => (
                      <Select.Option key={g.id} value={g.id}>
                          ⚙️ {g.name} {g.department?.name ? `(${g.department.name})` : ''}
                      </Select.Option>
                  ))}
              </Select>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button size="small" danger onClick={() => handleAssignGroup(null)} loading={changingGroup}>
                      Gỡ khỏi nhóm
                  </Button>
                  <Button size="small" type="primary" onClick={() => handleAssignGroup(selectedGroupId)} loading={changingGroup}>
                      Xác nhận gán
                  </Button>
              </div>
          </div>
      );

      const columns = [
          {
              title: 'STT',
              key: 'index',
              width: 50,
              align: 'center' as const,
              render: (_: any, __: any, index: number) => index + 1,
          },
          { 
              title: 'Họ và tên', 
              dataIndex: 'name', 
              key: 'name',
              render: (text: string, record: IUser) => {
                  const isLeader = record.user_id === groupLeader?.user_id || record.user_device_groups?.some(
                      g => g.group_id === currentGroup?.id && g.is_group_lead
                  );
                  return (
                      <Space>
                          <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: isLeader ? '#faad14' : '#1890ff' }} />
                          <span style={{ fontWeight: isLeader ? 600 : 400 }}>{text}</span>
                          {isLeader && (
                              <Tag color="gold" icon={<StarFilled />} style={{ fontSize: 11, padding: '0 6px' }}>
                                  Nhóm trưởng
                              </Tag>
                          )}
                      </Space>
                  );
              }
          },
          {
              title: 'Vai trò trong nhóm',
              key: 'role_in_group',
              width: 140,
              render: (_: any, record: IUser) => {
                  const isLeader = record.user_id === groupLeader?.user_id || record.user_device_groups?.some(
                      g => g.group_id === currentGroup?.id && g.is_group_lead
                  );
                  return isLeader ? (
                      <Tag color="gold" style={{ fontWeight: 600 }}>⭐ Nhóm trưởng</Tag>
                  ) : (
                      <Tag color="cyan">Thành viên kỹ thuật</Tag>
                  );
              }
          },
          { 
              title: 'Số điện thoại', 
              dataIndex: 'phone_number', 
              key: 'phone',
              render: (phone: string) => phone ? (
                  <Space size={4}>
                      <PhoneOutlined style={{ color: '#52c41a' }} />
                      <span>{phone}</span>
                  </Space>
              ) : <span style={{ color: '#ccc' }}>—</span>
          },
          { 
              title: 'Email', 
              dataIndex: 'email', 
              key: 'email',
              render: (email: string) => email ? (
                  <Space size={4}>
                      <MailOutlined style={{ color: '#1890ff' }} />
                      <span style={{ fontSize: 12 }}>{email}</span>
                  </Space>
              ) : <span style={{ color: '#ccc' }}>—</span>
          },
          { title: 'Chức vụ', dataIndex: 'position', key: 'position', render: (val: any) => val || '—' },
          { title: 'Phòng ban / Đơn vị', dataIndex: ['department', 'name'], key: 'dept', render: (val: any) => val || '-' },
      ];

      return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Card thông tin cơ cấu phân cấp */}
              <Card
                  size="small"
                  style={{
                      background: currentGroup ? 'linear-gradient(135deg, #f6f8fc 0%, #eef2fe 100%)' : '#fffbe6',
                      borderColor: currentGroup ? '#adc6ff' : '#ffe58f',
                  }}
              >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: currentGroup ? '#1d39c4' : '#d48806', marginBottom: 4 }}>
                              CƠ CẤU PHÂN CẤP QUẢN LÝ THIẾT BỊ
                          </div>
                          {currentGroup ? (
                              <Space size={16} wrap style={{ fontSize: 12 }}>
                                  <div>
                                      <ApartmentOutlined style={{ color: '#1890ff', marginRight: 4 }} />
                                      <span style={{ color: '#666' }}>Đội:</span>{' '}
                                      <strong>{parentDoi?.name || (parentTo?.parent_id ? 'Đội kỹ thuật' : '—')}</strong>
                                  </div>
                                  <div>
                                      <TeamOutlined style={{ color: '#13c2c2', marginRight: 4 }} />
                                      <span style={{ color: '#666' }}>Tổ trực thuộc:</span>{' '}
                                      <strong>{parentTo?.name || 'Chưa phân Tổ'}</strong>
                                  </div>
                                  <div>
                                      <ToolOutlined style={{ color: '#722ed1', marginRight: 4 }} />
                                      <span style={{ color: '#666' }}>Nhóm quản lý:</span>{' '}
                                      <Tag color="purple" style={{ fontWeight: 600, margin: 0 }}>{currentGroup.name}</Tag>
                                  </div>
                                  {groupLeader && (
                                      <div>
                                          <StarFilled style={{ color: '#faad14', marginRight: 4 }} />
                                          <span style={{ color: '#666' }}>Nhóm trưởng:</span>{' '}
                                          <strong style={{ color: '#d48806' }}>{groupLeader.name}</strong>
                                          {groupLeader.phone_number && ` (${groupLeader.phone_number})`}
                                      </div>
                                  )}
                              </Space>
                          ) : (
                              <div style={{ fontSize: 12, color: '#ad6800' }}>
                                  ⚠️ Thiết bị này hiện chưa được phân công cho Nhóm kỹ thuật nào để quản trị vận hành.
                              </div>
                          )}
                      </div>

                      <Popover
                          content={changeGroupContent}
                          title="Gán / Chuyển Nhóm quản lý"
                          trigger="click"
                          open={changeGroupOpen}
                          onOpenChange={setChangeGroupOpen}
                          placement="bottomRight"
                      >
                          <Button
                              type={currentGroup ? "default" : "primary"}
                              icon={<SwapOutlined />}
                              size="small"
                              style={{ borderColor: currentGroup ? '#1890ff' : undefined }}
                          >
                              {currentGroup ? "Đổi Nhóm" : "Gán vào Nhóm ngay"}
                          </Button>
                      </Popover>
                  </div>
              </Card>

              {/* Table Danh sách Nhân viên quản lý */}
              <Card
                  title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>II. Danh sách Nhân viên Quản lý ({users.length} nhân sự)</span>
                          {currentGroup && (
                              <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>
                                  Tất cả thành viên trong nhóm <strong>{currentGroup.name}</strong> chịu trách nhiệm bảo dưỡng & vận hành thiết bị này
                              </Text>
                          )}
                      </div>
                  }
                  size="small"
              >
                 <Table 
                    columns={columns} 
                    dataSource={users} 
                    rowKey="user_id" 
                    size="small" 
                    pagination={false} 
                    loading={loadingUsers}
                    locale={{
                        emptyText: (
                            <Empty
                                description="Chưa có nhân viên nào trong nhóm này hoặc thiết bị chưa được gán nhóm."
                                children={
                                    <Popover
                                        content={changeGroupContent}
                                        title="Gán Nhóm kỹ thuật"
                                        trigger="click"
                                        open={changeGroupOpen}
                                        onOpenChange={setChangeGroupOpen}
                                    >
                                        <Button type="primary" icon={<ToolOutlined />} size="small" style={{ marginTop: 8 }}>
                                            Gán thiết bị vào nhóm ngay
                                        </Button>
                                    </Popover>
                                }
                            />
                        )
                    }}
                />
              </Card>
          </div>
      );
  };

  // --- Tab 3: Kiểm định/Giấy phép ---
  const renderInspection = () => {
    // If license_info is an array of objects
    const licenseData = Array.isArray(device.license_info) ? device.license_info : [];
    
    // Add current expiry dates as rows if license_info is empty
    const data = licenseData.length > 0 ? licenseData : [
        { type: 'Đăng kiểm', expiry: device.inspection_expiry, issuer: '-', number: '' },
        { type: 'Bảo hiểm', expiry: device.insurance_expiry, issuer: '-', number: '' },
    ].filter(i => i.expiry);

    const columns: any[] = [
        { 
            title: 'STT', 
            key: 'index', 
            width: 60, 
            align: 'center',
            render: (_: any, __: any, index: number) => index + 1 
        },
        { 
            title: 'Số Giấy phép hoặc tem kiểm định', 
            dataIndex: 'number', 
            key: 'number', 
            render: (text: string, record: any) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{text || '---'}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>({record.type || 'Chưa xác định'})</div>
                </div>
            ) 
        },
        { 
            title: 'Đơn vị cấp', 
            dataIndex: 'issuer', 
            key: 'issuer',
            align: 'center', 
            render: (t: any) => t || '-' 
        },
        { 
            title: 'Thời hạn', 
            dataIndex: 'expiry', 
            key: 'expiry', 
            align: 'center',
            render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' 
        },
        {
            title: 'Ghi chú',
            dataIndex: 'note',
            key: 'note',
            render: (t: any) => t || ''
        }
    ];

    return (
        <Card 
            title="III. Theo dõi hồ sơ pháp lý" 
            size="small"
            extra={<Button type="primary" size="small" onClick={() => setShowLicenseModal(true)}>Thêm +</Button>}
        >
            <Table
                columns={columns}
                dataSource={data}
                rowKey={(record) => record.type ? record.type + record.expiry : Math.random()} 
                size="small"
                pagination={false}
                bordered
            />
        </Card>
    );
  };
 
  // --- Tab 4: Sửa chữa ---
  const renderRepairHistory = () => (
      <RepairHistoryTab 
        loading={loadingRepair} 
        repairs={repairs} 
        pagination={{
            current: repairPage,
            pageSize: repairPageSize,
            total: repairTotal,
            onChange: (p: number, s: number) => {
                setRepairPage(p);
                setRepairPageSize(s);
            }
        }}
      />
  );

  // --- Tab 5: Bảo dưỡng ---
  const renderMaintenanceHistory = () => (
       <MaintenanceHistoryTab 
          loading={loadingMaint} 
          maintenances={maintenances} 
          deviceId={device.device_id!}
          deviceName={device.name}
          device={device}
          onRefresh={fetchMaintenances}
       />
  );

  const items = [
    { key: '1', label: '1. Lý lịch thiết bị', children: renderProfile() },
    { key: '2', label: '2. Nhân viên QL', children: renderManagement() },
    { key: '3', label: '3. Giấy phép và đăng kiểm', children: renderInspection() },
    { key: '4', label: '4. Sửa chữa', children: renderRepairHistory() },
    { key: '5', label: '5. Bảo dưỡng', children: renderMaintenanceHistory() },
  ];

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 18,
              boxShadow: '0 2px 8px rgba(22, 119, 255, 0.3)',
            }}
          >
            <CarOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
              Hồ Sơ Thiết Bị: {device.name?.toUpperCase()}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
              Biển số: {device.reg_number || 'Chưa có'} | Mã TTB: {device.device_code || `#${device.device_id}`}
            </div>
          </div>
        </div>
      }
      width={1200}
      onClose={onClose}
      open={open}
      styles={{ body: { paddingBottom: 80 } }}
    >
      <Tabs defaultActiveKey="1" items={items} type="card" />
      <LicenseModal 
        open={showLicenseModal} 
        onClose={() => setShowLicenseModal(false)}
        onSubmit={handleAddLicense}
      />
    </Drawer>
  );
}

