import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  getAllRepairs,
  createRepair,
  updateRepair,
  reviewRepair,
  exportRepair,
  deleteRepair,
  submitInspection,
  submitAcceptance,
  requestLimitedUse,
  reviewLimitedUse,
} from "../../apis/repairs";
import { requestStockOut } from "../../apis/inventory";
import { getToken } from "../../utils/auth";
import {
  IRepair,
  RepairAcceptancePayload,
  RepairInspectionPayload,
  RepairUpsertPayload,
} from "../../types/repairs.types";
import { StockOutPayload } from "../../types/inventory.types";

type Role = "manager" | "technician" | "admin" | "viewer";

const RepairsContext = createContext<any>(null);

export const RepairsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [repairs, setRepairs] = useState<IRepair[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<Role>("viewer");
  // const token = getToken(); // Moving inside functions to avoid dependency issues

  const fetchData = useCallback(async (params?: {
    status_request?: string;
    status_inspection?: string;
    device_id?: number;
  }) => {
    setLoading(true);
    const currentToken = getToken();
    try {
      const data = await getAllRepairs(currentToken, params);
      setRepairs(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setRole = (role: Role) => setUserRole(role);

  const createRepairItem = async (payload: RepairUpsertPayload) => {
    const res = await createRepair(getToken(), payload);
    await fetchData();
    return res;
  };

  const updateRepairItem = async (id: number, payload: RepairUpsertPayload) => {
    const res = await updateRepair(id, getToken(), payload);
    await fetchData();
    return res;
  };

  const reviewRepairItem = async (
    id: number,
    payload: {
      action: "approve" | "reject";
      reason?: string;
      phase: "request" | "inspection" | "acceptance";
    }
  ) => {
    const res = await reviewRepair(id, getToken(), payload, payload.phase);
    await fetchData();
    return res;
  };

  const submitInspectionStep = async (
    id: number,
    payload: RepairInspectionPayload
  ) => {
    const res = await submitInspection(id, getToken(), payload);
    await fetchData();
    return res;
  };

  const submitAcceptanceStep = async (
    id: number,
    payload: RepairAcceptancePayload
  ) => {
    const res = await submitAcceptance(id, getToken(), payload);
    await fetchData();
    return res;
  };

  const requestStockOutForRepair = async (
    payload: StockOutPayload & { repair_id: number }
  ) => {
    const res = await requestStockOut(getToken(), payload);
    await fetchData();
    return res;
  };

  const exportRepairItem = async (
    id: number,
    type: "request" | "inspection" | "acceptance" = "request"
  ) => await exportRepair(id, getToken(), type);

  const deleteRepairItem = async (id: number) => {
    await deleteRepair(id, getToken());
    await fetchData();
  };

  const requestLimitedUseItem = async (id: number, reason: string) => {
    const res = await requestLimitedUse(id, getToken(), reason);
    await fetchData();
    return res;
  };

  const reviewLimitedUseItem = async (id: number, action: "approve" | "reject") => {
    const res = await reviewLimitedUse(id, getToken(), action);
    await fetchData();
    return res;
  };

  return (
    <RepairsContext.Provider
      value={{
        repairs,
        loading,
        userRole,
        setRole,
        createRepairItem,
        updateRepairItem,
        reviewRepairItem,
        submitInspectionStep,
        submitAcceptanceStep,
        requestStockOutForRepair,
        exportRepairItem,
        deleteRepairItem,
        requestLimitedUseItem,
        reviewLimitedUseItem,
        reload: fetchData,
      }}
    >
      {children}
    </RepairsContext.Provider>
  );
};

export const useRepairsContext = () => useContext(RepairsContext);
