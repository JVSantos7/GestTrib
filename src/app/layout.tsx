import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Cabecalho } from "@/components/layout/Cabecalho";
import { MenuLateral } from "@/components/layout/MenuLateral";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GestTrib",
    template: "%s | GestTrib",
  },
  description:
    "Sistema de gestão tributária municipal (projeto de portfólio com dados fictícios).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Cabecalho />
        <div className="flex flex-1 flex-col md:flex-row">
          <MenuLateral />
          <main className="flex-1 bg-zinc-50 p-4 dark:bg-black md:p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
