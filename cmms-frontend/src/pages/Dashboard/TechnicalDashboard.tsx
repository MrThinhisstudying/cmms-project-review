import React, { useEffect, useMemo, useCallback } from "react";
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
  Progress,
  Timeline,
} from "antd";
import {
  ToolOutlined,
  AlertOutlined,
  AppstoreOutlined,
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
import { isMaintenanceOverdue, getMaintenanceStatusInfo } from "../../utils/maintenanceDue";
import RepairDetailDrawer from "../RepairsManagement/components/RepairDetailDrawer";
import { useRefreshOnFocus } from "../../hooks/useRefreshOnFocus";
import { useSocket } from "../../hooks/useSocket";

const { Title, Text } = Typography;

const TechnicalDashboard = () => {
  const { user } = useAuthContext();
  const { items, refreshAll } = useInventoryContext();
  const { devices, fetchDevices } = useDevicesContext();
  const { repairs, reload: reloadRepairs, reviewRepairItem, exportRepairItem } = useRepairsContext();
  const { maintenances, fetchMaintenances } = useMaintenanceContext();
  const navigate = useNavigate();
  // const { token } = theme.useToken();

  // Drawers State
  const [selectedRepair, setSelectedRepair] = React.useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  useEffect(() => {
    // Initial fetch
    refreshAll();
    fetchDevices();
    reloadRepairs();
    fetchMaintenances();

    // Polling cho updates không qua WebSocket (giảm tần suất vì đã có WS)
    const interval = setInterval(() => {
        reloadRepairs();
        fetchMaintenances(true); 
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshAll, fetchDevices, reloadRepairs, fetchMaintenances]);

  // Phase A: Tự refetch khi user quay lại tab
  const refreshDashboard = useCallback(() => {
    refreshAll();
    fetchDevices();
    reloadRepairs();
    fetchMaintenances();
  }, [refreshAll, fetchDevices, reloadRepairs, fetchMaintenances]);

  useRefreshOnFocus(refreshDashboard);

  // Phase B: WebSocket - nhận events từ backend
  const socketListeners = useMemo(() => ({
    dashboard_refresh: () => refreshDashboard(),
    repair_updated: () => reloadRepairs(),
    device_updated: () => fetchDevices(),
  }), [refreshDashboard, reloadRepairs, fetchDevices]);
  useSocket(user?.user_id, socketListeners);

  // --- Stats Calculation ---
  const stats = useMemo(() => {
    // 1. Critical: Phiếu chờ xử lý (toàn hệ thống)
    const pendingRepairsCount = repairs.filter(
      (r: any) => 
        r.status_request === 'PENDING' || 
        r.status_request === 'WAITING_INSPECTION' || 
        r.status_request === 'WAITING_ACCEPTANCE' ||
        r.status_request === 'IN_PROGRESS'
    ).length;

    // 2. Performance
    const activeDevices = devices.filter((d) => 
        d.status === "DANG_SU_DUNG" as DeviceStatus || 
        d.status === "MOI" as DeviceStatus
    ).length;
    const totalDevices = devices.length;
    const readinessRate = totalDevices > 0 ? Math.round((activeDevices / totalDevices) * 100) : 0;

    // 3. Danger
    const overdueCount = maintenances.filter((m) => isMaintenanceOverdue(m)).length;

    // 4. Inventory
    const lowStockCount = items.filter((item) => item.quantity < 10).length;

    return {
      pendingRepairsCount,
      readinessRate,
      overdueCount,
      lowStockCount
    };
  }, [repairs, devices, maintenances, items]);

  // --- Phiếu chờ TÔI xử lý (context-based) ---
  const myPendingRepairs = useMemo(() => {
    if (!user) return [];
    const role = user.role;
    return repairs.filter((r: any) => {
      // TECHNICIAN: phiếu chờ tiếp nhận kỹ thuật
      if (['TECHNICIAN', 'OPERATOR'].includes(role) && r.status_request === 'PENDING') return true;
      // TEAM_LEAD: phiếu chờ Tổ trưởng duyệt
      if (role === 'TEAM_LEAD' && (
        r.status_request === 'WAITING_TEAM_LEAD' || 
        r.status_inspection === 'inspection_pending' ||
        r.status_acceptance === 'acceptance_pending'
      )) return true;
      // UNIT_HEAD: phiếu chờ CB đội duyệt  
      if (role === 'UNIT_HEAD' && (
        r.status_request === 'WAITING_MANAGER' ||
        r.status_inspection === 'inspection_lead_approved' ||
        r.status_acceptance === 'acceptance_lead_approved'
      )) return true;
      // DIRECTOR: phiếu chờ Ban GĐ duyệt
      if (role === 'DIRECTOR' && (
        r.status_request === 'WAITING_DIRECTOR' ||
        r.status_inspection === 'inspection_manager_approved' ||
        r.status_acceptance === 'acceptance_manager_approved'
      )) return true;
      // ADMIN: tất cả phiếu chờ duyệt cuối
      if (role === 'ADMIN' && (
        r.status_request === 'WAITING_DIRECTOR' ||
        r.status_inspection === 'inspection_manager_approved' ||
        r.status_acceptance === 'acceptance_manager_approved'
      )) return true;
      return false;
    }).sort((a: any, b: any) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());
  }, [repairs, user]);

  // --- Recent Repairs Data ---
  const recentRepairs = useMemo(() => {
    return [...repairs]
      .sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf())
      .slice(0, 10);
  }, [repairs]);

  // --- Schedule Data (Today + Overdue) ---
  const scheduleData = useMemo(() => {
    const now = dayjs();
    
    // Sort: Overdue first, then today
    return maintenances
      .filter(m => {
          if (!m.next_maintenance_date) return false;
          const info = getMaintenanceStatusInfo(m, now);
          return info.isOverdue || info.type === 'in_cycle' || info.type === 'in_cycle_last_day';
      })
      .sort((a, b) => dayjs(a.next_maintenance_date).valueOf() - dayjs(b.next_maintenance_date).valueOf())
      .slice(0, 5); // Show top 5
  }, [maintenances]);


  // --- Columns ---
  const repairColumns = [
    {
      title: 'Số phiếu',
      dataIndex: 'repair_id',
      key: 'repair_id',
      render: (text: string) => <Text strong>#{text}</Text>,
      width: 100,
    },
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
      key: 'status',
      render: (_, r: any) => {
          // Logic copied from RepairsTable to ensure consistency
          let currentPhase = 'request';
          if (r.status_request !== 'COMPLETED') currentPhase = 'request';
          else if (r.status_inspection === 'REJECTED_B04' || r.status_inspection === 'inspection_rejected') currentPhase = 'inspection';
          else if (r.status_inspection !== 'inspection_admin_approved') currentPhase = 'inspection';
          else if (r.status_acceptance === 'REJECTED_B05' || r.status_acceptance === 'acceptance_rejected') currentPhase = 'acceptance';
          else if (r.status_acceptance !== 'acceptance_admin_approved') currentPhase = 'acceptance';
          else currentPhase = 'completed';

          let statusKey: string = r.status_request || 'WAITING_TECH';
          if (currentPhase === 'completed') statusKey = 'COMPLETED'; // Real completed
          else if (currentPhase === 'acceptance' || r.status_acceptance === 'REJECTED_B05' || r.status_acceptance === 'acceptance_rejected') statusKey = r.status_acceptance || 'acceptance_pending';
          else if (currentPhase === 'inspection' || r.status_inspection === 'REJECTED_B04' || r.status_inspection === 'inspection_rejected') statusKey = r.status_inspection || 'inspection_pending';

          const labelMap: Record<string, string> = {
            WAITING_TECH: "Yêu cầu: Chờ KT tiếp nhận",
            WAITING_TEAM_LEAD: "Yêu cầu: Chờ Tổ trưởng duyệt",
            WAITING_MANAGER: "Yêu cầu: Chờ CB đội duyệt",
            WAITING_DIRECTOR: "Yêu cầu: Chờ Ban GĐ duyệt",
            REJECTED_B03: "B03: Đã từ chối",
            REJECTED: "Đã hủy",
            
            // Inspection
            inspection_pending: r.inspection_created_at ? "Kiểm nghiệm: chờ duyệt" : "Chờ kiểm nghiệm",
            inspection_lead_approved: "Kiểm nghiệm: Chờ CB đội duyệt",
            inspection_manager_approved: "Kiểm nghiệm: chờ ban GĐ duyệt",
            inspection_admin_approved: "Hoàn tất kiểm nghiệm",
            REJECTED_B04: "B04: Đã từ chối",
            inspection_rejected: "B04: Đã từ chối",

            // Acceptance
            acceptance_pending: r.acceptance_created_at ? "Nghiệm thu: Chờ duyệt" : "Chờ nghiệm thu",
            acceptance_lead_approved: "Nghiệm thu: Chờ CB đội duyệt",
            acceptance_manager_approved: "Nghiệm thu: chờ ban GĐ duyệt",
            acceptance_admin_approved: "Hoàn tất",
            REJECTED_B05: "B05: Đã từ chối",
            acceptance_rejected: "B05: Đã từ chối",
            
            COMPLETED: "Hoàn thành"
          };

           const colorMap: Record<string, string> = {
            WAITING_TECH: "blue",
            WAITING_TEAM_LEAD: "blue",
            WAITING_MANAGER: "orange", 
            WAITING_DIRECTOR: "purple",
            REJECTED_B03: "red",
            REJECTED: "red",
            COMPLETED: "green",

            inspection_pending: "purple",
            inspection_lead_approved: "warning",
            inspection_manager_approved: "cyan",
            inspection_admin_approved: "teal",
            REJECTED_B04: "red",
            inspection_rejected: "red",

            acceptance_pending: "cyan",
            acceptance_lead_approved: "warning",
            acceptance_manager_approved: "cyan",
            acceptance_admin_approved: "green",
            REJECTED_B05: "red",
            acceptance_rejected: "red",
          };

          const label = labelMap[statusKey] || statusKey;
          const color = colorMap[statusKey] || (statusKey.includes('REJECTED') ? 'error' : 'default');
          
          return <Tag color={color}>{label}</Tag>
      }
    }
  ];

  const handleReview = async (action: "approve" | "reject", reason?: string, phase?: any) => {
     if(!selectedRepair) return;
     try {
       await reviewRepairItem(selectedRepair.repair_id, {
         action,
         reason,
         phase
       });
       setIsDetailOpen(false);
       reloadRepairs();
     } catch (err) {
       console.error(err);
     }
  };

  const handleExport = async (type: any) => {
    if(!selectedRepair) return;
    try {
      await exportRepairItem(selectedRepair.repair_id, type);
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <Layout style={{ background: 'transparent', padding: 24 }}>
      {/* 1. Page Title only - Removed Card Header */}
      <Title level={4} style={{ marginBottom: 16 }}>Trung tâm điều hành bảo trì</Title>

      {/* 2. Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Card 1: Critical - Pending Repairs */}
        <Col span={6}>
          <Card variant="borderless" styles={{ body: { padding: 20, height: 160, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }}>
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
            <Card variant="borderless" styles={{ body: { padding: 20, height: 160 } }}>
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
            <Card variant="borderless" styles={{ body: { padding: 20, height: 160, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }}>
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
             <Card variant="borderless" styles={{ body: { padding: 20, height: 160, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }}>
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
          <Card variant="borderless" style={{ borderRadius: 8, height: '100%' }} styles={{ body: { padding: 0 } }}>
             <Tabs 
               defaultActiveKey={myPendingRepairs.length > 0 ? 'mine' : '1'}
               type="line"
               size="large"
               tabBarStyle={{ padding: '0 24px', margin: 0 }}
               items={[
                 ...(myPendingRepairs.length > 0 ? [{
                   key: 'mine',
                   label: <span>🔔 Chờ tôi xử lý <span style={{ background: '#ff4d4f', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 12, marginLeft: 4 }}>{myPendingRepairs.length}</span></span>,
                   children: (
                     <Table 
                        dataSource={myPendingRepairs.slice(0, 10)} 
                        columns={repairColumns} 
                        pagination={false} 
                        rowKey="repair_id" 
                        onRow={(record) => ({
                          onClick: () => {
                            setSelectedRepair(record);
                            setIsDetailOpen(true);
                          },
                          style: { cursor: 'pointer' }
                        })}
                     />
                   )
                 }] : []),
                 {
                   key: '1',
                   label: 'Phiếu gần đây',
                   children: (
                     <Table 
                        dataSource={recentRepairs} 
                        columns={repairColumns} 
                        pagination={false} 
                        rowKey="repair_id" 
                        onRow={(record) => ({
                          onClick: () => {
                            setSelectedRepair(record);
                            setIsDetailOpen(true);
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

        {/* Right Column - Widgets (hiện cho mọi role) */}
        <Col span={7}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
             {/* Widget: Tổng quan nhanh cho vai trò */}
             {user && ['UNIT_HEAD', 'DIRECTOR', 'TEAM_LEAD', 'ADMIN'].includes(user.role) && (
               <Card title="📊 Tổng quan duyệt" variant="borderless" size="small" style={{ borderRadius: 8 }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <Text type="secondary" style={{ fontSize: 13 }}>Chờ tôi duyệt</Text>
                     <span style={{ 
                       fontWeight: 700, fontSize: 20, 
                       color: myPendingRepairs.length > 0 ? '#ff4d4f' : '#52c41a' 
                     }}>
                       {myPendingRepairs.length}
                     </span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <Text type="secondary" style={{ fontSize: 13 }}>Tổng phiếu hệ thống</Text>
                     <span style={{ fontWeight: 600, fontSize: 16 }}>{repairs.length}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <Text type="secondary" style={{ fontSize: 13 }}>Hoàn thành</Text>
                     <span style={{ fontWeight: 600, fontSize: 16, color: '#52c41a' }}>
                       {repairs.filter((r: any) => r.status_acceptance === 'acceptance_admin_approved').length}
                     </span>
                   </div>
                 </div>
               </Card>
             )}

             {/* Widget: Lịch bảo trì */}
             <Card title="Lịch bảo trì cần thực hiện" variant="borderless" size="small" style={{ borderRadius: 8 }}>
                {scheduleData.length === 0 ? (
                   <div style={{ textAlign: 'center', padding: '20px 0', color: '#8c8c8c' }}>
                      Không có lịch bảo trì hôm nay
                   </div>
                ) : (
                  <Timeline 
                    items={scheduleData.map(m => {
                      const info = getMaintenanceStatusInfo(m);
                      return {
                        color: info.isOverdue ? 'red' : 'green',
                        children: (
                          <>
                             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text strong>{m.device?.name}</Text>
                                {info.isOverdue && 
                                    <Tag color="error" style={{ marginRight: 0, transform: 'scale(0.8)' }}>{info.label}</Tag>}
                             </div>
                             <br/>
                             <Text type="secondary" style={{ fontSize: 12 }}>
                                {m.level ? `Cấp ${m.level.replace('M', ' tháng')}` : 'Bảo dưỡng'}
                             </Text>
                             <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                                {dayjs(m.next_maintenance_date).format('DD/MM/YYYY')}
                             </div>
                          </>
                        )
                      };
                    })}
                  />
                )}
                 <div style={{ marginTop: 12, textAlign: 'center' }}>
                     <Link to="/quan_ly_bao_duong" style={{ fontSize: 13 }}>Xem lịch chi tiết</Link>
                 </div>
             </Card>
          </Space>
        </Col>
      </Row>

      {/* Details Drawer */}
      <RepairDetailDrawer
        open={isDetailOpen}
        data={selectedRepair}
        onClose={() => setIsDetailOpen(false)}
        currentUser={user}
        onReview={handleReview}
        onExport={handleExport}
        canExport={true}
      />
    </Layout>
  );
};

export default TechnicalDashboard;
