import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAuthContext } from "../AuthContext/AuthContext";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../../apis/departments";
import { IDepartment } from "../../types/user.types";
import { getToken } from "../../utils/auth";

interface DepartmentsContextValue {
  departments: IDepartment[];
  setDepartments: React.Dispatch<React.SetStateAction<IDepartment[]>>;
  loading: boolean;
  fetchDepartments: () => void;
  addDepartment: (payload: Partial<IDepartment>) => Promise<void>;
  editDepartment: (id: number, payload: Partial<IDepartment>) => Promise<void>;
  removeDepartment: (id: number) => Promise<void>;
}

const DepartmentsContext = createContext<DepartmentsContextValue>({
  departments: [],
  setDepartments: () => {},
  loading: true,
  fetchDepartments: () => {},
  addDepartment: async () => {},
  editDepartment: async () => {},
  removeDepartment: async () => {},
});

const DepartmentsProvider = ({ children }: { children: ReactNode }) => {
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuthContext();

  const fetchDepartments = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await getDepartments();
      setDepartments(data || []);
    } catch (error) {
      console.error("Fetch departments error:", error);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addDepartment = async (payload: Partial<IDepartment>) => {
    await createDepartment(getToken(), payload);
    fetchDepartments();
  };

  const editDepartment = async (id: number, payload: Partial<IDepartment>) => {
    await updateDepartment(id, getToken(), payload);
    fetchDepartments();
  };

  const removeDepartment = async (id: number) => {
    await deleteDepartment(id, getToken());
    fetchDepartments();
  };

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  return (
    <DepartmentsContext.Provider
      value={{
        departments,
        setDepartments,
        loading,
        fetchDepartments,
        addDepartment,
        editDepartment,
        removeDepartment,
      }}
    >
      {children}
    </DepartmentsContext.Provider>
  );
};

const useDepartmentsContext = () => useContext(DepartmentsContext);

export { DepartmentsProvider, useDepartmentsContext };
