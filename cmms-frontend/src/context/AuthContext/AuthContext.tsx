import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import Toast from "../../components/Toast";
import { jwtDecode } from "jwt-decode";
import { getToken, removeToken } from "../../utils/auth";
import { IDepartment, IUserDepartment } from "../../types/user.types";
import { getProfile } from "../../apis/users";

interface User {
  user_id: number;
  name: string;
  email: string;
  role: string;
  department?: IDepartment;
  user_departments?: IUserDepartment[];
  avatar: string;
  signature_url?: string;
  position?: string;
  permissions: string[];
  mustChangePassword?: boolean;
}

interface AuthContextValue {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  updateUser: (token: string) => void;
  refreshProfile: () => Promise<void>;
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
  signature_url?: string;
  permissions?: string[];
  exp: number;
  mustChangePassword?: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  setUser: () => {},
  updateUser: () => {},
  refreshProfile: async () => {},
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

  const clearUserLoginState = useCallback(() => {
    setUser(null);
    setLoading(false);
  }, []);

  const logoutUser = useCallback(() => {
    removeToken();
    clearUserLoginState();
  }, [clearUserLoginState]);

  const updateUser = useCallback(async (token: string) => {
    setLoading(true);
    if (token) {
      try {
        const decodedToken = jwtDecode<DecodedToken>(token);

        const initialUser: User = {
          user_id: decodedToken.id,
          name: decodedToken.sub,
          email: decodedToken.email,
          role: decodedToken.role === "Administrator" ? "ADMIN" : decodedToken.role?.toUpperCase(),
          department: decodedToken.department,
          avatar: decodedToken.avatar || "",
          signature_url: decodedToken.signature_url,
          permissions: decodedToken.permissions || [],
          mustChangePassword: decodedToken.mustChangePassword,
        };
        
        setUser(initialUser);

        // Fetch latest profile to get updated signature/info
        try {
            const freshProfile = await getProfile(token);
            if (freshProfile) {
                setUser(prev => ({
                    ...prev!,
                    ...freshProfile,
                    mustChangePassword: freshProfile.must_change_password,
                    role: (freshProfile.role || prev?.role || "VIEWER").toUpperCase()
                }));
            }
        } catch (e) {
            console.error("Failed to refresh profile", e);
        }

      } catch (error) {
        removeToken();
        clearUserLoginState();
      }
    }
    setLoading(false);
  }, [clearUserLoginState]);

  const refreshProfile = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const freshProfile = await getProfile(token);
      if (freshProfile) {
        setUser(prev => ({
          ...prev!,
          ...freshProfile,
          mustChangePassword: freshProfile.must_change_password,
          role: (freshProfile.role || prev?.role || 'VIEWER').toUpperCase()
        }));
      }
    } catch (e) {
      console.error('Failed to refresh profile', e);
    }
  }, []);

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
  }, [updateUser, logoutUser]);

  // Auto-refresh profile mỗi 30s để đồng bộ thay đổi từ HR
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      const token = getToken();
      if (!token) return;
      try {
        const freshProfile = await getProfile(token);
        if (freshProfile) {
          // So sánh phát hiện thay đổi quan trọng
          const importantFields = ['name', 'phone_number', 'gender', 'ethnicity', 'place_of_birth', 'date_of_birth', 'citizen_identification_card', 'permanent_address', 'temporary_address', 'hometown'] as const;
          const hasChange = importantFields.some(field => {
            const oldVal = (user as any)?.[field] || '';
            const newVal = (freshProfile as any)?.[field] || '';
            return String(oldVal) !== String(newVal);
          });

          if (hasChange) {
            setUser(prev => ({
              ...prev!,
              ...freshProfile,
              mustChangePassword: freshProfile.must_change_password,
              role: (freshProfile.role || prev?.role || 'VIEWER').toUpperCase()
            }));
            // Thông báo đã hiển thị qua hệ thống Notification (bell icon)
          }
        }
      } catch { /* silent */ }
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id]);

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
          setUser,
          updateUser,
          refreshProfile,
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
