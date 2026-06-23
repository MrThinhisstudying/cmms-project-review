import { useEffect, useRef } from 'react';

/**
 * Hook tự động gọi callback khi user quay lại tab (visibilitychange)
 * Có debounce để tránh gọi liên tục khi switch tab nhanh
 * 
 * @param callback - Hàm sẽ được gọi khi tab trở lại visible
 * @param options - Tùy chọn debounce (ms), mặc định 2000ms
 */
export function useRefreshOnFocus(
  callback: () => void,
  options?: { debounceMs?: number; enabled?: boolean }
) {
  const { debounceMs = 2000, enabled = true } = options || {};
  const lastRefresh = useRef<number>(0);
  const callbackRef = useRef(callback);

  // Luôn cập nhật callback mới nhất mà không gây re-render
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastRefresh.current >= debounceMs) {
          lastRefresh.current = now;
          callbackRef.current();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [debounceMs, enabled]);
}
