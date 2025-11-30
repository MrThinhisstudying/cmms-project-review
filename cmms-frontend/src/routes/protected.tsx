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

export const protectedRoutes = (userRole: string) => {
  if (userRole === "admin") {
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
          { path: "/quan_ly_nguoi_dung/*", element: <Users /> },
          { path: "/quan_ly_ttb_pt/*", element: <DevicesManagement /> },
          { path: "/quan_ly_sua_chua/*", element: <RepairsManagement /> },
          { path: "/quan_ly_bao_duong/*", element: <MaintenanceManagement /> },
          { path: "/quy_trinh_bao_duong/*", element: <MaintenanceTasksPage /> },
          {
            path: "/maintenance-procedures/*",
            element: <MaintenanceProcedurePage />,
          },
          {
            path: "/maintenance-history/*",
            element: <MaintenanceHistoryPage />,
          },
          { path: "/quan_ly_vat_tu/*", element: <InventoryManagementPage /> },
          { path: "/lay_vat_tu/*", element: <StockOutsPage /> },
          { path: "/bao_cao_thong_ke/*", element: <DevicesReport /> },
          { path: "/lich_su/*", element: <AuditPage /> },
          { path: "*", element: <Navigate to="trang_chu" /> },
        ],
      },
    ];
  } else if (userRole === "manager") {
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
          { path: "/quan_ly_ttb_pt/*", element: <DevicesManagement /> },
          { path: "/quan_ly_sua_chua/*", element: <RepairsManagement /> },
          { path: "/quan_ly_bao_duong/*", element: <MaintenanceManagement /> },
          { path: "/quy_trinh_bao_duong/*", element: <MaintenanceTasksPage /> },
          {
            path: "/maintenance-procedures/*",
            element: <MaintenanceProcedurePage />,
          },
          {
            path: "/maintenance-history/*",
            element: <MaintenanceHistoryPage />,
          },
          { path: "/quan_ly_vat_tu/*", element: <InventoryManagementPage /> },
          { path: "/lay_vat_tu/*", element: <StockOutsPage /> },
          { path: "/bao_cao_thong_ke/*", element: <DevicesReport /> },
          { path: "*", element: <Navigate to="trang_chu" /> },
        ],
      },
    ];
  } else {
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
          { path: "/quan_ly_ttb_pt/*", element: <DevicesManagement /> },
          { path: "/quan_ly_sua_chua/*", element: <RepairsManagement /> },
          { path: "/quan_ly_bao_duong/*", element: <MaintenanceManagement /> },
          { path: "/quy_trinh_bao_duong/*", element: <MaintenanceTasksPage /> },
          { path: "/quan_ly_vat_tu/*", element: <InventoryManagementPage /> },
          { path: "*", element: <Navigate to="trang_chu" /> },
        ],
      },
    ];
  }
};
