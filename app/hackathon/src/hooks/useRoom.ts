import { useState, useEffect, useCallback } from "react";
import { Room, User } from "../types/index";
import {
  findRoomByInviteCode,
  joinRoom as joinRoomAction,
  getRoom as getRoomAction,
  getUserSession,
} from "../app/actions";

interface UseRoomResult {
  currentRoom: Room | null;
  currentUser: User | null;
  error: string | null;
  isJoining: boolean;
  joinRoom: (userName: string) => Promise<void>;
}

export function useRoom(inviteCode: string): UseRoomResult {
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // ルーム情報の初期化
  useEffect(() => {
    const initializeRoom = async () => {
      try {
        setError(null); // 初期化時にエラーをクリア
        const room = await findRoomByInviteCode(inviteCode);
        if (!room) {
          setError("無効な招待コードです");
          return;
        }

        setCurrentRoom(room);
        setError(null);

        // セッション情報の確認
        const sessionId = localStorage.getItem(`session:${room.id}`);
        const savedUserName = localStorage.getItem(`userName:${room.id}`);

        if (sessionId && savedUserName) {
          try {
            const user = await getUserSession(sessionId);
            if (user) {
              const updatedUser = {
                ...user,
                name: savedUserName,
              };
              setCurrentUser(updatedUser);
              return;
            }
          } catch (sessionError) {
            console.error("セッションの復元に失敗しました:", sessionError);
          }
        }
      } catch (error) {
        console.error("ルームの確認中にエラーが発生しました:", error);
        setError("ルームの確認中にエラーが発生しました");
      }
    };

    initializeRoom();
  }, [inviteCode]);

  // ルーム情報を定期的に更新
  useEffect(() => {
    if (!currentRoom?.id) return;

    const updateRoomInfo = async () => {
      try {
        const updatedRoom = await getRoomAction(currentRoom.id);
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

  // ユーザー名をlocalStorageに保存
  useEffect(() => {
    if (currentUser && currentRoom) {
      localStorage.setItem(`userName:${currentRoom.id}`, currentUser.name);
    }
  }, [currentUser?.name, currentRoom?.id]);

  const joinRoom = useCallback(
    async (userName: string) => {
      if (!userName.trim() || !currentRoom || isJoining) return;

      setIsJoining(true);
      try {
        // UUIDv4のような形式でIDを生成
        const newUser = {
          id: crypto.randomUUID(),
          name: userName,
        };
        const sessionId = await joinRoomAction(currentRoom.id, newUser);
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
    },
    [currentRoom, isJoining]
  );

  return {
    currentRoom,
    currentUser,
    error,
    isJoining,
    joinRoom,
  };
}
