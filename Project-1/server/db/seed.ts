import { BookmarkRepository, DEFAULT_USER_ID } from "./repository";
import { sqlite } from "./client";

export function runSeed() {
  console.log("🌱 Starting Markly realistic database seed...");

  // Ensure tables exist and clean previous data for clean state
  sqlite.exec(`
    DELETE FROM bookmark_tags;
    DELETE FROM bookmarks;
    DELETE FROM folders;
    DELETE FROM tags;
    DELETE FROM users;
  `);

  BookmarkRepository.ensureDefaultUser();

  // Create Folders with 3-level nesting
  // Level 1: Engineering
  const fEngineering = BookmarkRepository.createFolder({ name: "Engineering", icon: "💻", color: "#3b82f6", userId: DEFAULT_USER_ID });
  // Level 2: Frontend under Engineering
  const fFrontend = BookmarkRepository.createFolder({ name: "Frontend", parentId: fEngineering.id, icon: "⚛️", color: "#60a5fa", userId: DEFAULT_USER_ID });
  // Level 3: React & Next.js under Frontend
  const fReact = BookmarkRepository.createFolder({ name: "React & Next.js", parentId: fFrontend.id, icon: "⚡", color: "#93c5fd", userId: DEFAULT_USER_ID });
  // Level 3: CSS & UI under Frontend
  const fCSS = BookmarkRepository.createFolder({ name: "CSS & UI Systems", parentId: fFrontend.id, icon: "🎨", color: "#93c5fd", userId: DEFAULT_USER_ID });

  // Level 2: Backend under Engineering
  const fBackend = BookmarkRepository.createFolder({ name: "Backend & Systems", parentId: fEngineering.id, icon: "⚙️", color: "#3b82f6", userId: DEFAULT_USER_ID });
  // Level 3: Databases under Backend
  const fDatabases = BookmarkRepository.createFolder({ name: "Databases & Storage", parentId: fBackend.id, icon: "🗄️", color: "#93c5fd", userId: DEFAULT_USER_ID });

  // Level 2: AI & LLMs under Engineering
  const fAI = BookmarkRepository.createFolder({ name: "AI & Machine Learning", parentId: fEngineering.id, icon: "🤖", color: "#8b5cf6", userId: DEFAULT_USER_ID });

  // Level 1: Design & Creative
  const fDesign = BookmarkRepository.createFolder({ name: "Design & Creative", icon: "🎯", color: "#ec4899", userId: DEFAULT_USER_ID });
  const fInspiration = BookmarkRepository.createFolder({ name: "Inspiration & Showcase", parentId: fDesign.id, icon: "✨", color: "#f472b6", userId: DEFAULT_USER_ID });
  const fTypography = BookmarkRepository.createFolder({ name: "Typography & Assets", parentId: fDesign.id, icon: "🔤", color: "#f472b6", userId: DEFAULT_USER_ID });

  // Level 1: Productivity & Tools
  const fProductivity = BookmarkRepository.createFolder({ name: "Productivity & Workflow", icon: "⚡", color: "#10b981", userId: DEFAULT_USER_ID });
  const fNotes = BookmarkRepository.createFolder({ name: "Notes & Knowledge", parentId: fProductivity.id, icon: "📓", color: "#34d399", userId: DEFAULT_USER_ID });
  const fDevTools = BookmarkRepository.createFolder({ name: "Developer Tools", parentId: fProductivity.id, icon: "🛠️", color: "#34d399", userId: DEFAULT_USER_ID });

  // Level 1: Reading & Research
  const fReading = BookmarkRepository.createFolder({ name: "Reading & Research", icon: "📚", color: "#f59e0b", userId: DEFAULT_USER_ID });

  console.log("📁 Created 13 nested folders across 3 hierarchy levels.");

  // Realistic seed bookmarks list (60+ items)
  const rawBookmarks = [
    // React & Next.js
    {
      title: "Next.js by Vercel - The React Framework",
      url: "https://nextjs.org",
      canonicalUrl: "https://nextjs.org",
      domain: "nextjs.org",
      description: "Used by some of the world's largest companies, Next.js enables you to create full-stack Web applications by extending the latest React features.",
      iconUrl: "https://nextjs.org/favicon.ico",
      folderId: fReact.id,
      isFavorite: true,
      tags: ["react", "nextjs", "framework", "ssr"],
      visitCount: 42,
    },
    {
      title: "React Official Documentation",
      url: "https://react.dev",
      canonicalUrl: "https://react.dev",
      domain: "react.dev",
      description: "The library for web and native user interfaces. Build user interfaces out of individual pieces called components written in JavaScript.",
      iconUrl: "https://react.dev/favicon.ico",
      folderId: fReact.id,
      isFavorite: true,
      tags: ["react", "frontend", "docs"],
      visitCount: 88,
    },
    {
      title: "TanStack Query (React Query)",
      url: "https://tanstack.com/query/latest",
      canonicalUrl: "https://tanstack.com/query",
      domain: "tanstack.com",
      description: "Powerful asynchronous state management for TS/JS, React, Solid, Vue, Svelte and Angular.",
      iconUrl: "https://tanstack.com/favicon.ico",
      folderId: fReact.id,
      isFavorite: true,
      tags: ["react", "state", "tanstack", "api"],
      visitCount: 35,
    },
    {
      title: "Zustand - Bear necessities for state management in React",
      url: "https://zustand.docs.pmnd.rs",
      canonicalUrl: "https://zustand.docs.pmnd.rs",
      domain: "zustand.docs.pmnd.rs",
      description: "A small, fast and scalable bearbones state-management solution using simplified flux principles.",
      iconUrl: "https://zustand.docs.pmnd.rs/favicon.ico",
      folderId: fReact.id,
      isFavorite: false,
      tags: ["react", "state", "zustand"],
      visitCount: 19,
    },
    {
      title: "TanStack Table - Headless UI for building tables & datagrids",
      url: "https://tanstack.com/table/latest",
      canonicalUrl: "https://tanstack.com/table",
      domain: "tanstack.com",
      description: "Headless UI for building powerful tables & datagrids for TS/JS, React, Vue, Solid.",
      iconUrl: "https://tanstack.com/favicon.ico",
      folderId: fReact.id,
      isFavorite: true,
      tags: ["tanstack", "table", "react", "datagrid"],
      visitCount: 27,
    },

    // CSS & UI Systems
    {
      title: "Tailwind CSS - Rapidly build modern websites",
      url: "https://tailwindcss.com",
      canonicalUrl: "https://tailwindcss.com",
      domain: "tailwindcss.com",
      description: "A utility-first CSS framework packed with classes like flex, pt-4, text-center and rotate-90 that can be composed to build any design.",
      iconUrl: "https://tailwindcss.com/favicon.ico",
      folderId: fCSS.id,
      isFavorite: true,
      tags: ["css", "tailwind", "ui", "design"],
      visitCount: 64,
    },
    {
      title: "shadcn/ui - Beautifully designed components",
      url: "https://ui.shadcn.com",
      canonicalUrl: "https://ui.shadcn.com",
      domain: "ui.shadcn.com",
      description: "Beautifully designed components that you can copy and paste into your apps. Accessible. Customizable. Open Source.",
      iconUrl: "https://ui.shadcn.com/favicon.ico",
      folderId: fCSS.id,
      isFavorite: true,
      tags: ["shadcn", "components", "tailwind", "react"],
      visitCount: 75,
    },
    {
      title: "Lucide - Beautiful & consistent icons",
      url: "https://lucide.dev",
      canonicalUrl: "https://lucide.dev",
      domain: "lucide.dev",
      description: "An open source icon library made by the community. Smooth, consistent, and easy to use across web and mobile apps.",
      iconUrl: "https://lucide.dev/favicon.ico",
      folderId: fCSS.id,
      isFavorite: false,
      tags: ["icons", "ui", "design", "lucide"],
      visitCount: 31,
    },
    {
      title: "Motion - Modern animation library for JavaScript and React",
      url: "https://motion.dev",
      canonicalUrl: "https://motion.dev",
      domain: "motion.dev",
      description: "A production-ready motion library for React and vanilla JavaScript. Formerly Framer Motion.",
      iconUrl: "https://motion.dev/favicon.ico",
      folderId: fCSS.id,
      isFavorite: true,
      tags: ["animation", "motion", "framer", "ui"],
      visitCount: 22,
    },
    {
      title: "Radix UI - Primitives for building high-quality design systems",
      url: "https://www.radix-ui.com",
      canonicalUrl: "https://www.radix-ui.com",
      domain: "radix-ui.com",
      description: "An open source component library optimized for fast development, easy maintenance, and accessibility.",
      iconUrl: "https://www.radix-ui.com/favicon.ico",
      folderId: fCSS.id,
      isFavorite: false,
      tags: ["accessible", "ui", "primitives"],
      visitCount: 15,
    },

    // Databases & Backend
    {
      title: "Drizzle ORM - TypeScript ORM that feels like SQL",
      url: "https://orm.drizzle.team",
      canonicalUrl: "https://orm.drizzle.team",
      domain: "drizzle.team",
      description: "Drizzle is a lightweight and performant TypeScript ORM with developer experience as the first priority.",
      iconUrl: "https://orm.drizzle.team/favicon.ico",
      folderId: fDatabases.id,
      isFavorite: true,
      tags: ["drizzle", "orm", "typescript", "database", "sql"],
      visitCount: 54,
    },
    {
      title: "Supabase - The Open Source Firebase Alternative",
      url: "https://supabase.com",
      canonicalUrl: "https://supabase.com",
      domain: "supabase.com",
      description: "Supabase is an open source Firebase alternative. Build production-grade applications with Postgres, Auth, Storage, and Realtime.",
      iconUrl: "https://supabase.com/favicon.ico",
      folderId: fDatabases.id,
      isFavorite: true,
      tags: ["supabase", "postgres", "auth", "backend"],
      visitCount: 61,
    },
    {
      title: "PostgreSQL: The World's Most Advanced Open Source Relational Database",
      url: "https://www.postgresql.org",
      canonicalUrl: "https://www.postgresql.org",
      domain: "postgresql.org",
      description: "PostgreSQL is a powerful, open source object-relational database system with over 35 years of active development.",
      iconUrl: "https://www.postgresql.org/favicon.ico",
      folderId: fDatabases.id,
      isFavorite: false,
      tags: ["database", "postgres", "sql"],
      visitCount: 18,
    },
    {
      title: "Redis - The real-time data platform",
      url: "https://redis.io",
      canonicalUrl: "https://redis.io",
      domain: "redis.io",
      description: "Redis delivers the speed, scalability, and high performance required by real-time applications.",
      iconUrl: "https://redis.io/favicon.ico",
      folderId: fDatabases.id,
      isFavorite: false,
      tags: ["cache", "redis", "database", "kv"],
      visitCount: 12,
    },
    {
      title: "Turso - SQLite for the Edge",
      url: "https://turso.tech",
      canonicalUrl: "https://turso.tech",
      domain: "turso.tech",
      description: "Turso is an in-process, distributed database engine built on libSQL, the open-source fork of SQLite.",
      iconUrl: "https://turso.tech/favicon.ico",
      folderId: fDatabases.id,
      isFavorite: false,
      tags: ["sqlite", "libsql", "edge", "database"],
      visitCount: 14,
    },

    // AI & Machine Learning
    {
      title: "Hugging Face - The AI community building the future",
      url: "https://huggingface.co",
      canonicalUrl: "https://huggingface.co",
      domain: "huggingface.co",
      description: "We are on a mission to democratize good machine learning, one model and dataset at a time.",
      iconUrl: "https://huggingface.co/favicon.ico",
      folderId: fAI.id,
      isFavorite: true,
      tags: ["ai", "models", "opensource", "ml"],
      visitCount: 46,
    },
    {
      title: "OpenAI Platform & Developer API Documentation",
      url: "https://platform.openai.com/docs",
      canonicalUrl: "https://platform.openai.com/docs",
      domain: "openai.com",
      description: "Explore developer resources, tutorials, API docs, and dynamic examples to get the most out of OpenAI's platform.",
      iconUrl: "https://openai.com/favicon.ico",
      folderId: fAI.id,
      isFavorite: true,
      tags: ["openai", "llm", "api", "ai"],
      visitCount: 52,
    },
    {
      title: "Anthropic Claude API & Prompt Engineering Guide",
      url: "https://docs.anthropic.com",
      canonicalUrl: "https://docs.anthropic.com",
      domain: "anthropic.com",
      description: "Build innovative AI applications powered by Claude 3.7 Sonnet and Claude 3.5 Haiku.",
      iconUrl: "https://anthropic.com/favicon.ico",
      folderId: fAI.id,
      isFavorite: true,
      tags: ["claude", "anthropic", "llm", "prompts"],
      visitCount: 41,
    },
    {
      title: "LangChain - Context-aware AI application framework",
      url: "https://www.langchain.com",
      canonicalUrl: "https://www.langchain.com",
      domain: "langchain.com",
      description: "Framework for developing applications powered by large language models, agents, and retrieval systems.",
      iconUrl: "https://www.langchain.com/favicon.ico",
      folderId: fAI.id,
      isFavorite: false,
      tags: ["ai", "agents", "langchain", "rag"],
      visitCount: 23,
    },
    {
      title: "Ollama - Get up and running with large language models locally",
      url: "https://ollama.com",
      canonicalUrl: "https://ollama.com",
      domain: "ollama.com",
      description: "Run Llama 3, DeepSeek, Mistral, and other models locally on macOS, Linux, and Windows.",
      iconUrl: "https://ollama.com/favicon.ico",
      folderId: fAI.id,
      isFavorite: true,
      tags: ["ai", "local", "ollama", "llm"],
      visitCount: 39,
    },

    // Design & Inspiration
    {
      title: "Mobbin - World's largest UI & UX design reference library",
      url: "https://mobbin.com",
      canonicalUrl: "https://mobbin.com",
      domain: "mobbin.com",
      description: "Discover real-world design inspiration. Browse over 300,000 screens from high-growth apps across iOS and Web.",
      iconUrl: "https://mobbin.com/favicon.ico",
      folderId: fInspiration.id,
      isFavorite: true,
      tags: ["design", "inspiration", "ux", "mobile"],
      visitCount: 47,
    },
    {
      title: "Dribbble - Discover the World's Top Designers & Creatives",
      url: "https://dribbble.com",
      canonicalUrl: "https://dribbble.com",
      domain: "dribbble.com",
      description: "Find Top Designers & Creative Professionals on Dribbble. We are where designers gain inspiration, feedback, and jobs.",
      iconUrl: "https://dribbble.com/favicon.ico",
      folderId: fInspiration.id,
      isFavorite: false,
      tags: ["design", "inspiration", "art"],
      visitCount: 16,
    },
    {
      title: "Awwwards - Website Awards & Best Web Design Trends",
      url: "https://www.awwwards.com",
      canonicalUrl: "https://www.awwwards.com",
      domain: "awwwards.com",
      description: "Awwwards are the website awards that recognize and promote the talent and effort of the best developers and designers in the world.",
      iconUrl: "https://www.awwwards.com/favicon.ico",
      folderId: fInspiration.id,
      isFavorite: true,
      tags: ["design", "awards", "web", "inspiration"],
      visitCount: 29,
    },
    {
      title: "Figma: The Collaborative Interface Design Tool",
      url: "https://www.figma.com",
      canonicalUrl: "https://www.figma.com",
      domain: "figma.com",
      description: "Figma is the leading collaborative design tool for building websites, applications, and design systems.",
      iconUrl: "https://www.figma.com/favicon.ico",
      folderId: fInspiration.id,
      isFavorite: true,
      tags: ["figma", "design", "ui", "collaboration"],
      visitCount: 95,
    },
    {
      title: "Godly - Curated web design inspiration",
      url: "https://godly.website",
      canonicalUrl: "https://godly.website",
      domain: "godly.website",
      description: "Astronomically good web design inspiration from all over the internet. Updated daily.",
      iconUrl: "https://godly.website/favicon.ico",
      folderId: fInspiration.id,
      isFavorite: true,
      tags: ["design", "inspiration", "minimalism"],
      visitCount: 38,
    },

    // Typography & Assets
    {
      title: "Google Fonts - Library of open source fonts and icons",
      url: "https://fonts.google.com",
      canonicalUrl: "https://fonts.google.com",
      domain: "fonts.google.com",
      description: "Making the web more beautiful, fast, and open through great typography and accessible icons.",
      iconUrl: "https://fonts.google.com/favicon.ico",
      folderId: fTypography.id,
      isFavorite: false,
      tags: ["typography", "fonts", "google", "assets"],
      visitCount: 24,
    },
    {
      title: "Geist Font - Font by Vercel for modern software engineering",
      url: "https://vercel.com/font",
      canonicalUrl: "https://vercel.com/font",
      domain: "vercel.com",
      description: "Geist is a typeface designed for developer aesthetics, readability, and modern web software.",
      iconUrl: "https://vercel.com/favicon.ico",
      folderId: fTypography.id,
      isFavorite: true,
      tags: ["fonts", "typography", "vercel", "code"],
      visitCount: 33,
    },
    {
      title: "Unsplash - Beautiful Free Images & Pictures",
      url: "https://unsplash.com",
      canonicalUrl: "https://unsplash.com",
      domain: "unsplash.com",
      description: "Over 4.5 million free high-resolution images brought to you by the world's most generous community of photographers.",
      iconUrl: "https://unsplash.com/favicon.ico",
      folderId: fTypography.id,
      isFavorite: false,
      tags: ["photos", "stock", "assets", "creative"],
      visitCount: 17,
    },

    // Productivity & Tools
    {
      title: "Notion - The all-in-one connected workspace",
      url: "https://www.notion.so",
      canonicalUrl: "https://www.notion.so",
      domain: "notion.so",
      description: "A new tool that blends your everyday work apps into one. It is the all-in-one workspace for you and your team.",
      iconUrl: "https://www.notion.so/favicon.ico",
      folderId: fNotes.id,
      isFavorite: true,
      tags: ["notion", "productivity", "notes", "workspace"],
      visitCount: 110,
    },
    {
      title: "Obsidian - Sharpen your thinking",
      url: "https://obsidian.md",
      canonicalUrl: "https://obsidian.md",
      domain: "obsidian.md",
      description: "Obsidian is the private and flexible writing app that adapts to the way you think, with local markdown storage.",
      iconUrl: "https://obsidian.md/favicon.ico",
      folderId: fNotes.id,
      isFavorite: true,
      tags: ["notes", "markdown", "knowledge", "local"],
      visitCount: 48,
    },
    {
      title: "Linear - A better way to build software products",
      url: "https://linear.app",
      canonicalUrl: "https://linear.app",
      domain: "linear.app",
      description: "Linear is a purpose-built tool for planning and building products. Streamline issues, projects, and product roadmaps.",
      iconUrl: "https://linear.app/favicon.ico",
      folderId: fProductivity.id,
      isFavorite: true,
      tags: ["linear", "pm", "agile", "issues"],
      visitCount: 65,
    },
    {
      title: "GitHub - Build and ship software on a single platform",
      url: "https://github.com",
      canonicalUrl: "https://github.com",
      domain: "github.com",
      description: "GitHub is where over 100 million developers shape the future of software, together. Contribute to the open source community.",
      iconUrl: "https://github.com/favicon.ico",
      folderId: fDevTools.id,
      isFavorite: true,
      tags: ["git", "github", "code", "devtools"],
      visitCount: 140,
    },
    {
      title: "Raycast - Supercharged productivity launcher for macOS and Windows",
      url: "https://www.raycast.com",
      canonicalUrl: "https://www.raycast.com",
      domain: "raycast.com",
      description: "Raycast is a blazingly fast, totally extendable launcher. It lets you complete tasks, calculate, share common links, and much more.",
      iconUrl: "https://www.raycast.com/favicon.ico",
      folderId: fDevTools.id,
      isFavorite: true,
      tags: ["productivity", "launcher", "tools", "raycast"],
      visitCount: 57,
    },
    {
      title: "Vercel - Develop. Preview. Ship.",
      url: "https://vercel.com",
      canonicalUrl: "https://vercel.com",
      domain: "vercel.com",
      description: "Vercel's Frontend Cloud provides the developer experience and infrastructure to build, scale, and secure a faster, more personalized web.",
      iconUrl: "https://vercel.com/favicon.ico",
      folderId: fDevTools.id,
      isFavorite: true,
      tags: ["deployment", "cloud", "vercel", "hosting"],
      visitCount: 71,
    },
    {
      title: "Railway - Instant application deployments and infrastructure",
      url: "https://railway.app",
      canonicalUrl: "https://railway.app",
      domain: "railway.app",
      description: "Railway is an infrastructure platform where you can provision infrastructure, develop locally, and deploy to the cloud.",
      iconUrl: "https://railway.app/favicon.ico",
      folderId: fDevTools.id,
      isFavorite: false,
      tags: ["deployment", "cloud", "docker", "infra"],
      visitCount: 26,
    },

    // Reading & Research
    {
      title: "Hacker News - Y Combinator Tech & Startup News",
      url: "https://news.ycombinator.com",
      canonicalUrl: "https://news.ycombinator.com",
      domain: "news.ycombinator.com",
      description: "Hacker News is a social news website focusing on computer science, entrepreneurship, and software engineering.",
      iconUrl: "https://news.ycombinator.com/favicon.ico",
      folderId: fReading.id,
      isFavorite: true,
      tags: ["news", "tech", "startups", "reading"],
      visitCount: 92,
    },
    {
      title: "MDN Web Docs - Web Technology for Developers",
      url: "https://developer.mozilla.org",
      canonicalUrl: "https://developer.mozilla.org",
      domain: "developer.mozilla.org",
      description: "The MDN Web Docs site provides information about Open Web technologies including HTML, CSS, and APIs for both Web sites and progressive web apps.",
      iconUrl: "https://developer.mozilla.org/favicon.ico",
      folderId: fReading.id,
      isFavorite: true,
      tags: ["mdn", "docs", "javascript", "web"],
      visitCount: 84,
    },
    {
      title: "Refactoring Guru - Design Patterns & Refactoring Guide",
      url: "https://refactoring.guru",
      canonicalUrl: "https://refactoring.guru",
      domain: "refactoring.guru",
      description: "Refactoring Guru makes it easy for you to learn everything about refactoring, design patterns, SOLID principles, and other programming topics.",
      iconUrl: "https://refactoring.guru/favicon.ico",
      folderId: fReading.id,
      isFavorite: false,
      tags: ["architecture", "patterns", "clean-code", "refactoring"],
      visitCount: 30,
    },
    {
      title: "Martin Fowler - ThoughtWorks Essays on Architecture",
      url: "https://martinfowler.com",
      canonicalUrl: "https://martinfowler.com",
      domain: "martinfowler.com",
      description: "Refactoring, continuous delivery, software design, agile methodologies, and microservices architecture essays by Martin Fowler.",
      iconUrl: "https://martinfowler.com/favicon.ico",
      folderId: fReading.id,
      isFavorite: true,
      tags: ["architecture", "articles", "agile", "reading"],
      visitCount: 25,
    },
    {
      title: "Smashing Magazine - For Web Designers and Developers",
      url: "https://www.smashingmagazine.com",
      canonicalUrl: "https://www.smashingmagazine.com",
      domain: "smashingmagazine.com",
      description: "Smashing Magazine delivers reliable, useful articles on web design, UX, accessibility, and front-end development.",
      iconUrl: "https://www.smashingmagazine.com/favicon.ico",
      folderId: fReading.id,
      isFavorite: false,
      tags: ["articles", "css", "web", "design"],
      visitCount: 17,
    },

    // Additional items to reach 60+ bookmarks with diverse domains and tags
    {
      title: "Stripe Documentation - Payments infrastructure for the internet",
      url: "https://stripe.com/docs",
      canonicalUrl: "https://stripe.com/docs",
      domain: "stripe.com",
      description: "Complete guide to integrating online payments, subscriptions, and financial infrastructure with Stripe.",
      iconUrl: "https://stripe.com/favicon.ico",
      folderId: fBackend.id,
      isFavorite: true,
      tags: ["stripe", "payments", "api", "fintech"],
      visitCount: 44,
    },
    {
      title: "Docker - Accelerated Container Application Development",
      url: "https://www.docker.com",
      canonicalUrl: "https://www.docker.com",
      domain: "docker.com",
      description: "Docker helps developers bring their ideas to life by conquering the complexity of app development with containers.",
      iconUrl: "https://www.docker.com/favicon.ico",
      folderId: fDevTools.id,
      isFavorite: false,
      tags: ["docker", "devops", "containers"],
      visitCount: 36,
    },
    {
      title: "Kubernetes - Production-Grade Container Orchestration",
      url: "https://kubernetes.io",
      canonicalUrl: "https://kubernetes.io",
      domain: "kubernetes.io",
      description: "Kubernetes is an open-source system for automating deployment, scaling, and management of containerized applications.",
      iconUrl: "https://kubernetes.io/favicon.ico",
      folderId: fBackend.id,
      isFavorite: false,
      tags: ["k8s", "devops", "containers", "orchestration"],
      visitCount: 19,
    },
    {
      title: "GraphQL - A query language for your API",
      url: "https://graphql.org",
      canonicalUrl: "https://graphql.org",
      domain: "graphql.org",
      description: "GraphQL provides a complete and understandable description of the data in your API, giving clients the power to ask for what they need.",
      iconUrl: "https://graphql.org/favicon.ico",
      folderId: fBackend.id,
      isFavorite: false,
      tags: ["graphql", "api", "backend"],
      visitCount: 21,
    },
    {
      title: "Apache ECharts - An Open Source JavaScript Charting Library",
      url: "https://echarts.apache.org",
      canonicalUrl: "https://echarts.apache.org",
      domain: "apache.org",
      description: "A powerful, interactive charting and data visualization library for browser.",
      iconUrl: "https://echarts.apache.org/favicon.ico",
      folderId: fFrontend.id,
      isFavorite: true,
      tags: ["charts", "visualization", "echarts", "javascript"],
      visitCount: 40,
    },
    {
      title: "Vitest - Blazing Fast Unit Test Framework",
      url: "https://vitest.dev",
      canonicalUrl: "https://vitest.dev",
      domain: "vitest.dev",
      description: "A Vite-native unit test framework. It is fast, lightweight, and supports TypeScript and ESM out of the box.",
      iconUrl: "https://vitest.dev/favicon.ico",
      folderId: fDevTools.id,
      isFavorite: true,
      tags: ["testing", "vitest", "vite", "typescript"],
      visitCount: 33,
    },
    {
      title: "Playwright - Fast and reliable end-to-end testing for modern web apps",
      url: "https://playwright.dev",
      canonicalUrl: "https://playwright.dev",
      domain: "playwright.dev",
      description: "Playwright enables reliable end-to-end testing for modern web apps across Chromium, Firefox, and WebKit.",
      iconUrl: "https://playwright.dev/favicon.ico",
      folderId: fDevTools.id,
      isFavorite: true,
      tags: ["testing", "e2e", "playwright", "automation"],
      visitCount: 37,
    },
    {
      title: "Zod - TypeScript-first schema validation with static type inference",
      url: "https://zod.dev",
      canonicalUrl: "https://zod.dev",
      domain: "zod.dev",
      description: "TypeScript-first schema declaration and validation library. The goal is to eliminate duplicative type declarations.",
      iconUrl: "https://zod.dev/favicon.ico",
      folderId: fEngineering.id,
      isFavorite: true,
      tags: ["typescript", "validation", "zod", "schema"],
      visitCount: 50,
    },
    {
      title: "Tailwind UI - Official Tailwind CSS Components & Templates",
      url: "https://tailwindui.com",
      canonicalUrl: "https://tailwindui.com",
      domain: "tailwindui.com",
      description: "Over 500+ beautifully designed, component examples designed by the creators of Tailwind CSS.",
      iconUrl: "https://tailwindui.com/favicon.ico",
      folderId: fCSS.id,
      isFavorite: false,
      tags: ["tailwind", "ui", "templates", "components"],
      visitCount: 28,
    },
    {
      title: "Postman - The API Platform for Building and Using APIs",
      url: "https://www.postman.com",
      canonicalUrl: "https://www.postman.com",
      domain: "postman.com",
      description: "Postman is an API platform for building and using APIs. Postman simplifies each step of the API lifecycle.",
      iconUrl: "https://www.postman.com/favicon.ico",
      folderId: fDevTools.id,
      isFavorite: false,
      tags: ["api", "testing", "postman", "devtools"],
      visitCount: 22,
    },
    {
      title: "Sentry - Application Performance Monitoring & Error Tracking",
      url: "https://sentry.io",
      canonicalUrl: "https://sentry.io",
      domain: "sentry.io",
      description: "Sentry's application monitoring platform helps every developer see performance issues and fix crashes fast.",
      iconUrl: "https://sentry.io/favicon.ico",
      folderId: fDevTools.id,
      isFavorite: false,
      tags: ["monitoring", "observability", "errors", "sentry"],
      visitCount: 16,
    },
    {
      title: "Cloudflare - The Web Performance & Security Company",
      url: "https://www.cloudflare.com",
      canonicalUrl: "https://www.cloudflare.com",
      domain: "cloudflare.com",
      description: "Cloudflare is an internet security and performance company helping make the web fast and secure for everyone.",
      iconUrl: "https://www.cloudflare.com/favicon.ico",
      folderId: fDevTools.id,
      isFavorite: true,
      tags: ["cdn", "dns", "security", "cloudflare", "edge"],
      visitCount: 45,
    },
    {
      title: "Unsorted Bookmark: Quick article on CSS Grid",
      url: "https://css-tricks.com/snippets/css/complete-guide-grid",
      canonicalUrl: "https://css-tricks.com/snippets/css/complete-guide-grid",
      domain: "css-tricks.com",
      description: "A complete guide to CSS Grid, focusing on all the settings both for the grid parent container and the grid child elements.",
      iconUrl: "https://css-tricks.com/favicon.ico",
      folderId: null, // Test inbox / unsorted!
      isFavorite: false,
      tags: ["css", "grid", "guide"],
      visitCount: 9,
    },
    {
      title: "Unsorted Bookmark: Clean Architecture in TypeScript",
      url: "https://khalilstemmler.com/articles/software-design-architecture/clean-architecture",
      canonicalUrl: "https://khalilstemmler.com/articles/software-design-architecture/clean-architecture",
      domain: "khalilstemmler.com",
      description: "Explaining Uncle Bob's Clean Architecture concept applied to production TypeScript enterprise apps.",
      iconUrl: "https://khalilstemmler.com/favicon.ico",
      folderId: null, // Test inbox / unsorted!
      isFavorite: true,
      tags: ["architecture", "typescript", "design"],
      visitCount: 14,
    },
    {
      title: "Old Bookmark in Archive: Webpack 4 Guide",
      url: "https://webpack.js.org/concepts",
      canonicalUrl: "https://webpack.js.org/concepts",
      domain: "webpack.js.org",
      description: "At its core, webpack is a static module bundler for modern JavaScript applications.",
      iconUrl: "https://webpack.js.org/favicon.ico",
      folderId: fFrontend.id,
      isFavorite: false,
      tags: ["webpack", "bundler", "legacy"],
      visitCount: 4,
    },
    {
      title: "Dead Link Demo: Deprecated API Documentation",
      url: "https://example.com/dead-deprecated-endpoint-404",
      canonicalUrl: "https://example.com/dead-deprecated-endpoint-404",
      domain: "example.com",
      description: "A simulated broken link to verify dead link detection and filter badges in Markly.",
      iconUrl: "https://example.com/favicon.ico",
      folderId: fEngineering.id,
      isFavorite: false,
      tags: ["deprecated", "broken"],
      visitCount: 1,
    },
  ];

  // Distribute creation timestamps across past 30 days for rich timeline and activity heatmap charts
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  let count = 0;
  for (let i = 0; i < rawBookmarks.length; i++) {
    const item = rawBookmarks[i];
    // Spread creation dates across the past 28 days
    const dayOffset = (i * 3) % 28;
    const createdAt = now - dayOffset * dayMs - (i * 1234567);

    const isArchived = item.title.includes("Old Bookmark in Archive");
    const isDead = item.title.includes("Dead Link Demo");

    const created = BookmarkRepository.createBookmark({
      title: item.title,
      url: item.url,
      canonicalUrl: item.canonicalUrl,
      domain: item.domain,
      description: item.description,
      iconUrl: item.iconUrl,
      folderId: item.folderId,
      isFavorite: item.isFavorite,
      tagNames: item.tags,
      userId: DEFAULT_USER_ID,
    });

    // Update created_at and status
    sqlite.prepare(`
      UPDATE bookmarks
      SET created_at = ?, visit_count = ?, is_archived = ?, status = ?
      WHERE id = ?
    `).run(createdAt, item.visitCount, isArchived ? 1 : 0, isDead ? "dead" : "alive", created.id);

    count++;
  }

  console.log(`✅ Seeded ${count} bookmarks with realistic metadata, tags, and timestamps.`);
}

// Run directly when called via tsx
if (require.main === module || process.argv[1]?.includes("seed.ts")) {
  runSeed();
  process.exit(0);
}

