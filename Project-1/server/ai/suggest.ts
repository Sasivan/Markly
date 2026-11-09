export interface SuggestInput {
  title: string;
  description?: string;
  domain?: string;
  url: string;
  folders: { id: string; name: string }[];
}

export interface SuggestOutput {
  suggestedFolderId: string | null;
  suggestedFolderName: string | null;
  suggestedTags: string[];
  summary?: string;
  source?: "gemini" | "heuristic";
}

/**
 * Intelligent folder and tag auto-suggestion engine
 * Uses keyword taxonomy and folder similarity heuristics with provider-agnostic extensibility
 */
export function suggestFolderAndTags(input: SuggestInput): SuggestOutput {
  const content = `${input.title || ""} ${input.description || ""} ${input.domain || ""} ${input.url || ""}`.toLowerCase();

  // Keyword taxonomy for automated tag classification
  const taxonomy: Record<string, string[]> = {
    react: ["react", "nextjs", "next.js", "jsx", "tsx", "frontend", "hooks", "components"],
    typescript: ["typescript", "typed", "interface", "compiler"],
    javascript: ["javascript", "js", "ecmascript", "node", "npm", "bun"],
    design: ["design", "ui", "ux", "figma", "colors", "typography", "icons", "svg", "components", "palette"],
    ai: ["ai", "machine learning", "llm", "gpt", "model", "neural", "deep learning", "claude", "gemini", "openai", "agent", "prompt"],
    database: ["database", "sql", "postgres", "sqlite", "orm", "drizzle", "prisma", "storage", "redis"],
    backend: ["backend", "api", "rest", "graphql", "server", "microservice", "docker"],
    productivity: ["productivity", "tools", "workflow", "management", "notion", "linear", "jira", "task", "calendar"],
    reading: ["article", "blog", "paper", "newsletter", "essay", "read", "guide", "tutorial"],
    css: ["css", "tailwind", "styling", "styles", "flexbox", "responsive"],
    security: ["security", "auth", "oauth", "jwt", "encryption", "crypto", "privacy", "ssrf"],
    cloud: ["aws", "gcp", "azure", "cloudflare", "vercel", "deploy", "serverless"],
  };

  const matchedTags: string[] = [];
  for (const [tag, keywords] of Object.entries(taxonomy)) {
    if (keywords.some((kw) => content.includes(kw))) {
      matchedTags.push(tag);
    }
  }

  // Folder matching scoring
  let bestFolder: { id: string; name: string } | null = null;
  let maxScore = 0;

  for (const folder of input.folders) {
    const fLower = folder.name.toLowerCase();
    const fTokens = fLower.split(/\W+/).filter((t) => t.length > 2);
    let score = 0;

    for (const token of fTokens) {
      if (content.includes(token)) {
        score += 3;
      }
    }

    // Correlation with matched tags
    for (const tag of matchedTags) {
      if (fLower.includes(tag)) {
        score += 4;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestFolder = folder;
    }
  }

  return {
    suggestedFolderId: bestFolder ? bestFolder.id : null,
    suggestedFolderName: bestFolder ? bestFolder.name : null,
    suggestedTags: matchedTags.slice(0, 4),
    source: "heuristic",
  };
}

/**
 * Enhanced suggestion engine using Google Gemini Generative AI
 * Falls back safely to keyword taxonomy if key is invalid, missing, or network fails.
 */
export async function suggestWithGemini(
  input: SuggestInput,
  apiKey?: string
): Promise<SuggestOutput> {
  const activeKey = apiKey?.trim() || process.env.GEMINI_API_KEY?.trim();

  // If no API key provided, use offline heuristic engine
  if (!activeKey) {
    return suggestFolderAndTags(input);
  }

  try {
    const folderNames = input.folders.map((f) => f.name);
    const prompt = `You are a bookmark organization assistant.
A user is saving a bookmark with these details:
- Title: "${input.title || "Unknown"}"
- URL: "${input.url}"
- Domain: "${input.domain || ""}"
- Description: "${input.description || ""}"

Existing folders in the user's library:
${folderNames.length > 0 ? folderNames.map((n) => `- "${n}"`).join("\n") : "(No folders created yet)"}

Task:
1. "suggestedFolderName": Recommend the best fitting folder name from the existing folders, or null if none fits.
2. "suggestedTags": Return an array of 2 to 4 concise, lowercase topic tags (e.g. ["ai", "react", "cloud"]).
3. "summary": One brief sentence describing what this page is.

Respond strictly with a JSON object:
{
  "suggestedFolderName": string | null,
  "suggestedTags": string[],
  "summary": string
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
      }
    );

    if (!res.ok) {
      console.warn("Gemini API call failed with status:", res.status);
      return suggestFolderAndTags(input);
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return suggestFolderAndTags(input);
    }

    const parsed = JSON.parse(rawText);
    const suggestedFolderName = parsed.suggestedFolderName || null;
    const suggestedTags = Array.isArray(parsed.suggestedTags)
      ? parsed.suggestedTags.map((t: string) => t.toLowerCase().replace(/[^a-z0-9_-]/g, "")).slice(0, 4)
      : [];

    let matchedFolder = null;
    if (suggestedFolderName) {
      matchedFolder =
        input.folders.find(
          (f) => f.name.toLowerCase() === suggestedFolderName.toLowerCase()
        ) ||
        input.folders.find((f) =>
          f.name.toLowerCase().includes(suggestedFolderName.toLowerCase())
        );
    }

    return {
      suggestedFolderId: matchedFolder ? matchedFolder.id : null,
      suggestedFolderName: matchedFolder ? matchedFolder.name : suggestedFolderName,
      suggestedTags: suggestedTags.length > 0 ? suggestedTags : suggestFolderAndTags(input).suggestedTags,
      summary: parsed.summary || undefined,
      source: "gemini",
    };
  } catch (err) {
    console.warn("Gemini suggestion failed, falling back to heuristic:", err);
    return suggestFolderAndTags(input);
  }
}
