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
  };
}

