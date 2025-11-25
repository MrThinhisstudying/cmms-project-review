import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuthContext } from "../AuthContext/AuthContext";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getItems,
  createItem,
  updateItem,
  deleteItem,
  getItem,
  restockItem,
  getItemTransactions,
  createTransaction as apiCreateTransaction,
  requestStockOut,
  listStockOuts,
  approveStockOut,
  cancelStockOut,
  getStockOut,
  apiGetStockOutsByItemId,
  apiGetInventoryReport,
} from "../../apis/inventory";
import {
  ICategory,
  IItem,
  IItemTransaction,
  IStockOut,
  CategoryPayload,
  ItemPayload,
  RestockPayload,
  TransactionPayload,
  StockOutPayload,
  IInventoryReport,
  IInventoryTab,
} from "../../types/inventory.types";
import { getToken } from "../../utils/auth";

interface InventoryState {
  categories: ICategory[];
  items: IItem[];
  stockOuts: IStockOut[];
  loading: boolean;
}

interface InventoryContextValue extends InventoryState {
  refreshAll: () => Promise<void>;
  refreshItem: (id: number) => Promise<void>;
  createCategory: (payload: CategoryPayload) => Promise<any>;
  updateCategory: (
    id: string | number,
    payload: { name?: string; description?: string }
  ) => Promise<any>;
  deleteCategory: (id: string | number) => Promise<any>;
  createItem: (payload: ItemPayload) => Promise<any>;
  updateItem: (
    id: number | string,
    payload: Partial<ItemPayload>
  ) => Promise<any>;
  deleteItem: (id: number | string) => Promise<any>;
  restockItem: (id: number, payload: RestockPayload) => Promise<any>;
  getItemTransactions: (itemId: number) => Promise<IItemTransaction[]>;
  createTransaction: (payload: TransactionPayload) => Promise<any>;
  requestStockOut: (payload: StockOutPayload) => Promise<any>;
  listStockOuts: () => Promise<IStockOut[]>;
  approveStockOut: (id: number) => Promise<any>;
  cancelStockOut: (id: number) => Promise<any>;
  getStockOut: (id: number) => Promise<IStockOut | null>;
  setItems: React.Dispatch<React.SetStateAction<IItem[]>>;
  getStockOutsByItemId: (itemId: number) => Promise<IStockOut[]>;
  fetchReport: (start?: string, end?: string) => Promise<void>;
  report: IInventoryReport | null;
  tabs: IInventoryTab[];
}

const initState: InventoryState = {
  categories: [],
  items: [],
  stockOuts: [],
  loading: true,
};

const InventoryContext = createContext<InventoryContextValue>({
  ...initState,
  refreshAll: async () => {},
  refreshItem: async () => {},
  createCategory: async () => {},
  updateCategory: async () => {},
  deleteCategory: async () => {},
  createItem: async () => {},
  updateItem: async () => {},
  deleteItem: async () => {},
  restockItem: async () => {},
  getItemTransactions: async () => [],
  createTransaction: async () => {},
  requestStockOut: async () => {},
  listStockOuts: async () => [],
  approveStockOut: async () => {},
  cancelStockOut: async () => {},
  getStockOut: async () => null,
  setItems: () => {},
  getStockOutsByItemId: async () => [],
  fetchReport: async () => {},
  report: null,
  tabs: [],
});

const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuthContext();
  const token = getToken();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [items, setItems] = useState<IItem[]>([]);
  const [stockOuts, setStockOuts] = useState<IStockOut[]>([]);
  const [report, setReport] = useState<IInventoryReport | null>(null);

  const fetchReport = useCallback(async (start?: string, end?: string) => {
    const token = getToken();
    setLoading(true);
    try {
      const data = await apiGetInventoryReport(token, start, end);
      setReport(data);
    } catch (err) {
      console.error("Fetch report failed:", err);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const data = await getItems();
      const filtered =
        user?.role === "admin" || user?.role === "manager"
          ? data
          : data.filter((it: any) => it.enabled !== false);
      setItems(filtered);
    } catch (error) {
      console.error(error);
    }
  }, [user]);

  const loadStockOuts = useCallback(async () => {
    if (user?.role !== "admin" && user?.role !== "manager") {
      setStockOuts([]);
      return;
    }
    try {
      const data = await listStockOuts(token);
      setStockOuts(data);
    } catch (error) {
      console.error(error);
    }
  }, [token, user]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    if (user?.role === "admin" || user?.role === "manager") {
      await Promise.all([loadCategories(), loadItems(), loadStockOuts()]);
    } else {
      await Promise.all([loadCategories(), loadItems()]);
    }
    setLoading(false);
  }, [user, loadCategories, loadItems, loadStockOuts]);

  const refreshItem = useCallback(
    async (id: number) => {
      try {
        const item = await getItem(id);
        if (!item) return;
        setItems((prev) => {
          const idx = prev.findIndex((p) => p.item_id === item.item_id);
          if (idx === -1) return [item, ...prev];
          const copy = [...prev];
          copy[idx] = item;
          return copy;
        });
      } catch (error) {
        console.error(error);
      }
    },
    [setItems]
  );

  useEffect(() => {
    if (user) {
      refreshAll();
    } else {
      setCategories([]);
      setItems([]);
      setStockOuts([]);
      setLoading(false);
    }
  }, [user, refreshAll]);

  const handleCreateCategory = useCallback(
    async (payload: CategoryPayload) => {
      const res = await createCategory(token, payload);
      await loadCategories();
      return res;
    },
    [token, loadCategories]
  );

  const getStockOutsByItemId = async (itemId: number) => {
    const token = getToken();
    return await apiGetStockOutsByItemId(token, itemId);
  };

  const handleUpdateCategory = useCallback(
    async (
      id: string | number,
      payload: { name?: string; description?: string }
    ) => {
      const res = await updateCategory(token, id, payload);
      await loadCategories();
      return res;
    },
    [token, loadCategories]
  );

  const handleDeleteCategory = useCallback(
    async (id: string | number) => {
      const res = await deleteCategory(token, id);
      await loadCategories();
      return res;
    },
    [token, loadCategories]
  );

  const handleCreateItem = useCallback(
    async (payload: ItemPayload) => {
      const res = await createItem(token, payload);
      await loadItems();
      return res;
    },
    [token, loadItems]
  );

  const handleUpdateItem = useCallback(
    async (id: number | string, payload: Partial<ItemPayload>) => {
      const res = await updateItem(token, id, payload);
      await loadItems();
      return res;
    },
    [token, loadItems]
  );

  const handleDeleteItem = useCallback(
    async (id: number | string) => {
      const res = await deleteItem(token, id);
      await loadItems();
      return res;
    },
    [token, loadItems]
  );

  const handleRestockItem = useCallback(
    async (id: number, payload: RestockPayload) => {
      const res = await restockItem(id, token, payload);
      await refreshItem(id);
      return res;
    },
    [token, refreshItem]
  );

  const handleCreateTransaction = useCallback(
    async (payload: TransactionPayload) => {
      const res = await apiCreateTransaction(token, payload);
      if (payload.item_id) {
        await refreshItem(payload.item_id);
      } else {
        await refreshAll();
      }
      return res;
    },
    [token, refreshItem, refreshAll]
  );

  const handleGetItemTransactions = useCallback(async (itemId: number) => {
    try {
      const txs = await getItemTransactions(itemId);
      return txs;
    } catch (error) {
      console.error(error);
      return [];
    }
  }, []);

  const handleRequestStockOut = useCallback(
    async (payload: StockOutPayload) => {
      const res = await requestStockOut(token, payload);
      await loadStockOuts();
      return res;
    },
    [token, loadStockOuts]
  );

  const handleListStockOuts = useCallback(async () => {
    await loadStockOuts();
    return stockOuts;
  }, [loadStockOuts, stockOuts]);

  const handleApproveStockOut = useCallback(
    async (id: number) => {
      const res = await approveStockOut(id, token);
      await refreshAll();
      return res;
    },
    [token, refreshAll]
  );

  const handleCancelStockOut = useCallback(
    async (id: number) => {
      const res = await cancelStockOut(id, token);
      await refreshAll();
      return res;
    },
    [token, refreshAll]
  );

  const handleGetStockOut = useCallback(
    async (id: number) => {
      try {
        const so = await getStockOut(id, token);
        return so;
      } catch (error) {
        console.error(error);
        return null;
      }
    },
    [token]
  );

  const tabs = useMemo<IInventoryTab[]>(() => {
    if (!items || !categories) return [];

    const grouped: Record<number | string, IItem[]> = {};
    items.forEach((item) => {
      const catId =
        typeof item.category === "object"
          ? item.category?.id
          : item.category ?? "unknown";
      if (!grouped[catId]) grouped[catId] = [];
      grouped[catId].push(item);
    });

    const catTabs: IInventoryTab[] = categories.map((c, index) => ({
      id: index + 1,
      value: index + 1,
      label: c.name || c.description || `Danh mục ${index + 1}`,
      total: grouped[c.id]?.length ?? 0,
      data: grouped[c.id] ?? [],
    }));

    const allTab: IInventoryTab = {
      id: 0,
      value: 0,
      label: "Tất cả",
      total: items.length,
      data: items,
    };

    return [allTab, ...catTabs];
  }, [items, categories]);

  return (
    <InventoryContext.Provider
      value={{
        categories,
        items,
        stockOuts,
        loading,
        refreshAll,
        refreshItem,
        createCategory: handleCreateCategory,
        updateCategory: handleUpdateCategory,
        deleteCategory: handleDeleteCategory,
        createItem: handleCreateItem,
        updateItem: handleUpdateItem,
        deleteItem: handleDeleteItem,
        restockItem: handleRestockItem,
        getItemTransactions: handleGetItemTransactions,
        createTransaction: handleCreateTransaction,
        requestStockOut: handleRequestStockOut,
        listStockOuts: handleListStockOuts,
        approveStockOut: handleApproveStockOut,
        cancelStockOut: handleCancelStockOut,
        getStockOut: handleGetStockOut,
        setItems,
        getStockOutsByItemId,
        report,
        fetchReport,
        tabs,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

const useInventoryContext = () => {
  const context = useContext(InventoryContext);
  return context;
};

export { InventoryProvider, useInventoryContext };
