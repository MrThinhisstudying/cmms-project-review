export const getNotifications = async (userId: number) => {
  const res = await fetch(`${process.env.REACT_APP_BASE_URL}/notifications/user/${userId}`);
  if (!res.ok) throw new Error("Lấy thông báo thất bại");
  return res.json();
};

export const markAsRead = async (id: number) => {
  await fetch(`${process.env.REACT_APP_BASE_URL}/notifications/${id}/read`, { method: "PATCH" });
};

export const markAllAsRead = async (userId: number) => {
  await fetch(`${process.env.REACT_APP_BASE_URL}/notifications/user/${userId}/read-all`, { method: "PATCH" });
};
