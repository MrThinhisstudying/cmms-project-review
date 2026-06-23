import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Hook tái sử dụng WebSocket connection
 * Tự động connect/disconnect khi mount/unmount
 * 
 * @param userId - ID user hiện tại (để server tracking)
 * @param listeners - Object map event name → handler
 */
export function useSocket(
  userId: number | undefined,
  listeners: Record<string, (data: any) => void>
) {
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef(listeners);

  // Cập nhật listeners mà không trigger reconnect
  useEffect(() => {
    listenersRef.current = listeners;
  }, [listeners]);

  useEffect(() => {
    if (!userId) return;

    const baseUrl = process.env.REACT_APP_BASE_URL || 'http://localhost:3000/api';
    const socketUrl = baseUrl.replace('/api', '');

    const socket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: false,
      query: { userId: String(userId) },
    });

    socketRef.current = socket;

    // Delay connect để tránh race condition
    const timer = setTimeout(() => {
      socket.connect();
    }, 300);

    // Đăng ký tất cả listeners
    const currentListeners = listenersRef.current;
    Object.entries(currentListeners).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      clearTimeout(timer);
      Object.keys(currentListeners).forEach((event) => {
        socket.off(event);
      });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  return socketRef;
}
