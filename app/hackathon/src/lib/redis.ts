"use server";

import { createClient } from "redis";
import { Message, Room, User, Agent } from "../app/actions";

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
  const messageKey = `message:${message.roomId}:${message.id}`;
  await client.set(messageKey, JSON.stringify(message));
  await client.rPush(`messages:${message.roomId}`, messageKey);
}

export async function getMessages(roomId: string): Promise<Message[]> {
  await connect();
  const messageKeys = await client.lRange(`messages:${roomId}`, 0, -1);
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
  const messageKey = `message:${roomId}:${messageId}`;
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
  await client.rPush(`agents:${agent.roomId}`, JSON.stringify(agent));
}

export async function getAgents(roomId: string): Promise<Agent[]> {
  await connect();
  const agents = await client.lRange(`agents:${roomId}`, 0, -1);
  return agents.map((agent) => JSON.parse(agent));
}
