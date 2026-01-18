import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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

  const fetchNotifications = useCallback(async () => {
    if (user?.user_id) {
      const data = await getNotifications(user?.user_id);
      setNotifications(data);
    }
  }, [user?.user_id]);

  const readOne = useCallback(async (id: number) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }, []);

  const readAll = useCallback(async () => {
    if (user?.user_id) {
      await markAllAsRead(user?.user_id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  }, [user?.user_id]);

  useEffect(() => {
    if (user) {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

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
