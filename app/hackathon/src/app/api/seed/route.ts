import { seedData } from "../../seed";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await seedData();
    return NextResponse.json({ message: "サンプルデータの作成が完了しました" });
  } catch (error) {
    console.error("サンプルデータの作成中にエラーが発生しました:", error);
    return NextResponse.json(
      { error: "サンプルデータの作成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
