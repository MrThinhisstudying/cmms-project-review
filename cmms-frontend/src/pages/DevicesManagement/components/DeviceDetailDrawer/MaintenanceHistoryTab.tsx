import React, { useState } from "react";
import { Table, Tag, Button, Modal, Typography, DatePicker, message, Card, Space } from "antd";
import type { ColumnsType } from "antd/es/table";
import { IMaintenance } from "../../../../types/maintenance.types";
import { IDevice } from "../../../../types/devicesManagement.types";
import dayjs from "dayjs";
import { CheckCircleOutlined, ClockCircleOutlined, ToolOutlined, ExclamationCircleOutlined, TableOutlined, CalendarOutlined } from "@ant-design/icons";
import { createMaintenanceTicket } from "../../../../apis/maintenance";
import { getToken } from "../../../../utils/auth";
import { renderMaintenanceStatusTag } from "../../../../utils/maintenanceDue";
import { useAuthContext } from "../../../../context/AuthContext/AuthContext";
import EditMaintenanceDateModal from "../../../../components/EditMaintenanceDateModal";

const { Text } = Typography;

interface Props {
  loading: boolean;
  maintenances: IMaintenance[];
  deviceId: number;
  deviceName: string;
  device?: IDevice;
  onRefresh: () => void;
}

export default function MaintenanceHistoryTab({
  loading,
  maintenances,
  deviceId,
  deviceName,
  device,
  onRefresh
}: Props) {
  const { user } = useAuthContext();
  const canEditDate = user?.role === 'ADMIN' || user?.permissions?.includes('UPDATE_MAINTENANCE_DATE');

  // --- STATE FOR PERFORM MAINTENANCE ---
  const [isPerformOpen, setIsPerformOpen] = useState(false);
  const [performRecord, setPerformRecord] = useState<any>(null);
  const [performDate, setPerformDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [minDate, setMinDate] = useState<dayjs.Dayjs | null>(null);
  const [creating, setCreating] = useState(false);

  // --- STATE FOR EDIT MAINTENANCE DATE ---
  const [isEditDateOpen, setIsEditDateOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  // ------------------------------------

  const handleOpenPerform = (record: any) => {
      setPerformRecord(record);
      setPerformDate(dayjs()); // Default today
      
      // Calculate Min Date
      // Note: `maintenances` prop might be sorted or not. usually API returns sorted by something.
      // Logic in MaintenanceDetailModal was: find index in `data` (which was sorted Active first, then Date).
      // Here we trust `maintenances` order or sort it ourselves.
      // Let's assume list order is visual order.
      const idx = maintenances.findIndex(d => d.maintenance_id === record.maintenance_id);
      if (idx > 0) {
          const prevItem = maintenances[idx - 1];
          // Check if previous item is COMPLETED (inactive + last_date)
          if (prevItem.status === 'inactive' && prevItem.last_maintenance_date) {
              setMinDate(dayjs(prevItem.last_maintenance_date));
          } else {
              setMinDate(null);
          }
      } else {
           setMinDate(null);
      }

      setIsPerformOpen(true);
  };

  const handleSavePerform = async () => {
      if (!performDate) {
          message.error("Vui lòng chọn ngày thực hiện!");
          return;
      }

      setCreating(true);
      try {
           const payload = {
            device_id: deviceId,
            maintenance_id: performRecord?.maintenance_id,
            template_id: null, // Disable template
            maintenance_level: performRecord.level,
            execution_date: performDate.hour(12).minute(0).second(0).toISOString(),
            checklist_result: [], 
            working_hours: 0,
            execution_team: [], 
           };

           await createMaintenanceTicket(getToken(), payload);
           message.success("Đã tạo phiếu và hoàn thành bảo dưỡng!");
           
           setIsPerformOpen(false);
           onRefresh(); // Trigger reload in parent
      } catch (error: any) {
          message.error("Lỗi: " + (error.message || "Không thể tạo phiếu"));
      } finally {
          setCreating(false);
      }
  };

  const disabledDate = (current: dayjs.Dayjs) => {
      return current > dayjs().endOf('day');
  };

  const columns: ColumnsType<IMaintenance> = [
    {
        title: 'Hạng mục',
        dataIndex: 'level',
        key: 'level',
        render: (val) => {
             const map: Record<string, string> = {
                "Tuần": "Tuần", "Week": "Tuần",
                "1M": "01 Tháng", "3M": "03 Tháng", "6M": "06 Tháng", "9M": "09 Tháng",
                "1Y": "01 Năm", "2Y": "02 Năm"
            };
            const colorMap: Record<string, string> = {
                "Tuần": "blue", "Week": "blue",
                "1M": "cyan", "3M": "geekblue", "6M": "purple", "9M": "magenta", "1Y": "magenta", "2Y": "volcano"
            };
            return <Tag color={colorMap[val] || "blue"}>{map[val] || val}</Tag>;
        }
    },
    {
      title: "Ngày dự kiến",
      dataIndex: "next_maintenance_date", // Synced field name with DetailModal
      key: "next_maintenance_date",
      render: (val) => (val ? dayjs(val).format("DD/MM/YYYY") : "—"),
    },
    {
        title: 'Ngày hoàn thành',
        dataIndex: 'last_maintenance_date',
        key: 'last',
        render: (val, r) => {
            if (r.status === 'inactive' && val) return <Text type="success">{dayjs(val).format('DD/MM/YYYY')}</Text>;
            if (r.status === 'active' && val) return <Text type="secondary">(Lần trước: {dayjs(val).format('DD/MM')})</Text>;
            return '---';
        }
    },
    {
        title: 'Trạng thái',
        key: 'status',
        render: (_, r: any) => renderMaintenanceStatusTag(r),
    },
    {
        title: 'Thao tác',
        key: 'action',
        align: 'right',
        render: (_, r, index) => {
            return (
              <Space size={6}>
                {canEditDate && (
                  <Button
                    size="small"
                    icon={<CalendarOutlined />}
                    onClick={() => {
                      setEditingRecord({ ...r, device_name: deviceName });
                      setIsEditDateOpen(true);
                    }}
                  >
                    Sửa ngày
                  </Button>
                )}
                {r.status === 'inactive' && r.last_maintenance_date ? (
                  <Tag color="green"><CheckCircleOutlined /> Đã xong</Tag>
                ) : r.status !== 'active' ? (
                  <Button size="small" disabled>Thực hiện</Button>
                ) : (
                  <Button 
                    type="primary" 
                    size="small" 
                    icon={<ToolOutlined />}
                    onClick={() => handleOpenPerform(r)}
                  >
                    Thực hiện
                  </Button>
                )}
              </Space>
            );
        }
    }
  ];

  // --- CHU KỲ BẢO DƯỠNG (VIEW GỐC) ---
  const cycles =
    maintenances.find((m) => m.cycle_config && m.cycle_config.length > 0)?.cycle_config ||
    maintenances[0]?.cycle_config ||
    [];

  const completedRecord = maintenances.find(
    (m) => m.status === 'inactive' && !!m.last_maintenance_date
  );
  const lastMaintenanceDate =
    completedRecord?.last_maintenance_date ||
    maintenances[0]?.last_maintenance_date ||
    maintenances[0]?.start_date;

  const renderCheck = (targetKey: string) => {
    if (!Array.isArray(cycles)) return null;
    const matchMap: Record<string, string[]> = {
      Tuần: ['Tuần', 'Week', '1W'],
      '1M': ['1M', '1 Tháng', '01 Tháng', '1_month'],
      '3M': ['3M', '3 Tháng', '03 Tháng', '3_month'],
      '6M': ['6M', '6 Tháng', '06 Tháng', '6_month'],
      '1Y': ['1Y', '1 Năm', '01 Năm', '12_month'],
      '2Y': ['2Y', '2 Năm', '02 Năm', '24_month'],
    };
    const targets = matchMap[targetKey] || [targetKey];
    const isMatch = cycles.some((c) => targets.includes(c));
    return isMatch ? (
      <Tag color="green" style={{ margin: 0, fontWeight: 600 }}>
        x
      </Tag>
    ) : null;
  };

  const originalPlanColumns: ColumnsType<any> = [
    {
      title: 'STT',
      width: 50,
      align: 'center',
      render: () => 1,
    },
    {
      title: 'Tên Trang Thiết Bị',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <b>{text || deviceName}</b>,
    },
    {
      title: 'Nước sản xuất',
      dataIndex: 'country_of_origin',
      key: 'country',
      width: 120,
      render: (val) => val || '—',
    },
    {
      title: 'Biển số xe',
      dataIndex: 'reg_number',
      key: 'reg_number',
      width: 130,
      render: (text) =>
        text ? <Tag color="blue">{text}</Tag> : <span style={{ color: '#ccc', fontStyle: 'italic' }}>N/A</span>,
    },
    {
      title: 'Ngày BD Gần Nhất',
      key: 'last_date',
      align: 'center',
      width: 140,
      render: () => (lastMaintenanceDate ? dayjs(lastMaintenanceDate).format('DD/MM/YYYY') : '—'),
    },
    {
      title: 'Tuần',
      align: 'center',
      width: 80,
      render: () => renderCheck('Tuần'),
    },
    {
      title: '1 Tháng',
      align: 'center',
      width: 80,
      render: () => renderCheck('1M'),
    },
    {
      title: '3 Tháng',
      align: 'center',
      width: 80,
      render: () => renderCheck('3M'),
    },
    {
      title: '6 Tháng',
      align: 'center',
      width: 80,
      render: () => renderCheck('6M'),
    },
    {
      title: '1 Năm',
      align: 'center',
      width: 80,
      render: () => renderCheck('1Y'),
    },
    {
      title: '2 Năm',
      align: 'center',
      width: 80,
      render: () => renderCheck('2Y'),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. BẢNG KẾ HOẠCH BẢO DƯỠNG (VIEW GỐC) */}
      <Card
        size="small"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TableOutlined style={{ color: '#1890ff' }} />
            <span style={{ fontWeight: 700, color: '#002766', fontSize: 13 }}>
              DANH SÁCH KẾ HOẠCH BẢO DƯỠNG (VIEW GỐC)
            </span>
          </div>
        }
        style={{ borderRadius: 8, borderColor: '#d9d9d9' }}
      >
        <Table
          columns={originalPlanColumns}
          dataSource={[device || { name: deviceName, device_id: deviceId }]}
          rowKey={(r) => r.device_id || 'view-goc'}
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {/* 2. BẢNG TIẾN ĐỘ THỰC HIỆN TỪNG ĐỢT */}
      <Card
        size="small"
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Lịch trình thực hiện bảo dưỡng chi tiết</span>
            {maintenances.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(0, 0, 0, 0.45)' }}>
                Tổng số: <strong>{maintenances.length}</strong> lịch bảo trì
              </span>
            )}
          </div>
        }
        style={{ borderRadius: 8 }}
      >
        <Table
          loading={loading}
          columns={columns}
          dataSource={maintenances}
          rowKey="maintenance_id"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} / ${t} lịch` }}
          locale={{ emptyText: "Không có lịch sử bảo trì" }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
      
      <Modal
        title={
            <span>
                <ToolOutlined /> Thực hiện bảo dưỡng: <span style={{color: '#1890ff'}}>{deviceName}</span>
            </span>
        }
        open={isPerformOpen}
        onCancel={() => setIsPerformOpen(false)}
        onOk={handleSavePerform}
        okText="Lưu & Hoàn thành"
        cancelText="Hủy bỏ"
        confirmLoading={creating}
        destroyOnClose
      >
          <div style={{marginBottom: 16}}>
              <Text strong>1. Chọn ngày thực hiện:</Text>
              <DatePicker 
                style={{width: '100%', marginTop: 8}} 
                format="DD/MM/YYYY"
                value={performDate}
                onChange={setPerformDate}
                disabledDate={disabledDate}
                allowClear={false}
              />
          </div>

          <div style={{background: '#f5f5f5', padding: 8, borderRadius: 4}}>
              <Text type="secondary" style={{fontSize: 12}}>
                  <ExclamationCircleOutlined /> Bạn đang thực hiện bảo dưỡng cấp độ <b>{performRecord?.level}</b>. 
                  <br/>Hệ thống sẽ ghi nhận ngày bảo dưỡng và cập nhật trạng thái thiết bị.
              </Text>
          </div>
      </Modal>

      <EditMaintenanceDateModal
        open={isEditDateOpen}
        record={editingRecord}
        onClose={() => {
          setIsEditDateOpen(false);
          setEditingRecord(null);
        }}
        onSuccess={onRefresh}
      />
    </div>
  );
}
