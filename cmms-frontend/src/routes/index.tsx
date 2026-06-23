import { useMemo } from "react";
import { useRoutes } from "react-router-dom";
import { protectedRoutes } from "./protected";
import { publicRoutes } from "./public";
import { useAuthContext } from "../context/AuthContext/AuthContext";
import ForceChangePassword from "../pages/ForceChangePassword";

export const AppRoutes = () => {
  const { user } = useAuthContext();
  
  const routes = useMemo(() => {
     if (user?.mustChangePassword) {
       return [
         { path: "*", element: <ForceChangePassword /> }
       ];
     }
     return user ? protectedRoutes(user.role) : publicRoutes;
  }, [user]); // Only re-calculate if user changes

  const element = useRoutes(routes);

  return <>{element}</>;
};
