import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { PwaRegistrar } from "@/components/pwa-registrar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-stack",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Markly — Visual Bookmark Workspace",
  description:
    "A precise, distraction-free bookmark workspace with visual analytics, nested collections, and an interactive knowledge graph.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0d" },
  ],
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
            __html: `try{var a=localStorage.getItem('markly_accent');if(a){document.documentElement.setAttribute('data-accent',a);}var c=localStorage.getItem('markly_accent_color');if(c){document.documentElement.style.setProperty('--primary',c);document.documentElement.style.setProperty('--ring',c);}}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${mono.variable} font-sans min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary`}
      >
        <Providers>
          <PwaRegistrar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
