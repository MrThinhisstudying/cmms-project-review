import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { getAllAuditLogs, rollbackTransaction } from "../../apis/audit";
import { useAuthContext } from "../AuthContext/AuthContext";
import { AuditContextValue, AuditLog } from "../../types/audit.types";
import { getToken } from "../../utils/auth";

const AuditContext = createContext<AuditContextValue>({
  logs: [],
  loading: false,
  fetchAll: async () => {},
  rollbackTx: async () => false,
});

const AuditProvider = ({ children }: { children: ReactNode }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthContext();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const data = await getAllAuditLogs(token);
      setLogs(data.items || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const rollbackTx = useCallback(
    async (txId: number, reason?: string) => {
      if (user?.role !== "admin") return false;
      setLoading(true);
      try {
        const token = getToken();
        await rollbackTransaction(txId, reason, token);
        return true;
      } catch {
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return (
    <AuditContext.Provider value={{ logs, loading, fetchAll, rollbackTx }}>
      {children}
    </AuditContext.Provider>
  );
};

const useAuditContext = () => useContext(AuditContext);

export { AuditProvider, useAuditContext };
