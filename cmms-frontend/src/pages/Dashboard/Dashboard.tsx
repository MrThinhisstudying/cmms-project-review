import React, { useEffect, useMemo } from "react";
import {
  Layout,
  Row,
  Col,
  Card,
  Typography,
  Button,
  Space,
  Table,
  Tag,
  Tabs,
  Statistic,
  Progress,
  Breadcrumb,
  Timeline,
  Avatar,
  Divider,
  theme
} from "antd";
import {
  ToolOutlined,
  AlertOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  AppstoreOutlined,
  SearchOutlined,
  CalendarOutlined,
  ExportOutlined,
  PlusOutlined,
  UserOutlined,
  RightOutlined
} from "@ant-design/icons";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { useInventoryContext } from "../../context/InventoryContext/InventoryContext";
import { useDevicesContext } from "../../context/DevicesContext/DevicesContext";
import { useRepairsContext } from "../../context/RepairsContext/RepairsContext";
import { useMaintenanceContext } from "../../context/MaintenanceContext/MaintenanceContext";
import dayjs from "dayjs";
import { DeviceStatus } from "../../types/devicesManagement.types";

const { Title, Text, Link: TextLink } = Typography;
const { Header, Content } = Layout;

const Dashboard = () => {
  const { user } = useAuthContext();
  const { items, stockOuts, refreshAll } = useInventoryContext();
  const { devices, fetchDevices } = useDevicesContext();
  const { repairs, reload: reloadRepairs } = useRepairsContext();
  const { maintenances, fetchMaintenances } = useMaintenanceContext();
  const navigate = useNavigate();
  const { token } = theme.useToken();

  useEffect(() => {
    refreshAll();
    fetchDevices();
    reloadRepairs();
    fetchMaintenances();
  }, [refreshAll, fetchDevices, reloadRepairs, fetchMaintenances]);

  // --- Stats Calculation ---
  const stats = useMemo(() => {
    // 1. Critical: Phiếu chờ xử lý
    const pendingRepairsCount = repairs.filter(
      (r: any) => 
        r.status_request === 'PENDING' || 
        r.status_request === 'WAITING_INSPECTION' || 
        r.status_request === 'WAITING_ACCEPTANCE' ||
        r.status_request === 'IN_PROGRESS'
    ).length;

    // 2. Performance: Tỷ lệ sẵn sàng
    // Assumption: 'DANG_SU_DUNG' and 'MOI' mean ready/working.
    const activeDevices = devices.filter((d) => 
        d.status === "DANG_SU_DUNG" as DeviceStatus || 
        d.status === "MOI" as DeviceStatus
    ).length;
    const totalDevices = devices.length;
    const readinessRate = totalDevices > 0 ? Math.round((activeDevices / totalDevices) * 100) : 0;

    // 3. Danger: Bảo dưỡng quá hạn
    // Count maintenances where next_maintenance_date < today
    const now = dayjs();
    const overdueCount = maintenances.filter((m) => {
      if (!m.next_maintenance_date) return false;
      return dayjs(m.next_maintenance_date).isBefore(now, 'day');
    }).length;

    // 4. Inventory: Vật tư sắp hết
    // Arbitrary threshold < 10
    const lowStockCount = items.filter((item) => item.quantity < 10).length;

    return {
      pendingRepairsCount,
      readinessRate,
      overdueCount,
      lowStockCount
    };
  }, [repairs, devices, maintenances, items]);

  // --- Recent Repairs Data ---
  const recentRepairs = useMemo(() => {
    // Sort by created_at desc
    return [...repairs]
      .sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf())
      .slice(0, 5);
  }, [repairs]);

  // --- Today's Schedule ---
  const todaySchedule = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    return maintenances
      .filter(m => m.next_maintenance_date && dayjs(m.next_maintenance_date).isSame(today, 'day'))
      .slice(0, 4); // Show max 4
  }, [maintenances]);


  // --- Columns ---
  const repairColumns = [
    {
      title: 'Thiết bị',
      dataIndex: ['device', 'name'],
      key: 'device_name',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Biển số',
      dataIndex: ['device', 'reg_number'],
      key: 'reg_number',
      render: (text: string) => text || <Text type="secondary">N/A</Text>
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => <Text type="secondary">{date ? dayjs(date).format('DD/MM/YYYY') : '---'}</Text>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status_request',
      key: 'status',
      render: (status: string) => {
          let label = status;
          let color = 'default';
          
          if (status === 'COMPLETED') {
            label = 'Hoàn thành';
            color = 'success';
          } else if (status.includes('WAITING') || status === 'PENDING') {
            label = 'Đang xử lý';
            color = 'processing'; // AntD Blue
          } else if (status.includes('REJECTED')) {
             label = 'Đã từ chối';
             color = 'error';
          }
          
          return <Tag color={color}>{label}</Tag>
      }
    }
  ];

  return (
    <Layout style={{ background: 'transparent', padding: 24 }}>
      {/* 1. Page Title only - Removed Card Header */}
      <Title level={4} style={{ marginBottom: 16 }}>Trung tâm điều hành bảo trì</Title>

      {/* 2. Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Card 1: Critical - Pending Repairs */}
        <Col span={6}>
          <Card bordered={false} bodyStyle={{ padding: 20, height: 160, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <div>
                  <Text type="secondary" style={{ fontSize: 14 }}>Phiếu chờ xử lý</Text>
                  <Title level={2} style={{ margin: '8px 0 0', color: '#faad14' }}>
                    {stats.pendingRepairsCount}
                  </Title>
               </div>
               <div style={{ 
                 background: '#fff7e6', 
                 padding: 10, 
                 borderRadius: '50%',
                 color: '#faad14' 
               }}>
                  <ToolOutlined style={{ fontSize: 24 }} />
               </div>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
               Cần xử lý ngay
            </Text>
          </Card>
        </Col>

        {/* Card 2: Performance - Readiness */}
        <Col span={6}>
            <Card bordered={false} bodyStyle={{ padding: 20, height: 160 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                <div>
                   <Text type="secondary" style={{ fontSize: 14 }}>Tỷ lệ sẵn sàng</Text>
                   <div style={{ marginTop: 8 }}>
                      <Text type="secondary">Tổng thiết bị: </Text>
                      <Text strong>{devices.length}</Text>
                   </div>
                </div>
                <Progress 
                  type="circle" 
                  percent={stats.readinessRate} 
                  strokeColor="#52c41a" 
                  width={80} 
                  format={percent => <span style={{ color: '#262626', fontSize: 16, fontWeight: 600 }}>{percent}%</span>}
                />
             </div>
          </Card>
        </Col>

        {/* Card 3: Danger - Overdue Maintenance */}
        <Col span={6}>
            <Card bordered={false} bodyStyle={{ padding: 20, height: 160, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <div>
                  <Text type="secondary" style={{ fontSize: 14 }}>Bảo dưỡng quá hạn</Text>
                  <Title level={2} style={{ margin: '8px 0 0', color: '#ff4d4f' }}>
                    {stats.overdueCount}
                  </Title>
               </div>
               <div style={{ 
                 background: '#fff1f0', 
                 padding: 10, 
                 borderRadius: '50%',
                 color: '#ff4d4f' 
               }}>
                  <AlertOutlined style={{ fontSize: 24 }} />
               </div>
            </div>
            <Link to="/quan_ly_bao_duong" style={{ fontSize: 12, color: '#ff4d4f' }}>
               Xem danh sách chênh lệch <RightOutlined style={{ fontSize: 10 }} />
            </Link>
          </Card>
        </Col>

        {/* Card 4: Inventory - Low Stock */}
        <Col span={6}>
             <Card bordered={false} bodyStyle={{ padding: 20, height: 160, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <div>
                  <Text type="secondary" style={{ fontSize: 14 }}>Vật tư sắp hết</Text>
                  <Title level={2} style={{ margin: '8px 0 0' }}>
                    {stats.lowStockCount}
                  </Title>
               </div>
               <div style={{ 
                 background: '#e6f7ff', 
                 padding: 10, 
                 borderRadius: '50%',
                 color: '#1890ff' 
               }}>
                  <AppstoreOutlined style={{ fontSize: 24 }} />
               </div>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
               Dưới định mức tối thiểu
            </Text>
          </Card>
        </Col>
      </Row>

      {/* 3. Content Area (70/30) */}
      <Row gutter={24}>
        {/* Left Column - Recent Activity */}
        <Col span={17}>
          <Card bordered={false} style={{ borderRadius: 8, height: '100%' }} bodyStyle={{ padding: 0 }}>
             <Tabs 
               defaultActiveKey="1" 
               type="line"
               size="large"
               tabBarStyle={{ padding: '0 24px', margin: 0 }}
               items={[
                 {
                   key: '1',
                   label: 'Phiếu sửa chữa gần đây',
                   children: (
                     <Table 
                        dataSource={recentRepairs} 
                        columns={repairColumns} 
                        pagination={false} 
                        rowKey="repair_id" 
                        onRow={(record) => ({
                          onClick: () => {
                            // Navigate to details (list view for now)
                            navigate(`/quan_ly_sua_chua`); 
                          },
                          style: { cursor: 'pointer' }
                        })}
                     />
                   )
                 }
               ]}
               tabBarExtraContent={
                  <Button type="link" onClick={() => navigate('/quan_ly_sua_chua')}>
                    Xem tất cả <RightOutlined />
                  </Button>
               }
             />
          </Card>
        </Col>

        {/* Right Column - Widgets */}
        <Col span={7}>
          <Space direction="vertical" style={{ width: '100%' }} size={24}>
             {/* Widget 1: Quick Actions */}
             <Card title="Trung tâm điều hành" bordered={false} style={{ borderRadius: 8 }}>
                <Button 
                   type="primary" 
                   block 
                   icon={<PlusOutlined />} 
                   size="large" 
                   style={{ marginBottom: 16, height: 48, fontSize: 16 }}
                   onClick={() => navigate('/quan_ly_sua_chua')} // Ideally open create modal
                >
                  Tạo phiếu sửa chữa
                </Button>
                
                <Row gutter={[12, 12]}>
                   <Col span={12}>
                      <Button block style={{ height: 80, flexDirection: 'column' }} onClick={() => navigate('/lay_vat_tu')}>
                         <ExportOutlined style={{ fontSize: 20, marginBottom: 8, color: '#1890ff' }} />
                         <span>Xuất kho</span>
                      </Button>
                   </Col>
                   <Col span={12}>
                       <Button block style={{ height: 80, flexDirection: 'column' }} onClick={() => navigate('/maintenance-procedures')}>
                         <SearchOutlined style={{ fontSize: 20, marginBottom: 8, color: '#1890ff' }} />
                         <span>Tra cứu</span>
                      </Button>
                   </Col>
                    <Col span={12}>
                       <Button block style={{ height: 80, flexDirection: 'column' }} onClick={() => navigate('/quan_ly_bao_duong')}>
                         <CalendarOutlined style={{ fontSize: 20, marginBottom: 8, color: '#1890ff' }} />
                         <span>Lịch</span>
                      </Button>
                   </Col>
                    <Col span={12}>
                       <Button block style={{ height: 80, flexDirection: 'column' }} onClick={() => navigate('/bao_cao_thong_ke')}>
                         <AppstoreOutlined style={{ fontSize: 20, marginBottom: 8, color: '#1890ff' }} />
                         <span>Báo cáo</span>
                      </Button>
                   </Col>
                </Row>
             </Card>

             {/* Widget 2: Today Schedule */}
             <Card title="Lịch bảo trì hôm nay" bordered={false} style={{ borderRadius: 8 }}>
                {todaySchedule.length === 0 ? (
                   <div style={{ textAlign: 'center', padding: '20px 0', color: '#8c8c8c' }}>
                      Không có lịch bảo trì hôm nay
                   </div>
                ) : (
                  <Timeline 
                    items={todaySchedule.map(m => ({
                        color: m.status === 'active' ? 'green' : 'gray',
                        children: (
                          <>
                             <Text strong>{m.device?.name}</Text>
                             <br/>
                             <Text type="secondary" style={{ fontSize: 12 }}>
                                {m.level ? `Cấp ${m.level}` : 'Bảo dưỡng'}
                             </Text>
                          </>
                        )
                    }))}
                  />
                )}
                 <div style={{ marginTop: 12, textAlign: 'center' }}>
                     <Link to="/quan_ly_bao_duong" style={{ fontSize: 13 }}>Xem lịch chi tiết</Link>
                 </div>
             </Card>
          </Space>
        </Col>
      </Row>
    </Layout>
  );
};

export default Dashboard;
