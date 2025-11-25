import { ICreateUser, IUpdatePassword, IUser } from "../types/user.types";

export interface GetAllUsersResponse {
  result: IUser[];
  pageable: {
    total: number;
    page: number;
    size: number;
  };
}

export const getAllUsers = async () => {
  try {
    const response = await fetch(`${process.env.REACT_APP_BASE_URL}/user`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const res = await response.json();
      return res?.data?.result as IUser[];
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
};

export const createUser = async (user: ICreateUser, token: string | null) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_BASE_URL}/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(user),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Thêm người dùng thất bại");
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const updateUser = async (
  id: number,
  user: ICreateUser | IUpdatePassword,
  token: string | null
) => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_BASE_URL}/user/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(user),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Cập nhật người dùng thất bại");
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const deleteUser = async (userId: number, token: string | null) => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_BASE_URL}/user/${userId}`,
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
      throw new Error(data.message || "Xoá người dùng thất bại");
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const forgotPassword = async (email: string) => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_BASE_URL}/auth/forgot-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Yêu cầu quên mật khẩu thất bại");
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const resetPassword = async (token: string, newPassword: string) => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_BASE_URL}/auth/reset-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, newPassword }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Đặt lại mật khẩu thất bại");
    }

    return data;
  } catch (error) {
    throw error;
  }
};
