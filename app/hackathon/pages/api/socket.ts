import type { NextApiRequest, NextApiResponse } from "next";
import cors from "cors";
import type { Socket as NetSocket } from "net";
import type { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import type { Message } from "../../src/app/actions";

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

interface ReadStatusUpdate {
  messageId: number;
  roomId: string;
  userId: string;
}

type ReseponseWebSocket = NextApiResponse & {
  socket: NetSocket & {
    server: HttpServer & {
      io?: SocketServer<ClientToServerEvents, ServerToClientEvents>;
    };
  };
};

const corsMiddleware = cors();

export default async function SocketHandler(
  req: NextApiRequest,
  res: ReseponseWebSocket
) {
  if (req.method !== "GET") {
    return res.status(405).end();
  }

  try {
    if (res.socket.server.io) {
      console.log("Socket.IO server already running");
      return res.send("already-set-up");
    }

    console.log("Setting up Socket.IO server...");
    const io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(
      res.socket.server,
      {
        path: "/api/socket",
        addTrailingSlash: false,
        transports: ["websocket"],
        cors: {
          origin: true,
          methods: ["GET", "POST"],
          credentials: true,
        },
        allowEIO3: true,
        pingTimeout: 30000,
        pingInterval: 15000,
        connectTimeout: 30000,
      }
    );

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

    await new Promise<void>((resolve) => {
      corsMiddleware(req, res, () => {
        res.socket.server.io = io;
        console.log("Socket.IO server initialized");
        resolve();
      });
    });

    res.end();
  } catch (error) {
    console.error("Socket initialization error:", error);
    res.status(500).end();
  }
}
