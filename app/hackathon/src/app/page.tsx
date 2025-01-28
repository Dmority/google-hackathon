"use client";

import { useState } from "react";
import { createRoom } from "./actions";
import { seedData } from "./seed";
import { useRouter } from "next/navigation";

export default function Home() {
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isDevelopment = process.env.NODE_ENV === "development";

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || isCreating) return;

    try {
      setIsCreating(true);
      const newRoom = await createRoom(newRoomName, newRoomDescription);
      router.push(`/room/${newRoom.inviteCode}`);
    } catch (error) {
      console.error("ルーム作成中にエラーが発生しました:", error);
      setError("ルームの作成に失敗しました");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <h2 className="text-2xl font-bold mb-6 text-center">
            新規ルーム作成
          </h2>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ルーム名
              </label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ルーム名を入力..."
                required
                disabled={isCreating}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                説明
              </label>
              <input
                type="text"
                value={newRoomDescription}
                onChange={(e) => setNewRoomDescription(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ルームの説明を入力..."
                disabled={isCreating}
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isCreating}
            >
              {isCreating ? "作成中..." : "作成"}
            </button>
          </form>
          {isDevelopment && (
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={async () => {
                  try {
                    await seedData();
                    setError(null);
                  } catch (error) {
                    console.error(
                      "サンプルデータの作成中にエラーが発生しました:",
                      error
                    );
                    setError("サンプルデータの作成に失敗しました");
                  }
                }}
                className="w-full py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                サンプルデータを作成
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
