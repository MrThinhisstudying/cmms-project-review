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

export interface AuditFilters {
  action?: string;
  entity?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

interface ExtendedAuditContextValue extends AuditContextValue {
  total: number;
  currentPage: number;
  pageSize: number;
  fetchWithFilters: (filters?: AuditFilters) => Promise<void>;
}

const AuditContext = createContext<ExtendedAuditContextValue>({
  logs: [],
  loading: false,
  total: 0,
  currentPage: 1,
  pageSize: 50,
  fetchAll: async () => {},
  fetchWithFilters: async () => {},
  rollbackTx: async () => false,
});

const AuditProvider = ({ children }: { children: ReactNode }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { user } = useAuthContext();

  const fetchWithFilters = useCallback(async (filters?: AuditFilters) => {
    setLoading(true);
    try {
      const token = getToken();
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const data = await getAllAuditLogs(token, {
        action: filters?.action,
        entity: filters?.entity,
        date_from: filters?.date_from,
        date_to: filters?.date_to,
        page,
        limit,
      });
      setLogs(data.items || []);
      setTotal(data.total || 0);
      setCurrentPage(page);
      setPageSize(limit);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    await fetchWithFilters({ page: 1, limit: 50 });
  }, [fetchWithFilters]);

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
    <AuditContext.Provider value={{ logs, loading, total, currentPage, pageSize, fetchAll, fetchWithFilters, rollbackTx }}>
      {children}
    </AuditContext.Provider>
  );
};

const useAuditContext = () => useContext(AuditContext);

export { AuditProvider, useAuditContext };
