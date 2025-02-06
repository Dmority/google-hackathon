import { useEffect, useRef, useCallback, useState } from "react";
import { Socket } from "socket.io-client";
import { Message } from "../types";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  ReadStatusUpdate,
} from "../types/socket";
import {
  SOCKET_EVENTS,
  SOCKET_CONNECTION_CONFIG,
  ERROR_MESSAGES,
} from "../constants";
import {
  initializeSocketConnection,
  setupSocketEventHandlers,
  cleanupSocketConnection,
} from "../lib/utils/socket";

interface UseSocketProps {
  roomId: string;
  onNewMessage?: (message: Message) => void;
  onReadStatusUpdate?: (data: ReadStatusUpdate | ReadStatusUpdate[]) => void;
}

export function useSocket({
  roomId,
  onNewMessage,
  onReadStatusUpdate,
}: UseSocketProps) {
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initSocket = useCallback(async () => {
    if (!roomId || socketRef.current?.connected) return;

    try {
      // Socket.IOの初期化前にAPIエンドポイントを呼び出し
      await fetch("/api/socket/", { method: "GET" });

      const socket = await initializeSocketConnection(
        window.location.origin,
        SOCKET_CONNECTION_CONFIG
      );

      socketRef.current = socket;
      setIsConnected(true);
      setError(null);

      // イベントハンドラの設定
      setupSocketEventHandlers(socket, {
        onNewMessage,
        onReadStatusUpdate: (updates) => {
          if (onReadStatusUpdate) {
            onReadStatusUpdate(Array.isArray(updates) ? updates : [updates]);
          }
        },
      });

      // ルームに参加
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, roomId);
    } catch (error) {
      console.error("[WebSocket] Initialization error:", error);
      setError(ERROR_MESSAGES.SOCKET_CONNECTION_ERROR);
      setIsConnected(false);
    }
  }, [roomId, onNewMessage, onReadStatusUpdate]);

  useEffect(() => {
    initSocket();

    return () => {
      if (socketRef.current?.connected) {
        cleanupSocketConnection(socketRef.current, roomId);
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, [roomId]);

  const sendMessage = useCallback(
    (message: Message) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit(SOCKET_EVENTS.NEW_MESSAGE, message);
      }
    },
    [isConnected]
  );

  const updateReadStatus = useCallback(
    (messageIds: number[], userId: string) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit(SOCKET_EVENTS.MESSAGES_READ, {
          messageIds,
          roomId,
          userId,
        });
      }
    },
    [roomId, isConnected]
  );

  return {
    sendMessage,
    updateReadStatus,
    isConnected,
    error,
  };
}
