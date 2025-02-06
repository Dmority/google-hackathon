import { User } from "../../types/index";
import { useState, useRef } from "react";

interface MessageInputProps {
  onSend: (text: string) => Promise<void>;
  onMentionSelect: (userName: string) => void;
  currentUser: User;
  members: User[];
  isSending: boolean;
  value: string;
  onChange: (value: string) => void;
}

export function MessageInput({
  onSend,
  onMentionSelect,
  currentUser,
  members,
  isSending,
  value,
  onChange,
}: MessageInputProps) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const mentionStartIndex = useRef<number>(-1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isSending) return;

    try {
      await onSend(value);
      onChange("");
    } catch (error) {
      console.error("メッセージ送信中にエラーが発生しました:", error);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const lastAtIndex = value.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const textAfterAt = value.slice(lastAtIndex + 1);
      const spaceIndex = textAfterAt.indexOf(" ");
      if (spaceIndex === -1) {
        mentionStartIndex.current = lastAtIndex;
        setMentionFilter(textAfterAt);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
    mentionStartIndex.current = -1;
  };

  const handleMentionSelect = (userName: string) => {
    if (mentionStartIndex.current !== -1) {
      const before = value.slice(0, mentionStartIndex.current);
      const after = value.slice(
        mentionStartIndex.current + mentionFilter.length + 1
      );
      const mentionedName = onMentionSelect(userName);
      onChange(before + "@" + mentionedName + " " + after);
      setShowMentions(false);
      mentionStartIndex.current = -1;
    }
  };

  return (
    <div className="relative bg-white border-t">
      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex space-x-2">
          <textarea
            value={value}
            onChange={handleMessageChange}
            autoFocus
            style={{ minHeight: "44px", maxHeight: "120px" }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (e.shiftKey) {
                  e.preventDefault();
                  onChange(value + "\n");
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
      {showMentions && (
        <div className="absolute bottom-full left-4 mb-2 w-64 bg-white rounded-lg shadow-lg border p-2">
          {members
            .filter(
              (member) =>
                member.id !== currentUser.id &&
                member.name.toLowerCase().includes(mentionFilter.toLowerCase())
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
  );
}
