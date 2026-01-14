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
  DevicesContextValue,
  IDevice,
} from "../../types/devicesManagement.types";
import { getAllDevices, getDevicesReport } from "../../apis/devices";
import { getToken } from "../../utils/auth";
import { ReportData } from "../../types/index.types";

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

  const fetchDevices = useCallback(async (filters?: { status?: string; name?: string; groupId?: number }) => {
    if (!user) return;

    try {
      const token = getToken();
      const devicesData = await getAllDevices(token, filters);
      if (devicesData) {
        setDevices(devicesData);
      }
    } catch (error) {
      console.error("Failed to load devices", error);
      // Keep previous devices if fetch fails (e.g. 304 or network error)
      if (devices.length === 0) setDevices([]);
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
