'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { ServerMessage, ClientMessage } from '@/lib/types';

interface UseSocketOptions {
  onMessage?: (message: ServerMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const connectRef = useRef<((params: { action: string; name: string; room?: string }) => void) | null>(null);

  const connect = useCallback(
    (params: { action: string; name: string; room?: string }) => {
      // Clean up existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const query = new URLSearchParams({
        action: params.action,
        name: params.name,
        ...(params.room && { room: params.room }),
      });
      const url = `${protocol}//${window.location.host}/ws?${query}`;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        options.onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          options.onMessage?.(message);
        } catch (err) {
          console.error('[WS] Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected');
        setIsConnected(false);
        options.onClose?.();

        // Auto-reconnect with exponential backoff (max 10s)
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
        reconnectAttemptsRef.current++;

        if (reconnectAttemptsRef.current < 10) {
          reconnectTimerRef.current = setTimeout(() => {
            console.log(`[WS] Reconnecting (attempt ${reconnectAttemptsRef.current})...`);
            connectRef.current?.(params);
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        options.onError?.(error);
      };
    },
    [options]
  );

  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    reconnectAttemptsRef.current = 999; // prevent reconnect
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connect, send, disconnect, isConnected };
}
