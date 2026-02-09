import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ghost Network",
  description:
    "Ghost Network leaves no trace. End-to-end encrypted, token-based messaging prototype.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-zinc-100`}
      >
        <ErrorBoundary>
          <ToastProvider>
            <Providers>
              <div className="min-h-screen flex flex-col">
                <main className="flex-1 flex flex-col">{children}</main>
                <footer className="border-t border-zinc-800 px-4 py-2 text-xs text-zinc-500 flex items-center justify-between">
                  <span>Ghost Network Prototype</span>
                  <span>Licensed under AGPLv3</span>
                </footer>
              </div>
            </Providers>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

