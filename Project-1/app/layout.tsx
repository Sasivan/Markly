import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { PwaRegistrar } from "@/components/pwa-registrar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Markly — Notion-Style Bookmark Manager & Visual Analytics",
  description: "A fast, Notion-style bookmark manager with visual analytics, unlimited folder nesting, and intelligent scraping.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var a=localStorage.getItem('markly_accent');if(a){document.documentElement.setAttribute('data-accent',a);}}catch(e){}`,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary`}>
        <Providers>
          <PwaRegistrar />
          {children}
        </Providers>
      </body>
    </html>
  );
}

