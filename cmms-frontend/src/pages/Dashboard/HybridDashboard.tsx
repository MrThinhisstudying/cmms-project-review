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
  Timeline,
  Avatar,
  Grid,
  Segmented,
} from 'antd';
import {
  ToolOutlined,
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
  BarChartOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

// Contexts & APIs
import { useAuthContext } from '../../context/AuthContext/AuthContext';
import { getBackendImageUrl } from '../../utils/imageUrl';
import { useDevicesContext } from '../../context/DevicesContext/DevicesContext';
import { useRepairsContext } from '../../context/RepairsContext/RepairsContext';
import { useMaintenanceContext } from '../../context/MaintenanceContext/MaintenanceContext';
import { useInventoryContext } from '../../context/InventoryContext/InventoryContext';
import certificatesApi from '../../apis/certificates';
import { getPendingRequests, IProfileRequest } from '../../apis/profileRequests';
import { getLaborContracts, ILaborContract } from '../../apis/laborContracts';
import { getTasks, getTaskProjects } from '../../apis/tasks';
import { getDepartments } from '../../apis/departments';
import { getAllUsers } from '../../apis/users';
import { getToken } from '../../utils/auth';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import { isMaintenanceOverdue, getMaintenanceStatusInfo } from '../../utils/maintenanceDue';
import { useSocket } from '../../hooks/useSocket';
import RepairDetailDrawer from '../RepairsManagement/components/RepairDetailDrawer';
import ExecutiveDashboardView from '../Tasks/components/ExecutiveDashboardView';
import TaskDetailModal from '../Tasks/components/TaskDetailModal';
import TaskFormModal from '../Tasks/components/TaskFormModal';
import HRDashboard from '../HRDashboard';
import { calculateDeviceExpiries } from '../../utils/deviceExpiries';
import { DeviceStatus } from '../../types/devicesManagement.types';
import { IRepair } from '../../types/repairs.types';
import {
  ITaskAssignmentContext,
  ITaskProject,
  ITaskStats,
  IWorkTask,
} from '../../types/tasks.types';
import { IDepartment, IUser } from '../../types/user.types';
import {
  TASK_PRIORITY_CONFIG,
  TASK_STATUS_CONFIG,
  getDeadlineMeta,
  isTaskOverdue,
} from '../Tasks/taskConstants';

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

const DEFAULT_TASK_STATS: ITaskStats = {
  total: 0,
  newCount: 0,
  inProgress: 0,
  pendingReview: 0,
  completed: 0,
  overdue: 0,
  myAssigned: 0,
  myCreated: 0,
  waitingMyReview: 0,
};

const HybridDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const role = (user?.role || '').toUpperCase();
  const isExecutive = ['ADMIN', 'DIRECTOR'].includes(role);
  const isHrManager = role === 'HR_MANAGER';
  const canViewHrPerspective = ['ADMIN', 'DIRECTOR', 'UNIT_HEAD', 'HR_MANAGER'].includes(role);

  // Nhận diện Cán bộ thuộc Đội Kỹ thuật hay Đội Phi kỹ thuật
  const isTechnicalDept = useMemo(() => {
    if (isExecutive) return true;
    if (isHrManager) return false;
    if (user?.department?.is_technical) return true;
    if (user?.user_departments?.some((ud) => ud.department?.is_technical)) return true;
    return false;
  }, [user, isExecutive, isHrManager]);

  // Chế độ góc nhìn ngay trên Trang chủ (Unified Perspectives)
  const [perspective, setPerspective] = useState<'OVERVIEW' | 'TASKS' | 'HR'>(() =>
    role === 'HR_MANAGER' ? 'HR' : 'OVERVIEW'
  );

  // Context Data
  const { items, refreshAll: refreshInventory } = useInventoryContext();
  const { devices, fetchDevices, loading: devicesLoading } = useDevicesContext();
  const { repairs, reload: reloadRepairs, reviewRepairItem, exportRepairItem } = useRepairsContext();
  const { maintenances, fetchMaintenances } = useMaintenanceContext();

  // Local State: Work Tasks
  const [tasks, setTasks] = useState<IWorkTask[]>([]);
  const [taskStats, setTaskStats] = useState<ITaskStats>(DEFAULT_TASK_STATS);
  const [assignmentContext, setAssignmentContext] = useState<ITaskAssignmentContext | null>(null);
  const [projects, setProjects] = useState<ITaskProject[]>([]);
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [activeUsers, setActiveUsers] = useState<IUser[]>([]);

  // Task Modals State
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<IWorkTask | null>(null);
  const [parentTaskForSub, setParentTaskForSub] = useState<IWorkTask | null>(null);

  // Local State: HR & Compliance
  const [loadingHr, setLoadingHr] = useState<boolean>(false);
  const [expiringCerts, setExpiringCerts] = useState<any[]>([]);
  const [qualificationStats, setQualificationStats] = useState<any>(null);
  const [pendingProfileRequests, setPendingProfileRequests] = useState<IProfileRequest[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<ILaborContract[]>([]);

  // Repair Drawer Detail State
  const [selectedRepair, setSelectedRepair] = useState<IRepair | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  // Active Tab in Priority Action Queue
  const [activeQueueTab, setActiveQueueTab] = useState<string>(() =>
    isTechnicalDept ? 'tasks' : 'tasks'
  );

  // Load Work Tasks & Master Data
  const loadTasksData = useCallback(async () => {
    try {
      const token = getToken();
      const [taskRes, projRes, deptRes, userRes] = await Promise.allSettled([
        getTasks({ view_mode: 'ALL', include_subtasks: true }),
        getTaskProjects(),
        getDepartments(),
        getAllUsers(token),
      ]);

      if (taskRes.status === 'fulfilled') {
        setTasks(taskRes.value.items || []);
        setTaskStats(taskRes.value.stats || DEFAULT_TASK_STATS);
        if (taskRes.value.assignmentContext) {
          setAssignmentContext(taskRes.value.assignmentContext);
        }
      }
      if (projRes.status === 'fulfilled') setProjects(projRes.value || []);
      if (deptRes.status === 'fulfilled') setDepartments(deptRes.value || []);
      if (userRes.status === 'fulfilled') {
        const activeList = (userRes.value || []).filter(
          (u: IUser) => !u.status || u.status.trim().toLowerCase() === 'active'
        );
        setActiveUsers(activeList);
      }
    } catch (err) {
      console.error('Failed to load tasks on dashboard:', err);
    }
  }, []);

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
    loadTasksData();
    loadComplianceData();
    if (isTechnicalDept) {
      refreshInventory();
      fetchDevices();
      reloadRepairs();
      fetchMaintenances();
    }
  }, [
    loadTasksData,
    loadComplianceData,
    isTechnicalDept,
    refreshInventory,
    fetchDevices,
    reloadRepairs,
    fetchMaintenances,
  ]);

  useEffect(() => {
    refreshAllData();
    const interval = setInterval(() => {
      loadTasksData();
      if (isTechnicalDept) {
        reloadRepairs();
        fetchMaintenances(true);
      }
    }, 45000);
    return () => clearInterval(interval);
  }, [refreshAllData, loadTasksData, isTechnicalDept, reloadRepairs, fetchMaintenances]);

  useRefreshOnFocus(refreshAllData);

  // Socket auto refresh
  const socketListeners = useMemo(
    () => ({
      dashboard_refresh: () => refreshAllData(),
      task_updated: () => loadTasksData(),
      repair_updated: () => reloadRepairs(),
      device_updated: () => fetchDevices(),
    }),
    [refreshAllData, loadTasksData, reloadRepairs, fetchDevices]
  );
  useSocket(user?.user_id, socketListeners);

  // --- 1. LỌC CÔNG VIỆC CẦN CHÚ Ý / CHỜ TÔI DUYỆT ---
  const priorityTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
        const isWaitingMyReview =
          t.status === 'PENDING_REVIEW' &&
          (t.assigner_id === user?.user_id || isExecutive);
        const isAssignedToMe = t.assignee_id === user?.user_id;
        const overdue = isTaskOverdue(t);
        const isUrgent = t.priority === 'URGENT' || t.priority === 'HIGH';
        return isWaitingMyReview || isAssignedToMe || overdue || isUrgent;
      })
      .sort((a, b) => {
        // Ưu tiên việc chờ nghiệm thu & quá hạn lên đầu
        const aReview = a.status === 'PENDING_REVIEW' ? 1 : 0;
        const bReview = b.status === 'PENDING_REVIEW' ? 1 : 0;
        if (aReview !== bReview) return bReview - aReview;
        return dayjs(a.deadline).valueOf() - dayjs(b.deadline).valueOf();
      });
  }, [tasks, user?.user_id, isExecutive]);

  // --- 2. LỌC PHIẾU SỬA CHỮA CHỜ TÔI DUYỆT ---
  const myPendingRepairs = useMemo(() => {
    if (!user || !isTechnicalDept) return [];
    return repairs
      .filter((r: any) => {
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
      })
      .sort((a: any, b: any) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());
  }, [repairs, user, role, isTechnicalDept]);

  // --- 3. THỐNG KÊ THIẾT BỊ & TỶ LỆ SẴN SÀNG ---
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

    const getEffectiveInspection = (d: any) => {
      if (d.inspection_expiry) return d.inspection_expiry;
      if (d.license_info) {
        return calculateDeviceExpiries(d.license_info).inspection_expiry;
      }
      return null;
    };

    const attentionDevices = devices.filter((d) => {
      const exp = getEffectiveInspection(d);
      return (
        d.status === ('DANG_SUA_CHUA' as DeviceStatus) ||
        d.status === ('SU_DUNG_HAN_CHE' as DeviceStatus) ||
        (exp && dayjs(exp).isBefore(dayjs(), 'day'))
      );
    });

    const expiredInspection = devices.filter((d) => {
      const exp = getEffectiveInspection(d);
      return exp && dayjs(exp).isBefore(dayjs(), 'day');
    }).length;

    const expiringInspection = devices.filter((d) => {
      const exp = getEffectiveInspection(d);
      return (
        exp &&
        dayjs(exp).isAfter(dayjs()) &&
        dayjs(exp).diff(dayjs(), 'day') <= 30
      );
    }).length;

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

  // --- 4. THỐNG KÊ BẢO DƯỠNG ---
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

  // --- 5. THỐNG KÊ VẬT TƯ THẤP ---
  const lowStockItems = useMemo(() => {
    return items.filter((item) => (item.quantity ?? 0) <= 10);
  }, [items]);

  // --- 6. TỔNG HỢP RỦI RO TUÂN THỦ (COMPLIANCE RADAR) ---
  const complianceStats = useMemo(() => {
    const expiredGplx = qualificationStats?.expiredLicensesCount || 0;
    const expiringGplx = qualificationStats?.expiringLicensesCount || 0;
    const totalGplxRisk = expiredGplx + expiringGplx;

    const certExpired = expiringCerts.filter((c: any) => {
      const exp = c.expiry_date || c.next_training_date;
      return exp && dayjs(exp).isBefore(dayjs(), 'day');
    }).length;
    const certExpiring = expiringCerts.length - certExpired;

    const totalRisks =
      totalGplxRisk +
      expiringCerts.length +
      (isTechnicalDept ? deviceStats.expiredInspection : 0);

    return {
      expiredGplx,
      expiringGplx,
      totalGplxRisk,
      certExpired,
      certExpiring,
      totalCertRisk: expiringCerts.length,
      totalRisks,
    };
  }, [qualificationStats, expiringCerts, deviceStats.expiredInspection, isTechnicalDept]);

  // --- 7. PHIẾU GẦN ĐÂY ---
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

  const handleOpenTaskDetail = (taskId: number) => {
    setSelectedTaskId(taskId);
    setTaskDetailOpen(true);
  };

  const greetingText = useMemo(() => {
    const hour = dayjs().hour();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }, []);

  const dayName = useMemo(() => {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return `${days[dayjs().day()]}, ${dayjs().format('DD/MM/YYYY')}`;
  }, []);

  // Tổng số việc chờ cán bộ duyệt
  const totalPendingMyAction =
    taskStats.waitingMyReview +
    myPendingRepairs.length +
    pendingProfileRequests.length;

  const roleBadgeLabel = useMemo(() => {
    if (role === 'ADMIN') return 'Quản trị hệ thống';
    if (role === 'DIRECTOR') return 'Ban Giám Đốc';
    if (role === 'HR_MANAGER') return 'Quản lý Nhân sự';
    if (role === 'UNIT_HEAD') return isTechnicalDept ? 'Cán bộ Đội Kỹ thuật' : 'Chỉ huy Đơn vị';
    if (role === 'TEAM_LEAD') return isTechnicalDept ? 'Tổ trưởng Kỹ thuật' : 'Tổ trưởng Điều hành';
    return role;
  }, [role, isTechnicalDept]);

  return (
    <div
      style={{
        padding: isMobile ? '8px 4px 24px' : '16px 20px 36px',
        background: '#f8fafc',
        minHeight: '100vh',
      }}
    >
      {/* ============================================================ */}
      {/* 1. UNIFIED EXECUTIVE COMMAND HEADER & PERSPECTIVE SWITCHER */}
      {/* ============================================================ */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: isMobile ? 12 : 16,
          padding: isMobile ? '14px 14px' : '20px 24px',
          marginBottom: isMobile ? 12 : 18,
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.25)',
          color: '#fff',
        }}
      >
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col xs={24} lg={13}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14 }}>
              <Avatar
                size={isMobile ? 42 : 52}
                src={user?.avatar ? getBackendImageUrl(user.avatar) : undefined}
                icon={!user?.avatar && <UserOutlined />}
                style={{
                  background: '#3b82f6',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  fontSize: isMobile ? 18 : 22,
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Title
                    level={isMobile ? 5 : 4}
                    style={{ margin: 0, color: '#f8fafc', fontWeight: 700 }}
                  >
                    {greetingText}, {user?.name || 'Cán bộ'}!
                  </Title>
                  <Tag
                    color="blue"
                    style={{
                      margin: 0,
                      borderRadius: 12,
                      fontWeight: 600,
                      fontSize: 10.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    {roleBadgeLabel}
                  </Tag>
                  {user?.department?.name && (
                    <Tag
                      style={{
                        margin: 0,
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#cbd5e1',
                        borderRadius: 12,
                        fontSize: 10.5,
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
                    gap: 12,
                    marginTop: 4,
                    fontSize: isMobile ? 11.5 : 13,
                    color: '#94a3b8',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>
                    <CalendarOutlined style={{ marginRight: 5, color: '#60a5fa' }} />
                    {dayName}
                  </span>
                  {!isMobile && (
                    <>
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
                        Trung tâm Điều hành Hợp nhất theo Vai trò & Đơn vị
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Col>

          {/* Quick Actions */}
          <Col xs={24} lg={11} style={{ textAlign: isMobile ? 'left' : 'right' }}>
            <Space wrap size={8}>
              <Button
                size={isMobile ? 'small' : 'middle'}
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingTask(null);
                  setParentTaskForSub(null);
                  setTaskFormOpen(true);
                }}
                style={{
                  background: '#2563eb',
                  borderColor: '#2563eb',
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              >
                Giao việc mới
              </Button>

              {isTechnicalDept && (
                <Button
                  size={isMobile ? 'small' : 'middle'}
                  icon={<ToolOutlined />}
                  onClick={() => navigate('/quan_ly_sua_chua')}
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    borderColor: 'rgba(255,255,255,0.25)',
                    color: '#f8fafc',
                    borderRadius: 8,
                  }}
                >
                  Phiếu sửa chữa
                </Button>
              )}

              <Button
                size={isMobile ? 'small' : 'middle'}
                icon={<ReloadOutlined spin={loadingHr || devicesLoading} />}
                onClick={refreshAllData}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  borderRadius: 8,
                }}
              >
                {!isMobile && 'Làm mới'}
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Thanh chuyển góc nhìn điều hành hợp nhất ngay trên Trang chủ */}
        <div
          style={{
            marginTop: isMobile ? 12 : 16,
            paddingTop: isMobile ? 10 : 14,
            borderTop: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
            <Segmented
              size={isMobile ? 'small' : 'middle'}
              value={perspective}
              onChange={(val) => setPerspective(val as 'OVERVIEW' | 'TASKS' | 'HR')}
              options={[
                {
                  value: 'OVERVIEW',
                  label: (
                    <span style={{ fontWeight: 600, padding: '0 4px' }}>
                      <ThunderboltOutlined style={{ marginRight: 5 }} />
                      {isExecutive
                        ? 'Tổng quan Toàn cảng'
                        : isTechnicalDept
                        ? 'Điều hành Đội/Tổ Kỹ thuật'
                        : 'Điều hành Đơn vị'}
                    </span>
                  ),
                },
                {
                  value: 'TASKS',
                  label: (
                    <span style={{ fontWeight: 600, padding: '0 4px' }}>
                      <BarChartOutlined style={{ marginRight: 5 }} />
                      Tiến độ & Đôn đốc Công việc
                    </span>
                  ),
                },
                ...(canViewHrPerspective
                  ? [
                      {
                        value: 'HR',
                        label: (
                          <span style={{ fontWeight: 600, padding: '0 4px' }}>
                            <TeamOutlined style={{ marginRight: 5 }} />
                            Tổng quan Nhân sự & Chứng chỉ
                          </span>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </div>

          {!isMobile && (
            <Space size={12}>
              <Button
                type="link"
                size="small"
                onClick={() => navigate('/lich_cong_viec')}
                style={{ color: '#93c5fd', padding: 0 }}
              >
                <CalendarOutlined /> Xem Lịch công việc →
              </Button>
              <Button
                type="link"
                size="small"
                onClick={() => navigate('/kpi_thi_dua')}
                style={{ color: '#fcd34d', padding: 0 }}
              >
                🏆 Bình xét KPI & Thi đua →
              </Button>
            </Space>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* PERSPECTIVE 2: ĐIỀU HÀNH TIẾN ĐỘ & ĐÔN ĐỐC CÔNG VIỆC */}
      {/* ============================================================ */}
      {perspective === 'TASKS' && (
        <ExecutiveDashboardView
          departments={departments}
          projects={projects}
          onOpenDetail={handleOpenTaskDetail}
          onRefreshTasks={loadTasksData}
        />
      )}

      {/* ============================================================ */}
      {/* PERSPECTIVE 3: TỔNG QUAN NHÂN SỰ & CHỨNG CHỈ 360 */}
      {/* ============================================================ */}
      {perspective === 'HR' && <HRDashboard />}

      {/* ============================================================ */}
      {/* PERSPECTIVE 1: TỔNG QUAN ĐIỀU HÀNH THEO ROLE & ĐỘI */}
      {/* ============================================================ */}
      {perspective === 'OVERVIEW' && (
        <>
          {/* 2. ADAPTIVE KPI COMMAND STRIP */}
          <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} style={{ marginBottom: isMobile ? 12 : 20 }}>
            {/* KPI 1: Công việc & Tiến độ (Luôn hiển thị cho mọi Đội) */}
            <Col xs={12} sm={12} md={8} lg={isTechnicalDept ? 5 : 6}>
              <Card
                hoverable
                onClick={() => navigate('/quan_ly_cong_viec')}
                style={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  borderTop: '4px solid #2563eb',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  height: '100%',
                }}
                styles={{ body: { padding: isMobile ? '10px 12px' : '16px 18px' } }}
              >
                <Text
                  type="secondary"
                  style={{ fontSize: isMobile ? 10.5 : 12, fontWeight: 600, color: '#64748b' }}
                >
                  CÔNG VIỆC ĐANG CHẠY
                </Text>
                <div
                  style={{
                    fontSize: isMobile ? 22 : 28,
                    fontWeight: 700,
                    color: '#2563eb',
                    margin: '2px 0',
                  }}
                >
                  {taskStats.inProgress + taskStats.newCount}
                </div>
                <div style={{ fontSize: isMobile ? 11 : 12, color: '#64748b' }}>
                  {taskStats.overdue > 0 ? (
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>
                      {taskStats.overdue} quá hạn
                    </span>
                  ) : (
                    `${taskStats.completed}/${taskStats.total} hoàn thành`
                  )}
                </div>
              </Card>
            </Col>

            {/* KPI 2: Chờ tôi phê duyệt / Nghiệm thu */}
            <Col xs={12} sm={12} md={8} lg={isTechnicalDept ? 5 : 6}>
              <Card
                hoverable
                onClick={() => setActiveQueueTab('tasks')}
                style={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  borderTop: totalPendingMyAction > 0 ? '4px solid #f59e0b' : '4px solid #94a3b8',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  height: '100%',
                }}
                styles={{ body: { padding: isMobile ? '10px 12px' : '16px 18px' } }}
              >
                <Text
                  type="secondary"
                  style={{ fontSize: isMobile ? 10.5 : 12, fontWeight: 600, color: '#64748b' }}
                >
                  CHỜ TÔI DUYỆT
                </Text>
                <div
                  style={{
                    fontSize: isMobile ? 22 : 28,
                    fontWeight: 700,
                    color: totalPendingMyAction > 0 ? '#d97706' : '#0f172a',
                    margin: '2px 0',
                  }}
                >
                  {totalPendingMyAction}
                </div>
                <div style={{ fontSize: isMobile ? 11 : 12, color: '#64748b' }}>
                  {taskStats.waitingMyReview} nghiệm thu
                  {isTechnicalDept ? ` • ${myPendingRepairs.length} phiếu SC` : ''}
                </div>
              </Card>
            </Col>

            {/* KPI 3 (Nếu Đội Kỹ thuật): Tỷ lệ sẵn sàng phương tiện | (Nếu Phi kỹ thuật): Việc chờ nghiệm thu / Quá hạn */}
            {isTechnicalDept ? (
              <Col xs={12} sm={12} md={8} lg={5}>
                <Card
                  hoverable
                  onClick={() => navigate('/quan_ly_ttb_pt')}
                  style={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    borderTop: '4px solid #10b981',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    height: '100%',
                  }}
                  styles={{ body: { padding: isMobile ? '10px 12px' : '16px 18px' } }}
                >
                  <Text
                    type="secondary"
                    style={{ fontSize: isMobile ? 10.5 : 12, fontWeight: 600, color: '#64748b' }}
                  >
                    TỶ LỆ SẴN SÀNG XE
                  </Text>
                  <div
                    style={{
                      fontSize: isMobile ? 22 : 28,
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: '2px 0',
                    }}
                  >
                    {deviceStats.readinessRate}%
                  </div>
                  <div style={{ fontSize: isMobile ? 11 : 12, color: '#10b981', fontWeight: 500 }}>
                    {deviceStats.active}/{deviceStats.total} TTB tốt
                  </div>
                </Card>
              </Col>
            ) : (
              <Col xs={12} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  onClick={() => setPerspective('TASKS')}
                  style={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    borderTop: taskStats.overdue > 0 ? '4px solid #ef4444' : '4px solid #10b981',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    height: '100%',
                  }}
                  styles={{ body: { padding: isMobile ? '10px 12px' : '16px 18px' } }}
                >
                  <Text
                    type="secondary"
                    style={{ fontSize: isMobile ? 10.5 : 12, fontWeight: 600, color: '#64748b' }}
                  >
                    VIỆC TRỄ HẠN / ĐỌNG
                  </Text>
                  <div
                    style={{
                      fontSize: isMobile ? 22 : 28,
                      fontWeight: 700,
                      color: taskStats.overdue > 0 ? '#ef4444' : '#10b981',
                      margin: '2px 0',
                    }}
                  >
                    {taskStats.overdue}
                  </div>
                  <div style={{ fontSize: isMobile ? 11 : 12, color: '#64748b' }}>
                    Bấm để xem & đôn đốc ngay
                  </div>
                </Card>
              </Col>
            )}

            {/* KPI 4 (Nếu Đội Kỹ thuật): Bảo dưỡng quá hạn */}
            {isTechnicalDept && (
              <Col xs={12} sm={12} md={8} lg={5}>
                <Card
                  hoverable
                  onClick={() => navigate('/quan_ly_bao_duong')}
                  style={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    borderTop:
                      maintenanceStats.overdueCount > 0
                        ? '4px solid #f97316'
                        : '4px solid #94a3b8',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    height: '100%',
                  }}
                  styles={{ body: { padding: isMobile ? '10px 12px' : '16px 18px' } }}
                >
                  <Text
                    type="secondary"
                    style={{ fontSize: isMobile ? 10.5 : 12, fontWeight: 600, color: '#64748b' }}
                  >
                    BẢO DƯỠNG QUÁ HẠN
                  </Text>
                  <div
                    style={{
                      fontSize: isMobile ? 22 : 28,
                      fontWeight: 700,
                      color: maintenanceStats.overdueCount > 0 ? '#ea580c' : '#0f172a',
                      margin: '2px 0',
                    }}
                  >
                    {maintenanceStats.overdueCount}
                  </div>
                  <div style={{ fontSize: isMobile ? 11 : 12, color: '#64748b' }}>
                    {lowStockItems.length} vật tư dưới định mức
                  </div>
                </Card>
              </Col>
            )}

            {/* KPI 5: Rủi ro An toàn & Tuân thủ (CCCM / GPLX / Kiểm định) */}
            <Col xs={24} sm={12} md={8} lg={isTechnicalDept ? 4 : 6}>
              <Card
                hoverable
                onClick={() =>
                  canViewHrPerspective ? setPerspective('HR') : navigate('/quan_ly_nhan_vien')
                }
                style={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  borderTop:
                    complianceStats.totalRisks > 0 ? '4px solid #ef4444' : '4px solid #10b981',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  height: '100%',
                }}
                styles={{ body: { padding: isMobile ? '10px 12px' : '16px 18px' } }}
              >
                <Text
                  type="secondary"
                  style={{ fontSize: isMobile ? 10.5 : 12, fontWeight: 600, color: '#64748b' }}
                >
                  RỦI RO TUÂN THỦ
                </Text>
                <div
                  style={{
                    fontSize: isMobile ? 22 : 28,
                    fontWeight: 700,
                    color: complianceStats.totalRisks > 0 ? '#ef4444' : '#10b981',
                    margin: '2px 0',
                  }}
                >
                  {complianceStats.totalRisks}
                </div>
                <div style={{ fontSize: isMobile ? 11 : 12, color: '#64748b' }}>
                  {complianceStats.totalGplxRisk} GPLX • {complianceStats.totalCertRisk} CCCM
                </div>
              </Card>
            </Col>
          </Row>

          {/* 3. MAIN CONTENT (LEFT: UNIFIED ACTION QUEUE | RIGHT: RADAR & FLEET) */}
          <Row gutter={[isMobile ? 12 : 20, isMobile ? 12 : 20]}>
            <Col xs={24} lg={15}>
              <Card
                style={{
                  borderRadius: 14,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  marginBottom: isMobile ? 12 : 20,
                }}
                styles={{ body: { padding: '0 0 12px' } }}
              >
                <div
                  style={{
                    padding: isMobile ? '12px 14px' : '16px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
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
                      <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: '#0f172a' }}>
                        Hàng đợi Điều hành & Phê duyệt Hợp nhất
                      </div>
                      {!isMobile && (
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          Xử lý công việc, nghiệm thu và phê duyệt phiếu ngay tại Trang chủ
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Tabs
                  activeKey={activeQueueTab}
                  onChange={setActiveQueueTab}
                  size={isMobile ? 'small' : 'middle'}
                  tabBarStyle={{ padding: isMobile ? '0 12px' : '0 20px', margin: 0 }}
                  items={[
                    {
                      key: 'tasks',
                      label: (
                        <span>
                          📋 Công việc cần xử lý
                          {priorityTasks.length > 0 && (
                            <span
                              style={{
                                background: '#2563eb',
                                color: '#fff',
                                borderRadius: 10,
                                padding: '1px 7px',
                                fontSize: 11,
                                fontWeight: 700,
                                marginLeft: 6,
                              }}
                            >
                              {priorityTasks.length}
                            </span>
                          )}
                        </span>
                      ),
                      children: (
                        <div style={{ padding: isMobile ? '8px 10px 0' : '8px 16px 0' }}>
                          {priorityTasks.length === 0 ? (
                            <div style={{ padding: '32px 0', textAlign: 'center' }}>
                              <CheckCircleOutlined
                                style={{ fontSize: 38, color: '#10b981', marginBottom: 8 }}
                              />
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                                Không có công việc tồn đọng hoặc chờ nghiệm thu
                              </div>
                            </div>
                          ) : isMobile ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {priorityTasks.slice(0, 6).map((t) => {
                                const sCfg =
                                  TASK_STATUS_CONFIG[t.status] || TASK_STATUS_CONFIG.NEW;
                                const pCfg =
                                  TASK_PRIORITY_CONFIG[t.priority] || TASK_PRIORITY_CONFIG.NORMAL;
                                const dMeta = getDeadlineMeta(t);
                                return (
                                  <div
                                    key={t.id}
                                    onClick={() => handleOpenTaskDetail(t.id)}
                                    style={{
                                      background: '#f8fafc',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: 10,
                                      padding: '10px 12px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 4,
                                      }}
                                    >
                                      <Space size={4}>
                                        <Tag color="blue" style={{ margin: 0, fontWeight: 700 }}>
                                          {t.code}
                                        </Tag>
                                        <span
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: sCfg.color,
                                            background: sCfg.bg,
                                            padding: '1px 7px',
                                            borderRadius: 999,
                                          }}
                                        >
                                          {sCfg.label}
                                        </span>
                                      </Space>
                                      <span
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 600,
                                          color: pCfg.color,
                                          background: pCfg.bg,
                                          padding: '1px 6px',
                                          borderRadius: 6,
                                        }}
                                      >
                                        {pCfg.label}
                                      </span>
                                    </div>
                                    <div
                                      style={{
                                        fontWeight: 600,
                                        fontSize: 13.5,
                                        color: '#0f172a',
                                        marginBottom: 6,
                                      }}
                                    >
                                      {t.title}
                                    </div>
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: 11.5,
                                        color: '#64748b',
                                      }}
                                    >
                                      <span>👤 {t.assignee?.name || '—'}</span>
                                      <span style={{ color: dMeta.color, fontWeight: 600 }}>
                                        ⏰ {dMeta.text}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <Table
                              dataSource={priorityTasks}
                              rowKey="id"
                              pagination={{ pageSize: 5, size: 'small' }}
                              size="middle"
                              onRow={(r) => ({
                                onClick: () => handleOpenTaskDetail(r.id),
                                style: { cursor: 'pointer' },
                              })}
                              columns={[
                                {
                                  title: 'Mã CV',
                                  dataIndex: 'code',
                                  key: 'code',
                                  width: 110,
                                  render: (code: string) => (
                                    <Tag color="blue" style={{ fontWeight: 700, margin: 0 }}>
                                      {code}
                                    </Tag>
                                  ),
                                },
                                {
                                  title: 'Nội dung công việc',
                                  key: 'title',
                                  render: (_: unknown, r: IWorkTask) => (
                                    <div>
                                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                        {r.title}
                                      </div>
                                      <div style={{ fontSize: 12, color: '#64748b' }}>
                                        Phụ trách: <b>{r.assignee?.name || '—'}</b> •{' '}
                                        {r.department?.name || 'Toàn cảng'}
                                      </div>
                                    </div>
                                  ),
                                },
                                {
                                  title: 'Trạng thái',
                                  key: 'status',
                                  width: 150,
                                  render: (_: unknown, r: IWorkTask) => {
                                    const sCfg =
                                      TASK_STATUS_CONFIG[r.status] || TASK_STATUS_CONFIG.NEW;
                                    return (
                                      <span
                                        style={{
                                          fontSize: 11.5,
                                          fontWeight: 700,
                                          color: sCfg.color,
                                          background: sCfg.bg,
                                          padding: '2px 8px',
                                          borderRadius: 999,
                                        }}
                                      >
                                        ● {sCfg.label}
                                      </span>
                                    );
                                  },
                                },
                                {
                                  title: 'Hạn hoàn thành',
                                  key: 'deadline',
                                  width: 140,
                                  render: (_: unknown, r: IWorkTask) => {
                                    const dMeta = getDeadlineMeta(r);
                                    return (
                                      <div>
                                        <div style={{ fontSize: 12, color: '#334155' }}>
                                          {dayjs(r.deadline).format('DD/MM/YYYY')}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: dMeta.color,
                                          }}
                                        >
                                          {dMeta.text}
                                        </div>
                                      </div>
                                    );
                                  },
                                },
                                {
                                  title: 'Thao tác',
                                  key: 'action',
                                  width: 110,
                                  align: 'right',
                                  render: (_: unknown, r: IWorkTask) => (
                                    <Button
                                      type="primary"
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenTaskDetail(r.id);
                                      }}
                                      style={{ borderRadius: 6, fontSize: 12 }}
                                    >
                                      {r.status === 'PENDING_REVIEW' ? 'Nghiệm thu' : 'Xem & Xử lý'}
                                    </Button>
                                  ),
                                },
                              ]}
                            />
                          )}
                        </div>
                      ),
                    },
                    ...(isTechnicalDept
                      ? [
                          {
                            key: 'repairs',
                            label: (
                              <span>
                                🔔 Phiếu SC chờ duyệt
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
                              <div style={{ padding: isMobile ? '8px 10px 0' : '8px 16px 0' }}>
                                {myPendingRepairs.length === 0 ? (
                                  <div style={{ padding: '32px 0', textAlign: 'center' }}>
                                    <CheckCircleOutlined
                                      style={{ fontSize: 38, color: '#10b981', marginBottom: 8 }}
                                    />
                                    <div
                                      style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}
                                    >
                                      Không có phiếu sửa chữa nào tồn đọng
                                    </div>
                                  </div>
                                ) : isMobile ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {myPendingRepairs.slice(0, 6).map((r: IRepair) => {
                                      const { label, color } = getRepairPhaseInfo(r);
                                      return (
                                        <div
                                          key={r.repair_id}
                                          onClick={() => {
                                            setSelectedRepair(r);
                                            setIsDetailOpen(true);
                                          }}
                                          style={{
                                            background: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: 10,
                                            padding: '10px 12px',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          <div
                                            style={{
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                              marginBottom: 4,
                                            }}
                                          >
                                            <Text strong style={{ color: '#2563eb' }}>
                                              Phiếu #{r.repair_id}
                                            </Text>
                                            <Tag color={color} style={{ margin: 0 }}>
                                              {label}
                                            </Tag>
                                          </div>
                                          <div
                                            style={{
                                              fontWeight: 600,
                                              color: '#0f172a',
                                              fontSize: 13.5,
                                            }}
                                          >
                                            {r.device?.name || 'Thiết bị'} (BS:{' '}
                                            {r.device?.reg_number || '---'})
                                          </div>
                                          <div
                                            style={{
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                              marginTop: 6,
                                              fontSize: 12,
                                              color: '#64748b',
                                            }}
                                          >
                                            <span>
                                              Ngày:{' '}
                                              {r.created_at
                                                ? dayjs(r.created_at).format('DD/MM/YYYY')
                                                : '---'}
                                            </span>
                                            <Button type="primary" size="small">
                                              Xem & Duyệt
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    })}
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
                                            <div
                                              style={{
                                                fontWeight: 600,
                                                color: '#1e293b',
                                                fontSize: 13,
                                              }}
                                            >
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
                                        align: 'right' as const,
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
                        ]
                      : []),
                    ...(canViewHrPerspective
                      ? [
                          {
                            key: 'profile_requests',
                            label: (
                              <span>
                                👤 Hồ sơ nhân sự
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
                              <div style={{ padding: isMobile ? '8px 10px 0' : '8px 16px 0' }}>
                                {pendingProfileRequests.length === 0 ? (
                                  <div style={{ padding: '32px 0', textAlign: 'center' }}>
                                    <CheckCircleOutlined
                                      style={{ fontSize: 38, color: '#10b981', marginBottom: 8 }}
                                    />
                                    <div
                                      style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}
                                    >
                                      Không có yêu cầu cập nhật hồ sơ tồn đọng
                                    </div>
                                  </div>
                                ) : (
                                  <Table
                                    dataSource={pendingProfileRequests}
                                    rowKey="id"
                                    pagination={{ pageSize: 5, size: 'small' }}
                                    size="small"
                                    scroll={{ x: 'max-content' }}
                                    columns={[
                                      {
                                        title: 'Nhân viên',
                                        key: 'user',
                                        render: (_: any, r: IProfileRequest) => (
                                          <div>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                              {r.user?.name || 'N/A'}
                                            </div>
                                            <div style={{ fontSize: 11.5, color: '#64748b' }}>
                                              {r.user?.department?.name || '---'}
                                            </div>
                                          </div>
                                        ),
                                      },
                                      {
                                        title: 'Loại YC',
                                        dataIndex: 'request_type',
                                        key: 'request_type',
                                        render: (t: string) => (
                                          <Tag color={t === 'NEW_CERTIFICATE' ? 'cyan' : 'blue'}>
                                            {t === 'NEW_CERTIFICATE' ? 'Chứng chỉ mới' : 'Hồ sơ'}
                                          </Tag>
                                        ),
                                      },
                                      {
                                        title: 'Thao tác',
                                        key: 'action',
                                        align: 'right' as const,
                                        render: () => (
                                          <Button
                                            size="small"
                                            onClick={() =>
                                               navigate('/quan_ly_nhan_vien?tab=approvals')
                                            }
                                          >
                                            Duyệt
                                          </Button>
                                        ),
                                      },
                                    ]}
                                  />
                                )}
                              </div>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              </Card>

              {/* Khối Hoạt động Kỹ thuật gần đây (Chỉ hiển thị cho Đội Kỹ thuật / Ban GĐ) */}
              {isTechnicalDept && (
                <Card
                  title={
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ToolOutlined style={{ color: '#2563eb' }} />
                        <span
                          style={{
                            fontSize: isMobile ? 14 : 15,
                            fontWeight: 700,
                            color: '#0f172a',
                          }}
                        >
                          Hoạt động Sửa chữa Gần nhất
                        </span>
                      </div>
                      <Button
                        type="link"
                        onClick={() => navigate('/quan_ly_sua_chua')}
                        style={{ fontSize: 12.5, padding: 0 }}
                      >
                        Tất cả <RightOutlined />
                      </Button>
                    </div>
                  }
                  style={{
                    borderRadius: 14,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}
                  styles={{ body: { padding: isMobile ? '8px 10px' : '8px 16px' } }}
                >
                  {isMobile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {recentRepairs.map((r: IRepair) => {
                        const { label, color } = getRepairPhaseInfo(r);
                        return (
                          <div
                            key={r.repair_id}
                            onClick={() => {
                              setSelectedRepair(r);
                              setIsDetailOpen(true);
                            }}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 8,
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                                #{r.repair_id} • {r.device?.name || 'N/A'}
                              </div>
                              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                                BS: {r.device?.reg_number || '---'} •{' '}
                                {r.created_at ? dayjs(r.created_at).format('DD/MM/YYYY') : ''}
                              </div>
                            </div>
                            <Tag color={color} style={{ margin: 0 }}>
                              {label}
                            </Tag>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
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
                  )}
                </Card>
              )}
            </Col>

            {/* RIGHT COLUMN: RADAR COMPLIANCE, MAINTENANCE & FLEET STATUS */}
            <Col xs={24} lg={9}>
              <Space direction="vertical" size={isMobile ? 12 : 20} style={{ width: '100%' }}>
                {/* Widget 1: Radar An toàn & Tuân thủ Hàng không */}
                <Card
                  title={
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <SafetyCertificateOutlined style={{ color: '#ef4444' }} />
                        <span
                          style={{
                            fontSize: isMobile ? 14 : 15,
                            fontWeight: 700,
                            color: '#0f172a',
                          }}
                        >
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
                  styles={{ body: { padding: isMobile ? 12 : 16 } }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div
                      style={{
                        padding: '10px 12px',
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
                          <div style={{ fontSize: 11.5, color: '#64748b' }}>
                            {complianceStats.expiredGplx} quá hạn • {complianceStats.expiringGplx}{' '}
                            sắp đến hạn
                          </div>
                        </div>
                      </div>
                      <Tag color={complianceStats.totalGplxRisk > 0 ? 'error' : 'success'}>
                        {complianceStats.totalGplxRisk}
                      </Tag>
                    </div>

                    <div
                      style={{
                        padding: '10px 12px',
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
                          <div style={{ fontSize: 11.5, color: '#64748b' }}>
                            {complianceStats.certExpired} quá hạn • {complianceStats.certExpiring}{' '}
                            sắp đến hạn
                          </div>
                        </div>
                      </div>
                      <Tag color={complianceStats.totalCertRisk > 0 ? 'warning' : 'success'}>
                        {complianceStats.totalCertRisk}
                      </Tag>
                    </div>

                    {isTechnicalDept && (
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          background:
                            deviceStats.expiredInspection > 0 ? '#fff1f2' : '#f8fafc',
                          border: '1px solid',
                          borderColor:
                            deviceStats.expiredInspection > 0 ? '#fecdd3' : '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <ToolOutlined
                            style={{
                              fontSize: 18,
                              color:
                                deviceStats.expiredInspection > 0 ? '#ef4444' : '#64748b',
                            }}
                          />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                              Hạn Kiểm định & Bảo hiểm xe
                            </div>
                            <div style={{ fontSize: 11.5, color: '#64748b' }}>
                              {deviceStats.expiredInspection} quá hạn •{' '}
                              {deviceStats.expiringInspection} sắp đến hạn
                            </div>
                          </div>
                        </div>
                        <Tag
                          color={deviceStats.expiredInspection > 0 ? 'error' : 'success'}
                        >
                          {deviceStats.expiredInspection}
                        </Tag>
                      </div>
                    )}

                    <div
                      style={{
                        padding: '10px 12px',
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
                          <div style={{ fontSize: 11.5, color: '#64748b' }}>
                            {expiringContracts.length} hợp đồng cần gia hạn
                          </div>
                        </div>
                      </div>
                      <Tag color={expiringContracts.length > 0 ? 'processing' : 'default'}>
                        {expiringContracts.length}
                      </Tag>
                    </div>
                  </div>

                  {canViewHrPerspective && (
                    <div style={{ marginTop: 12, textAlign: 'center' }}>
                      <Button
                        type="link"
                        onClick={() => setPerspective('HR')}
                        style={{ fontSize: 12.5, padding: 0 }}
                      >
                        Mở Tổng quan Nhân sự & Chứng chỉ <ArrowRightOutlined />
                      </Button>
                    </div>
                  )}
                </Card>

                {/* Widget 2 & 3: Chỉ hiển thị cho Đội Kỹ thuật / Ban Giám Đốc */}
                {isTechnicalDept && (
                  <>
                    <Card
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ApartmentOutlined style={{ color: '#10b981' }} />
                          <span
                            style={{
                              fontSize: isMobile ? 14 : 15,
                              fontWeight: 700,
                              color: '#0f172a',
                            }}
                          >
                            Tình trạng Đội Phương tiện ({deviceStats.total})
                          </span>
                        </div>
                      }
                      style={{
                        borderRadius: 14,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                      }}
                      styles={{ body: { padding: isMobile ? 14 : 18 } }}
                    >
                      <div
                        style={{
                          height: 10,
                          borderRadius: 5,
                          display: 'flex',
                          overflow: 'hidden',
                          marginBottom: 14,
                        }}
                      >
                        <div
                          style={{
                            width: `${
                              deviceStats.total > 0
                                ? (deviceStats.active / deviceStats.total) * 100
                                : 0
                            }%`,
                            background: '#10b981',
                          }}
                        />
                        <div
                          style={{
                            width: `${
                              deviceStats.total > 0
                                ? (deviceStats.inRepair / deviceStats.total) * 100
                                : 0
                            }%`,
                            background: '#ef4444',
                          }}
                        />
                        <div
                          style={{
                            width: `${
                              deviceStats.total > 0
                                ? (deviceStats.limited / deviceStats.total) * 100
                                : 0
                            }%`,
                            background: '#f59e0b',
                          }}
                        />
                      </div>

                      <Row gutter={[12, 10]}>
                        <Col span={12}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 2,
                                background: '#10b981',
                              }}
                            />
                            <span style={{ fontSize: 12, color: '#64748b' }}>Hoạt động tốt:</span>
                          </div>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: '#0f172a',
                              marginLeft: 18,
                            }}
                          >
                            {deviceStats.active} ({deviceStats.readinessRate}%)
                          </div>
                        </Col>

                        <Col span={12}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 2,
                                background: '#ef4444',
                              }}
                            />
                            <span style={{ fontSize: 12, color: '#64748b' }}>Đang sửa chữa:</span>
                          </div>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: '#ef4444',
                              marginLeft: 18,
                            }}
                          >
                            {deviceStats.inRepair}
                          </div>
                        </Col>
                      </Row>
                    </Card>

                    <Card
                      title={
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CalendarOutlined style={{ color: '#d97706' }} />
                            <span
                              style={{
                                fontSize: isMobile ? 14 : 15,
                                fontWeight: 700,
                                color: '#0f172a',
                              }}
                            >
                              Lịch Bảo trì Cần thực hiện
                            </span>
                          </div>
                          <Button
                            type="link"
                            onClick={() => navigate('/quan_ly_bao_duong')}
                            style={{ fontSize: 12, padding: 0 }}
                          >
                            Chi tiết <RightOutlined />
                          </Button>
                        </div>
                      }
                      style={{
                        borderRadius: 14,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                      }}
                      styles={{ body: { padding: '14px 16px' } }}
                    >
                      {maintenanceStats.overdueList.length === 0 &&
                      maintenanceStats.upcomingList.length === 0 ? (
                        <div
                          style={{ textAlign: 'center', padding: '18px 0', color: '#94a3b8' }}
                        >
                          <CheckCircleOutlined
                            style={{ fontSize: 26, color: '#10b981', marginBottom: 4 }}
                          />
                          <div>Không có thiết bị đến hạn bảo dưỡng tuần này</div>
                        </div>
                      ) : (
                        <Timeline
                          items={[
                            ...maintenanceStats.overdueList.slice(0, 3).map((m: any) => ({
                              color: 'red',
                              children: (
                                <div>
                                  <div
                                    style={{ display: 'flex', justifyContent: 'space-between' }}
                                  >
                                    <Text strong style={{ color: '#0f172a', fontSize: 13 }}>
                                      {m.device?.name || 'Thiết bị'}
                                    </Text>
                                    <Tag color="error" style={{ margin: 0, fontSize: 10 }}>
                                      Quá hạn
                                    </Tag>
                                  </div>
                                  <div style={{ fontSize: 11.5, color: '#ef4444' }}>
                                    Hạn: {dayjs(m.next_maintenance_date).format('DD/MM/YYYY')}
                                  </div>
                                </div>
                              ),
                            })),
                            ...maintenanceStats.upcomingList.slice(0, 2).map((m: any) => ({
                              color: 'green',
                              children: (
                                <div>
                                  <div
                                    style={{ display: 'flex', justifyContent: 'space-between' }}
                                  >
                                    <Text strong style={{ color: '#0f172a', fontSize: 13 }}>
                                      {m.device?.name || 'Thiết bị'}
                                    </Text>
                                    <Tag color="success" style={{ margin: 0, fontSize: 10 }}>
                                      Đến hạn
                                    </Tag>
                                  </div>
                                  <div style={{ fontSize: 11.5, color: '#10b981' }}>
                                    Hạn: {dayjs(m.next_maintenance_date).format('DD/MM/YYYY')}
                                  </div>
                                </div>
                              ),
                            })),
                          ]}
                        />
                      )}
                    </Card>
                  </>
                )}
              </Space>
            </Col>
          </Row>
        </>
      )}

      {/* ============================================================ */}
      {/* 4. MODALS & DRAWERS (REPAIR DETAIL + TASK DETAIL + TASK FORM) */}
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

      <TaskDetailModal
        open={taskDetailOpen}
        taskId={selectedTaskId}
        currentUser={user}
        canCreateTask={assignmentContext?.canCreateTask ?? true}
        onClose={() => setTaskDetailOpen(false)}
        onUpdated={loadTasksData}
        onEditTask={(t) => {
          setTaskDetailOpen(false);
          setEditingTask(t);
          setParentTaskForSub(null);
          setTaskFormOpen(true);
        }}
        onCreateSubtask={(parent) => {
          setTaskDetailOpen(false);
          setEditingTask(null);
          setParentTaskForSub(parent);
          setTaskFormOpen(true);
        }}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      <TaskFormModal
        open={taskFormOpen}
        onClose={() => setTaskFormOpen(false)}
        onSuccess={() => {
          setTaskFormOpen(false);
          loadTasksData();
        }}
        editingTask={editingTask}
        parentTask={parentTaskForSub}
        projects={projects}
        departments={departments}
        users={activeUsers}
        assignmentContext={assignmentContext}
      />
    </div>
  );
};

export default HybridDashboard;
