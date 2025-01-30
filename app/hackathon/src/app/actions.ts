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

import {
  saveRoom as saveRoomToRedis,
  getRoomByInviteCode as getRoomByInviteCodeFromRedis,
  getRoom as getRoomFromRedis,
  updateRoomMembers as updateRoomMembersInRedis,
  saveMessage as saveMessageToRedis,
  getMessages as getMessagesFromRedis,
  updateMessageReadStatus as updateMessageReadStatusInRedis,
  saveAgent as saveAgentToRedis,
  getAllRooms as getAllRoomsFromRedis,
  getAllTemplateAgents,
  saveTemplateAgent,
} from "../lib/redis";

// Redis client is used to store and retrieve data
let messages: Message[] = [];
let rooms: Room[] = [
  {
    id: "default",
    name: "テストルーム",
    description: "Geminiエージェントのテストルーム",
    inviteCode: "test123",
    members: [],
    agents: [],
  },
];
let agents: Agent[] = [];
let savedAgents: Agent[] = [];

export async function getRooms(): Promise<Room[]> {
  // まずRedisからルーム一覧を取得
  const roomsFromRedis = await getAllRoomsFromRedis();
  if (roomsFromRedis.length > 0) {
    // メモリ内のルーム一覧も更新
    rooms = roomsFromRedis;
    return roomsFromRedis;
  }
  // Redisに無ければメモリから取得
  // メモリにあってRedisに無い場合は、Redisに保存
  await Promise.all(rooms.map((room) => saveRoomToRedis(room)));
  return rooms;
}

export async function getSavedAgents(): Promise<Agent[]> {
  // Redisから保存済みのテンプレートエージェントを取得
  const templateAgents = await getAllTemplateAgents();

  // メモリ内の保存済みエージェントと結合
  const allAgents = [...templateAgents, ...savedAgents];

  // 重複を除去(IDが同じエージェントは最後のものが優先される)
  const uniqueAgents = [
    ...new Map(allAgents.map((agent) => [agent.id, agent])).values(),
  ];

  return uniqueAgents;
}

export async function saveAgent(
  agent: Agent,
  shouldSave: boolean = true
): Promise<void> {
  // メモリとRedisの両方に保存
  if (!savedAgents.some((a) => a.id === agent.id)) {
    savedAgents.push({ ...agent });
    await saveAgentToRedis(agent);
    // shouldSaveがtrueの場合のみテンプレートとして保存
    if (shouldSave) {
      await saveTemplateAgent(agent);
    }
  }
}

export async function findRoomByInviteCode(
  inviteCode: string
): Promise<Room | null> {
  // まずRedisから検索
  const roomFromRedis = await getRoomByInviteCodeFromRedis(inviteCode);
  if (roomFromRedis) {
    return roomFromRedis;
  }
  // Redisに無ければメモリから検索
  const roomFromMemory = rooms.find((room) => room.inviteCode === inviteCode);
  if (roomFromMemory) {
    // メモリにあってRedisに無い場合は、Redisに保存
    await saveRoomToRedis(roomFromMemory);
    return roomFromMemory;
  }
  return null;
}

export async function getRoom(roomId: string): Promise<Room | null> {
  // まずRedisから検索
  const roomFromRedis = await getRoomFromRedis(roomId);
  if (roomFromRedis) {
    return roomFromRedis;
  }
  // Redisに無ければメモリから検索
  const roomFromMemory = rooms.find((room) => room.id === roomId);
  if (roomFromMemory) {
    // メモリにあってRedisに無い場合は、Redisに保存
    await saveRoomToRedis(roomFromMemory);
    return roomFromMemory;
  }
  return null;
}

export async function joinRoom(roomId: string, user: User): Promise<string> {
  // まずRedisからroomを取得
  const room = await getRoom(roomId);
  if (!room) throw new Error("Room not found");

  // 既存のメンバーを探す
  const existingMember = room.members.find((m) => m.id === user.id);
  if (existingMember) {
    // 既存のメンバーが見つかった場合、そのユーザーのセッションを返す
    return `session_${existingMember.id}`;
  }

  // 新しいメンバーの場合、追加する
  room.members.push(user);
  // メモリとRedisの両方を更新
  const memoryRoom = rooms.find((r) => r.id === roomId);
  if (memoryRoom) {
    memoryRoom.members = room.members;
  }
  await updateRoomMembersInRedis(roomId, room.members);

  return `session_${user.id}`;
}

export async function getUserSession(sessionId: string): Promise<User | null> {
  const userId = sessionId.replace("session_", "");

  // まずRedisからすべてのルームを取得
  const allRooms = await getAllRoomsFromRedis();

  // すべてのルームのメンバーからユーザーを検索
  for (const room of allRooms) {
    const user = room.members.find((m) => m.id === userId);
    if (user) {
      // メモリ内のルームも更新
      const memoryRoom = rooms.find((r) => r.id === room.id);
      if (memoryRoom) {
        memoryRoom.members = room.members;
      }
      return user;
    }
  }

  // Redisに見つからない場合はメモリから検索
  for (const room of rooms) {
    const user = room.members.find((m) => m.id === userId);
    if (user) {
      return user;
    }
  }

  return null;
}

export async function fetchMessages(roomId: string): Promise<Message[]> {
  // まずRedisからメッセージを取得
  const messagesFromRedis = await getMessagesFromRedis(roomId);
  if (messagesFromRedis.length > 0) {
    // メモリ内のメッセージも更新
    messages = messages.filter((m) => m.roomId !== roomId);
    messages.push(...messagesFromRedis);
    return messagesFromRedis;
  }
  // Redisに無ければメモリから取得
  const messagesFromMemory = messages.filter((m) => m.roomId === roomId);
  // メモリにあってRedisに無い場合は、Redisに保存
  await Promise.all(
    messagesFromMemory.map((message) => saveMessageToRedis(message))
  );
  return messagesFromMemory;
}

export async function sendMessage(message: Message): Promise<void> {
  // メモリとRedisの両方にメッセージを保存
  messages.push(message);
  await saveMessageToRedis(message);

  // エージェントへのメンションがある場合、エージェントからの応答を生成
  const room = rooms.find((r) => r.id === message.roomId);
  if (room) {
    // メンションされたエージェントを抽出
    const mentionPattern = /@(Agent:[^\s]+)/g;
    const mentions = [...message.text.matchAll(mentionPattern)].map(
      (match) => match[1]
    );

    // メンションの順序を保持しながら、同じエージェントへの連続したメンションをグループ化
    const mentionGroups: { agent: Agent; nextAgent: Agent | null }[] = [];
    for (let i = 0; i < mentions.length; i++) {
      const currentAgentName = mentions[i];
      // すべての部屋からエージェントを検索
      let currentAgent: Agent | undefined;
      for (const r of rooms) {
        currentAgent = r.agents.find(
          (agent) => agent.name === currentAgentName
        );
        if (currentAgent) break;
      }
      if (!currentAgent) continue;

      const nextMention = mentions[i + 1];
      // 次のエージェントもすべての部屋から検索
      let nextAgent: Agent | null = null;
      if (nextMention) {
        for (const r of rooms) {
          const found = r.agents.find((agent) => agent.name === nextMention);
          if (found) {
            nextAgent = found;
            break;
          }
        }
      }

      // 同じエージェントが連続する場合はスキップ
      if (
        mentionGroups.length > 0 &&
        mentionGroups[mentionGroups.length - 1].agent.name === currentAgent.name
      ) {
        continue;
      }

      mentionGroups.push({
        agent: currentAgent,
        nextAgent: nextAgent,
      });
    }

    // グループ化されたメンションに基づいて応答を生成
    for (let i = 0; i < mentionGroups.length; i++) {
      const { agent, nextAgent } = mentionGroups[i];
      try {
        // 会話の履歴を構築
        const conversationHistory = messages
          .filter((m) => m.roomId === message.roomId)
          .slice(-5)
          .map((m) => `${m.sender}: ${m.text}`)
          .join("\n");

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: `
Context: ${agent.context}
Instructions: ${agent.instructions}
Recent Conversation:
${conversationHistory}
User Message: ${message.text}
${
  i > 0
    ? `Previous Agent Responses:
${mentionGroups
  .slice(0, i)
  .map((group) => {
    const prevResponse = messages[messages.length - (mentionGroups.length - i)];
    return `${group.agent.name}: ${prevResponse.text}`;
  })
  .join("\n")}`
    : ""
}
${nextAgent ? `\nPlease address your response to @${nextAgent.name}` : ""}
`,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response from agent");
        }

        const data = await response.json();
        const agentMessage: Message = {
          id: Date.now() + Math.random(),
          text: data.text,
          sender: agent.name,
          timestamp: new Date().toISOString(),
          roomId: message.roomId,
          readBy: [],
          mentions: nextAgent ? [nextAgent.name] : [message.sender],
        };

        messages.push(agentMessage);
        // 各エージェントの応答後に少し待機
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Agent ${agent.name} failed to respond:`, error);
      }
    }
  }
}

export async function updateMessageReadStatus(
  messageId: number,
  userId: string
): Promise<void> {
  const message = messages.find((m) => m.id === messageId);
  if (message && !message.readBy.includes(userId)) {
    message.readBy.push(userId);
    // メモリとRedisの両方を更新
    await updateMessageReadStatusInRedis(messageId, message.roomId, userId);
  }
}

export async function createRoom(
  name: string,
  description?: string
): Promise<Room> {
  const room: Room = {
    id: Date.now().toString(),
    name,
    description,
    inviteCode: Math.random().toString(36).substring(7),
    members: [],
    agents: [],
  };

  // メモリとRedisの両方にroomを保存
  rooms.push(room);
  await saveRoomToRedis(room);

  return room;
}

export async function createAgent(
  agent: Agent,
  shouldSave: boolean = true
): Promise<void> {
  // まずRedisからroomを取得
  const room = await getRoom(agent.roomId);
  if (!room) throw new Error("Room not found");

  // エージェント名にプレフィックスを追加
  agent.name = `Agent:${agent.name}`;

  // エージェントをユーザーとしても追加
  const agentUser: User = {
    id: agent.id,
    name: agent.name,
  };

  // エージェントをグローバルリストに追加
  agents.push({ ...agent });

  // shouldSaveがtrueの場合のみRedisとsavedAgentsに保存
  if (shouldSave) {
    savedAgents.push({ ...agent });
    await saveAgentToRedis(agent);
    await saveTemplateAgent(agent);
  }

  // エージェントを部屋に追加
  room.agents.push({ ...agent });
  room.members.push(agentUser);

  // 更新されたroomをメモリとRedisに保存
  const memoryRoom = rooms.find((r) => r.id === agent.roomId);
  if (memoryRoom) {
    memoryRoom.agents = room.agents;
    memoryRoom.members = room.members;
  }
  await saveRoomToRedis(room);
}
