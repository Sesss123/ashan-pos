import { useEffect, useRef, useCallback } from 'react';
import { socketClient } from './socketClient';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Custom hook to listen to real-time events and automatically invalidate TanStack queries.
 * Cleans up event listeners on unmount to prevent memory leaks.
 */
export function useSocketEvent(eventName: string, queryKeysToInvalidate?: string[]) {
  const queryClient = useQueryClient();
  // Store queryKeys in a ref so the effect doesn't re-run on every render
  const keysRef = useRef(queryKeysToInvalidate);
  keysRef.current = queryKeysToInvalidate;

  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;

    const handler = (data: unknown) => {
      console.log(`[Real-Time ⚡] ${eventName}:`, data);
      
      // Auto-invalidate React Query caches
      if (keysRef.current && keysRef.current.length > 0) {
        keysRef.current.forEach(key => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }
    };

    socket.on(eventName, handler);

    // Cleanup: remove listener on unmount to prevent memory leaks
    return () => {
      socket.off(eventName, handler);
    };
  }, [eventName, queryClient]); // Only re-run if event name changes
}

/**
 * Custom hook to subscribe to a real-time event and call a callback with the data.
 * Useful when you need to react to data directly (e.g. show toasts, update local state).
 */
export function useSocketData<T = unknown>(
  eventName: string,
  onData: (data: T) => void
) {
  const callbackRef = useRef(onData);
  callbackRef.current = onData;

  const stableCallback = useCallback((data: T) => {
    callbackRef.current(data);
  }, []);

  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;

    socket.on(eventName, stableCallback as (...args: unknown[]) => void);

    return () => {
      socket.off(eventName, stableCallback as (...args: unknown[]) => void);
    };
  }, [eventName, stableCallback]);
}
