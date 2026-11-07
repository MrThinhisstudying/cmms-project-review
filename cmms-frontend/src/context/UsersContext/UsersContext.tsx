import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useAuthContext } from "../AuthContext/AuthContext";
import { getAllUsers } from "../../apis/users";
import { IUser, UsersContextValue } from "../../types/user.types";
import { getToken } from "../../utils/auth";
const UsersContext = createContext<UsersContextValue>({
  users: [],
  activeUsers: [],
  setUsers: () => {},
  loading: true,
  fetchUsers: () => {},
});

const UsersProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuthContext();

  const activeUsers = useMemo(() => {
    return users.filter(
      (u) => !u.status || u.status.trim().toLowerCase() === "active"
    );
  }, [users]);

  const fetchUsers = useCallback(async () => {
    if (user) {
      try {
        setLoading(true);
        const token = getToken(); // Lấy token
        const usersData = await getAllUsers(token);
        setUsers(usersData || []);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <UsersContext.Provider
      value={{
        users,
        activeUsers,
        setUsers,
        loading,
        fetchUsers,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
};

const useUsersContext = () => useContext(UsersContext);

export { UsersProvider, useUsersContext };
