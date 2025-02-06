import { useState } from "react";
import { Message } from "../types";
import { useSocket } from "./useSocket";
import { useQueryMessages } from "./useQueryMessages";

interface UseMessagesProps {
  roomId: string;
  userId: string;
}

export function useMessages({ roomId, userId }: UseMessagesProps) {
  const [isSending, setIsSending] = useState(false);

  const {
    messages,
    error,
    isLoading,
    sendMessage: sendMessageMutation,
    handleNewMessage,
    handleReadStatusUpdate,
  } = useQueryMessages({ roomId, userId });

  // WebSocket接続の設定
  const {
    sendMessage: socketSendMessage,
    updateReadStatus,
    isConnected,
  } = useSocket({
    roomId,
    onNewMessage: (message: Message) => {
      handleNewMessage(message);
      if (message.sender !== userId && updateReadStatus) {
        updateReadStatus([message.id], userId);
      }
    },
    onReadStatusUpdate: (data) => {
      handleReadStatusUpdate(Array.isArray(data) ? data : [data]);
    },
  });

  // メッセージ送信処理
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isSending || !socketSendMessage || !isConnected) return;

    setIsSending(true);
    try {
      // ユーザー名を取得
      const userName = localStorage.getItem(`userName:${roomId}`);
      if (!userName) {
        throw new Error("ユーザー名が見つかりません");
      }

      await sendMessageMutation(text);
      const message: Message = {
        id: Date.now(),
        text,
        sender: userName, // userIdの代わりにユーザー名を使用
        timestamp: new Date().toISOString(),
        roomId,
        readBy: [userId], // 既読情報にはIDを使用
        mentions: text.match(/@(\S+)/g)?.map((m) => m.slice(1)) || [],
      };
      socketSendMessage(message);
    } catch (error) {
      console.error("メッセージ送信中にエラーが発生しました:", error);
    } finally {
      setIsSending(false);
    }
  };

  return {
    messages,
    isSending,
    error,
    isLoading,
    isConnected,
    sendMessage: handleSendMessage,
  };
}
