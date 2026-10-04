import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { getUser } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "Strhni Dav – tréning charizmy s AI",
  description: "Hlasový AI partner na tréning komunikácie: rande, predaj, pohovory a ďalšie situácie.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();
  return (
    <html lang="sk" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-zinc-800">
          <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-bold">
              Strhni <span className="text-amber-400">Dav</span>
            </Link>
            {user ? (
              <div className="flex items-center gap-5 text-sm">
                <Link href="/train" className="hover:text-amber-300">Tréning</Link>
                <Link href="/dashboard" className="hover:text-amber-300">Môj progres</Link>
                <form action="/auth/signout" method="post">
                  <button className="text-zinc-400 hover:text-zinc-200">Odhlásiť</button>
                </form>
              </div>
            ) : (
              <Link href="/login" className="text-sm hover:text-amber-300">Prihlásiť sa</Link>
            )}
          </nav>
        </header>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
