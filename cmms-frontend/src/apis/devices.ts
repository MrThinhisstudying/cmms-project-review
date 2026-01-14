import { IDevice } from "../types/devicesManagement.types";

type DevicePayload = Partial<IDevice>;

export const getAllDevices = async (
  token?: string | null,
  filters?: { status?: string; name?: string; groupId?: number }
): Promise<IDevice[]> => {
  try {
    const query = new URLSearchParams();
    if (filters?.status) query.append("status", filters.status);
    if (filters?.name) query.append("name", filters.name);
    if (filters?.groupId) query.append("groupId", filters.groupId.toString());

    const response = await fetch(`${process.env.REACT_APP_BASE_URL}/devices?${query.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Thêm Authorization header
        Authorization: token ? `Bearer ${token}` : "",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Lấy danh sách trang thiết bị thất bại"
      );
    }

    const res = await response.json();
    // Đảm bảo backend trả về đúng cấu trúc này (res.data.result)
    return res.data.result;
  } catch (error) {
    console.error("Get all devices failed:", error);
    throw error;
  }
};

export const uploadDevices = async (token: string | null, file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${process.env.REACT_APP_BASE_URL}/devices/upload_devices`,
    {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Tải thiết bị thất bại");
  }

  return data;
};

export const deleteDevice = async (
  device_id: number | undefined,
  token: string | null
) => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_BASE_URL}/devices/${device_id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Xoá trang thiết bị thất bại");
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const createDevice = async (
  token: string | null,
  payload: DevicePayload
) => {
  const response = await fetch(`${process.env.REACT_APP_BASE_URL}/devices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Thêm mới trang thiết bị thất bại");
  }

  return data;
};

export const updateDevice = async (
  device_id: number,
  token: string | null,
  payload: DevicePayload
) => {
  const response = await fetch(
    `${process.env.REACT_APP_BASE_URL}/devices/${device_id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Cập nhật trang thiết bị thất bại");
  }

  return data;
};

export const getDevicesReport = async (
  token: string | null,
  startDate?: string,
  endDate?: string
) => {
  const query = new URLSearchParams();
  if (startDate) query.append("startDate", startDate);
  if (endDate) query.append("endDate", endDate);

  const response = await fetch(
    `${process.env.REACT_APP_BASE_URL}/devices/report?${query.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Lấy báo cáo thiết bị thất bại");
  }

  return data;
};
export const getDeviceAnalytics = async (token: string | null) => {
  const response = await fetch(`${process.env.REACT_APP_BASE_URL}/devices/analytics/monthly`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch analytics');
  }
  return response.json();
};

export const exportDevicesPdf = async (token: string | null) => {
  const response = await fetch(`${process.env.REACT_APP_BASE_URL}/devices/export/pdf`, {
    method: 'GET',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to export PDF');
  }
  return response.blob();
};
