import { useState } from "react";
import { message } from "antd";
import { importMaintenancePriority } from "../apis/maintenance";
import { getToken } from "../utils/auth";

export const useMaintenance = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importMaintenanceSchedule = async (file: File) => {
    setLoading(true);
    setError(null);
    const token = getToken();
    
    if (!token) {
        message.error("Vui lòng đăng nhập lại!");
        return;
    }

    try {
      const result = await importMaintenancePriority(file, token);
      message.success("Import lịch bảo dưỡng thành công!");
      return result;
    } catch (err: any) {
      const errorMsg =
        err.message || "Lỗi khi import lịch bảo dưỡng";
      setError(errorMsg);
      message.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    importMaintenanceSchedule,
    loading,
    error,
  };
};
