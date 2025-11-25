import React, { createContext, useContext, useState, useEffect } from "react";
import {
  getNotifications,
  markAllAsRead,
  markAsRead,
} from "../../apis/notifications";
import { useAuthContext } from "../AuthContext/AuthContext";

const NotificationContext = createContext<any>(null);

export const NotificationProvider = ({ children }: any) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const { user } = useAuthContext();

  const fetchNotifications = async () => {
    if (user?.id) {
      const data = await getNotifications(user?.id);
      setNotifications(data);
    }
  };

  const readOne = async (id: number) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const readAll = async () => {
    if (user?.id) {
      await markAllAsRead(user?.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        fetchNotifications,
        readOne,
        readAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => useContext(NotificationContext);
