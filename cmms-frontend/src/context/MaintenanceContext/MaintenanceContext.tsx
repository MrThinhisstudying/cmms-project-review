import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { getAllMaintenances } from "../../apis/maintenance";
import { useAuthContext } from "../AuthContext/AuthContext";
import {
  IMaintenance,
  MaintenanceContextValue,
} from "../../types/maintenance.types";

const MaintenanceContext = createContext<MaintenanceContextValue>({
  maintenances: [],
  setMaintenances: () => {},
  loading: true,
  fetchMaintenances: async () => {},
});

const MaintenanceProvider = ({ children }: { children: ReactNode }) => {
  const [maintenances, setMaintenances] = useState<IMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthContext();

  const fetchMaintenances = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getAllMaintenances();
      setMaintenances(data || []);
    } catch {
      setMaintenances([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMaintenances();
  }, [fetchMaintenances]);

  return (
    <MaintenanceContext.Provider
      value={{ maintenances, setMaintenances, loading, fetchMaintenances }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
};

const useMaintenanceContext = () => useContext(MaintenanceContext);

export { MaintenanceProvider, useMaintenanceContext };
