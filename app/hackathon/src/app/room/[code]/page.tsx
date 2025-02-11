"use client";

import { useState } from "react";
import { useRoom } from "../../../hooks/useRoom";
import { useMessages } from "../../../hooks/useMessages";
import { useAgent } from "../../../hooks/useAgent";
import { ChatHeader } from "../../components/ChatHeader";
import { MessageList } from "../../components/MessageList";
import { MessageInput } from "../../components/MessageInput";
import { JoinRoomForm } from "../../components/JoinRoomForm";
import { CreateAgentModal } from "../../components/modals/CreateAgentModal";
import { SettingsModal } from "../../components/modals/SettingsModal";

export default function ChatRoom() {
  // モーダルの状態管理
  const [isCreateAgentModalOpen, setIsCreateAgentModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingAgentName, setEditingAgentName] = useState<string | null>(null);

  // カスタムフックの使用
  const inviteCode = window.location.pathname.split("/").pop() || "";
  const {
    currentRoom,
    currentUser,
    error: roomError,
    isJoining,
    joinRoom,
  } = useRoom(inviteCode);
  const {
    messages,
    isSending,
    error: messageError,
    sendMessage,
  } = useMessages({
    roomId: currentRoom?.id || "",
    userId: currentUser?.id || "",
  });
  const {
    savedAgents,
    allRooms,
    isCreating,
    error: agentError,
    createAgent,
    updateExistingAgent,
  } = useAgent();

  // ユーザー名の更新処理
  const handleUpdateUserName = async (newName: string) => {
    if (currentUser) {
      // Note: この実装では単にローカルのユーザー名を更新するだけです
      // 実際のアプリケーションでは、サーバーサイドでの更新も必要かもしれません
      localStorage.setItem(`userName:${currentRoom?.id}`, newName);
    }
  };

  // メンション処理
  const [messageInputValue, setMessageInputValue] = useState("");

  const handleMentionUser = (userName: string) => {
    // 現在のメッセージ入力値の末尾にメンションを追加
    const mentionText = `@${userName} `;
    setMessageInputValue((prev) => {
      // 既存のテキストがある場合は空白を追加
      if (prev && !prev.endsWith(" ")) {
        return `${prev} ${mentionText}`;
      }
      return `${prev}${mentionText}`;
    });
    return userName;
  };

  // エラー表示の統合
  const error = roomError || messageError || agentError;

  // 未ログインの場合はJoinRoomFormを表示
  if (!currentUser) {
    return (
      <JoinRoomForm onJoin={joinRoom} error={error} isJoining={isJoining} />
    );
  }

  return (
    <main className="flex min-h-screen bg-gray-100">
      <div className="flex-1 flex flex-col h-screen">
        <ChatHeader
          room={currentRoom}
          currentUser={currentUser}
          onCreateAgent={() => setIsCreateAgentModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onMentionUser={handleMentionUser}
          onEditAgent={(agentName) => {
            setEditingAgentName(agentName);
            setIsCreateAgentModalOpen(true);
          }}
        />

        <MessageList
          messages={messages}
          currentUser={currentUser}
          currentRoom={currentRoom}
          error={error}
          onMentionUser={handleMentionUser}
        />

        <MessageInput
          onSend={sendMessage}
          onMentionSelect={handleMentionUser}
          currentUser={currentUser}
          members={currentRoom?.members || []}
          isSending={isSending}
          value={messageInputValue}
          onChange={setMessageInputValue}
        />

        {/* モーダル */}
        <CreateAgentModal
          isOpen={isCreateAgentModalOpen}
          onClose={() => {
            setIsCreateAgentModalOpen(false);
            setEditingAgentName(null);
          }}
          onCreateAgent={createAgent}
          onUpdateAgent={updateExistingAgent}
          savedAgents={savedAgents}
          allRooms={allRooms}
          currentRoomId={currentRoom?.id || ""}
          currentUserId={currentUser.id}
          isCreating={isCreating}
          editingAgentName={editingAgentName}
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentUser={currentUser}
          onUpdateUserName={handleUpdateUserName}
          isUpdating={false}
        />
      </div>
    </main>
  );
}
