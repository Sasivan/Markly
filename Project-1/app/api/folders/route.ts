import { NextResponse } from "next/server";
import { BookmarkRepository } from "@/server/db/repository";

export async function GET() {
  try {
    const tree = BookmarkRepository.getFolderTree();
    const flat = BookmarkRepository.getAllFolders();
    return NextResponse.json({ success: true, tree, folders: flat });
  } catch (error) {
    console.error("GET /api/folders error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch folders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ success: false, error: "Folder name is required" }, { status: 400 });
    }

    const folder = BookmarkRepository.createFolder({
      name: body.name.trim(),
      parentId: body.parentId || null,
      icon: body.icon || "📁",
      color: body.color || "gray",
    });

    return NextResponse.json({ success: true, folder });
  } catch (error) {
    console.error("POST /api/folders error:", error);
    return NextResponse.json({ success: false, error: "Failed to create folder" }, { status: 500 });
  }
}

