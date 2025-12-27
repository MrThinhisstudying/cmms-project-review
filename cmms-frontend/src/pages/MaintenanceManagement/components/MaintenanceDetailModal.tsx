import React, { useEffect, useState } from "react";
import { Modal, Table, Tag, Steps, Spin, Card, Row, Col, Typography, Button, Tooltip } from "antd";
import { getMaintenancesByDevice } from "../../../apis/maintenance";
import { getToken } from "../../../utils/auth";
import dayjs from "dayjs";
import { ScheduleOutlined, CheckCircleOutlined, ClockCircleOutlined, ToolOutlined } from "@ant-design/icons";

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

  useEffect(() => {
    if (open && deviceId) {
      fetchDetails();
    }
  }, [open, deviceId]);

  const fetchDetails = async () => {
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
  };

  const activePlans = data.filter((d) => d.status === "active");
  const inactivePlans = data.filter((d) => d.status !== "active" && d.status !== "canceled");

  // Format Status
  const renderStatus = (status: string, date: string) => {
    const today = dayjs().startOf("day");
    const nextDate = dayjs(date).startOf("day");
    const diff = nextDate.diff(today, "day");

    if (status === "active") {
        if (diff < 0) return <Tag color="red" icon={<ClockCircleOutlined />}>Đã quá hạn {Math.abs(diff)} ngày</Tag>;
        if (diff <= 5) return <Tag color="orange" icon={<ClockCircleOutlined />}>Sắp đến ({diff} ngày)</Tag>;
        return <Tag color="blue" icon={<ClockCircleOutlined />}>Đang theo dõi</Tag>;
    }
    return <Tag color="default">Chờ kích hoạt</Tag>;
  };

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      footer={
        <Button onClick={onClose}>Đóng</Button>
      }
      width={900}
      bodyStyle={{ padding: 24 }}
    >
      <div style={{ marginBottom: 24 }}>
          <Title level={4}><ToolOutlined /> Kết hoạch bảo dưỡng chi tiết</Title>
          <Text type="secondary">{deviceName}</Text>
      </div>

      <Spin spinning={loading}>
        {/* VIEW DẠNG LIST (GIỐNG ẢNH YÊU CẦU) */}
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
                    render: (val) => dayjs(val).format('DD/MM/YYYY')
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
                                disabled={isLocked}
                                onClick={() => {
                                    onClose(); 
                                    if(onPerformMaintenance) onPerformMaintenance(r);
                                }}
                            >
                                Tạo phiếu
                            </Button>
                        );

                        if (isLocked) {
                             return (
                                 <Tooltip title="Vui lòng hoàn thành phiếu trước đó">
                                     {btn}
                                 </Tooltip>
                             )
                        }
                        return btn;
                    }
                }
            ]}
        />
      </Spin>
    </Modal>
  );
};

export default MaintenanceDetailModal;
