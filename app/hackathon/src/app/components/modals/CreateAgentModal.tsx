import { useState, useEffect } from "react";
import { Agent, Room } from "../../../types/index";

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAgent: (
    agent: Omit<Agent, "id" | "createdAt">,
    shouldSave: boolean
  ) => Promise<void>;
  savedAgents: Agent[];
  allRooms: Room[];
  currentRoomId: string;
  currentUserId: string;
  isCreating: boolean;
  editingAgentName: string | null;
}

export function CreateAgentModal({
  isOpen,
  onClose,
  onCreateAgent,
  savedAgents,
  allRooms,
  currentRoomId,
  currentUserId,
  isCreating,
  editingAgentName,
}: CreateAgentModalProps) {
  const [agentName, setAgentName] = useState("");
  const [agentContext, setAgentContext] = useState("");
  const [agentInstructions, setAgentInstructions] = useState("");
  const [shouldSaveAgent, setShouldSaveAgent] = useState(false);
  const [creationType, setCreationType] = useState<"new" | "template">("new");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  useEffect(() => {
    if (isOpen && editingAgentName) {
      const existingAgent = savedAgents.find((agent) => {
        const cleanAgentName = agent.name.replace(/^Agent:+/, "");
        const cleanEditingName = editingAgentName.replace(/^Agent:+/, "");
        return cleanAgentName === cleanEditingName;
      });
      if (existingAgent) {
        setAgentName(existingAgent.name.replace("Agent:", ""));
        setAgentContext(existingAgent.context);
        setAgentInstructions(existingAgent.instructions);
        setShouldSaveAgent(true);
        setCreationType("new");
      }
    } else if (creationType === "template" && selectedTemplateId) {
      const template = savedAgents.find(
        (agent) => agent.id === selectedTemplateId
      );
      if (template) {
        setAgentName(template.name.replace("Agent:", ""));
        setAgentContext(template.context);
        setAgentInstructions(template.instructions);
      }
    }
  }, [isOpen, creationType, selectedTemplateId, savedAgents, editingAgentName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !agentName.trim() ||
      !agentContext.trim() ||
      !agentInstructions.trim() ||
      isCreating
    )
      return;

    try {
      const newAgent = {
        name: agentName,
        context: agentContext,
        instructions: agentInstructions,
        roomId: currentRoomId,
        createdBy: currentUserId,
      };

      await onCreateAgent(newAgent, shouldSaveAgent);
      handleClose();
    } catch (error) {
      console.error("エージェント作成中にエラーが発生しました:", error);
    }
  };

  const handleClose = () => {
    setAgentName("");
    setAgentContext("");
    setAgentInstructions("");
    setShouldSaveAgent(false);
    setCreationType("new");
    setSelectedTemplateId("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="fixed inset-0" onClick={handleClose}></div>
      <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-md mx-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {editingAgentName ? "エージェントを編集" : "エージェントを作成"}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4 mb-4">
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={creationType === "new"}
                  onChange={() => {
                    setCreationType("new");
                    setAgentName("");
                    setAgentContext("");
                    setAgentInstructions("");
                  }}
                  className="mr-2"
                />
                新規作成
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={creationType === "template"}
                  onChange={() => setCreationType("template")}
                  className="mr-2"
                />
                テンプレートから作成
              </label>
            </div>

            {creationType === "template" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  テンプレート選択
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isCreating}
                >
                  <option value="">テンプレートを選択...</option>
                  {savedAgents.map((agent) => {
                    const room = allRooms.find((r) => r.id === agent.roomId);
                    return (
                      <option key={agent.id} value={agent.id}>
                        {agent.name.replace(/^Agent:+/, "")} (
                        {room?.name || "保存済み"})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              エージェント名
            </label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="エージェント名を入力..."
              required
              disabled={isCreating}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              コンテキスト
            </label>
            <textarea
              value={agentContext}
              onChange={(e) => setAgentContext(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
              placeholder="コンテキストを入力..."
              required
              disabled={isCreating}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              指示
            </label>
            <textarea
              value={agentInstructions}
              onChange={(e) => setAgentInstructions(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
              placeholder="指示を入力..."
              required
              disabled={isCreating}
            />
          </div>
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              checked={shouldSaveAgent}
              onChange={(e) => setShouldSaveAgent(e.target.checked)}
              className="mr-2"
              id="saveAgent"
              disabled={isCreating}
            />
            <label htmlFor="saveAgent" className="text-sm text-gray-700">
              このエージェントを保存する
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isCreating}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                isCreating ||
                (creationType === "template" && !selectedTemplateId)
              }
            >
              {isCreating ? "作成中..." : editingAgentName ? "更新" : "作成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
