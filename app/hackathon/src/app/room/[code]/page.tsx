"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSocket } from "../../../hooks/useSocket";
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
  getRoom,
  getSavedAgents,
  saveAgent,
  getRooms,
} from "../../actions";

// ReadStatusUpdateの型定義をuseSocket.tsから再利用
interface ReadStatusUpdate {
  messageId: number;
  roomId: string;
  userId: string;
}

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
  const [socketSendMessage, setSocketSendMessage] = useState<
    ((message: Message) => void) | null
  >(null);
  const [socketUpdateReadStatus, setSocketUpdateReadStatus] = useState<
    ((messageIds: number[], userId: string) => void) | null
  >(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "end",
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const isOwnMessage = lastMessage.sender === currentUser?.name;
      scrollToBottom(!isOwnMessage);
    }
  }, [messages, currentUser?.name, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const inviteCode = window.location.pathname.split("/").pop() || "";
        const room = await findRoomByInviteCode(inviteCode);
        console.log("room", room);

        // ルームが存在しない場合のみエラーを表示
        if (!room) {
          setError("無効な招待コードです");
          return;
        }

        // ルームが存在する場合は、常にルーム情報を設定
        setCurrentRoom(room);
        setError(null);

        // セッション情報の確認
        const sessionId = localStorage.getItem(`session:${room.id}`);
        const savedUserName = localStorage.getItem(`userName:${room.id}`);

        if (sessionId && savedUserName) {
          try {
            const user = await getUserSession(sessionId);
            if (user) {
              // 保存されているユーザー名を使用
              const updatedUser = {
                ...user,
                name: savedUserName,
              };
              setCurrentUser(updatedUser);
              return;
            }
          } catch (sessionError) {
            console.error("セッションの復元に失敗しました:", sessionError);
            // セッションの復元に失敗した場合は、ユーザー作成画面を表示するため
            // currentUserはnullのままにします
          }
        }

        // セッションがない場合やセッションの復元に失敗した場合は、
        // currentUserはnullのままで、ユーザー作成画面が表示されます
      } catch (error) {
        console.error("ルームの確認中にエラーが発生しました:", error);
        setError("ルームの確認中にエラーが発生しました");
      }
    };

    checkSession();
  }, []);

  // ユーザー名をlocalStorageに保存
  useEffect(() => {
    if (currentUser && currentRoom) {
      localStorage.setItem(`userName:${currentRoom.id}`, currentUser.name);
    }
  }, [currentUser?.name, currentRoom?.id]);

  // ルーム情報を定期的に更新
  useEffect(() => {
    const roomId = currentRoom?.id;
    if (!roomId) return;

    const updateRoomInfo = async () => {
      try {
        const updatedRoom = await getRoom(roomId);
        if (updatedRoom) {
          setCurrentRoom(updatedRoom);
        }
      } catch (error) {
        console.error("ルーム情報の更新中にエラーが発生しました:", error);
      }
    };

    // 初回更新
    updateRoomInfo();

    // 3秒ごとに更新
    const intervalId = setInterval(updateRoomInfo, 3000);
    return () => clearInterval(intervalId);
  }, [currentRoom?.id]);

  const handleReadStatusUpdate = useCallback((updates: ReadStatusUpdate[]) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) => {
        const update = updates.find((u) => u.messageId === msg.id);
        if (update && !msg.readBy.includes(update.userId)) {
          return { ...msg, readBy: [...msg.readBy, update.userId] };
        }
        return msg;
      })
    );
  }, []);

  const handleNewMessage = useCallback(
    (message: Message) => {
      setMessages((prevMessages) => {
        const isDuplicate = prevMessages.some((msg) => msg.id === message.id);
        if (isDuplicate) {
          return prevMessages;
        }
        return [...prevMessages, message];
      });

      if (
        currentUser &&
        message.sender !== currentUser.name &&
        socketUpdateReadStatus
      ) {
        socketUpdateReadStatus([message.id], currentUser.id);
      }
    },
    [currentUser, socketUpdateReadStatus]
  );

  const handleReadStatusUpdateCallback = useCallback(
    (data: ReadStatusUpdate | ReadStatusUpdate[]) => {
      if (Array.isArray(data)) {
        handleReadStatusUpdate(data);
      } else {
        handleReadStatusUpdate([data]);
      }
    },
    [handleReadStatusUpdate]
  );

  const {
    sendMessage: wsSocketSendMessage,
    updateReadStatus: wsSocketUpdateReadStatus,
  } = useSocket({
    roomId: currentRoom?.id || "",
    onNewMessage: handleNewMessage,
    onReadStatusUpdate: handleReadStatusUpdateCallback,
  });

  useEffect(() => {
    if (wsSocketSendMessage && wsSocketUpdateReadStatus) {
      setSocketSendMessage(() => wsSocketSendMessage);
      setSocketUpdateReadStatus(() => wsSocketUpdateReadStatus);
    }
  }, [wsSocketSendMessage, wsSocketUpdateReadStatus]);

  useEffect(() => {
    const roomId = currentRoom?.id;
    if (!roomId) return;

    const updateMessages = async () => {
      try {
        const fetchedMessages = await fetchMessages(roomId);
        setMessages((prevMessages) => {
          const newMessages = fetchedMessages.filter(
            (newMsg) =>
              !prevMessages.some((prevMsg) => prevMsg.id === newMsg.id)
          );
          if (newMessages.length === 0) {
            return prevMessages;
          }
          return [
            ...prevMessages,
            ...newMessages.map((message) => ({
              ...message,
              readBy: message.readBy || [],
              mentions: message.mentions || [],
            })),
          ];
        });
      } catch (error) {
        console.error("メッセージの更新中にエラーが発生しました:", error);
      }
    };

    const intervalId = setInterval(updateMessages, 3000);
    return () => clearInterval(intervalId);
  }, [currentRoom?.id]);

  useEffect(() => {
    const roomId = currentRoom?.id;
    if (!roomId) return;

    const loadInitialMessages = async () => {
      try {
        const fetchedMessages = await fetchMessages(roomId);
        setMessages(
          fetchedMessages.map((message) => ({
            ...message,
            readBy: message.readBy || [],
            mentions: message.mentions || [],
          }))
        );
      } catch (error) {
        console.error("メッセージの読み込み中にエラーが発生しました:", error);
        setError("メッセージの読み込みに失敗しました");
      }
    };

    loadInitialMessages();
  }, [currentRoom?.id]);

  const sortedMessages = useMemo(() => {
    const uniqueMessages = messages.reduce((acc: Message[], current) => {
      const exists = acc.find((msg) => msg.id === current.id);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);

    return uniqueMessages.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }, [messages]);

  useEffect(() => {
    if (
      !currentUser ||
      !currentRoom ||
      messages.length === 0 ||
      !socketUpdateReadStatus
    )
      return;

    const unreadMessages = messages.filter(
      (msg) => !msg.readBy.includes(currentUser.id)
    );

    if (unreadMessages.length === 0) return;

    const timeoutId = setTimeout(() => {
      const messageIds = unreadMessages.map((msg) => msg.id);
      socketUpdateReadStatus(messageIds, currentUser.id);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [currentUser, currentRoom, messages, socketUpdateReadStatus]);

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
      localStorage.setItem(`userName:${currentRoom.id}`, userName);
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
    if (
      !newMessage.trim() ||
      !currentUser ||
      !currentRoom ||
      isSending ||
      !socketSendMessage
    )
      return;

    setIsSending(true);

    try {
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
      socketSendMessage(message);
      setNewMessage("");
      setError(null);
    } catch (error) {
      console.error("メッセージ送信中にエラーが発生しました:", error);
      setError("メッセージの送信に失敗しました");
    } finally {
      setIsSending(false);
    }
  };

  const [shouldSaveAgent, setShouldSaveAgent] = useState(false);
  const [creationType, setCreationType] = useState<"new" | "template">("new");
  const [savedAgents, setSavedAgents] = useState<Agent[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [allRooms, setAllRooms] = useState<Room[]>([]);

  // ルーム一覧を取得
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const loadedRooms = await getRooms();
        setAllRooms(loadedRooms);
      } catch (error) {
        console.error("ルーム一覧の読み込みに失敗しました:", error);
      }
    };
    loadRooms();
  }, []);

  // エージェント作成モーダルが開かれたときにデータを読み込む
  useEffect(() => {
    if (isCreateAgentModalOpen) {
      const loadData = async () => {
        try {
          // 保存済みエージェントを読み込む
          const agents = await getSavedAgents();
          setSavedAgents(agents);

          // ルーム一覧を更新
          const rooms = await getRooms();
          setAllRooms(rooms);
        } catch (error) {
          console.error("データの読み込みに失敗しました:", error);
        }
      };
      loadData();
    }
  }, [isCreateAgentModalOpen]);

  // テンプレート選択時の処理
  useEffect(() => {
    if (creationType === "template" && selectedTemplateId) {
      const template = savedAgents.find(
        (agent) => agent.id === selectedTemplateId
      );
      if (template) {
        setAgentName(template.name);
        setAgentContext(template.context);
        setAgentInstructions(template.instructions);
      }
    }
  }, [creationType, selectedTemplateId, savedAgents]);

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
      let newAgent: Agent;
      if (creationType === "template" && selectedTemplateId) {
        // テンプレートから作成する場合、新しいIDと現在のルームIDを設定
        const template = savedAgents.find(
          (agent) => agent.id === selectedTemplateId
        );
        if (!template) {
          throw new Error("テンプレートが見つかりません");
        }
        newAgent = {
          ...template,
          id: Date.now().toString(),
          roomId: currentRoom.id,
          createdBy: currentUser.id,
          createdAt: new Date().toISOString(),
        };
      } else {
        // 新規作成の場合
        newAgent = {
          id: Date.now().toString(),
          name: agentName,
          context: agentContext,
          instructions: agentInstructions,
          roomId: currentRoom.id,
          createdBy: currentUser.id,
          createdAt: new Date().toISOString(),
        };
      }

      await createAgent(newAgent, shouldSaveAgent);

      setIsCreateAgentModalOpen(false);
      setAgentName("");
      setAgentContext("");
      setAgentInstructions("");
      setShouldSaveAgent(false);
      setCreationType("new");
      setSelectedTemplateId("");
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
      <div className="flex-1 flex flex-col h-screen">
        {/* Room Header */}
        <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-50">
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
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ height: "calc(100vh - 140px)" }}
        >
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-center">
              {error}
            </div>
          )}
          {sortedMessages.length > 0 ? (
            sortedMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === currentUser?.name
                    ? "justify-end"
                    : "justify-start"
                } animate-fadeIn`}
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
        <div className="relative bg-white border-t">
          <form onSubmit={handleSubmit} className="p-4">
            <div className="flex space-x-2">
              <textarea
                value={newMessage}
                onChange={handleMessageChange}
                autoFocus
                style={{ minHeight: "44px", maxHeight: "120px" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (e.shiftKey) {
                      e.preventDefault();
                      setNewMessage((prev) => prev + "\n");
                    } else {
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
              <div className="space-y-4 mb-4">
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={creationType === "new"}
                      onChange={() => {
                        setCreationType("new");
                        setAgentName("");
                        setAgentContext("");
                        setAgentInstructions("");
                      }}
                      className="mr-2"
                    />
                    新規作成
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={creationType === "template"}
                      onChange={() => setCreationType("template")}
                      className="mr-2"
                    />
                    テンプレートから作成
                  </label>
                </div>

                {creationType === "template" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      テンプレート選択
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isCreatingAgent}
                    >
                      <option value="">テンプレートを選択...</option>
                      {savedAgents.map((agent) => {
                        const room = allRooms.find(
                          (r) => r.id === agent.roomId
                        );
                        return (
                          <option key={agent.id} value={agent.id}>
                            {agent.name} ({room?.name || "保存済み"})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

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
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={shouldSaveAgent}
                  onChange={(e) => setShouldSaveAgent(e.target.checked)}
                  className="mr-2"
                  id="saveAgent"
                  disabled={isCreatingAgent}
                />
                <label htmlFor="saveAgent" className="text-sm text-gray-700">
                  このエージェントを保存する
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateAgentModalOpen(false);
                    setAgentName("");
                    setAgentContext("");
                    setAgentInstructions("");
                    setShouldSaveAgent(false);
                    setCreationType("new");
                    setSelectedTemplateId("");
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isCreatingAgent}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    isCreatingAgent ||
                    (creationType === "template" && !selectedTemplateId)
                  }
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
