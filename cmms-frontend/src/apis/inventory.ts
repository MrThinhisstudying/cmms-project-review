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
} from "../types/inventory.types";

const BASE = process.env.REACT_APP_BASE_URL;

export const getCategories = async (): Promise<ICategory[]> => {
  try {
    const response = await fetch(`${BASE}/inventory-category`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Lấy danh sách category thất bại");
    }

    const res = await response.json();
    return res.data ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const createCategory = async (
  token: string | null,
  payload: CategoryPayload
) => {
  const response = await fetch(`${BASE}/inventory-category`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Tạo category thất bại");
  }

  return data;
};

export const updateCategory = async (
  token: string | null,
  id: string | number,
  payload: { name?: string; description?: string }
) => {
  const response = await fetch(`${BASE}/inventory-category/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Cập nhật category thất bại");
  }

  return data;
};

export const deleteCategory = async (
  token: string | null,
  id: string | number
) => {
  const response = await fetch(`${BASE}/inventory-category/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Xoá category thất bại");
  }

  return data;
};

export const getItems = async (): Promise<IItem[]> => {
  try {
    const response = await fetch(`${BASE}/inventory-item`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Lấy danh sách vật tư thất bại");
    }

    const res = await response.json();
    return res.data ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const createItem = async (
  token: string | null,
  payload: ItemPayload
) => {
  const response = await fetch(`${BASE}/inventory-item`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Tạo vật tư thất bại");
  }

  return data;
};

export const updateItem = async (
  token: string | null,
  id: number | string,
  payload: Partial<ItemPayload>
) => {
  const response = await fetch(`${BASE}/inventory-item/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Cập nhật vật tư thất bại");
  }

  return data;
};

export const deleteItem = async (token: string | null, id: number | string) => {
  const response = await fetch(`${BASE}/inventory-item/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Xoá vật tư thất bại");
  }

  return data;
};

export const getItem = async (id: number): Promise<IItem | null> => {
  try {
    const response = await fetch(`${BASE}/inventory-item/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Lấy chi tiết vật tư thất bại");
    }

    const res = await response.json();
    return res.data ?? null;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const restockItem = async (
  id: number,
  token: string | null,
  payload: RestockPayload
) => {
  const response = await fetch(`${BASE}/inventory-item/${id}/restock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Nhập tồn thất bại");
  }

  return data;
};

export const getItemTransactions = async (
  itemId: number
): Promise<IItemTransaction[]> => {
  try {
    const response = await fetch(
      `${BASE}/inventory-transaction/item/${itemId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Lấy lịch sử giao dịch thất bại");
    }

    const res = await response.json();
    return res.data ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const createTransaction = async (
  token: string | null,
  payload: TransactionPayload
) => {
  const response = await fetch(`${BASE}/inventory-transaction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Tạo giao dịch thất bại");
  }

  return data;
};

export const requestStockOut = async (
  token: string | null,
  payload: StockOutPayload
) => {
  const response = await fetch(`${BASE}/stock-out`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Yêu cầu xuất kho thất bại");
  }

  return data;
};

export const listStockOuts = async (
  token: string | null
): Promise<IStockOut[]> => {
  try {
    const response = await fetch(`${BASE}/stock-out`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Lấy danh sách xuất kho thất bại");
    }

    const res = await response.json();
    return res.data ?? [];
  } catch (error) {
    return [];
  }
};

export const approveStockOut = async (id: number, token: string | null) => {
  const response = await fetch(`${BASE}/stock-out/${id}/approve`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Approve xuất kho thất bại");
  }

  return data;
};

export const cancelStockOut = async (id: number, token: string | null) => {
  const response = await fetch(`${BASE}/stock-out/${id}/cancel`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Huỷ xuất kho thất bại");
  }

  return data;
};

export const getStockOut = async (
  id: number,
  token: string | null
): Promise<IStockOut | null> => {
  try {
    const response = await fetch(`${BASE}/stock-out/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Lấy chi tiết xuất kho thất bại");
    }

    const res = await response.json();
    return res.data ?? null;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const uploadInventory = async (token: string | null, file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${process.env.REACT_APP_BASE_URL}/inventory-item/import`,
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
    throw new Error(data.message || "Tải vật tư thất bại");
  }

  return data;
};

export const apiGetStockOutsByItemId = async (
  token: string | null,
  itemId: number
) => {
  const res = await fetch(
    `${process.env.REACT_APP_BASE_URL}/stock-out/item/${itemId}`,
    {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Không thể lấy danh sách xuất kho");
  }

  return data.data;
};

export const apiGetInventoryReport = async (
  token: string | null,
  start?: string,
  end?: string
) => {
  const params = new URLSearchParams();
  if (start) params.append("start", start);
  if (end) params.append("end", end);

  const res = await fetch(
    `${
      process.env.REACT_APP_BASE_URL
    }/inventory-item/report?${params.toString()}`,
    {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Không thể lấy báo cáo vật tư");
  }

  return data.data;
};
