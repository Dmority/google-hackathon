import { Room, User } from "../../types/index";

interface ChatHeaderProps {
  room: Room | null;
  currentUser: User;
  onCreateAgent: () => void;
  onOpenSettings: () => void;
  onMentionUser: (userName: string) => void;
  onEditAgent: (agentName: string) => void;
}

export function ChatHeader({
  room,
  currentUser,
  onCreateAgent,
  onOpenSettings,
  onMentionUser,
  onEditAgent,
}: ChatHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-50">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">{room?.name}</h2>
          <p className="text-sm text-gray-500">{room?.description}</p>
          <div className="text-sm text-gray-500 flex items-center flex-wrap gap-2">
            <span>参加者:</span>
            {room?.members.map((m: User) => (
              <span key={m.id} className="flex items-center">
                <span
                  className={`${
                    m.name.startsWith("Agent:")
                      ? "text-green-600 font-medium"
                      : "text-blue-600 font-medium"
                  } cursor-pointer hover:underline hover:bg-gray-100 px-2 py-1 rounded transition-colors`}
                  onClick={() => {
                    if (m.id !== currentUser?.id) {
                      onMentionUser(m.name);
                    }
                  }}
                >
                  {m.name}
                </span>
                {m.name.startsWith("Agent:") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditAgent(m.name);
                    }}
                    className="ml-1 p-1 text-gray-500 hover:text-gray-700 rounded transition-colors"
                    title="エージェントを編集"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={onCreateAgent}
            className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-1"
          >
            <span>+</span>
            <span>エージェントを作成</span>
          </button>
          <div className="text-sm text-gray-700">{currentUser.name}</div>
          <button
            onClick={onOpenSettings}
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
  );
}
