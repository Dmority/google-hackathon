"use server";

import { createClient } from "redis";
import { Message, Room, User, Agent } from "../types/index";

const client = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

client.on("error", (err) => console.error("Redis Client Error", err));

export async function connect() {
  if (!client.isOpen) {
    await client.connect();
  }
}

// Room関連の操作
export async function getAllRooms(): Promise<Room[]> {
  await connect();
  const keys = await client.keys("room:*");
  const roomKeys = keys.filter((key) => !key.includes("invitecode:"));
  const rooms = await Promise.all(
    roomKeys.map(async (key) => {
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    })
  );
  return rooms.filter((room): room is Room => room !== null);
}

export async function saveRoom(room: Room) {
  await connect();
  await client.set(`room:${room.id}`, JSON.stringify(room));
  await client.set(`room:invitecode:${room.inviteCode}`, room.id);
}

export async function getRoom(roomId: string): Promise<Room | null> {
  await connect();
  const data = await client.get(`room:${roomId}`);
  return data ? JSON.parse(data) : null;
}

export async function getRoomByInviteCode(
  inviteCode: string
): Promise<Room | null> {
  await connect();
  const roomId = await client.get(`room:invitecode:${inviteCode}`);
  if (!roomId) return null;
  return getRoom(roomId);
}

export async function updateRoomMembers(roomId: string, members: User[]) {
  await connect();
  const room = await getRoom(roomId);
  if (room) {
    room.members = members;
    await saveRoom(room);
  }
}

// Message関連の操作
export async function saveMessage(message: Message) {
  await connect();
  const messageKey = `messages:data:${message.roomId}:${message.id}`;
  const messageListKey = `messages:list:${message.roomId}`;

  await client.set(messageKey, JSON.stringify(message));
  await client.rPush(messageListKey, messageKey);
}

export async function getMessages(roomId: string): Promise<Message[]> {
  await connect();
  const messageListKey = `messages:list:${roomId}`;
  const messageKeys = await client.lRange(messageListKey, 0, -1);
  const messages = await Promise.all(
    messageKeys.map(async (key) => {
      const message = await client.get(key);
      return message ? JSON.parse(message) : null;
    })
  );
  return messages.filter((msg): msg is Message => msg !== null);
}

export async function updateMessageReadStatus(
  messageId: number,
  roomId: string,
  userId: string
) {
  await connect();
  const messageKey = `messages:data:${roomId}:${messageId}`;
  const message = await client.get(messageKey);

  if (message) {
    const parsedMessage = JSON.parse(message);
    if (!parsedMessage.readBy.includes(userId)) {
      parsedMessage.readBy.push(userId);
      await client.set(messageKey, JSON.stringify(parsedMessage));
    }
  }
}

// Session関連の操作
export async function saveSession(roomId: string, user: User): Promise<string> {
  await connect();
  const sessionId = `${roomId}:${user.id}`;
  await client.set(`session:${sessionId}`, JSON.stringify(user));
  return sessionId;
}

export async function getSession(sessionId: string): Promise<User | null> {
  await connect();
  const data = await client.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await connect();
  await client.del(`session:${sessionId}`);
}

// Agent関連の操作
export async function saveAgent(agent: Agent) {
  await connect();
  // エージェントをroomに追加
  const room = await getRoom(agent.roomId);
  if (!room) throw new Error("Room not found");

  // エージェントをユーザーとしても追加(名前の重複を防ぐ)
  const agentUser: User = {
    id: agent.id,
    name: agent.name.startsWith("Agent:") ? agent.name : `Agent:${agent.name}`,
  };

  // roomのagentsとmembersを更新
  if (!room.agents) room.agents = [];
  if (!room.members) room.members = [];

  room.agents.push(agent);
  room.members.push(agentUser);

  // 更新されたroomを保存
  await saveRoom(room);
}

export async function getAgents(roomId: string): Promise<Agent[]> {
  await connect();
  const room = await getRoom(roomId);
  return room?.agents || [];
}

// 保存済みエージェント関連の操作
export async function saveTemplateAgent(agent: Agent) {
  await connect();
  await client.set(`template:agent:${agent.id}`, JSON.stringify(agent));
  // テンプレートエージェントのIDリストを更新
  await client.sAdd("template:agents", agent.id);
}

export async function getAllTemplateAgents(): Promise<Agent[]> {
  await connect();
  // すべてのテンプレートエージェントのIDを取得
  const agentIds = await client.sMembers("template:agents");
  // 各エージェントの詳細を取得
  const agents = await Promise.all(
    agentIds.map(async (id) => {
      const data = await client.get(`template:agent:${id}`);
      return data ? JSON.parse(data) : null;
    })
  );
  return agents.filter((agent): agent is Agent => agent !== null);
}
