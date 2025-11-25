import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAuthContext } from "../AuthContext/AuthContext";
import { getAllUsers } from "../../apis/users";
import { IUser, UsersContextValue } from "../../types/user.types";

const UsersContext = createContext<UsersContextValue>({
  users: [],
  setUsers: () => {},
  loading: true,
  fetchUsers: () => {},
});

const UsersProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuthContext();

  const fetchUsers = useCallback(async () => {
    if (user) {
      try {
        setLoading(true);
        const usersData = await getAllUsers();
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
