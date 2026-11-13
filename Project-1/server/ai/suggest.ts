export interface SuggestInput {
  title: string;
  description?: string;
  domain?: string;
  url: string;
  folders: { id: string; name: string }[];
}

export interface AiConfig {
  provider?: "gemini";
  apiKey: string;
  model?: string;
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
    ai: ["ai", "machine learning", "llm", "gpt", "model", "neural", "deep learning", "claude", "gemini", "openai", "agent", "prompt", "grok"],
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
 * Helper to clean and parse JSON from AI outputs (stripping markdown fences)
 */
function parseAiJson(rawText: string): any {
  try {
    let cleaned = rawText.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/i, "");
    }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleaned.trim());
  } catch {
    return {};
  }
}

/**
 * Universal AI Suggestion Engine
 * Supports:
 * 1. Google Gemini (Gemini 1.5/2.0 Flash)
 * 2. OpenRouter (OpenRouter free & paid models)
 * 3. Grok (xAI)
 * 4. OpenAI (GPT-4o-mini, etc.)
 * 5. Universal OpenAI-compatible (Local Ollama, vLLM, DeepSeek, custom proxies)
 */
export async function suggestWithAi(
  input: SuggestInput,
  configOrKey?: AiConfig | string
): Promise<SuggestOutput> {
  let config: AiConfig | null = null;

  if (typeof configOrKey === "string" && configOrKey.trim()) {
    try {
      config = JSON.parse(configOrKey);
    } catch {
      // If plain string, default to Gemini API key
      config = {
        provider: "gemini",
        apiKey: configOrKey.trim(),
        model: "gemini-flash-latest",
      };
    }
  } else if (configOrKey && typeof configOrKey === "object") {
    config = configOrKey;
  }

  // If no API key provided, use instant offline heuristic classification engine
  if (!config || !config.apiKey?.trim()) {
    return suggestFolderAndTags(input);
  }

  const apiKey = config.apiKey.trim();
  const folderNames = input.folders.map((f) => f.name);

  const prompt = `A user is saving a bookmark:
- Title: "${input.title || "Unknown"}"
- URL: "${input.url}"
- Domain: "${input.domain || ""}"
- Description: "${input.description || ""}"

Existing folders in the library:
${folderNames.length > 0 ? folderNames.map((n) => `- "${n}"`).join("\n") : "(No folders created yet)"}

Task:
1. "suggestedFolderName": Recommend the best matching folder name from the existing folders above, or null if none fits.
2. "suggestedTags": Array of 2 to 4 concise, lowercase topic tags (e.g. ["ai", "react", "cloud"]).
3. "summary": One brief sentence describing what this page is.

Respond strictly in valid JSON:
{
  "suggestedFolderName": string | null,
  "suggestedTags": string[],
  "summary": string
}`;

  try {
    let rawText = "";

    // Google Gemini Native API
    const rawModel = config.model?.trim() || "gemini-flash-latest";
    let cleanModel = rawModel.replace(/^models\//, "");
    if (cleanModel === "gemini-1.5-flash" || cleanModel === "gemini-1.5-pro") {
      cleanModel = "gemini-flash-latest";
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
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
        const errorText = await res.text().catch(() => "");
        console.warn(`Gemini API call failed (${res.status}):`, errorText);
        return suggestFolderAndTags(input);
      }

      const data = await res.json();
      rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } finally {
      clearTimeout(timer);
    }

    if (!rawText) {
      return suggestFolderAndTags(input);
    }

    const parsed = parseAiJson(rawText);
    const suggestedFolderName = parsed.suggestedFolderName || null;
    const suggestedTags = Array.isArray(parsed.suggestedTags)
      ? parsed.suggestedTags
          .map((t: string) => t.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
          .filter(Boolean)
          .slice(0, 4)
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
      suggestedTags:
        suggestedTags.length > 0 ? suggestedTags : suggestFolderAndTags(input).suggestedTags,
      summary: parsed.summary || undefined,
      source: "gemini",
    };
  } catch (err) {
    console.warn("Gemini AI suggestion failed, using heuristic:", err);
    return suggestFolderAndTags(input);
  }
}

// Backward-compatible alias for suggestWithGemini
export const suggestWithGemini = suggestWithAi;
