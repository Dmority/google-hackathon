import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Message } from "../app/actions";

interface ReadStatusUpdate {
  messageId: number;
  roomId: string;
  userId: string;
}

interface UseSocketProps {
  roomId: string;
  onNewMessage?: (message: Message) => void;
  onReadStatusUpdate?: (data: ReadStatusUpdate | ReadStatusUpdate[]) => void;
}

interface ServerToClientEvents {
  "message-received": (message: Message) => void;
  "read-status-updated": (updates: ReadStatusUpdate[]) => void;
}

interface ClientToServerEvents {
  "join-room": (roomId: string) => void;
  "leave-room": (roomId: string) => void;
  "new-message": (message: Message) => void;
  "messages-read": (data: {
    messageIds: number[];
    roomId: string;
    userId: string;
  }) => void;
}

// グローバルなWebSocket状態管理
let globalSocket: Socket<ServerToClientEvents, ClientToServerEvents> | null =
  null;
let isInitializing = false;
let initializedRooms = new Set<string>();

export function useSocket({
  roomId,
  onNewMessage,
  onReadStatusUpdate,
}: UseSocketProps) {
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);

  const initSocket = useCallback(async () => {
    if (!roomId) return;

    try {
      if (!globalSocket && !isInitializing) {
        isInitializing = true;
        try {
          // 現在のホストとポートを取得
          // Socket.IOの初期化前にAPIエンドポイントを呼び出し
          await fetch("/api/socket");

          globalSocket = io(window.location.origin, {
            path: "/api/socket",
            transports: ["websocket"],
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 30000,
            reconnection: true,
            reconnectionAttempts: 10,
            forceNew: true,
            withCredentials: true,
          });

          // エラーハンドリングの強化
          globalSocket.on("connect_error", (error: Error) => {
            console.error("[WebSocket] Connection error:", error.message);
            isInitializing = false;
            globalSocket?.connect();
          });

          globalSocket.on("connect", () => {
            console.log("[WebSocket] Connected");
            isInitializing = false;
          });

          globalSocket.on("disconnect", (reason: string) => {
            console.log("[WebSocket] Disconnected:", reason);
            if (
              reason === "io server disconnect" ||
              reason === "transport close"
            ) {
              globalSocket?.connect();
            }
          });

          // 定期的な接続確認
          setInterval(() => {
            if (!globalSocket?.connected) {
              console.log("[WebSocket] Reconnecting...");
              globalSocket?.connect();
            }
          }, 3000);
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.debug("[WebSocket] Initialization error:", error);
          }
          isInitializing = false;
          throw error;
        }
      }

      if (globalSocket) {
        socketRef.current = globalSocket;

        // 既存のリスナーを削除
        globalSocket.off("message-received");
        globalSocket.off("read-status-updated");

        // ルームに参加（再接続時のために毎回実行）
        globalSocket.emit("join-room", roomId);
        initializedRooms.add(roomId);

        // メッセージ受信のリスナー
        if (onNewMessage) {
          globalSocket.on("message-received", (message) => {
            console.log("[WebSocket] Message received:", message);
            onNewMessage(message);
          });
        }

        // 既読状態更新のリスナー
        if (onReadStatusUpdate) {
          globalSocket.on("read-status-updated", (updates) => {
            console.log("[WebSocket] Read status updated:", updates);
            onReadStatusUpdate(updates);
          });
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[WebSocket] Initialization error:", error);
      }
      isInitializing = false;
    }
  }, [roomId, onNewMessage, onReadStatusUpdate]);

  useEffect(() => {
    initSocket();

    return () => {
      if (socketRef.current && initializedRooms.has(roomId)) {
        socketRef.current.emit("leave-room", roomId);
        socketRef.current.off("message-received");
        socketRef.current.off("read-status-updated");
        initializedRooms.delete(roomId);
      }
    };
  }, [roomId, initSocket]);

  const sendMessage = useCallback((message: Message) => {
    if (socketRef.current) {
      socketRef.current.emit("new-message", message);
    }
  }, []);

  const updateReadStatus = useCallback(
    (messageIds: number[], userId: string) => {
      if (socketRef.current) {
        socketRef.current.emit("messages-read", { messageIds, roomId, userId });
      }
    },
    [roomId]
  );

  return {
    sendMessage,
    updateReadStatus,
  };
}
