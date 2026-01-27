import { useMemo } from "react";
import { useRoutes } from "react-router-dom";
import { protectedRoutes } from "./protected";
import { publicRoutes } from "./public";
import { useAuthContext } from "../context/AuthContext/AuthContext";

export const AppRoutes = () => {
  const { user } = useAuthContext();
  
  const routes = useMemo(() => {
     return user ? protectedRoutes(user.role) : publicRoutes;
  }, [user]); // Only re-calculate if user changes

  const element = useRoutes(routes);

  return <>{element}</>;
};
