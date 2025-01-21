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

export interface Agent {
  id: string;
  name: string;
  context: string;
  instructions: string;
  roomId: string;
  createdBy: string;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  members: User[];
  agents: Agent[];
}

import {
  saveRoom,
  getRoom,
  getRoomByInviteCode,
  updateRoomMembers,
  saveMessage,
  getMessages,
  updateMessageReadStatus as updateRedisMessageReadStatus,
  saveSession,
  getSession,
  deleteSession,
  saveAgent,
  getAgents,
} from "../lib/redis";

export async function createRoom(room: Room): Promise<void> {
  await saveRoom(room);
}

export async function joinRoom(roomId: string, user: User): Promise<string> {
  const room = await getRoom(roomId);
  if (room) {
    if (!room.members.some((member) => member.id === user.id)) {
      room.members.push(user);
      await updateRoomMembers(roomId, room.members);
    }
    // セッションを作成して返す
    return await saveSession(roomId, user);
  }
  throw new Error("Room not found");
}

export async function sendMessage(message: Message): Promise<void> {
  await saveMessage(message);

  // メンションされたエージェントの応答を処理
  const room = await getRoom(message.roomId);
  if (room && message.mentions.length > 0) {
    const mentionedAgents = room.agents.filter((agent) =>
      message.mentions.includes(agent.id)
    );

    for (const agent of mentionedAgents) {
      const response: Message = {
        id: Date.now() + Math.random(), // ユニークなIDを生成
        text: "了解しました",
        sender: `Agent:${agent.name}`,
        timestamp: new Date().toISOString(),
        roomId: message.roomId,
        readBy: [agent.id],
        mentions: [],
      };
      await saveMessage(response);
    }
  }
}

export async function fetchMessages(roomId: string): Promise<Message[]> {
  return getMessages(roomId);
}

export async function findRoomByInviteCode(
  inviteCode: string
): Promise<Room | null> {
  return getRoomByInviteCode(inviteCode);
}

export async function updateRoom(room: Room): Promise<void> {
  await saveRoom(room);
}

export async function deleteRoom(roomId: string): Promise<void> {
  // TODO: Redisからルームを削除する機能を実装
}

export async function updateMessageReadStatus(
  messageId: number,
  roomId: string,
  userId: string
): Promise<void> {
  // 指定されたルームのメッセージを取得
  const roomMessages = await getMessages(roomId);

  // 指定されたメッセージIDとルームIDに一致するメッセージを探す
  const targetMessage = roomMessages.find(
    (msg) => msg.id === messageId && msg.roomId === roomId
  );

  // メッセージが見つかった場合のみ既読状態を更新
  if (targetMessage) {
    await updateRedisMessageReadStatus(messageId, targetMessage.roomId, userId);
  }
}

// Session関連の関数
export async function getUserSession(sessionId: string): Promise<User | null> {
  return getSession(sessionId);
}

export async function createUserSession(
  roomId: string,
  user: User
): Promise<string> {
  return saveSession(roomId, user);
}

export async function removeUserSession(sessionId: string): Promise<void> {
  await deleteSession(sessionId);
}

// Agent関連の関数
export async function createAgent(agent: Agent): Promise<void> {
  await saveAgent(agent);
  const room = await getRoom(agent.roomId);
  if (room) {
    // エージェントをルームに追加
    room.agents = [...(room.agents || []), agent];
    // エージェントをメンバーとして追加
    const agentUser: User = {
      id: agent.id,
      name: `Agent:${agent.name}`,
    };
    room.members = [...room.members, agentUser];
    await saveRoom(room);
  }
}

export async function getAgentsByRoom(roomId: string): Promise<Agent[]> {
  return getAgents(roomId);
}
