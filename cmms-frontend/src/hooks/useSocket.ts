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
      transports: ['websocket', 'polling'],
      autoConnect: true,
      query: { userId: String(userId) },
    });

    socketRef.current = socket;

    // Đăng ký dynamic listeners để luôn gọi phiên bản handler mới nhất
    const events = Object.keys(listenersRef.current);
    events.forEach((event) => {
      socket.on(event, (data: any) => {
        listenersRef.current[event]?.(data);
      });
    });

    return () => {
      events.forEach((event) => {
        socket.off(event);
      });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  return socketRef;
}
