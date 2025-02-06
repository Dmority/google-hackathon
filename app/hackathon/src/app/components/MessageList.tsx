import { Message, User, Room } from "../../types/index";
import { useRef, useEffect } from "react";

interface MessageListProps {
  messages: Message[];
  currentUser: User;
  currentRoom: Room | null;
  error: string | null;
  onMentionUser: (userName: string) => void;
}

export function MessageList({
  messages,
  currentUser,
  currentRoom,
  error,
  onMentionUser,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "end",
    });
  };

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const isOwnMessage = lastMessage.sender === currentUser?.name;
      scrollToBottom(!isOwnMessage);
    }
  }, [messages, currentUser?.name]);

  useEffect(() => {
    scrollToBottom(false);
  }, []);

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

  return (
    <div
      className="flex-1 overflow-y-auto p-4 space-y-4"
      style={{ height: "calc(100vh - 140px)" }}
    >
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
                    } cursor-pointer hover:underline hover:bg-gray-100 px-2 py-1 rounded transition-colors inline-block`}
                    onClick={() => {
                      if (message.sender !== currentUser?.name) {
                        const cleanName = message.sender.replace(
                          /^Agent:+/,
                          ""
                        );
                        onMentionUser(cleanName);
                      }
                    }}
                  >
                    {message.sender.startsWith("Agent:")
                      ? message.sender.replace("Agent:", "")
                      : message.sender}
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
  );
}
