import { ICreateUser, IUpdatePassword, IUser } from "../types/user.types";

export interface GetAllUsersResponse {
  result: IUser[];
  pageable: {
    total: number;
    page: number;
    size: number;
  };
}

export const getAllUsers = async (token: string | null, params?: { groupId?: number }) => {
  try {
    const query = new URLSearchParams();
    if (params?.groupId) query.append("groupId", params.groupId.toString());

    const response = await fetch(`${process.env.REACT_APP_BASE_URL}/user?${query.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Thêm dòng này để xác thực
        Authorization: token ? `Bearer ${token}` : "",
      },
    });

    if (response.ok) {
      const res = await response.json();
      // Đảm bảo trả về mảng rỗng nếu không có dữ liệu
      return (res?.data?.result || []) as IUser[];
    } else {
      return [];
    }
  } catch (error) {
    return [];
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

export const getProfile = async (token: string | null) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_BASE_URL}/user/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
    });
    if (response.ok) {
        const res = await response.json();
        return res.data as IUser;
    }
    return null;
  } catch (error) {
    throw error;
  }
};

export const updateProfile = async (data: Partial<IUser>, token: string | null) => {
    try {
        const response = await fetch(`${process.env.REACT_APP_BASE_URL}/user/profile`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify(data),
        });
        const res = await response.json();
        if (!response.ok) throw new Error(res.message);
        return res.data as IUser;
    } catch (error) {
        throw error;
    }
};

export const uploadSignature = async (userId: number, file: File, token: string | null) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${process.env.REACT_APP_BASE_URL}/user/${userId}/signature`,
      {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: formData,
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Upload failed");
    return data.data; // { signature_url: string }
  } catch (error) {
    throw error;
  }
};
