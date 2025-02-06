import { Message } from "./index";

export interface ReadStatusUpdate {
  messageId: number;
  roomId: string;
  userId: string;
}

export interface ServerToClientEvents {
  "message-received": (message: Message) => void;
  "read-status-updated": (updates: ReadStatusUpdate[]) => void;
}

export interface ClientToServerEvents {
  "join-room": (roomId: string) => void;
  "leave-room": (roomId: string) => void;
  "new-message": (message: Message) => void;
  "messages-read": (data: {
    messageIds: number[];
    roomId: string;
    userId: string;
  }) => void;
}
