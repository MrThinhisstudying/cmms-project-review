import { IDepartment } from "../types/user.types";

type DepartmentPayload = Partial<IDepartment>;

export const getDepartments = async (): Promise<IDepartment[]> => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_BASE_URL}/department`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Lấy danh sách phòng ban thất bại");
    }

    const res = await response.json();
    return res.data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const createDepartment = async (
  token: string | null,
  payload: DepartmentPayload
) => {
  const response = await fetch(`${process.env.REACT_APP_BASE_URL}/department`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Tạo phòng ban thất bại");
  }

  return data;
};

export const updateDepartment = async (
  dept_id: number,
  token: string | null,
  payload: DepartmentPayload
) => {
  const response = await fetch(
    `${process.env.REACT_APP_BASE_URL}/department/${dept_id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Cập nhật phòng ban thất bại");
  }

  return data;
};

export const deleteDepartment = async (
  dept_id: number,
  token: string | null
) => {
  const response = await fetch(
    `${process.env.REACT_APP_BASE_URL}/department/${dept_id}`,
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
    throw new Error(data.message || "Xoá phòng ban thất bại");
  }

  return data;
};
