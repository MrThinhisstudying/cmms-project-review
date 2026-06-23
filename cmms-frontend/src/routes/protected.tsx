import { Navigate } from "react-router-dom";
import Dashboard from "../pages/Dashboard/Dashboard";
import MainLayout from "../layout/MainLayout/MainLayout";
import Users from "../pages/Users/Users";
import DevicesManagement from "../pages/DevicesManagement/DevicesManagement";
import MaintenanceManagement from "../pages/MaintenanceManagement/MaintenanceManagement";
import DevicesReport from "../pages/Reports/Reports";
import AuditPage from "../pages/Audit/Audit";
import MaintenanceTasksPage from "../pages/MaintenanceTasks/MaintenanceTasks";
import { InventoryManagementPage } from "../pages/Inventory/Inventory";
import StockOutsPage from "../pages/StockOuts/StockOuts";
import RepairsManagement from "../pages/RepairsManagement/RepairsManagement";
import MaintenanceProcedurePage from "../pages/MaintenanceProcedure";
import MaintenanceHistoryPage from "../pages/MaintenanceHistory";
import Profile from "../pages/Profile/Profile";
import HRDashboard from "../pages/HRDashboard";
import TrainingPrograms from "../pages/TrainingPrograms";
import ProfileRequests from "../pages/ProfileRequests";
import LeaveManagement from "../pages/LeaveManagement";
import Employees from "../pages/Employees";
import LaborContracts from "../pages/LaborContracts";
import RewardDisciplines from "../pages/RewardDisciplines";

export const protectedRoutes = (userRole: string) => {
  const isFullAccess = ['admin', 'ADMIN', 'HR_MANAGER', 'DIRECTOR', 'UNIT_HEAD', 'TEAM_LEAD'].includes(userRole);
  const isHrAccessible = ['admin', 'ADMIN', 'HR_MANAGER', 'DIRECTOR', 'UNIT_HEAD'].includes(userRole);
  const isAdmin = ['admin', 'ADMIN'].includes(userRole);
  const isHrAdmin = ['admin', 'ADMIN', 'HR_MANAGER'].includes(userRole);

  if (isFullAccess) {
    const children: any[] = [
      { path: "/trang_chu/*", element: <Dashboard /> },
      { path: "/profile", element: <Profile /> },
      // Thiết bị & Vật tư
      { path: "/quan_ly_ttb_pt/*", element: <DevicesManagement /> },
      { path: "/quan_ly_vat_tu/*", element: <InventoryManagementPage /> },
      { path: "/lay_vat_tu/*", element: <StockOutsPage /> },
      // Sửa chữa & Bảo dưỡng
      { path: "/quan_ly_sua_chua/*", element: <RepairsManagement /> },
      { path: "/quan_ly_bao_duong/*", element: <MaintenanceManagement /> },
      { path: "/quy_trinh_bao_duong/*", element: <MaintenanceTasksPage /> },
      { path: "/maintenance-procedures/*", element: <MaintenanceProcedurePage /> },
      { path: "/maintenance-history/*", element: <MaintenanceHistoryPage /> },
      // Báo cáo
      { path: "/bao_cao_thong_ke/*", element: <DevicesReport /> },
    ];

    if (isHrAccessible) {
      children.push(
        { path: "/quan_ly_nhan_vien/*", element: <Employees /> },
        { path: "/hr-dashboard/*", element: <HRDashboard /> },
        { path: "/training-programs/*", element: <TrainingPrograms /> },
        { path: "/hop-dong-lao-dong/*", element: <LaborContracts /> },
        { path: "/khen-thuong-ky-luat/*", element: <RewardDisciplines /> },
        { path: "/quan_ly_phep/*", element: <LeaveManagement /> },
      );
    }

    // Chỉ ADMIN / HR_MANAGER mới có phê duyệt hồ sơ
    if (isHrAdmin) {
      children.push(
        { path: "/phe_duyet_ho_so/*", element: <ProfileRequests /> },
      );
    }

    // Chỉ ADMIN mới có quản lý tài khoản IT và lịch sử hệ thống
    if (isAdmin) {
      children.push(
        { path: "/quan_ly_nguoi_dung/*", element: <Users /> },
        { path: "/lich_su/*", element: <AuditPage /> },
      );
    }

    children.push({ path: "*", element: <Navigate to="trang_chu" /> });

    return [
      { path: "/", element: <Navigate to="/trang_chu" /> },
      { path: "/", element: <MainLayout />, children },
    ];
  } else {
    // OPERATOR, TECHNICIAN - quyền cơ bản
    return [
      {
        path: "/",
        element: <Navigate to="/trang_chu" />,
      },
      {
        path: "/",
        element: <MainLayout />,
        children: [
          { path: "/trang_chu/*", element: <Dashboard /> },
          { path: "/profile", element: <Profile /> },
          { path: "/quan_ly_ttb_pt/*", element: <DevicesManagement /> },
          { path: "/quan_ly_sua_chua/*", element: <RepairsManagement /> },
          { path: "/quan_ly_bao_duong/*", element: <MaintenanceManagement /> },
          { path: "/quy_trinh_bao_duong/*", element: <MaintenanceTasksPage /> },
          { path: "/quan_ly_vat_tu/*", element: <InventoryManagementPage /> },
          { path: "/maintenance-procedures/*", element: <MaintenanceProcedurePage /> },
          { path: "/maintenance-history/*", element: <MaintenanceHistoryPage /> },
          { path: "*", element: <Navigate to="trang_chu" /> },
        ],
      },
    ];
  }
};
