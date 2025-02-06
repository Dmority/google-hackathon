import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Message } from "../types";
import { fetchMessages, sendMessage } from "../app/actions";

const MESSAGES_QUERY_KEY = "messages";

interface UseQueryMessagesProps {
  roomId: string;
  userId: string;
}

export function useQueryMessages({ roomId, userId }: UseQueryMessagesProps) {
  const queryClient = useQueryClient();

  // メッセージの取得
  const {
    data: messages = [],
    isLoading,
    error: queryError,
  } = useQuery<Message[]>({
    queryKey: [MESSAGES_QUERY_KEY, roomId],
    queryFn: () => fetchMessages(roomId),
    refetchInterval: 5000, // 5秒ごとにポーリング
  });

  // メッセージの送信
  const { mutate: sendMessageMutation } = useMutation({
    mutationFn: (text: string) => {
      const mentions = text.match(/@(\S+)/g)?.map((m) => m.slice(1)) || [];
      const userName = localStorage.getItem(`userName:${roomId}`);
      if (!userName) {
        throw new Error("ユーザー名が見つかりません");
      }
      const message: Message = {
        id: Date.now(),
        text,
        sender: userName,
        timestamp: new Date().toISOString(),
        roomId,
        readBy: [userId],
        mentions,
      };
      return sendMessage(message);
    },
    onSuccess: () => {
      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: [MESSAGES_QUERY_KEY, roomId] });
    },
  });

  // WebSocketで受信したメッセージをキャッシュに追加
  const handleNewMessage = (message: Message) => {
    queryClient.setQueryData<Message[]>([MESSAGES_QUERY_KEY, roomId], (old) => {
      if (!old) return [message];
      // 重複チェック
      const isDuplicate = old.some(
        (msg) =>
          msg.id === message.id &&
          msg.text === message.text &&
          msg.sender === message.sender &&
          msg.timestamp === message.timestamp
      );
      if (isDuplicate) return old;
      return [...old, message];
    });
  };

  // 既読ステータスの更新をキャッシュに反映
  const handleReadStatusUpdate = (
    updates: { messageId: number; userId: string }[]
  ) => {
    queryClient.setQueryData<Message[]>([MESSAGES_QUERY_KEY, roomId], (old) => {
      if (!old) return [];
      return old.map((msg) => {
        const update = updates.find((u) => u.messageId === msg.id);
        if (update && !msg.readBy.includes(update.userId)) {
          return { ...msg, readBy: [...msg.readBy, update.userId] };
        }
        return msg;
      });
    });
  };

  // エラーメッセージの変換
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : String(queryError)
    : null;

  return {
    messages,
    isLoading,
    error,
    sendMessage: sendMessageMutation,
    handleNewMessage,
    handleReadStatusUpdate,
  };
}
