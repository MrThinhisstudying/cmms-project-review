import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Toast from "../../components/Toast";
import { jwtDecode } from "jwt-decode";
import { getToken, removeToken } from "../../utils/auth";
import { IDepartment } from "../../types/user.types";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  department?: IDepartment;
  avatar: string;
  permissions: string[];
}

interface AuthContextValue {
  user: User | null;
  updateUser: (token: string) => void;
  logoutUser: () => void;
  loading: boolean;
}

interface DecodedToken {
  id: number;
  sub: string;
  email: string;
  role: string;
  department?: IDepartment;
  avatar?: string;
  permissions?: string[];
  exp: number;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  updateUser: () => {},
  logoutUser: () => {},
  loading: false,
});

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [openToast, setOpenToast] = useState(false);

  const toast = useRef<{ type: "error" | "success"; content: string }>({
    type: "success",
    content: "",
  });

  const updateUser = (token: string) => {
    setLoading(true);
    if (token) {
      try {
        const decodedToken = jwtDecode<DecodedToken>(token);

        setUser({
          id: decodedToken.id,
          name: decodedToken.sub,
          email: decodedToken.email,
          role:
            decodedToken.role === "Administrator"
              ? "admin"
              : decodedToken.role?.toLowerCase(),
          department: decodedToken.department,
          avatar: decodedToken.avatar || "",
          permissions: decodedToken.permissions || [],
        });
      } catch (error) {
        removeToken();
        clearUserLoginState();
      }
    }
    setLoading(false);
  };

  const logoutUser = () => {
    removeToken();
    clearUserLoginState();
  };

  const clearUserLoginState = () => {
    setUser(null);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    const token = getToken();

    if (token) {
      try {
        const decodedToken = jwtDecode<DecodedToken>(token);
        const currentTime = Math.floor(Date.now() / 1000);

        if (decodedToken.exp > currentTime) {
          updateUser(token);
        } else {
          logoutUser();
        }
      } catch (error) {
        logoutUser();
      }
    } else {
      logoutUser();
    }
  }, []);

  return (
    <>
      <Toast
        content={toast.current?.content}
        variant={toast.current?.type}
        open={openToast}
        onClose={() => setOpenToast(false)}
      />
      <AuthContext.Provider
        value={{
          user,
          updateUser,
          logoutUser,
          loading,
        }}
      >
        {children}
      </AuthContext.Provider>
    </>
  );
};

const useAuthContext = () => useContext(AuthContext);

export { AuthProvider, useAuthContext };
