import { useState } from "react";
import { User } from "../../../types/index";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateUserName: (newName: string) => Promise<void>;
  isUpdating: boolean;
}

export function SettingsModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateUserName,
  isUpdating,
}: SettingsModalProps) {
  const [newUserName, setNewUserName] = useState(currentUser.name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || isUpdating) return;

    try {
      await onUpdateUserName(newUserName);
      onClose();
    } catch (error) {
      console.error("ユーザー名の更新中にエラーが発生しました:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="fixed inset-0" onClick={onClose}></div>
      <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-md mx-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">設定</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              disabled={isUpdating}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isUpdating}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isUpdating}
            >
              {isUpdating ? "更新中..." : "更新"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
