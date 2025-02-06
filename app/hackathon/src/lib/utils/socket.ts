import { io, Socket, ManagerOptions, SocketOptions } from "socket.io-client";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  ReadStatusUpdate,
} from "../../types/socket";
import { Message } from "@/types";

export const initializeSocketConnection = (
  url: string,
  options: Partial<ManagerOptions & SocketOptions>
) => {
  return new Promise<Socket<ServerToClientEvents, ClientToServerEvents>>(
    (resolve, reject) => {
      try {
        const socket = io(url, options);

        socket.on("connect", () => {
          console.log("[WebSocket] Connected");
          resolve(socket);
        });

        socket.on("connect_error", (error: Error) => {
          console.error("[WebSocket] Connection error:", error.message);
          reject(error);
        });

        socket.on("disconnect", (reason: string) => {
          console.log("[WebSocket] Disconnected:", reason);
          if (
            reason === "io server disconnect" ||
            reason === "transport close"
          ) {
            socket.connect();
          }
        });
      } catch (error) {
        reject(error);
      }
    }
  );
};

export const setupSocketEventHandlers = (
  socket: Socket<ServerToClientEvents, ClientToServerEvents>,
  handlers: {
    onNewMessage?: (message: Message) => void;
    onReadStatusUpdate?: (updates: ReadStatusUpdate[]) => void;
  }
) => {
  if (handlers.onNewMessage) {
    socket.on("message-received", (message) => {
      console.log("[WebSocket] Message received:", message);
      handlers.onNewMessage!(message);
    });
  }

  if (handlers.onReadStatusUpdate) {
    socket.on("read-status-updated", (updates) => {
      console.log("[WebSocket] Read status updated:", updates);
      handlers.onReadStatusUpdate!(updates);
    });
  }
};

export const cleanupSocketConnection = (
  socket: Socket<ServerToClientEvents, ClientToServerEvents>,
  roomId: string
) => {
  socket.emit("leave-room", roomId);
  socket.off("message-received");
  socket.off("read-status-updated");
};
