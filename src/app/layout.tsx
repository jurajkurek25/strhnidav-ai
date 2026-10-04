import type { Metadata } from "next";
import Link from "next/link";
import { Big_Shoulders, Fraunces, Inter } from "next/font/google";
import { getUser } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/knowhow";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
});
const bigShoulders = Big_Shoulders({ variable: "--font-big-shoulders", subsets: ["latin", "latin-ext"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "Strhni Dav – tréning charizmy s AI",
  description: "Hlasový AI partner na tréning komunikácie: rande, predaj, pohovory a ďalšie situácie.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();
  return (
    <html
      lang="sk"
      className={`${fraunces.variable} ${bigShoulders.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <div className="grain" />
        <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md">
          <nav className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8 sm:py-5">
            <Link href="/" className="font-label text-[22px] font-bold uppercase tracking-[0.02em]">
              Strhni <span className="text-gold">Dav</span>
            </Link>
            {user ? (
              <div className="flex items-center gap-5 text-sm">
                <Link href="/train" className="hover:text-gold-bright">Tréning</Link>
                <Link href="/dashboard" className="hover:text-gold-bright">Môj progres</Link>
                {isAdmin(user.email) && (
                  <Link href="/admin" className="text-gold hover:text-gold-bright">Admin</Link>
                )}
                <form action="/auth/signout" method="post">
                  <button className="text-muted hover:text-cream">Odhlásiť</button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <span className="hidden font-label text-[15px] tracking-[0.03em] text-muted sm:inline">
                  <b className="font-bold text-gold-bright">49 €</b> / mesiac
                </span>
                <Link href="/login" className="btn btn-sm">Prihlásiť sa</Link>
              </div>
            )}
          </nav>
        </header>
        <div className="relative z-[2] flex-1">{children}</div>
        <footer className="relative z-[2] border-t border-line py-8">
          <div className="mx-auto flex max-w-[1180px] flex-wrap justify-between gap-3 px-5 text-[13.5px] text-muted sm:px-8">
            <span>Strhni Dav — AI tréning komunikácie</span>
            <span className="flex gap-6">
              <a href="https://strhnidav.sk/obchodne-podmienky" className="underline hover:text-gold-bright">
                Obchodné podmienky
              </a>
              <a href="https://strhnidav.sk/gdpr" className="underline hover:text-gold-bright">
                Ochrana osobných údajov
              </a>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
