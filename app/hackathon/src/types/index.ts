export interface Message {
  id: number;
  text: string;
  sender: string;
  timestamp: string;
  roomId: string;
  readBy: string[];
  mentions: string[];
}

export interface User {
  id: string;
  name: string;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  members: User[];
  agents: Agent[];
}

export interface Agent {
  id: string;
  name: string;
  context: string;
  instructions: string;
  roomId: string;
  createdBy: string;
  createdAt: string;
}
