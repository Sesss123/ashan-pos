import { useEffect } from 'react';
import { socketClient } from './socketClient';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Custom hook to listen to real-time events and automatically invalidate TanStack queries
 */
export function useSocketEvent(eventName: string, queryKeysToInvalidate?: string[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;

    const handler = (data: any) => {
      console.log(`[Event Received] ${eventName}:`, data);
      
      // Auto-invalidate React Query caches if keys are provided
      if (queryKeysToInvalidate) {
        queryKeysToInvalidate.forEach(key => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }
    };

    socket.on(eventName, handler);

    return () => {
      socket.off(eventName, handler);
    };
  }, [eventName, queryKeysToInvalidate, queryClient]);
}
