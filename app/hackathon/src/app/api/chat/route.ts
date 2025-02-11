import { VertexAI } from "@google-cloud/vertexai";
import { NextRequest, NextResponse } from "next/server";

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || "default";
const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

if (!projectId) {
  throw new Error("GOOGLE_CLOUD_PROJECT_ID environment variable is required");
}

const vertex = new VertexAI({
  project: projectId,
  location,
});

const model = "gemini-2.0-pro-exp-02-05";

export async function POST(req: NextRequest) {
  try {
    const { prompt, agent } = await req.json();

    // タイムアウト処理を追加
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), 30000)
    );

    const generativeModel = vertex.preview.getGenerativeModel({
      model,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.9,
        topP: 1,
      },
      safetySettings: [],
    });

    const chat = generativeModel.startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text: `あなたの設定:
名前: ${agent.name}
コンテキスト: ${agent.context}
指示: ${agent.instructions}

上記の設定に従って応答してください。`,
            },
          ],
        },
        {
          role: "assistant",
          parts: [
            {
              text: `承知しました。私は${agent.name}として、与えられたコンテキストと指示に従って応答いたします。`,
            },
          ],
        },
      ],
    });

    // Promise.raceでタイムアウト処理を実装
    const result = (await Promise.race([
      chat.sendMessage(prompt),
      timeout,
    ])) as Awaited<ReturnType<typeof chat.sendMessage>>;

    const response = result.response;

    if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("No response content:", response);
      throw new Error("No response generated");
    }

    return NextResponse.json({
      text: response.candidates[0].content.parts[0].text,
    });
  } catch (error) {
    console.error("Vertex AI Error:", error);

    // エラーの種類に応じて適切なレスポンスを返す
    if (error instanceof Error) {
      if (error.message === "Request timeout") {
        return NextResponse.json(
          {
            error:
              "応答がタイムアウトしました。しばらく待ってから再度お試しください。",
          },
          { status: 504 }
        );
      }

      // エラーメッセージをクライアントに返す
      return NextResponse.json(
        {
          error: "エージェントからの応答生成に失敗しました。",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "予期せぬエラーが発生しました。" },
      { status: 500 }
    );
  }
}
