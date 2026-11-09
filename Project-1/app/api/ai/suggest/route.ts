import { NextResponse } from "next/server";
import { suggestFolderAndTags } from "@/server/ai/suggest";
import { FolderRepository } from "@/server/db/repository";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, domain, url } = body;

    if (!url) {
      return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 });
    }

    const folders = FolderRepository.getAllFolders();
    const suggestions = suggestFolderAndTags({
      title: title || "",
      description: description || "",
      domain: domain || "",
      url,
      folders: folders.map((f) => ({ id: f.id, name: f.name })),
    });

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (err: any) {
    console.error("AI suggest error:", err);
    return NextResponse.json({ success: false, error: "Failed to generate suggestions" }, { status: 500 });
  }
}

