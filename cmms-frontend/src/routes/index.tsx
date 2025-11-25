import { useRoutes } from "react-router-dom";
import { protectedRoutes } from "./protected";
import { publicRoutes } from "./public";
import { useAuthContext } from "../context/AuthContext/AuthContext";

export const AppRoutes = () => {
  const { user } = useAuthContext();
  const routes = user ? protectedRoutes(user.role) : publicRoutes;

  const element = useRoutes([...routes]);

  return <>{element}</>;
};
