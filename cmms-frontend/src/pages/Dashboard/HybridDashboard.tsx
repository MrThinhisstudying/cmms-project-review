import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
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
  Avatar,
} from 'antd';
import {
  ToolOutlined,
  AlertOutlined,
  AppstoreOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  PlusOutlined,
  CalendarOutlined,
  UserOutlined,
  FileTextOutlined,
  ApartmentOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

// Contexts & APIs
import { useAuthContext } from '../../context/AuthContext/AuthContext';
import { useDevicesContext } from '../../context/DevicesContext/DevicesContext';
import { useRepairsContext } from '../../context/RepairsContext/RepairsContext';
import { useMaintenanceContext } from '../../context/MaintenanceContext/MaintenanceContext';
import { useInventoryContext } from '../../context/InventoryContext/InventoryContext';
import certificatesApi from '../../apis/certificates';
import { getPendingRequests, IProfileRequest } from '../../apis/profileRequests';
import { getLaborContracts, ILaborContract } from '../../apis/laborContracts';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import { isMaintenanceOverdue, getMaintenanceStatusInfo } from '../../utils/maintenanceDue';
import { useSocket } from '../../hooks/useSocket';
import RepairDetailDrawer from '../RepairsManagement/components/RepairDetailDrawer';
import { IDevice, DeviceStatus } from '../../types/devicesManagement.types';
import { IRepair } from '../../types/repairs.types';

const { Title, Text } = Typography;

// Helper: Phân loại nhãn và màu sắc của trạng thái phiếu sửa chữa
const getRepairPhaseInfo = (r: any) => {
  let currentPhase = 'request';
  if (r.status_request !== 'COMPLETED') currentPhase = 'request';
  else if (r.status_inspection === 'REJECTED_B04' || r.status_inspection === 'inspection_rejected') currentPhase = 'inspection';
  else if (r.status_inspection !== 'inspection_admin_approved') currentPhase = 'inspection';
  else if (r.status_acceptance === 'REJECTED_B05' || r.status_acceptance === 'acceptance_rejected') currentPhase = 'acceptance';
  else if (r.status_acceptance !== 'acceptance_admin_approved') currentPhase = 'acceptance';
  else currentPhase = 'completed';

  let statusKey: string = r.status_request || 'WAITING_TECH';
  if (currentPhase === 'completed') statusKey = 'COMPLETED';
  else if (currentPhase === 'acceptance' || r.status_acceptance === 'REJECTED_B05' || r.status_acceptance === 'acceptance_rejected') statusKey = r.status_acceptance || 'acceptance_pending';
  else if (currentPhase === 'inspection' || r.status_inspection === 'REJECTED_B04' || r.status_inspection === 'inspection_rejected') statusKey = r.status_inspection || 'inspection_pending';

  const labelMap: Record<string, string> = {
    WAITING_TECH: 'Chờ KT tiếp nhận',
    WAITING_TEAM_LEAD: 'Chờ Tổ trưởng duyệt',
    WAITING_MANAGER: 'Chờ CB Đội duyệt',
    WAITING_DIRECTOR: 'Chờ Ban GĐ duyệt',
    REJECTED_B03: 'Từ chối tiếp nhận',
    REJECTED: 'Đã hủy',
    inspection_pending: 'Kiểm nghiệm: Chờ duyệt',
    inspection_lead_approved: 'Kiểm nghiệm: Chờ CB Đội',
    inspection_manager_approved: 'Kiểm nghiệm: Chờ Ban GĐ',
    inspection_admin_approved: 'Hoàn tất kiểm nghiệm',
    REJECTED_B04: 'Từ chối kiểm nghiệm',
    inspection_rejected: 'Từ chối kiểm nghiệm',
    acceptance_pending: 'Nghiệm thu: Chờ duyệt',
    acceptance_lead_approved: 'Nghiệm thu: Chờ CB Đội',
    acceptance_manager_approved: 'Nghiệm thu: Chờ Ban GĐ',
    acceptance_admin_approved: 'Nghiệm thu hoàn tất',
    REJECTED_B05: 'Từ chối nghiệm thu',
    acceptance_rejected: 'Từ chối nghiệm thu',
    COMPLETED: 'Hoàn thành',
  };

  const colorMap: Record<string, string> = {
    WAITING_TECH: 'blue',
    WAITING_TEAM_LEAD: 'cyan',
    WAITING_MANAGER: 'orange',
    WAITING_DIRECTOR: 'purple',
    REJECTED_B03: 'red',
    REJECTED: 'red',
    COMPLETED: 'green',
    inspection_pending: 'purple',
    inspection_lead_approved: 'warning',
    inspection_manager_approved: 'cyan',
    inspection_admin_approved: 'teal',
    REJECTED_B04: 'red',
    inspection_rejected: 'red',
    acceptance_pending: 'cyan',
    acceptance_lead_approved: 'warning',
    acceptance_manager_approved: 'cyan',
    acceptance_admin_approved: 'green',
    REJECTED_B05: 'red',
    acceptance_rejected: 'red',
  };

  return {
    label: labelMap[statusKey] || statusKey,
    color: colorMap[statusKey] || 'default',
    phase: currentPhase,
  };
};

const HybridDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const role = (user?.role || '').toUpperCase();

  // Context Data
  const { items, refreshAll: refreshInventory } = useInventoryContext();
  const { devices, fetchDevices, loading: devicesLoading } = useDevicesContext();
  const { repairs, reload: reloadRepairs, reviewRepairItem, exportRepairItem } = useRepairsContext();
  const { maintenances, fetchMaintenances } = useMaintenanceContext();

  // Local State: HR & Compliance
  const [loadingHr, setLoadingHr] = useState<boolean>(false);
  const [expiringCerts, setExpiringCerts] = useState<any[]>([]);
  const [qualificationStats, setQualificationStats] = useState<any>(null);
  const [pendingProfileRequests, setPendingProfileRequests] = useState<IProfileRequest[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<ILaborContract[]>([]);

  // Drawer Detail State
  const [selectedRepair, setSelectedRepair] = useState<IRepair | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  // Active Tab in Priority Action Queue
  const [activeQueueTab, setActiveQueueTab] = useState<string>('repairs');

  // Load Extra Compliance & Approval Data
  const loadComplianceData = useCallback(async () => {
    setLoadingHr(true);
    try {
      const [certsRes, qStatsRes, reqsRes, contractsRes] = await Promise.allSettled([
        certificatesApi.getExpiringCertificates(90),
        certificatesApi.getQualificationStats(),
        getPendingRequests(),
        getLaborContracts(),
      ]);

      if (certsRes.status === 'fulfilled') setExpiringCerts(certsRes.value || []);
      if (qStatsRes.status === 'fulfilled') setQualificationStats(qStatsRes.value || null);
      if (reqsRes.status === 'fulfilled') setPendingProfileRequests(reqsRes.value || []);
      if (contractsRes.status === 'fulfilled') {
        const now = dayjs();
        const expContracts = (contractsRes.value || []).filter((c: ILaborContract) => {
          if (!c.end_date || c.status !== 'ACTIVE') return false;
          const end = dayjs(c.end_date);
          return end.isAfter(now) && end.diff(now, 'day') <= 60;
        });
        setExpiringContracts(expContracts);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu tuân thủ & phê duyệt:', err);
    } finally {
      setLoadingHr(false);
    }
  }, []);

  // Tải toàn bộ dữ liệu trang chủ
  const refreshAllData = useCallback(() => {
    refreshInventory();
    fetchDevices();
    reloadRepairs();
    fetchMaintenances();
    loadComplianceData();
  }, [refreshInventory, fetchDevices, reloadRepairs, fetchMaintenances, loadComplianceData]);

  useEffect(() => {
    refreshAllData();
    const interval = setInterval(() => {
      reloadRepairs();
      fetchMaintenances(true);
    }, 45000);
    return () => clearInterval(interval);
  }, [refreshAllData, reloadRepairs, fetchMaintenances]);

  useRefreshOnFocus(refreshAllData);

  // Socket auto refresh
  const socketListeners = useMemo(
    () => ({
      dashboard_refresh: () => refreshAllData(),
      repair_updated: () => reloadRepairs(),
      device_updated: () => fetchDevices(),
    }),
    [refreshAllData, reloadRepairs, fetchDevices]
  );
  useSocket(user?.user_id, socketListeners);

  // --- 1. LỌC PHIẾU CHỜ TÔI DUYỆT (ROLE-BASED ACTION QUEUE) ---
  const myPendingRepairs = useMemo(() => {
    if (!user) return [];
    return repairs.filter((r: any) => {
      if (role === 'TEAM_LEAD') {
        return (
          r.status_request === 'WAITING_TEAM_LEAD' ||
          r.status_inspection === 'inspection_pending' ||
          r.status_acceptance === 'acceptance_pending'
        );
      }
      if (role === 'UNIT_HEAD') {
        return (
          r.status_request === 'WAITING_MANAGER' ||
          r.status_inspection === 'inspection_lead_approved' ||
          r.status_acceptance === 'acceptance_lead_approved'
        );
      }
      if (role === 'DIRECTOR') {
        return (
          r.status_request === 'WAITING_DIRECTOR' ||
          r.status_inspection === 'inspection_manager_approved' ||
          r.status_acceptance === 'acceptance_manager_approved'
        );
      }
      if (role === 'ADMIN') {
        return (
          r.status_request === 'WAITING_DIRECTOR' ||
          r.status_request === 'WAITING_MANAGER' ||
          r.status_inspection === 'inspection_manager_approved' ||
          r.status_acceptance === 'acceptance_manager_approved'
        );
      }
      return false;
    }).sort((a: any, b: any) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());
  }, [repairs, user, role]);

  // --- 2. THỐNG KÊ THIẾT BỊ & TỶ LỆ SẴN SÀNG ---
  const deviceStats = useMemo(() => {
    const total = devices.length;
    const active = devices.filter(
      (d) => d.status === ('DANG_SU_DUNG' as DeviceStatus) || d.status === ('MOI' as DeviceStatus)
    ).length;
    const inRepair = devices.filter((d) => d.status === ('DANG_SUA_CHUA' as DeviceStatus)).length;
    const limited = devices.filter(
      (d) => d.status === ('SU_DUNG_HAN_CHE' as DeviceStatus) || d.status === ('HUY_BO' as DeviceStatus)
    ).length;
    const readinessRate = total > 0 ? Math.round((active / total) * 100) : 0;

    // Thiết bị đang sự cố hoặc cần chú ý
    const attentionDevices = devices.filter(
      (d) =>
        d.status === ('DANG_SUA_CHUA' as DeviceStatus) ||
        d.status === ('SU_DUNG_HAN_CHE' as DeviceStatus) ||
        (d.inspection_expiry && dayjs(d.inspection_expiry).isBefore(dayjs(), 'day'))
    );

    // Thiết bị hết hạn kiểm định
    const expiredInspection = devices.filter(
      (d) => d.inspection_expiry && dayjs(d.inspection_expiry).isBefore(dayjs(), 'day')
    ).length;

    // Thiết bị sắp hết hạn kiểm định (trong 30 ngày)
    const expiringInspection = devices.filter(
      (d) =>
        d.inspection_expiry &&
        dayjs(d.inspection_expiry).isAfter(dayjs()) &&
        dayjs(d.inspection_expiry).diff(dayjs(), 'day') <= 30
    ).length;

    return {
      total,
      active,
      inRepair,
      limited,
      readinessRate,
      attentionDevices,
      expiredInspection,
      expiringInspection,
    };
  }, [devices]);

  // --- 3. THỐNG KÊ BẢO DƯỠNG ---
  const maintenanceStats = useMemo(() => {
    const now = dayjs();
    const overdue = maintenances.filter((m) => isMaintenanceOverdue(m));

    const upcoming = maintenances
      .filter((m) => {
        if (!m.next_maintenance_date) return false;
        const info = getMaintenanceStatusInfo(m, now);
        return info.type === 'near_due' || info.type === 'in_cycle' || info.type === 'in_cycle_last_day';
      })
      .sort((a, b) => dayjs(a.next_maintenance_date).valueOf() - dayjs(b.next_maintenance_date).valueOf());

    return {
      overdueCount: overdue.length,
      overdueList: overdue,
      upcomingList: upcoming,
    };
  }, [maintenances]);

  // --- 4. THỐNG KÊ VẬT TƯ THẤP ---
  const lowStockItems = useMemo(() => {
    return items.filter((item) => (item.quantity ?? 0) <= 10);
  }, [items]);

  // --- 5. TỔNG HỢP RỦI RO TUÂN THỦ (COMPLIANCE RADAR) ---
  const complianceStats = useMemo(() => {
    const expiredGplx = qualificationStats?.expiredLicensesCount || 0;
    const expiringGplx = qualificationStats?.expiringLicensesCount || 0;
    const totalGplxRisk = expiredGplx + expiringGplx;

    const certExpired = expiringCerts.filter((c: any) => {
      const exp = c.expiry_date || c.next_training_date;
      return exp && dayjs(exp).isBefore(dayjs(), 'day');
    }).length;
    const certExpiring = expiringCerts.length - certExpired;

    const totalRisks = totalGplxRisk + expiringCerts.length + deviceStats.expiredInspection;

    return {
      expiredGplx,
      expiringGplx,
      totalGplxRisk,
      certExpired,
      certExpiring,
      totalCertRisk: expiringCerts.length,
      totalRisks,
    };
  }, [qualificationStats, expiringCerts, deviceStats.expiredInspection]);

  // --- 6. PHIẾU GẦN ĐÂY ---
  const recentRepairs = useMemo(() => {
    return [...repairs]
      .sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf())
      .slice(0, 6);
  }, [repairs]);

  // --- HANDLER REVIEW & EXPORT PHIẾU ---
  const handleReview = async (action: 'approve' | 'reject', reason?: string, phase?: any) => {
    if (!selectedRepair) return;
    try {
      await reviewRepairItem(selectedRepair.repair_id, {
        action,
        reason,
        phase,
      });
      setIsDetailOpen(false);
      reloadRepairs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async (type: any) => {
    if (!selectedRepair) return;
    try {
      await exportRepairItem(selectedRepair.repair_id, type);
    } catch (err) {
      console.error(err);
    }
  };

  // Lời chào theo thời gian
  const greetingText = useMemo(() => {
    const hour = dayjs().hour();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }, []);

  const dayName = useMemo(() => {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return `${days[dayjs().day()]}, ngày ${dayjs().format('DD/MM/YYYY')}`;
  }, []);

  // Tổng số việc chờ cán bộ duyệt
  const totalPendingMyAction = myPendingRepairs.length + pendingProfileRequests.length;

  return (
    <div style={{ padding: '20px 24px 40px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* ============================================================ */}
      {/* 1. EXECUTIVE WELCOME & SHIFT BRIEFING HEADER */}
      {/* ============================================================ */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 20,
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.25)',
          color: '#fff',
        }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar
                size={52}
                src={user?.avatar}
                icon={!user?.avatar && <UserOutlined />}
                style={{
                  background: '#3b82f6',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  fontSize: 22,
                }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <Title level={4} style={{ margin: 0, color: '#f8fafc', fontWeight: 700 }}>
                    {greetingText}, {user?.name || 'Cán bộ'}!
                  </Title>
                  <Tag
                    color="blue"
                    style={{
                      margin: 0,
                      borderRadius: 12,
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {role === 'ADMIN'
                      ? 'Quản trị hệ thống'
                      : role === 'DIRECTOR'
                      ? 'Ban Giám Đốc'
                      : role === 'UNIT_HEAD'
                      ? 'Cán bộ Đội'
                      : role === 'TEAM_LEAD'
                      ? 'Tổ trưởng Kỹ thuật'
                      : role}
                  </Tag>
                  {user?.department?.name && (
                    <Tag
                      style={{
                        margin: 0,
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#cbd5e1',
                        borderRadius: 12,
                        fontSize: 11,
                      }}
                    >
                      <ApartmentOutlined style={{ marginRight: 4 }} />
                      {user.department.name}
                    </Tag>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    marginTop: 6,
                    fontSize: 13,
                    color: '#94a3b8',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>
                    <CalendarOutlined style={{ marginRight: 6, color: '#60a5fa' }} />
                    {dayName}
                  </span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#10b981',
                        boxShadow: '0 0 8px #10b981',
                      }}
                    />
                    Hệ thống vận hành bình thường
                  </span>
                </div>
              </div>
            </div>
          </Col>

          {/* Quick Actions for Executives */}
          <Col xs={24} md={10} style={{ textAlign: 'right' }}>
            <Space wrap size={10}>
              <Button
                icon={<ReloadOutlined spin={loadingHr || devicesLoading} />}
                onClick={refreshAllData}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  borderRadius: 8,
                }}
              >
                Cập nhật
              </Button>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/quan_ly_sua_chua')}
                style={{
                  background: '#2563eb',
                  borderColor: '#2563eb',
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              >
                Tạo phiếu sửa chữa
              </Button>

              <Button
                onClick={() => navigate('/hr-dashboard')}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  borderColor: 'rgba(255,255,255,0.25)',
                  color: '#e2e8f0',
                  borderRadius: 8,
                }}
              >
                Tổng quan Nhân sự <RightOutlined style={{ fontSize: 10 }} />
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* ============================================================ */}
      {/* 2. EXECUTIVE COMMAND STRIP: 5 KPI METRICS */}
      {/* ============================================================ */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Metric 1: Tỷ lệ Sẵn sàng Phương tiện */}
        <Col xs={24} sm={12} md={8} flex="1 1 200px">
          <Card
            hoverable
            onClick={() => navigate('/quan_ly_ttb_pt')}
            style={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              borderTop: '4px solid #10b981',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
            styles={{ body: { padding: '16px 18px' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                  TỶ LỆ SẴN SÀNG
                </Text>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', margin: '4px 0 2px' }}>
                  {deviceStats.readinessRate}%
                </div>
                <div style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>
                  {deviceStats.active}/{deviceStats.total} thiết bị tốt
                </div>
              </div>
              <Progress
                type="circle"
                percent={deviceStats.readinessRate}
                size={44}
                strokeColor="#10b981"
                format={() => null}
              />
            </div>
          </Card>
        </Col>

        {/* Metric 2: Hàng đợi chờ tôi duyệt */}
        <Col xs={24} sm={12} md={8} flex="1 1 200px">
          <Card
            hoverable
            onClick={() => setActiveQueueTab('repairs')}
            style={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              borderTop: totalPendingMyAction > 0 ? '4px solid #f59e0b' : '4px solid #94a3b8',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
            styles={{ body: { padding: '16px 18px' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                  CHỜ TÔI PHÊ DUYỆT
                </Text>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: totalPendingMyAction > 0 ? '#d97706' : '#0f172a',
                    margin: '4px 0 2px',
                  }}
                >
                  {totalPendingMyAction}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {myPendingRepairs.length} phiếu SC • {pendingProfileRequests.length} hồ sơ
                </div>
              </div>
              <div
                style={{
                  background: totalPendingMyAction > 0 ? '#fef3c7' : '#f1f5f9',
                  color: totalPendingMyAction > 0 ? '#d97706' : '#64748b',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                <ToolOutlined />
              </div>
            </div>
          </Card>
        </Col>

        {/* Metric 3: Cảnh báo Tuân thủ Hàng không */}
        <Col xs={24} sm={12} md={8} flex="1 1 200px">
          <Card
            hoverable
            onClick={() => navigate('/hr-dashboard')}
            style={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              borderTop: complianceStats.totalRisks > 0 ? '4px solid #ef4444' : '4px solid #10b981',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
            styles={{ body: { padding: '16px 18px' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                  RỦI RO AN TOÀN & TUÂN THỦ
                </Text>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: complianceStats.totalRisks > 0 ? '#ef4444' : '#10b981',
                    margin: '4px 0 2px',
                  }}
                >
                  {complianceStats.totalRisks}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {complianceStats.totalGplxRisk} GPLX • {complianceStats.totalCertRisk} CCCM •{' '}
                  {deviceStats.expiredInspection} kiểm định
                </div>
              </div>
              <div
                style={{
                  background: complianceStats.totalRisks > 0 ? '#fee2e2' : '#dcfce7',
                  color: complianceStats.totalRisks > 0 ? '#ef4444' : '#10b981',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                <SafetyCertificateOutlined />
              </div>
            </div>
          </Card>
        </Col>

        {/* Metric 4: Bảo dưỡng Quá hạn */}
        <Col xs={24} sm={12} md={8} flex="1 1 200px">
          <Card
            hoverable
            onClick={() => navigate('/quan_ly_bao_duong')}
            style={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              borderTop: maintenanceStats.overdueCount > 0 ? '4px solid #f97316' : '4px solid #94a3b8',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
            styles={{ body: { padding: '16px 18px' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                  BẢO DƯỠNG QUÁ HẠN
                </Text>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: maintenanceStats.overdueCount > 0 ? '#ea580c' : '#0f172a',
                    margin: '4px 0 2px',
                  }}
                >
                  {maintenanceStats.overdueCount}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Cần lên lịch đôn đốc thực hiện
                </div>
              </div>
              <div
                style={{
                  background: maintenanceStats.overdueCount > 0 ? '#ffedd5' : '#f1f5f9',
                  color: maintenanceStats.overdueCount > 0 ? '#ea580c' : '#64748b',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                <AlertOutlined />
              </div>
            </div>
          </Card>
        </Col>

        {/* Metric 5: Vật tư Dưới Mức Tối Thiểu */}
        <Col xs={24} sm={12} md={8} flex="1 1 200px">
          <Card
            hoverable
            onClick={() => navigate('/quan_ly_vat_tu')}
            style={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              borderTop: '4px solid #0284c7',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
            styles={{ body: { padding: '16px 18px' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                  VẬT TƯ CẦN BỔ SUNG
                </Text>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#0284c7', margin: '4px 0 2px' }}>
                  {lowStockItems.length}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Dưới định mức tồn kho tối thiểu
                </div>
              </div>
              <div
                style={{
                  background: '#e0f2fe',
                  color: '#0284c7',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                <AppstoreOutlined />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ============================================================ */}
      {/* 3. MAIN DASHBOARD CONTENT (62% ACTION QUEUE / 38% RADAR) */}
      {/* ============================================================ */}
      <Row gutter={[20, 20]}>
        {/* ============================================================ */}
        {/* LEFT COLUMN: PRIORITY ACTION QUEUE & RECENT ACTIVITY */}
        {/* ============================================================ */}
        <Col xs={24} lg={15}>
          {/* Action Queue Card */}
          <Card
            style={{
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              marginBottom: 20,
            }}
            styles={{ body: { padding: '0 0 16px' } }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    background: '#eff6ff',
                    color: '#2563eb',
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                  }}
                >
                  <ThunderboltOutlined />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                    Hàng đợi Hành động & Phê duyệt Cấp thiết
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Các đầu việc đòi hỏi chỉ đạo hoặc duyệt của cấp thẩm quyền
                  </div>
                </div>
              </div>
            </div>

            <Tabs
              activeKey={activeQueueTab}
              onChange={setActiveQueueTab}
              tabBarStyle={{ padding: '0 20px', margin: 0 }}
              items={[
                {
                  key: 'repairs',
                  label: (
                    <span>
                      🔔 Phiếu SC chờ tôi duyệt
                      {myPendingRepairs.length > 0 && (
                        <span
                          style={{
                            background: '#ef4444',
                            color: '#fff',
                            borderRadius: 10,
                            padding: '1px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            marginLeft: 6,
                          }}
                        >
                          {myPendingRepairs.length}
                        </span>
                      )}
                    </span>
                  ),
                  children: (
                    <div style={{ padding: '8px 16px 0' }}>
                      {myPendingRepairs.length === 0 ? (
                        <div style={{ padding: '36px 0', textAlign: 'center' }}>
                          <CheckCircleOutlined style={{ fontSize: 40, color: '#10b981', marginBottom: 10 }} />
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                            Không có phiếu sửa chữa nào tồn đọng
                          </div>
                          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                            Cán bộ đã hoàn thành tất cả nhiệm vụ phê duyệt kỹ thuật của ca trực.
                          </div>
                        </div>
                      ) : (
                        <Table
                          dataSource={myPendingRepairs}
                          rowKey="repair_id"
                          pagination={{ pageSize: 5, size: 'small' }}
                          size="middle"
                          columns={[
                            {
                              title: 'Số phiếu',
                              dataIndex: 'repair_id',
                              key: 'repair_id',
                              width: 90,
                              render: (val: any) => (
                                <Text strong style={{ color: '#2563eb' }}>
                                  #{val}
                                </Text>
                              ),
                            },
                            {
                              title: 'Phương tiện / Thiết bị',
                              key: 'device',
                              render: (_: any, r: any) => (
                                <div>
                                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                                    {r.device?.name || 'N/A'}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#64748b' }}>
                                    BS: {r.device?.reg_number || '---'}
                                  </div>
                                </div>
                              ),
                            },
                            {
                              title: 'Giai đoạn chờ duyệt',
                              key: 'stage',
                              width: 170,
                              render: (_: any, r: any) => {
                                const { label, color } = getRepairPhaseInfo(r);
                                return <Tag color={color}>{label}</Tag>;
                              },
                            },
                            {
                              title: 'Ngày tạo',
                              dataIndex: 'created_at',
                              key: 'created_at',
                              width: 110,
                              render: (d: string) => (
                                <span style={{ fontSize: 12, color: '#64748b' }}>
                                  {d ? dayjs(d).format('DD/MM/YYYY') : '---'}
                                </span>
                              ),
                            },
                            {
                              title: 'Thao tác',
                              key: 'action',
                              width: 110,
                              align: 'right',
                              render: (_: any, record: IRepair) => (
                                <Button
                                  type="primary"
                                  size="small"
                                  onClick={() => {
                                    setSelectedRepair(record);
                                    setIsDetailOpen(true);
                                  }}
                                  style={{
                                    borderRadius: 6,
                                    fontSize: 12,
                                    background: '#2563eb',
                                  }}
                                >
                                  Xem & Duyệt
                                </Button>
                              ),
                            },
                          ]}
                        />
                      )}
                    </div>
                  ),
                },
                {
                  key: 'profile_requests',
                  label: (
                    <span>
                      📋 Yêu cầu hồ sơ nhân sự
                      {pendingProfileRequests.length > 0 && (
                        <span
                          style={{
                            background: '#f59e0b',
                            color: '#fff',
                            borderRadius: 10,
                            padding: '1px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            marginLeft: 6,
                          }}
                        >
                          {pendingProfileRequests.length}
                        </span>
                      )}
                    </span>
                  ),
                  children: (
                    <div style={{ padding: '8px 16px 0' }}>
                      {pendingProfileRequests.length === 0 ? (
                        <div style={{ padding: '36px 0', textAlign: 'center' }}>
                          <CheckCircleOutlined style={{ fontSize: 40, color: '#10b981', marginBottom: 10 }} />
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                            Không có yêu cầu cập nhật hồ sơ
                          </div>
                          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                            Tất cả hồ sơ và chứng chỉ nhân viên đã được kiểm tra đầy đủ.
                          </div>
                        </div>
                      ) : (
                        <Table
                          dataSource={pendingProfileRequests}
                          rowKey="id"
                          pagination={{ pageSize: 5, size: 'small' }}
                          size="middle"
                          columns={[
                            {
                              title: 'Mã YC',
                              dataIndex: 'id',
                              key: 'id',
                              width: 80,
                              render: (val: number) => <Text strong>#{val}</Text>,
                            },
                            {
                              title: 'Nhân viên đề xuất',
                              key: 'user',
                              render: (_: any, r: IProfileRequest) => (
                                <div>
                                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                                    {r.user?.name || 'N/A'}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#64748b' }}>
                                    {r.user?.department?.name || r.user?.employee_code || '---'}
                                  </div>
                                </div>
                              ),
                            },
                            {
                              title: 'Loại yêu cầu',
                              dataIndex: 'request_type',
                              key: 'request_type',
                              render: (t: string) => (
                                <Tag color={t === 'NEW_CERTIFICATE' ? 'cyan' : 'blue'}>
                                  {t === 'NEW_CERTIFICATE' ? 'Chứng chỉ mới' : 'Cập nhật thông tin'}
                                </Tag>
                              ),
                            },
                            {
                              title: 'Ngày gửi',
                              dataIndex: 'created_at',
                              key: 'created_at',
                              render: (d: string) => (
                                <span style={{ fontSize: 12, color: '#64748b' }}>
                                  {d ? dayjs(d).format('DD/MM/YYYY') : '---'}
                                </span>
                              ),
                            },
                            {
                              title: 'Thao tác',
                              key: 'action',
                              align: 'right',
                              render: () => (
                                <Button
                                  size="small"
                                  onClick={() => navigate('/profile-requests')}
                                  style={{ borderRadius: 6, fontSize: 12 }}
                                >
                                  Phê duyệt <RightOutlined style={{ fontSize: 10 }} />
                                </Button>
                              ),
                            },
                          ]}
                        />
                      )}
                    </div>
                  ),
                },
                {
                  key: 'down_devices',
                  label: (
                    <span>
                      🚨 Thiết bị sự cố ({deviceStats.attentionDevices.length})
                    </span>
                  ),
                  children: (
                    <div style={{ padding: '8px 16px 0' }}>
                      {deviceStats.attentionDevices.length === 0 ? (
                        <div style={{ padding: '36px 0', textAlign: 'center' }}>
                          <CheckCircleOutlined style={{ fontSize: 40, color: '#10b981', marginBottom: 10 }} />
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                            Không có thiết bị gặp sự cố
                          </div>
                          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                            Tất cả phương tiện đều đang sẵn sàng phục vụ các chuyến bay.
                          </div>
                        </div>
                      ) : (
                        <Table
                          dataSource={deviceStats.attentionDevices}
                          rowKey="device_id"
                          pagination={{ pageSize: 5, size: 'small' }}
                          size="middle"
                          columns={[
                            {
                              title: 'Mã TB',
                              dataIndex: 'device_code',
                              key: 'device_code',
                              width: 100,
                              render: (val: string) => <Text strong>{val || 'N/A'}</Text>,
                            },
                            {
                              title: 'Tên thiết bị & Biển số',
                              key: 'name',
                              render: (_: any, d: IDevice) => (
                                <div>
                                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{d.name}</div>
                                  <div style={{ fontSize: 12, color: '#64748b' }}>
                                    Biển số: {d.reg_number || 'N/A'}
                                  </div>
                                </div>
                              ),
                            },
                            {
                              title: 'Trạng thái',
                              dataIndex: 'status',
                              key: 'status',
                              render: (st: string) => (
                                <Tag color={st === 'DANG_SUA_CHUA' ? 'error' : 'warning'}>
                                  {st === 'DANG_SUA_CHUA'
                                    ? 'Đang sửa chữa'
                                    : st === 'SU_DUNG_HAN_CHE'
                                    ? 'Sử dụng hạn chế'
                                    : st}
                                </Tag>
                              ),
                            },
                            {
                              title: 'Đơn vị sử dụng',
                              dataIndex: 'using_department',
                              key: 'using_department',
                              render: (val: string) => val || '---',
                            },
                            {
                              title: 'Thao tác',
                              key: 'action',
                              align: 'right',
                              render: (_: any, d: IDevice) => (
                                <Button
                                  size="small"
                                  onClick={() => navigate(`/device-passport/${d.device_id}`)}
                                  style={{ borderRadius: 6, fontSize: 12 }}
                                >
                                  Hồ sơ TB
                                </Button>
                              ),
                            },
                          ]}
                        />
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Card>

          {/* Recent Repairs Table Card */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ToolOutlined style={{ color: '#2563eb' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                    Hoạt động Sửa chữa Gần nhất Hệ thống
                  </span>
                </div>
                <Button
                  type="link"
                  onClick={() => navigate('/quan_ly_sua_chua')}
                  style={{ fontSize: 13, padding: 0 }}
                >
                  Xem tất cả phiếu <RightOutlined />
                </Button>
              </div>
            }
            style={{
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
            styles={{ body: { padding: '8px 16px' } }}
          >
            <Table
              dataSource={recentRepairs}
              rowKey="repair_id"
              pagination={false}
              size="middle"
              onRow={(record) => ({
                onClick: () => {
                  setSelectedRepair(record);
                  setIsDetailOpen(true);
                },
                style: { cursor: 'pointer' },
              })}
              columns={[
                {
                  title: 'Số phiếu',
                  dataIndex: 'repair_id',
                  key: 'repair_id',
                  width: 90,
                  render: (id: string) => <Text strong>#{id}</Text>,
                },
                {
                  title: 'Thiết bị & Biển số',
                  key: 'device',
                  render: (_: any, r: any) => (
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                        {r.device?.name || 'N/A'}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        BS: {r.device?.reg_number || '---'}
                      </div>
                    </div>
                  ),
                },
                {
                  title: 'Ngày tạo',
                  dataIndex: 'created_at',
                  key: 'created_at',
                  width: 110,
                  render: (d: string) => (
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      {d ? dayjs(d).format('DD/MM/YYYY') : '---'}
                    </span>
                  ),
                },
                {
                  title: 'Trạng thái xử lý',
                  key: 'status',
                  render: (_: any, r: any) => {
                    const { label, color } = getRepairPhaseInfo(r);
                    return <Tag color={color}>{label}</Tag>;
                  },
                },
              ]}
            />
          </Card>
        </Col>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: RADAR COMPLIANCE, MAINTENANCE & FLEET STATUS */}
        {/* ============================================================ */}
        <Col xs={24} lg={9}>
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {/* Widget 1: Radar An toàn & Tuân thủ Hàng không */}
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SafetyCertificateOutlined style={{ color: '#ef4444' }} />
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                      Radar Tuân thủ & An toàn
                    </span>
                  </div>
                  <Tag color="red" style={{ margin: 0, borderRadius: 10 }}>
                    {complianceStats.totalRisks} rủi ro
                  </Tag>
                </div>
              }
              style={{
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}
              styles={{ body: { padding: 16 } }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Mục 1: GPLX Sân đỗ */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: complianceStats.totalGplxRisk > 0 ? '#fff1f2' : '#f8fafc',
                    border: '1px solid',
                    borderColor: complianceStats.totalGplxRisk > 0 ? '#fecdd3' : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CarOutlined
                      style={{
                        fontSize: 18,
                        color: complianceStats.totalGplxRisk > 0 ? '#e11d48' : '#64748b',
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                        Giấy phép lái xe sân đỗ (GPLX)
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {complianceStats.expiredGplx} quá hạn • {complianceStats.expiringGplx} sắp đến hạn
                      </div>
                    </div>
                  </div>
                  <Tag color={complianceStats.totalGplxRisk > 0 ? 'error' : 'success'}>
                    {complianceStats.totalGplxRisk}
                  </Tag>
                </div>

                {/* Mục 2: CCCM */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: complianceStats.totalCertRisk > 0 ? '#fffbeb' : '#f8fafc',
                    border: '1px solid',
                    borderColor: complianceStats.totalCertRisk > 0 ? '#fde68a' : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <SafetyCertificateOutlined
                      style={{
                        fontSize: 18,
                        color: complianceStats.totalCertRisk > 0 ? '#d97706' : '#64748b',
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                        Chứng chỉ chuyên môn (CCCM)
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {complianceStats.certExpired} quá hạn • {complianceStats.certExpiring} sắp đến hạn
                      </div>
                    </div>
                  </div>
                  <Tag color={complianceStats.totalCertRisk > 0 ? 'warning' : 'success'}>
                    {complianceStats.totalCertRisk}
                  </Tag>
                </div>

                {/* Mục 3: Đăng kiểm Thiết bị */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: deviceStats.expiredInspection > 0 ? '#fff1f2' : '#f8fafc',
                    border: '1px solid',
                    borderColor: deviceStats.expiredInspection > 0 ? '#fecdd3' : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ToolOutlined
                      style={{
                        fontSize: 18,
                        color: deviceStats.expiredInspection > 0 ? '#ef4444' : '#64748b',
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                        Hạn Kiểm định & Bảo hiểm xe
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {deviceStats.expiredInspection} quá hạn • {deviceStats.expiringInspection} sắp đến hạn
                      </div>
                    </div>
                  </div>
                  <Tag color={deviceStats.expiredInspection > 0 ? 'error' : 'success'}>
                    {deviceStats.expiredInspection}
                  </Tag>
                </div>

                {/* Mục 4: Hợp đồng lao động */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: expiringContracts.length > 0 ? '#f0f9ff' : '#f8fafc',
                    border: '1px solid',
                    borderColor: expiringContracts.length > 0 ? '#bae6fd' : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileTextOutlined
                      style={{
                        fontSize: 18,
                        color: expiringContracts.length > 0 ? '#0284c7' : '#64748b',
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                        Hợp đồng lao động (HĐLĐ)
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {expiringContracts.length} hợp đồng cần gia hạn trong 60 ngày
                      </div>
                    </div>
                  </div>
                  <Tag color={expiringContracts.length > 0 ? 'processing' : 'default'}>
                    {expiringContracts.length}
                  </Tag>
                </div>
              </div>

              <div style={{ marginTop: 14, textAlign: 'center' }}>
                <Button
                  type="link"
                  onClick={() => navigate('/hr-dashboard')}
                  style={{ fontSize: 13, padding: 0 }}
                >
                  Chi tiết Trung tâm Cảnh báo Tuân thủ <ArrowRightOutlined />
                </Button>
              </div>
            </Card>

            {/* Widget 2: Phân bổ Tình trạng Đội Phương tiện */}
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ApartmentOutlined style={{ color: '#10b981' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                    Tình trạng Đội Phương tiện ({deviceStats.total})
                  </span>
                </div>
              }
              style={{
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}
              styles={{ body: { padding: 18 } }}
            >
              {/* Thanh phân bổ tỷ lệ */}
              <div style={{ height: 10, borderRadius: 5, display: 'flex', overflow: 'hidden', marginBottom: 16 }}>
                <div
                  style={{
                    width: `${deviceStats.total > 0 ? (deviceStats.active / deviceStats.total) * 100 : 0}%`,
                    background: '#10b981',
                  }}
                  title="Đang hoạt động tốt"
                />
                <div
                  style={{
                    width: `${deviceStats.total > 0 ? (deviceStats.inRepair / deviceStats.total) * 100 : 0}%`,
                    background: '#ef4444',
                  }}
                  title="Đang sửa chữa"
                />
                <div
                  style={{
                    width: `${deviceStats.total > 0 ? (deviceStats.limited / deviceStats.total) * 100 : 0}%`,
                    background: '#f59e0b',
                  }}
                  title="Sử dụng hạn chế / Bảo dưỡng"
                />
              </div>

              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#10b981' }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Đang hoạt động:</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginLeft: 18 }}>
                    {deviceStats.active}{' '}
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>
                      ({deviceStats.readinessRate}%)
                    </span>
                  </div>
                </Col>

                <Col span={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444' }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Đang sửa chữa:</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#ef4444', marginLeft: 18 }}>
                    {deviceStats.inRepair}{' '}
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>
                      (
                      {deviceStats.total > 0
                        ? Math.round((deviceStats.inRepair / deviceStats.total) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                </Col>

                <Col span={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b' }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Hạn chế / Dự phòng:</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#d97706', marginLeft: 18 }}>
                    {deviceStats.limited}
                  </div>
                </Col>

                <Col span={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#64748b' }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Tổng đội thiết bị:</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginLeft: 18 }}>
                    {deviceStats.total}
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Widget 3: Lịch Bảo trì Cần thực hiện */}
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CalendarOutlined style={{ color: '#d97706' }} />
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                      Lịch Bảo trì Cần thực hiện
                    </span>
                  </div>
                  <Button
                    type="link"
                    onClick={() => navigate('/quan_ly_bao_duong')}
                    style={{ fontSize: 12, padding: 0 }}
                  >
                    Xem lịch <RightOutlined />
                  </Button>
                </div>
              }
              style={{
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}
              styles={{ body: { padding: '16px 18px' } }}
            >
              {maintenanceStats.overdueList.length === 0 &&
              maintenanceStats.upcomingList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                  <CheckCircleOutlined style={{ fontSize: 28, color: '#10b981', marginBottom: 6 }} />
                  <div>Không có thiết bị đến hạn bảo dưỡng trong tuần này</div>
                </div>
              ) : (
                <Timeline
                  items={[
                    ...maintenanceStats.overdueList.slice(0, 3).map((m: any) => ({
                      color: 'red',
                      children: (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text strong style={{ color: '#0f172a', fontSize: 13 }}>
                              {m.device?.name || 'Thiết bị'}
                            </Text>
                            <Tag color="error" style={{ margin: 0, fontSize: 10 }}>
                              Quá hạn
                            </Tag>
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            {m.level ? `Cấp ${m.level.replace('M', ' tháng')}` : 'Bảo dưỡng định kỳ'} • BS:{' '}
                            {m.device?.reg_number || '---'}
                          </div>
                          <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>
                            Hạn bảo dưỡng: {dayjs(m.next_maintenance_date).format('DD/MM/YYYY')}
                          </div>
                        </div>
                      ),
                    })),
                    ...maintenanceStats.upcomingList.slice(0, 3).map((m: any) => ({
                      color: 'green',
                      children: (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text strong style={{ color: '#0f172a', fontSize: 13 }}>
                              {m.device?.name || 'Thiết bị'}
                            </Text>
                            <Tag color="success" style={{ margin: 0, fontSize: 10 }}>
                              Hôm nay
                            </Tag>
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            {m.level ? `Cấp ${m.level.replace('M', ' tháng')}` : 'Bảo dưỡng định kỳ'}
                          </div>
                          <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>
                            Hạn bảo dưỡng: {dayjs(m.next_maintenance_date).format('DD/MM/YYYY')}
                          </div>
                        </div>
                      ),
                    })),
                  ]}
                />
              )}
            </Card>
          </Space>
        </Col>
      </Row>

      {/* ============================================================ */}
      {/* 4. DETAILS DRAWER INTEGRATION */}
      {/* ============================================================ */}
      <RepairDetailDrawer
        open={isDetailOpen}
        data={selectedRepair}
        onClose={() => setIsDetailOpen(false)}
        currentUser={user}
        onReview={handleReview}
        onExport={handleExport}
        canExport={true}
      />
    </div>
  );
};

export default HybridDashboard;
