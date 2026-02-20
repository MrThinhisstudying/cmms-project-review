import React, { useEffect, useState, useCallback } from "react";
import { Modal, Table, Tag, Spin, Typography, Button, Tooltip, DatePicker, Select, message } from "antd";
import { getMaintenancesByDevice, getAllTemplates, createMaintenanceTicket } from "../../../apis/maintenance";
import { getToken } from "../../../utils/auth";
import dayjs from "dayjs";
import { CheckCircleOutlined, ClockCircleOutlined, ToolOutlined, ExclamationCircleOutlined } from "@ant-design/icons";

interface Props {
  open: boolean;
  onClose: () => void;
  deviceId?: number;
  deviceName?: string;
  onPerformMaintenance?: (record: any) => void;
}

const { Title, Text } = Typography;

const MaintenanceDetailModal: React.FC<Props> = ({
  open,
  onClose,
  deviceId,
  deviceName,
  onPerformMaintenance,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  // --- NEW STATE FOR PERFORM MAINTENANCE ---
  const [isPerformOpen, setIsPerformOpen] = useState(false);
  const [performRecord, setPerformRecord] = useState<any>(null);
  const [performDate, setPerformDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [minDate, setMinDate] = useState<dayjs.Dayjs | null>(null); // Constraint
  const [templates, setTemplates] = useState<any[]>([]);
  const [performTemplateId, setPerformTemplateId] = useState<number | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [filteredTemplates, setFilteredTemplates] = useState<any[]>([]);
  // ----------------------------------------

  // Fetch templates once
  useEffect(() => {
    if (open) {
        getAllTemplates(getToken()).then(res => {
            if (Array.isArray(res)) setTemplates(res);
        }).catch(err => console.error(err));
    }
  }, [open]);

  // Filter templates when record changes
  useEffect(() => {
     if (performRecord && templates.length > 0) {
         setFilteredTemplates(templates);
     }
  }, [performRecord, templates]);

  const handleOpenPerform = (record: any) => {
      setPerformRecord(record);
      setPerformDate(dayjs()); // Default today
      setPerformTemplateId(undefined); // Reset
      
      // Calculate Min Date (Must be after the previous completed maintenance)
      const idx = data.findIndex(d => d.maintenance_id === record.maintenance_id);
      if (idx > 0) {
          const prevItem = data[idx - 1];
          if (prevItem && prevItem.last_maintenance_date) {
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
      // USER REQUEST: Disable Template Logic for now.
      // let tId = performTemplateId;
      
      // if (!tId && templates.length > 0) {
      //     tId = templates[0].id; 
      // }

      // if (!tId) {
      //     message.error("Hệ thống chưa có Quy trình bảo dưỡng nào! Vui lòng tạo quy trình trước.");
      //     return;
      // }

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
           fetchDetails(); // Reload list
      } catch (error: any) {
          message.error("Lỗi: " + (error.message || "Không thể tạo phiếu"));
      } finally {
          setCreating(false);
      }
  };
  
  // Date Constraint Function
  const disabledDate = (current: dayjs.Dayjs) => {
      // 1. Cannot select future dates
      if (current > dayjs().endOf('day')) return true;
      
      // 2. Cannot select dates before the previous maintenance completion
      if (minDate && current < minDate.startOf('day')) return true;
      
      return false;
  };

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await getMaintenancesByDevice(deviceId!, token);
      // Sort: Active first, then by date desc
      const sorted = Array.isArray(res) ? res.sort((a: any, b: any) => {
          return new Date(a.next_maintenance_date).getTime() - new Date(b.next_maintenance_date).getTime();
      }) : [];
      setData(sorted);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (open && deviceId) {
      fetchDetails();
    }
  }, [open, deviceId, fetchDetails]);

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      footer={
        <Button onClick={onClose}>Đóng</Button>
      }
      width={900}
      styles={{ body: { padding: 24 } }}
    >
      <div style={{ marginBottom: 24 }}>
          <Title level={4}><ToolOutlined /> Kế hoạch bảo dưỡng chi tiết</Title>
          <Text type="secondary">{deviceName}</Text>
      </div>

      <Spin spinning={loading}>
      <Table
            dataSource={data}
            rowKey="maintenance_id"
            pagination={false}
            columns={[
                {
                    title: 'Hạng mục',
                    dataIndex: 'level',
                    key: 'level',
                    render: (val) => {
                         const map: Record<string, string> = {
                            "Tuần": "Tuần",
                            "Week": "Tuần",
                            "1M": "01 Tháng",
                            "3M": "03 Tháng",
                            "6M": "06 Tháng",
                            "9M": "09 Tháng",
                            "1Y": "01 Năm",
                            "2Y": "02 Năm"
                        };
                         const colorMap: Record<string, string> = {
                            "Tuần": "blue",
                            "Week": "blue",
                            "1M": "cyan",
                            "3M": "geekblue",
                            "6M": "purple",
                            "9M": "magenta",
                            "1Y": "magenta",
                            "2Y": "volcano"
                        };
                        return <Tag color={colorMap[val] || "blue"}>{map[val] || val}</Tag>;
                    }
                },
                 {
                    title: 'Ngày dự kiến',
                    dataIndex: 'next_maintenance_date',
                    key: 'date',
                    render: (val) => {
                        if (!val) return '---';
                        const d = dayjs(val);
                        return d.isValid() ? d.format('DD/MM/YYYY') : '---';
                    }
                },
                 {
                    title: 'Ngày hoàn thành',
                    dataIndex: 'last_maintenance_date',
                    key: 'last',
                    render: (val, r) => {
                        // Nếu đã xong (inactive + có last date) -> Hiển thị ngày hoàn thành
                        if (r.status === 'inactive' && val) return <Text type="success">{dayjs(val).format('DD/MM/YYYY')}</Text>;
                        // Nếu đang active + có last date -> Hiển thị ngày lần trước
                        if (r.status === 'active' && val) return <Text type="secondary">(Lần trước: {dayjs(val).format('DD/MM')})</Text>;
                        return '---';
                    }
                },
                 {
                    title: 'Trạng thái',
                    key: 'status',
                    render: (_, r) => {
                        // 1. Đã hoàn thành (Inactive + Có ngày last)
                        if (r.status === 'inactive' && r.last_maintenance_date) {
                            return <Tag color="green"><CheckCircleOutlined /> Hoàn thành</Tag>;
                        }
                        
                        // 2. ACTIVE (Chưa hoàn thành)
                        if (r.status === 'active') {
                             const today = dayjs().startOf("day");
                             const nextDate = dayjs(r.next_maintenance_date).startOf("day");
                             const diff = nextDate.diff(today, "day");

                             // Đã trễ hạn
                             if (diff < 0) return <Tag color="red" icon={<ClockCircleOutlined />}>Đã quá hạn {Math.abs(diff)} ngày</Tag>;
                             // Sắp đến hạn (trong vòng 5 ngày tới)
                             if (diff <= 5) return <Tag color="orange" icon={<ClockCircleOutlined />}>Sắp đến hạn ({diff} ngày)</Tag>;
                             // Đang theo dõi
                             return <Tag color="processing" icon={<ClockCircleOutlined />}>Đang tiến hành</Tag>;
                        }
                        
                        // 3. Status Inactive + Không có last date -> Chưa tới ngày
                        return <Tag color="default">Chưa tới ngày bảo dưỡng</Tag>;
                    }
                },
                {
                    title: 'Thao tác',
                    key: 'action',
                    align: 'right',
                    render: (_, r, index) => {
                        // 1. Nếu đã hoàn thành
                        if (r.status === 'inactive' && r.last_maintenance_date) {
                            return <Tag color="green"><CheckCircleOutlined /> Đã hoàn thành</Tag>;
                        }

                        // 2. Logic tạo phiếu: Chỉ cho phép tạo nếu đang là Active
                        if (r.status !== 'active') {
                            return <Button size="small" disabled>Tạo phiếu</Button>;
                        }

                        // Lock nếu không phải active đầu tiên (Logic cũ nhưng kiểm tra kỹ hơn)
                        // Tìm active đầu tiên
                        const firstActiveIndex = data.findIndex(d => d.status === 'active');
                        const isLocked = index !== firstActiveIndex && firstActiveIndex !== -1;

                        const btn = (
                             <Button 
                                type="primary" 
                                size="small" 
                                icon={<ToolOutlined />}
                                // disabled={isLocked} // TẠM THỜI MỞ KHÓA THEO YÊU CẦU "BỎ QUA LOGIC CŨ"
                                onClick={() => {
                                    handleOpenPerform(r);
                                }}
                            >
                                Thực hiện bảo dưỡng
                            </Button>
                        );

                        if (isLocked) {
                             // Note: Logic cũ lock nhưng user bảo bỏ qua. Có thể để Tooltip warning thay vì disable?
                             // Hiện tại cứ enable hết cho chắc.
                             return btn;
                        }
                        return btn;
                    }
                }
            ]}
        />
      </Spin>

      {/* --- MODAL THỰC HIỆN BẢO DƯỠNG (MỚI) --- */}
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
    </Modal>
  );
};


export default MaintenanceDetailModal;
