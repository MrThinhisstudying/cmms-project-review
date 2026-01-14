import { DeviceGroup } from "../types/devicesManagement.types";

export const getAllDeviceGroups = async (token?: string | null): Promise<DeviceGroup[]> => {
    try {
        const response = await fetch(`${process.env.REACT_APP_BASE_URL}/device-groups`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: token ? `Bearer ${token}` : "",
            },
        });

        if (!response.ok) {
            throw new Error("Failed to fetch device groups");
        }

        const data = await response.json();
        return data.data || []; // Adjust based on actual API response structure { data: [...] }
    } catch (error) {
        console.error("Get all device groups failed:", error);
        return [];
    }
};
