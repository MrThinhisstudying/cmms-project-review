import React, { useState, useEffect } from "react";
import { Table, Tag, Button, Tooltip, Modal, Typography, DatePicker, message, Spin } from "antd";
import type { ColumnsType } from "antd/es/table";
import { IMaintenance } from "../../../../types/maintenance.types";
import dayjs from "dayjs";
import { CheckCircleOutlined, ClockCircleOutlined, ToolOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { createMaintenanceTicket, getAllTemplates } from "../../../../apis/maintenance";
import { getToken } from "../../../../utils/auth";

const { Text, Title } = Typography;

interface Props {
  loading: boolean;
  maintenances: IMaintenance[];
  deviceId: number;
  deviceName: string;
  onRefresh: () => void;
}

export default function MaintenanceHistoryTab({
  loading,
  maintenances,
  deviceId,
  deviceName,
  onRefresh
}: Props) {
  // --- STATE FOR PERFORM MAINTENANCE ---
  const [isPerformOpen, setIsPerformOpen] = useState(false);
  const [performRecord, setPerformRecord] = useState<any>(null);
  const [performDate, setPerformDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [minDate, setMinDate] = useState<dayjs.Dayjs | null>(null);
  const [creating, setCreating] = useState(false);
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
            template_id: null, // Disable template
            maintenance_level: performRecord.level,
            execution_date: performDate.toISOString(),
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
      if (current > dayjs().endOf('day')) return true;
      if (minDate && current < minDate.startOf('day')) return true;
      return false;
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
        render: (_, r: any) => {
            if (r.status === 'inactive' && r.last_maintenance_date) {
                return <Tag color="green"><CheckCircleOutlined /> Hoàn thành</Tag>;
            }
            
            if (r.status === 'active') {
                 const today = dayjs().startOf("day");
                 const nextDate = dayjs(r.next_maintenance_date).startOf("day");
                 const diff = nextDate.diff(today, "day");

                 if (diff < 0) return <Tag color="red" icon={<ClockCircleOutlined />}>Đã quá hạn {Math.abs(diff)} ngày</Tag>;
                 if (diff <= 5) return <Tag color="orange" icon={<ClockCircleOutlined />}>Sắp đến hạn ({diff} ngày)</Tag>;
                 return <Tag color="processing" icon={<ClockCircleOutlined />}>Đang tiến hành</Tag>;
            }
            
            return <Tag color="default">Chưa tới ngày</Tag>;
        }
    },
    {
        title: 'Thao tác',
        key: 'action',
        align: 'right',
        render: (_, r, index) => {
            if (r.status === 'inactive' && r.last_maintenance_date) {
                return <Tag color="green"><CheckCircleOutlined /> Đã xong</Tag>;
            }

            if (r.status !== 'active') {
                return <Button size="small" disabled>Thực hiện</Button>;
            }

            // Lock logic (Optional, keep simple for now or match Modal)
            const firstActiveIndex = maintenances.findIndex(d => d.status === 'active');
            const isLocked = index !== firstActiveIndex && firstActiveIndex !== -1;
            
            // Allow bypassing lock per user request in previous steps? 
            // The user said "remove template", didn't explicitly say "remove lock".
            // But let's keep it consistent: Encourage sequential but allows click.
            
            return (
                 <Button 
                    type="primary" 
                    size="small" 
                    icon={<ToolOutlined />}
                    onClick={() => handleOpenPerform(r)}
                >
                    Thực hiện
                </Button>
            );
        }
    }
  ];

  return (
    <div>
      {maintenances.length > 0 && (
        <div style={{ marginBottom: 16, color: 'rgba(0, 0, 0, 0.45)' }}>
          Tổng số: <strong>{maintenances.length}</strong> lịch bảo trì
        </div>
      )}
      <Table
        loading={loading}
        columns={columns}
        dataSource={maintenances}
        rowKey="maintenance_id"
        size="small"
        pagination={false} // List is usually short enough or parent handles scroll
        locale={{ emptyText: "Không có lịch sử bảo trì" }}
      />
      
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
    </div>
  );
}
