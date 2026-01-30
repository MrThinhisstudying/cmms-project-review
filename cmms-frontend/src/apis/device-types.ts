import { fetchClient } from "../utils/fetchClient";

export interface IDeviceType {
    id: number;
    name: string;
    code: string;
    description?: string;
}

export const getAllDeviceTypes = async (token: string | null): Promise<IDeviceType[]> => {
    const res = await fetchClient(`/device-types?_t=${new Date().getTime()}`, {
        method: "GET",
        token: token || undefined,
    });
    return res.json();
};

export const createDeviceType = async (token: string | null, data: { name: string; code: string; description?: string }) => {
    const res = await fetchClient(`/device-types`, {
        method: "POST",
        token: token || undefined,
        body: JSON.stringify(data),
    });
    return res.json();
};

export const updateDeviceType = async (token: string | null, id: number, data: Partial<{ name: string; code: string; description?: string }>) => {
    const res = await fetchClient(`/device-types/${id}`, {
        method: "PUT",
        token: token || undefined,
        body: JSON.stringify(data),
    });
    return res.json();
};

export const deleteDeviceType = async (token: string | null, id: number) => {
    const res = await fetchClient(`/device-types/${id}`, {
        method: "DELETE",
        token: token || undefined,
    });
    return res.json();
};
