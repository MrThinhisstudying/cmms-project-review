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

  const fetchMaintenances = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const data = await getAllMaintenances();
      setMaintenances(data || []);
    } catch {
      setMaintenances([]);
    } finally {
      if (!silent) setLoading(false);
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
