import { useState } from "react";

interface JoinRoomFormProps {
  onJoin: (userName: string) => Promise<void>;
  error: string | null;
  isJoining: boolean;
}

export function JoinRoomForm({ onJoin, error, isJoining }: JoinRoomFormProps) {
  const [userName, setUserName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || isJoining) return;
    await onJoin(userName);
  };

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
          <form onSubmit={handleSubmit} className="space-y-4">
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
