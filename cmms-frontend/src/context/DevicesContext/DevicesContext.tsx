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
import {
  DevicesContextValue,
  IDevice,
} from "../../types/devicesManagement.types";
import { getAllDevices, getDevicesReport } from "../../apis/devices";
import { getToken } from "../../utils/auth";
import { ReportData } from "../../types/index.types";
import { useRefreshOnFocus } from "../../hooks/useRefreshOnFocus";
import { useSocket } from "../../hooks/useSocket";

const DevicesContext = createContext<DevicesContextValue>({
  devices: [],
  setDevices: () => {},
  loading: true,
  fetchDevices: async () => {},
  report: null,
  fetchReport: async () => {},
});

const DevicesProvider = ({ children }: { children: ReactNode }) => {
  const [devices, setDevices] = useState<IDevice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const { user } = useAuthContext();

  const fetchDevices = useCallback(async (filters?: { status?: string; name?: string; groupId?: number; deviceTypeId?: number }) => {
    if (!user) return;

    try {
      const token = getToken();
      const devicesData = await getAllDevices(token, filters);
      if (devicesData) {
        setDevices(devicesData);
      }
    } catch (error) {
      console.error("Failed to load devices", error);
      // Keep previous devices if fetch fails, or ensure empty if none
      setDevices(prev => prev.length === 0 ? [] : prev);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchReport = useCallback(
    async (startDate?: string, endDate?: string) => {
      if (!user) return;
      try {
        const token = getToken();
        const res = await getDevicesReport(token, startDate, endDate);
        setReport(res.data);
      } catch (err) {
        console.error("Fetch report failed", err);
        setReport(null);
      }
    },
    [user]
  );

  useEffect(() => {
    fetchDevices();
    fetchReport();
  }, [fetchDevices, fetchReport]);

  // Phase A: Tự refetch khi user quay lại tab
  useRefreshOnFocus(
    useCallback(() => {
      fetchDevices();
      fetchReport();
    }, [fetchDevices, fetchReport])
  );

  // Phase B: WebSocket - nhận event device_updated từ backend
  const socketListeners = useMemo(() => ({
    device_updated: () => {
      fetchDevices();
      fetchReport();
    },
  }), [fetchDevices, fetchReport]);

  useSocket(user?.user_id, socketListeners);

  return (
    <DevicesContext.Provider
      value={{
        devices,
        setDevices,
        loading,
        fetchDevices,
        report,
        fetchReport,
      }}
    >
      {children}
    </DevicesContext.Provider>
  );
};

const useDevicesContext = () => useContext(DevicesContext);

export { DevicesProvider, useDevicesContext };
