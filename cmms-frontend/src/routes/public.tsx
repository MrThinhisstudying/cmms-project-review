import { Navigate } from "react-router-dom";
import Login from "../pages/Login";
import ResetPasswordPage from "../pages/ResetPassword/ResetPassword";
import DevicePassportPage from "../pages/DevicePassport";

export const publicRoutes = [
  {
    path: "/dang_nhap/*",
    element: <Login />,
  },
  {
    path: "/dat_lai_mat_khau/*",
    element: <ResetPasswordPage />,
  },
  {
    path: "/device-passport/:id",
    element: <DevicePassportPage />,
  },
  {
    path: "/*",
    element: <Navigate to="/dang_nhap" />,
  },
];
