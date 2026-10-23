import { getToken } from "../utils/auth";
import { IDepartment } from "../types/user.types";

export interface IDeviceGroup {
  id: number;
  name: string;
  description?: string;
  dept_id?: number;
  department?: IDepartment;
  leader_id?: number;
  leader?: {
    user_id: number;
    name: string;
    email?: string;
    phone_number?: string;
    position?: string;
  };
  devices?: any[];
  user_device_groups?: any[];
}

const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:3000/api';

export const getDeviceGroups = async (): Promise<IDeviceGroup[]> => {
  const token = getToken();
  try {
      const response = await fetch(`${BASE_URL}/device-groups`, {
          method: "GET",
          headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
          },
      });
      if (response.ok) {
          const res = await response.json();
          return (Array.isArray(res) ? res : res.data || []) as IDeviceGroup[];
      }
      return [];
  } catch (error) {
      console.error(error);
      return [];
  }
};

export const getDeviceGroup = async (id: number): Promise<IDeviceGroup | null> => {
  const token = getToken();
  try {
      const response = await fetch(`${BASE_URL}/device-groups/${id}`, {
          method: "GET",
          headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
          },
      });
      if (response.ok) {
          const res = await response.json();
          return (res.data || res) as IDeviceGroup;
      }
      return null;
  } catch (error) {
      console.error(error);
      return null;
  }
};

export const createDeviceGroup = async (payload: {
  name: string;
  description?: string;
  dept_id?: number | null;
  leader_id?: number | null;
}): Promise<IDeviceGroup> => {
  const token = getToken();
  const response = await fetch(`${BASE_URL}/device-groups`, {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(payload),
  });
  if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Tạo nhóm thiết bị thất bại');
  }
  const res = await response.json();
  return (res.data || res) as IDeviceGroup;
};

export const updateDeviceGroup = async (
  id: number,
  payload: {
    name?: string;
    description?: string;
    dept_id?: number | null;
    leader_id?: number | null;
  }
): Promise<IDeviceGroup> => {
  const token = getToken();
  const response = await fetch(`${BASE_URL}/device-groups/${id}`, {
      method: "PATCH",
      headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(payload),
  });
  if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Cập nhật nhóm thiết bị thất bại');
  }
  const res = await response.json();
  return (res.data || res) as IDeviceGroup;
};

export const deleteDeviceGroup = async (id: number): Promise<void> => {
  const token = getToken();
  const response = await fetch(`${BASE_URL}/device-groups/${id}`, {
      method: "DELETE",
      headers: {
          Authorization: token ? `Bearer ${token}` : "",
      },
  });
  if (!response.ok) {
      throw new Error('Xóa nhóm thất bại');
  }
};

export const setGroupDevices = async (groupId: number, deviceIds: number[]): Promise<IDeviceGroup> => {
  const token = getToken();
  const response = await fetch(`${BASE_URL}/device-groups/${groupId}/devices/batch`, {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ deviceIds }),
  });
  if (!response.ok) {
      throw new Error('Cập nhật danh sách thiết bị thất bại');
  }
  const res = await response.json();
  return (res.data || res) as IDeviceGroup;
};

export const setGroupMembers = async (
  groupId: number,
  members: { userId: number; is_group_lead?: boolean }[]
): Promise<IDeviceGroup> => {
  const token = getToken();
  const response = await fetch(`${BASE_URL}/device-groups/${groupId}/members`, {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ members }),
  });
  if (!response.ok) {
      throw new Error('Cập nhật danh sách thành viên thất bại');
  }
  const res = await response.json();
  return (res.data || res) as IDeviceGroup;
};

export const assignDeviceToGroup = async (
  deviceId: number,
  groupId: number | null
): Promise<any> => {
  const token = getToken();
  const response = await fetch(`${BASE_URL}/device-groups/assign-device`, {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ deviceId, groupId }),
  });
  if (!response.ok) {
      throw new Error('Gán thiết bị vào nhóm thất bại');
  }
  return response.json();
};
