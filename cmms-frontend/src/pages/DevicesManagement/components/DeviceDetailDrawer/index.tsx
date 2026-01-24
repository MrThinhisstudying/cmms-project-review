import React, { useEffect, useState } from "react";
import { Drawer, Tabs, Descriptions, Tag, Row, Col, Space, Table, Empty, Card, Tooltip, Button, notification } from "antd";
import { StarFilled } from "@ant-design/icons";

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
import dayjs from "dayjs";

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

  useEffect(() => {
    if (!open || !device?.device_group?.id) {
        setUsers([]);
        return;
    }
    const token = getToken();
    (async () => {
        setLoadingUsers(true);
        try {
            const res = await getAllUsers(token, { groupId: device.device_group?.id });
            setUsers(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingUsers(false);
        }
    })();
  }, [open, device?.device_group?.id]);

  useEffect(() => {
    if (!open || !device?.device_id) return;
    const token = getToken();

    (async () => {
      setLoadingMaint(true);
      try {
        const res = await getMaintenancesByDevice(device.device_id!, token ?? "");
        setMaintenances(res || []);
      } finally {
        setLoadingMaint(false);
      }
    })();
  }, [open, device?.device_id]);

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

  // Helper for displaying values
  const display = (val: any) => (val === 0 ? 0 : val || "NIL");

  // --- Tab 1: Lý lịch (Profile) ---
  const renderProfile = () => (
    <Row gutter={24}>
        <Col span={24}>
            <Card title="I. Thông tin chung" size="small" style={{ marginBottom: 16 }}>
                <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="Tên thiết bị">{display(device.name)}</Descriptions.Item>
                    <Descriptions.Item label="Mã thiết bị">{display(device.device_code)}</Descriptions.Item>
                    <Descriptions.Item label="Biển số">{display(device.reg_number)}</Descriptions.Item>
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
                </Descriptions>
            </Card>

            <Card title="II. Thông số kỹ thuật" size="small">
                <Descriptions bordered column={2} size="small">
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
      const columns = [
          { 
              title: 'Họ và tên', 
              dataIndex: 'name', 
              key: 'name',
              render: (text: string, record: IUser) => {
                  const currentGroupId = device.device_group?.id;
                  const isLeader = record.user_device_groups?.some(
                      g => g.group_id === currentGroupId && g.is_group_lead
                  );
                  return (
                      <Space>
                          {text}
                          {isLeader && (
                              <Tooltip title="Nhóm trưởng">
                                  <StarFilled style={{ color: '#faad14', fontSize: '16px' }} />
                              </Tooltip>
                          )}
                      </Space>
                  );
              }
          },
          { title: 'Chức vụ', dataIndex: 'position', key: 'position' },
          { title: 'Email', dataIndex: 'email', key: 'email' },
          { title: 'Phòng ban', dataIndex: ['department', 'name'], key: 'dept', render: (val: any) => val || '-' },
      ];

      return (
          <Card title={`II. Nhân viên Quản lý (Nhóm: ${device.device_group?.name || 'Chưa gán'})`} size="small">
             <Table 
                columns={columns} 
                dataSource={users} 
                rowKey="user_id" 
                size="small" 
                pagination={false} 
                loading={loadingUsers}
                locale={{ emptyText: <Empty description="Chưa có nhân viên nào trong nhóm này" /> }}
            />
          </Card>
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
       <MaintenanceHistoryTab loading={loadingMaint} maintenances={maintenances} />
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
      title={`Hồ sơ thiết bị: ${device.name.toUpperCase()}`}
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

