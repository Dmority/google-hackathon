import type { NextApiRequest, NextApiResponse } from "next";
import type { Socket as NetSocket } from "net";
import type { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import type { Message } from "../../src/types";
import {
  ReadStatusUpdate,
  ServerToClientEvents,
  ClientToServerEvents,
} from "@/types/socket";

type ReseponseWebSocket = NextApiResponse & {
  socket: NetSocket & {
    server: HttpServer & {
      io?: SocketServer<ClientToServerEvents, ServerToClientEvents>;
    };
  };
};

export default async function SocketHandler(
  req: NextApiRequest,
  res: ReseponseWebSocket
) {
  if (req.method !== "GET") {
    console.log("Method not allowed:", req.method);
    return res.status(405).end();
  }

  if (!res.socket?.server) {
    console.log("No socket server");
    return res.status(500).end();
  }

  try {
    if (res.socket.server.io) {
      console.log("Socket.IO server already running");
      res.end();
      return;
    }

    console.log("Setting up Socket.IO server...");
    const io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(
      res.socket.server,
      {
        path: "/api/socket/",
        transports: ["websocket"],
        allowEIO3: true,
        pingTimeout: 60000,
        pingInterval: 25000,
        connectTimeout: 60000,
        cors: {
          origin: "*",
          methods: ["GET", "POST"],
        },
        allowRequest: (req, callback) => {
          callback(null, true);
        },
      }
    );

    // エラーイベントのハンドリング
    io.engine.on("connection_error", (err) => {
      console.error("Connection error:", err);
    });

    // 接続数の監視
    let connectionCount = 0;
    io.engine.on("connection", () => {
      connectionCount++;
      console.log(`Active connections: ${connectionCount}`);
    });

    io.engine.on("disconnect", () => {
      connectionCount--;
      console.log(`Active connections: ${connectionCount}`);
    });

    // ルームごとのユーザー管理
    const rooms = new Map<string, Set<string>>();

    io.on("connection", (socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on("join-room", (roomId: string) => {
        socket.join(roomId);
        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Set());
        }
        rooms.get(roomId)?.add(socket.id);
        console.log(`Client ${socket.id} joined room ${roomId}`);
      });

      socket.on("leave-room", (roomId: string) => {
        socket.leave(roomId);
        rooms.get(roomId)?.delete(socket.id);
        console.log(`Client ${socket.id} left room ${roomId}`);
      });

      socket.on("new-message", (message: Message) => {
        io.to(message.roomId).emit("message-received", message);
        console.log(`New message in room ${message.roomId}:`, message);
      });

      socket.on("messages-read", (data) => {
        const updates: ReadStatusUpdate[] = data.messageIds.map(
          (messageId) => ({
            messageId,
            roomId: data.roomId,
            userId: data.userId,
          })
        );
        io.to(data.roomId).emit("read-status-updated", updates);
        console.log(`Messages read in room ${data.roomId}:`, updates);
      });

      socket.on("disconnect", () => {
        rooms.forEach((users, roomId) => {
          if (users.has(socket.id)) {
            users.delete(socket.id);
            console.log(`Client ${socket.id} disconnected from room ${roomId}`);
          }
        });
      });
    });

    res.socket.server.io = io;
    console.log("Socket.IO server initialized");

    res.end();
  } catch (error) {
    console.error("Socket initialization error:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack);
    }
    res.status(500).end();
  }
}
