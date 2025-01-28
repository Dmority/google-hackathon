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

export async function findRoomByInviteCode(
  inviteCode: string
): Promise<Room | null> {
  return rooms.find((room) => room.inviteCode === inviteCode) || null;
}

export async function getRoom(roomId: string): Promise<Room | null> {
  return rooms.find((room) => room.id === roomId) || null;
}

export async function joinRoom(roomId: string, user: User): Promise<string> {
  const room = rooms.find((r) => r.id === roomId);
  if (!room) throw new Error("Room not found");

  if (!room.members.find((m) => m.id === user.id)) {
    room.members.push(user);
  }

  return `session_${user.id}`;
}

export async function getUserSession(sessionId: string): Promise<User | null> {
  const userId = sessionId.replace("session_", "");
  for (const room of rooms) {
    const user = room.members.find((m) => m.id === userId);
    if (user) return user;
  }
  return null;
}

export async function fetchMessages(roomId: string): Promise<Message[]> {
  return messages.filter((m) => m.roomId === roomId);
}

export async function sendMessage(message: Message): Promise<void> {
  messages.push(message);

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
      const currentAgent = room.agents.find(
        (agent) => agent.name === currentAgentName
      );
      if (!currentAgent) continue;

      const nextMention = mentions[i + 1];
      const nextAgent = nextMention
        ? room.agents.find((agent) => agent.name === nextMention) || null
        : null;

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
  rooms.push(room);
  return room;
}

export async function createAgent(agent: Agent): Promise<void> {
  const room = rooms.find((r) => r.id === agent.roomId);
  if (!room) throw new Error("Room not found");

  // エージェント名にプレフィックスを追加
  agent.name = `Agent:${agent.name}`;

  // エージェントをユーザーとしても追加
  const agentUser: User = {
    id: agent.id,
    name: agent.name,
  };

  room.members.push(agentUser);
  room.agents.push(agent);
  agents.push(agent);
}
