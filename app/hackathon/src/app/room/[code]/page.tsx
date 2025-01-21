"use client";

import { useEffect, useRef, useState } from "react";
import {
  Message,
  Room,
  User,
  Agent,
  fetchMessages,
  findRoomByInviteCode,
  joinRoom,
  sendMessage,
  updateMessageReadStatus,
  getUserSession,
  createAgent,
} from "../../actions";

export default function ChatRoom() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [userName, setUserName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isCreateAgentModalOpen, setIsCreateAgentModalOpen] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [agentContext, setAgentContext] = useState("");
  const [agentInstructions, setAgentInstructions] = useState("");
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mentionStartIndex = useRef<number>(-1);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const checkSession = async () => {
      const inviteCode = window.location.pathname.split("/").pop() || "";
      const room = await findRoomByInviteCode(inviteCode);
      if (!room) {
        setError("無効な招待コードです");
        return;
      }

      // セッションの確認
      const sessionId = localStorage.getItem(`session:${room.id}`);
      if (sessionId) {
        const user = await getUserSession(sessionId);
        if (user) {
          setCurrentUser(user);
          setCurrentRoom(room);
          return;
        }
      }

      setCurrentRoom(room);
    };

    checkSession();
  }, []);

  useEffect(() => {
    if (currentRoom) {
      const loadMessages = async () => {
        try {
          const fetchedMessages = await fetchMessages(currentRoom.id);
          // 既読情報を更新
          const updatedMessages = fetchedMessages.map((message) => ({
            ...message,
            readBy: message.readBy || [],
            mentions: message.mentions || [],
          }));
          if (currentUser) {
            const unreadMessages = updatedMessages.filter(
              (msg) => !msg.readBy.includes(currentUser.id)
            );
            if (unreadMessages.length > 0) {
              const newMessages = updatedMessages.map((msg) =>
                unreadMessages.find((u) => u.id === msg.id) &&
                !msg.readBy.includes(currentUser.id)
                  ? { ...msg, readBy: [...msg.readBy, currentUser.id] }
                  : msg
              );
              setMessages(newMessages);
              // 既読情報をサーバーに送信
              unreadMessages.forEach(async (message) => {
                await updateMessageReadStatus(
                  message.id,
                  currentRoom.id,
                  currentUser.id
                );
              });
            } else {
              setMessages(updatedMessages);
            }
          }
          setError(null);
        } catch (error) {
          console.error("メッセージの読み込み中にエラーが発生しました:", error);
          setError("メッセージの読み込みに失敗しました");
        }
      };
      loadMessages();

      // 3秒ごとにメッセージを更新
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [currentRoom, currentUser]);

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !currentRoom || isJoining) return;

    try {
      setIsJoining(true);
      const newUser = {
        id: Date.now().toString(),
        name: userName,
      };
      const sessionId = await joinRoom(currentRoom.id, newUser);
      localStorage.setItem(`session:${currentRoom.id}`, sessionId);
      setCurrentUser(newUser);
      setError(null);
    } catch (error) {
      console.error("ルーム参加中にエラーが発生しました:", error);
      setError("ルームへの参加に失敗しました");
    } finally {
      setIsJoining(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !currentRoom || isSending) return;

    setIsSending(true);

    try {
      // メンションを抽出
      const mentions =
        newMessage.match(/@(\S+)/g)?.map((m) => m.slice(1)) || [];
      const mentionedUsers = currentRoom.members
        .filter((m) => mentions.includes(m.name))
        .map((m) => m.id);

      const message: Message = {
        id: Date.now(),
        text: newMessage,
        sender: currentUser.name,
        timestamp: new Date().toISOString(),
        roomId: currentRoom.id,
        readBy: [currentUser.id],
        mentions: mentionedUsers,
      };
      await sendMessage(message);
      const updatedMessages = await fetchMessages(currentRoom.id);
      setMessages(updatedMessages);
      setNewMessage("");
      setError(null);
    } catch (error) {
      console.error("メッセージ送信中にエラーが発生しました:", error);
      setError("メッセージの送信に失敗しました");
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !agentName.trim() ||
      !agentContext.trim() ||
      !agentInstructions.trim() ||
      !currentRoom ||
      !currentUser ||
      isCreatingAgent
    )
      return;

    try {
      setIsCreatingAgent(true);
      const newAgent: Agent = {
        id: Date.now().toString(),
        name: agentName,
        context: agentContext,
        instructions: agentInstructions,
        roomId: currentRoom.id,
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
      };
      await createAgent(newAgent);
      setIsCreateAgentModalOpen(false);
      setAgentName("");
      setAgentContext("");
      setAgentInstructions("");
      setError(null);
    } catch (error) {
      console.error("エージェント作成中にエラーが発生しました:", error);
      setError("エージェントの作成に失敗しました");
    } finally {
      setIsCreatingAgent(false);
    }
  };

  const handleUpdateUserName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || isUpdatingName || !currentUser) return;

    setIsUpdatingName(true);
    try {
      const updatedUser = {
        ...currentUser,
        name: newUserName,
      };
      setCurrentUser(updatedUser);
      setIsSettingsOpen(false);
      setError(null);
    } catch (error) {
      console.error("ユーザー名の更新中にエラーが発生しました:", error);
      setError("ユーザー名の更新に失敗しました");
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    // メンション候補の表示制御
    const lastAtIndex = value.lastIndexOf("@");
    if (lastAtIndex !== -1 && lastAtIndex === mentionStartIndex.current) {
      const filterText = value.slice(lastAtIndex + 1);
      setMentionFilter(filterText);
      setShowMentions(true);
    } else if (value.endsWith("@")) {
      mentionStartIndex.current = value.length - 1;
      setMentionFilter("");
      setShowMentions(true);
    } else {
      setShowMentions(false);
      mentionStartIndex.current = -1;
    }
  };

  const handleMentionSelect = (userName: string) => {
    if (mentionStartIndex.current !== -1) {
      const before = newMessage.slice(0, mentionStartIndex.current + 1);
      const after = newMessage.slice(
        mentionStartIndex.current + 1 + mentionFilter.length
      );
      setNewMessage(before + userName + after);
      setShowMentions(false);
      mentionStartIndex.current = -1;
    }
  };

  const formatTime = (dateString: string) => {
    return new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  const getMentionedUsers = (message: Message) => {
    if (!currentRoom) return [];
    return currentRoom.members
      .filter((member) => message.mentions.includes(member.id))
      .map((member) => member.name);
  };

  if (!currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold mb-6 text-center">
              チャットに参加
            </h2>
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
                {error}
              </div>
            )}
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ユーザー名
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  autoFocus
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ユーザー名を入力..."
                  required
                  disabled={isJoining}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isJoining}
              >
                {isJoining ? "参加中..." : "参加"}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-gray-100">
      <div className="flex-1 flex flex-col">
        {/* Room Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">{currentRoom?.name}</h2>
              <p className="text-sm text-gray-500">
                {currentRoom?.description}
              </p>
              <p className="text-sm text-gray-500">
                参加者:{" "}
                {currentRoom?.members.map((m, i) => (
                  <span key={m.id}>
                    {i > 0 && ", "}
                    <span
                      className={`${
                        m.name.startsWith("Agent:")
                          ? "text-green-600 font-medium"
                          : "text-blue-600 font-medium"
                      } cursor-pointer hover:underline`}
                      onClick={() => {
                        if (m.id !== currentUser?.id) {
                          const currentPosition = newMessage.length;
                          const spaceNeeded =
                            currentPosition > 0 && !newMessage.endsWith(" ")
                              ? " "
                              : "";
                          setNewMessage(
                            (prev) => `${prev}${spaceNeeded}@${m.name} `
                          );
                        }
                      }}
                    >
                      {m.name}
                    </span>
                  </span>
                ))}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsCreateAgentModalOpen(true)}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-1"
              >
                <span>+</span>
                <span>エージェントを作成</span>
              </button>
              <div className="text-sm text-gray-700">{currentUser.name}</div>
              <button
                onClick={() => {
                  setNewUserName(currentUser.name);
                  setIsSettingsOpen(true);
                }}
                className="p-1 text-gray-500 hover:text-gray-700 rounded transition-colors"
                title="設定"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-center">
              {error}
            </div>
          )}
          {messages.length > 0 ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === currentUser?.name
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.mentions.includes(currentUser.id)
                      ? "bg-yellow-100 text-gray-800"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  <div className="text-sm mb-1">
                    {message.sender === currentUser?.name ? (
                      ""
                    ) : (
                      <span
                        className={`${
                          message.sender.startsWith("Agent:")
                            ? "text-green-600 font-medium"
                            : "text-blue-600 font-medium"
                        } cursor-pointer hover:underline`}
                        onClick={() => {
                          if (message.sender !== currentUser?.name) {
                            const currentPosition = newMessage.length;
                            const spaceNeeded =
                              currentPosition > 0 && !newMessage.endsWith(" ")
                                ? " "
                                : "";
                            setNewMessage(
                              (prev) =>
                                `${prev}${spaceNeeded}@${message.sender} `
                            );
                          }
                        }}
                      >
                        {message.sender}
                      </span>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap">{message.text}</div>
                  <div className="flex justify-between items-center mt-1">
                    <div
                      className={`text-xs ${
                        message.sender === currentUser?.name
                          ? "text-blue-100"
                          : "text-gray-500"
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                    {message.sender === currentUser?.name && (
                      <div className="text-xs text-blue-100">
                        {message.readBy.length > 1
                          ? `既読${message.readBy.length - 1}`
                          : ""}
                      </div>
                    )}
                  </div>
                  {getMentionedUsers(message).length > 0 && (
                    <div className="text-xs mt-1 text-gray-500">
                      メンション: {getMentionedUsers(message).join(", ")}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              メッセージはありません
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="relative">
          <form onSubmit={handleSubmit} className="bg-white border-t p-4">
            <div className="flex space-x-2">
              <textarea
                value={newMessage}
                onChange={handleMessageChange}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (e.shiftKey) {
                      // Shift+Enterの場合は改行を挿入
                      e.preventDefault();
                      setNewMessage((prev) => prev + "\n");
                    } else {
                      // 通常のEnterの場合は送信
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }
                }}
                placeholder="メッセージを入力... (@でメンション)"
                className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                disabled={isSending}
                rows={1}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSending}
              >
                {isSending ? "送信中..." : "送信"}
              </button>
            </div>
          </form>

          {/* Mention Suggestions */}
          {showMentions && currentRoom && (
            <div className="absolute bottom-full left-4 mb-2 w-64 bg-white rounded-lg shadow-lg border p-2">
              {currentRoom.members
                .filter(
                  (member) =>
                    member.id !== currentUser.id &&
                    member.name
                      .toLowerCase()
                      .includes(mentionFilter.toLowerCase())
                )
                .map((member) => (
                  <div
                    key={member.id}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded"
                    onClick={() => handleMentionSelect(member.name)}
                  >
                    <span
                      className={`${
                        member.name.startsWith("Agent:")
                          ? "text-green-600 font-medium"
                          : "text-blue-600 font-medium"
                      }`}
                    >
                      {member.name}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Agent Modal */}
      {isCreateAgentModalOpen && (
        <div className="fixed inset-0 z-[100] overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div
            className="fixed inset-0"
            onClick={() => setIsCreateAgentModalOpen(false)}
          ></div>
          <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-md mx-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">エージェントを作成</h3>
              <button
                onClick={() => setIsCreateAgentModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  エージェント名
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="エージェント名を入力..."
                  required
                  disabled={isCreatingAgent}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  コンテキスト
                </label>
                <textarea
                  value={agentContext}
                  onChange={(e) => setAgentContext(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                  placeholder="コンテキストを入力..."
                  required
                  disabled={isCreatingAgent}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  指示
                </label>
                <textarea
                  value={agentInstructions}
                  onChange={(e) => setAgentInstructions(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                  placeholder="指示を入力..."
                  required
                  disabled={isCreatingAgent}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateAgentModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isCreatingAgent}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isCreatingAgent}
                >
                  {isCreatingAgent ? "作成中..." : "作成"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div
            className="fixed inset-0"
            onClick={() => setIsSettingsOpen(false)}
          ></div>
          <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-md mx-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">設定</h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateUserName} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ユーザー名
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="新しいユーザー名を入力..."
                  required
                  disabled={isUpdatingName}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isUpdatingName}
                >
                  {isUpdatingName ? "更新中..." : "更新"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
