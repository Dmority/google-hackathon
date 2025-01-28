import { VertexAI } from "@google-cloud/vertexai";
import { NextRequest, NextResponse } from "next/server";

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

if (!projectId) {
  throw new Error("GOOGLE_CLOUD_PROJECT_ID environment variable is required");
}

const vertex = new VertexAI({
  project: projectId,
  location,
});

const model = "gemini-1.5-pro";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    const generativeModel = vertex.preview.getGenerativeModel({
      model,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.9,
        topP: 1,
      },
    });

    const chat = generativeModel.startChat({
      history: [
        {
          role: "user",
          parts: [
            { text: "あなたはユーザーをサポートするAIアシスタントです。" },
          ],
        },
      ],
    });

    const result = await chat.sendMessage(prompt);
    const response = result.response;

    if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("No response generated");
    }

    return NextResponse.json({
      text: response.candidates[0].content.parts[0].text,
    });
  } catch (error) {
    console.error("Vertex AI Error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
