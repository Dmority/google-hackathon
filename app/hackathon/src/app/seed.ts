import { createRoom, createAgent } from "./actions";

export async function seedData() {
  try {
    // サンプルルームを作成
    const room = await createRoom(
      "テストルーム",
      "Geminiエージェントのテストルーム"
    );

    // サンプルエージェントを作成
    const agent = {
      id: Date.now().toString(),
      name: "Assistant",
      context: "あなたは親切で知識豊富なAIアシスタントです。",
      instructions:
        "ユーザーの質問に対して、簡潔で分かりやすい回答を提供してください。",
      roomId: room.id,
      createdBy: "system",
      createdAt: new Date().toISOString(),
    };

    await createAgent(agent);
    console.log("サンプルデータの作成が完了しました");
    console.log("ルームの招待コード:", room.inviteCode);
  } catch (error) {
    console.error("サンプルデータの作成中にエラーが発生しました:", error);
  }
}
