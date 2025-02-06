import { useState, useCallback, useEffect } from "react";
import { Agent, Room } from "../types/index";
import {
  createAgent as createAgentAction,
  getSavedAgents as getSavedAgentsAction,
  getRooms,
} from "../app/actions";

interface UseAgentResult {
  savedAgents: Agent[];
  allRooms: Room[];
  isCreating: boolean;
  error: string | null;
  createAgent: (
    agent: Omit<Agent, "id" | "createdAt">,
    shouldSave: boolean
  ) => Promise<void>;
}

export function useAgent(): UseAgentResult {
  const [savedAgents, setSavedAgents] = useState<Agent[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 保存済みエージェントとルーム一覧の読み込み
  const loadData = useCallback(async () => {
    try {
      // 保存済みエージェントを読み込む
      const agents = await getSavedAgentsAction();
      setSavedAgents(agents);

      // ルーム一覧を更新
      const rooms = await getRooms();
      setAllRooms(rooms);

      setError(null);
    } catch (error) {
      console.error("データの読み込みに失敗しました:", error);
      setError("データの読み込みに失敗しました");
    }
  }, []);

  // 初期データの読み込み
  useEffect(() => {
    loadData();
  }, [loadData]);

  const createAgent = useCallback(
    async (
      agent: Omit<Agent, "id" | "createdAt">,
      shouldSave: boolean = false
    ) => {
      if (isCreating) return;

      setIsCreating(true);
      try {
        await createAgentAction(
          {
            ...agent,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
          },
          shouldSave
        );

        // エージェントの作成後にデータを再読み込み
        await loadData();
        setError(null);
      } catch (error) {
        console.error("エージェント作成中にエラーが発生しました:", error);
        setError("エージェントの作成に失敗しました");
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [isCreating, loadData]
  );

  return {
    savedAgents,
    allRooms,
    isCreating,
    error,
    createAgent,
  };
}
