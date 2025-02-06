import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import { Server as IOServer } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import { Message } from "../../src/types";

interface ServerToClientEvents {
  "message-received": (message: Message) => void;
  "read-status-updated": (
    updates: Array<{
      messageId: number;
      roomId: string;
      userId: string;
    }>
  ) => void;
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

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  userId: string;
}

interface SocketServer extends HTTPServer {
  io?: IOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

// レート制限の実装
const rateLimits = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT = 10; // 10リクエスト
const TIME_WINDOW = 1000; // 1秒

const isRateLimited = (userId: string): boolean => {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);

  if (!userLimit) {
    rateLimits.set(userId, { count: 1, timestamp: now });
    return false;
  }

  if (now - userLimit.timestamp > TIME_WINDOW) {
    rateLimits.set(userId, { count: 1, timestamp: now });
    return false;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return true;
  }

  userLimit.count++;
  return false;
};

const handler = async (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (res.socket.server.io) {
    console.log("Socket is already running");
    res.end();
    return;
  }

  console.log("Setting up socket");
  const io = new IOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(res.socket.server, {
    path: "/api/ws",
    addTrailingSlash: false,
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
  });

  // 接続中のクライアント数を追跡
  let connectedClients = 0;

  io.on("connection", (socket) => {
    connectedClients++;
    console.log(`Client connected (total: ${connectedClients})`);

    // ルーム参加時の処理
    socket.on("join-room", (roomId: string) => {
      if (typeof roomId !== "string") return;
      socket.join(roomId);
      console.log(`Client joined room: ${roomId}`);
    });

    // ルーム退出時の処理
    socket.on("leave-room", (roomId: string) => {
      if (typeof roomId !== "string") return;
      socket.leave(roomId);
      console.log(`Client left room: ${roomId}`);
    });

    // 新規メッセージ送信時の処理
    socket.on("new-message", (message: Message) => {
      if (!message || !message.roomId) return;
      io.to(message.roomId).emit("message-received", message);
    });

    // メッセージ既読時の処理
    socket.on(
      "messages-read",
      (data: { messageIds: number[]; roomId: string; userId: string }) => {
        if (
          !data ||
          !Array.isArray(data.messageIds) ||
          !data.roomId ||
          !data.userId
        )
          return;

        // レート制限のチェック
        if (isRateLimited(data.userId)) {
          console.log(`Rate limit exceeded for user: ${data.userId}`);
          return;
        }

        // バッチ処理で既読状態を更新
        const updates = data.messageIds.map((messageId) => ({
          messageId,
          roomId: data.roomId,
          userId: data.userId,
        }));

        // 一括で既読状態を更新
        io.to(data.roomId).emit("read-status-updated", updates);
        console.log(
          `Batch read status update: ${data.messageIds.length} messages by ${data.userId}`
        );
      }
    );

    // 切断時の処理
    socket.on("disconnect", () => {
      connectedClients--;
      console.log(`Client disconnected (remaining: ${connectedClients})`);
    });
  });

  res.socket.server.io = io;
  res.end();
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default handler;
