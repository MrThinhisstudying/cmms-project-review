import React, { useEffect, useState } from "react";
import { Drawer, Tabs, Descriptions, Spin, Tag, Row, Col, Space, Table, Empty, Card } from "antd";
import { QRCodeSVG } from "qrcode.react";
import { getToken } from "../../../../utils/auth";
import { getMaintenancesByDevice } from "../../../../apis/maintenance";
import { getRepairsByDevice } from "../../../../apis/repairs";
import { IMaintenance } from "../../../../types/maintenance.types";
import { IRepair } from "../../../../types/repairs.types";
import MaintenanceHistoryTab from "./MaintenanceHistoryTab";
import RepairHistoryTab from "./RepairHistoryTab";
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

    (async () => {
      setLoadingRepair(true);
      try {
        const res = await getRepairsByDevice(device.device_id!, token ?? "");
        setRepairs(res || []);
      } finally {
        setLoadingRepair(false);
      }
    })();
  }, [open, device?.device_id]);

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

  // --- Tab 1: Lý lịch (Profile) ---
  const renderProfile = () => (
    <Row gutter={24}>
        <Col span={18}>
            <Card title="I. Thông tin chung" size="small" style={{ marginBottom: 16 }}>
                <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="Tên thiết bị">{device.name}</Descriptions.Item>
                    <Descriptions.Item label="Mã thiết bị">{device.device_code}</Descriptions.Item>
                    <Descriptions.Item label="Biển số">{device.reg_number}</Descriptions.Item>
                    <Descriptions.Item label="Nhãn hiệu">{device.brand}</Descriptions.Item>
                    <Descriptions.Item label="Số máy">{device.serial_number}</Descriptions.Item>
                    <Descriptions.Item label="Nước sản xuất">{device.country_of_origin}</Descriptions.Item>
                    <Descriptions.Item label="Năm sản xuất">{device.manufacture_year}</Descriptions.Item>
                    <Descriptions.Item label="Năm đưa vào SD">{device.usage_start_year}</Descriptions.Item>
                    <Descriptions.Item label="Mục đích SD" span={2}>{device.usage_purpose}</Descriptions.Item>
                    <Descriptions.Item label="Phạm vi hoạt động" span={2}>{device.operating_scope}</Descriptions.Item>
                    <Descriptions.Item label="Trạng thái">
                        <Tag color="cyan">{STATUS_LABELS[device.status] || device.status}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Đơn vị sử dụng">{device.using_department || "Chưa gán"}</Descriptions.Item>
                </Descriptions>
            </Card>

            <Card title="II. Thông số kỹ thuật" size="small">
                <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="Kích thước (D x R x C)">
                        {device.length || '-'} x {device.width || '-'} x {device.height || '-'} (mm)
                    </Descriptions.Item>
                    <Descriptions.Item label="Khối lượng bản thân">{device.weight} (kg)</Descriptions.Item>
                    <Descriptions.Item label="Nguồn điện">{device.power_source}</Descriptions.Item>
                    <Descriptions.Item label="Công suất tiêu thụ">{device.power_consumption}</Descriptions.Item>
                    <Descriptions.Item label="Đặc điểm khác" span={2}>{device.other_specifications}</Descriptions.Item>
                </Descriptions>
            </Card>
        </Col>
        <Col span={6}>
            <div style={{ textAlign: 'center', marginTop: 16, border: '1px solid #f0f0f0', padding: 16, borderRadius: 8 }}>
                <QRCodeSVG value={JSON.stringify({id: device.device_id, code: device.device_code})} size={150} />
                <div style={{ marginTop: 12, fontWeight: 'bold' }}>{device.device_code}</div>
                <div style={{ fontSize: 12, color: '#888' }}>Quét mã để xem hồ sơ</div>
            </div>
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

  // --- Tab 2: Ban quản lý (Personnel/Relocation) ---
  const renderManagement = () => {
      // Mock columns for relocation/personnel history.
      // If we don't have real data yet, show current logic or placeholder.
      // Use relocation_history if available
      const historyData = Array.isArray(device.relocation_history) ? device.relocation_history : [];
      
      const columns = [
          { title: 'Thời gian', dataIndex: 'date', key: 'date' },
          { title: 'Đơn vị/Cán bộ', dataIndex: 'unit', key: 'unit' },
          { title: 'Chức vụ', dataIndex: 'role', key: 'role' },
          { title: 'Nội dung', dataIndex: 'note', key: 'note' },
      ];

      return (
          <Card title="III. Quá trình quản lý & Di dời" size="small">
             <Table 
                columns={columns} 
                dataSource={historyData} 
                rowKey="date" 
                size="small" 
                pagination={false} 
                locale={{ emptyText: <Empty description="Chưa có dữ liệu lịch sử" /> }}
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
        { type: 'Đăng kiểm', expiry: device.inspection_expiry, issuer: '-' },
        { type: 'Bảo hiểm', expiry: device.insurance_expiry, issuer: '-' },
    ].filter(i => i.expiry);

    const columns = [
        { title: 'Loại giấy phép', dataIndex: 'type', key: 'type' },
        { title: 'Số phiếu/GCN', dataIndex: 'number', key: 'number', render: (t:any) => t || '-' },
        { title: 'Đơn vị cấp', dataIndex: 'issuer', key: 'issuer' },
        { title: 'Ngày hết hạn', dataIndex: 'expiry', key: 'expiry', render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    ];

    return (
        <Card title="IV. Theo dõi hồ sơ pháp lý" size="small">
            <Table
                columns={columns}
                dataSource={data}
                rowKey="type"
                size="small"
                pagination={false}
            />
        </Card>
    );
  };

  // --- Tab 4: History ---
  const renderHistory = () => (
      <Space direction="vertical" style={{ width: '100%' }} size="large">
          <RepairHistoryTab loading={loadingRepair} repairs={repairs} />
          <MaintenanceHistoryTab loading={loadingMaint} maintenances={maintenances} />
      </Space>
  );

  const items = [
    { key: '1', label: '1. Lý lịch thiết bị', children: renderProfile() },
    { key: '2', label: '2. Ban quản lý', children: renderManagement() },
    { key: '3', label: '3. Pháp lý & Kiểm định', children: renderInspection() },
    { key: '4', label: '4. Sửa chữa & Bảo trì', children: renderHistory() },
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
    </Drawer>
  );
}

