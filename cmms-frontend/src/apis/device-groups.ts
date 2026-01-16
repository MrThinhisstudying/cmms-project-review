import { getToken } from "../utils/auth";

export interface IDeviceGroup {
  id: number;
  name: string;
  description: string;
  devices?: any[]; // Using any[] for now or IDevice[] if imported.
}

export const getDeviceGroups = async () => {
  const token = getToken();
  try {
      const response = await fetch(`${process.env.REACT_APP_BASE_URL}/device-groups`, {
          method: "GET",
          headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
          },
      });
      if (response.ok) {
          const res = await response.json();
          // Backend returns array directly or {data: []}? 
          // Backend Controller findAll returns array.
          // Wait, Controller: `return this.deviceGroupsService.findAll();` -> Returns `DeviceGroup[]`.
          // Frontend usually expects {data: ...} or just array depending on backend global interceptor.
          // In `users.controller.ts`, `getAll` returns `{ message, data }`.
          // In `device-groups.controller.ts`, `findAll` returns array directly (I wrote it that way).
          // I should probably wrap it in object or handle array.
          // Let's assume array for now based on my backend code.
          return (Array.isArray(res) ? res : res.data || []) as IDeviceGroup[];
      }
      return [];
  } catch (error) {
      console.error(error);
      return [];
  }
};
