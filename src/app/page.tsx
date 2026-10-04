import Link from "next/link";
import { SCENARIOS } from "@/lib/scenarios";

const wrap = "mx-auto max-w-[1180px] px-5 sm:px-8";

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden pb-14 pt-16 sm:pt-24">
        <div className="pointer-events-none absolute -right-40 -top-52 h-[560px] w-[560px] bg-[radial-gradient(circle,rgba(201,161,48,0.10)_0%,transparent_70%)]" />
        <div className={`${wrap} relative grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr] md:gap-16`}>
          <div>
            <div className="eyebrow">AI tréning ku kurzu Strhni Dav</div>
            <h1 className="text-[clamp(44px,6vw,78px)] leading-[0.98] tracking-[-0.01em]">
              Trénuj charizmu<br />
              <em>nahlas</em>
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg leading-[1.65] text-muted">
              AI partner, s ktorým sa rozprávaš <b className="font-semibold text-cream">hlasom</b> ako s človekom —
              na rande, pri predaji, na pohovore či v náročnom rozhovore. Po každom tréningu dostaneš{" "}
              <b className="font-semibold text-cream">úprimné vyhodnotenie</b> a sleduješ svoj progres.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link href="/train" className="btn">Začať trénovať</Link>
              <a href="#cena" className="btn btn-ghost">Pozrieť cenu</a>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <span className="badge">Prvé rande</span>
              <span className="font-label text-[13px] tracking-[0.04em] text-muted">
                Náročnosť <b className="text-gold-bright">stredná</b>
              </span>
            </div>
            <div className="space-y-3 px-6 py-6 text-sm">
              <p className="max-w-[85%] rounded-sm bg-bg-alt px-4 py-2">Ahoj, tak predsa si to našiel. Dlho si hľadal?</p>
              <p className="ml-auto max-w-[85%] rounded-sm bg-gold px-4 py-2 text-bg">
                Chvíľu áno — ale tipujem, že ty si sem chodíš často, vyzeráš tu ako doma.
              </p>
              <p className="max-w-[85%] rounded-sm bg-bg-alt px-4 py-2">Haha, máš pravdu. Ako si to uhádol?</p>
            </div>
            <div className="border-t border-line px-6 py-5">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-[19px] font-medium">Vyhodnotenie</span>
                <span className="font-display text-4xl font-semibold text-gold-bright">78</span>
              </div>
              <p className="mt-3 border-t border-line pt-3 text-sm leading-[1.55] text-muted">
                <b className="font-semibold text-cream">Silná stránka:</b> hravé tipovanie namiesto výsluchu otázkami.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line py-16 sm:py-22">
        <div className={wrap}>
          <div className="eyebrow">Ako to funguje</div>
          <h2 className="max-w-[18ch] text-[clamp(30px,4vw,44px)]">Teóriu poznáš. Teraz ju natrénuj.</h2>
          <div className="mt-12 grid gap-11 md:grid-cols-2 md:gap-16">
            <div>
              <span className="label mb-4 inline-block rounded-sm border border-wine/50 bg-wine/20 px-2.5 py-1 text-wine-soft">
                Bez tréningu
              </span>
              <h3 className="mb-3 text-[26px]">Vieš, čo robiť — kým to nepríde</h3>
              <p className="leading-[1.7] text-muted">
                Princípy z knihy či kurzu dávajú zmysel. Lenže v skutočnom rozhovore príde tréma, výpadok
                a staré návyky. Bez praxe sa vedomosti nezmenia na zručnosť.
              </p>
            </div>
            <div>
              <span className="label mb-4 inline-block rounded-sm border border-gold/40 bg-gold/15 px-2.5 py-1 text-gold-bright">
                S AI partnerom
              </span>
              <h3 className="mb-3 text-[26px]">Bezpečná prax, kedykoľvek</h3>
              <p className="leading-[1.7] text-muted">
                Rozprávaš sa nahlas s partnerom, ktorý reaguje ako skutočný človek. Po rozhovore vidíš, čo
                fungovalo, čo zlepšiť a ktoré tvoje vety rozhodli.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line py-16 sm:py-22">
        <div className={wrap}>
          <div className="eyebrow">Scenáre</div>
          <h2 className="max-w-[18ch] text-[clamp(30px,4vw,44px)]">Situácie, ktoré chceš zvládnuť</h2>
          <p className="mt-5 max-w-[58ch] text-[17px] leading-[1.7] text-muted">
            Každý scenár má tri úrovne náročnosti. Vlastný scenár si opíšeš sám — od rozhovoru s klientom až po
            rozhovor s rodičmi.
          </p>
          <div className="mt-11 border-t border-line">
            {SCENARIOS.map((s, i) => (
              <div
                key={s.id}
                className="grid grid-cols-[34px_1fr] gap-4 border-b border-line px-1 py-5 transition-colors hover:bg-gold/[0.035] sm:grid-cols-[52px_1fr] sm:gap-6"
              >
                <span className="pt-1 font-label text-[15px] tabular-nums text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="font-display text-[18.5px] font-medium leading-[1.3]">{s.title}</div>
                  <p className="mt-1.5 max-w-[56ch] text-[14.5px] leading-[1.6] text-muted">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cena" className="border-t border-line py-16 sm:py-22">
        <div className={wrap}>
          <div className="eyebrow">Predplatné</div>
          <h2 className="max-w-[18ch] text-[clamp(30px,4vw,44px)]">Jedna cena, denný tréning</h2>
          <div className="card mt-11 grid items-center gap-10 p-7 sm:p-14 md:grid-cols-[1fr_auto]">
            <div>
              <div className="font-display text-[clamp(56px,7vw,88px)] font-semibold leading-none text-gold-bright">
                49 €<span className="ml-1 font-sans text-[0.35em] font-medium text-muted">/ mesiac</span>
              </div>
              <ul className="mt-6 flex flex-col gap-2.5">
                {[
                  "Až 2 hodiny hlasového tréningu denne (fair use)",
                  "Všetky scenáre + vlastné situácie, 3 úrovne náročnosti",
                  "Detailné vyhodnotenie po každom rozhovore",
                  "História a sledovanie progresu",
                  "Potrebuješ viac? Dokúp si kredity",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5 text-[15px] text-muted">
                    <span className="text-gold">—</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3 md:w-[280px]">
              <Link href="/dashboard" className="btn">Aktivovať predplatné</Link>
              <a href="https://strhnidav.sk/kurz.html" className="btn btn-ghost">Pozrieť kurz Strhni Dav</a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line py-16 sm:py-22">
        <div className={wrap}>
          <p className="max-w-[22ch] font-display text-[clamp(24px,3.4vw,36px)] font-medium italic leading-[1.35]">
            Kurz ti dá <b className="font-semibold not-italic text-gold-bright">mapu</b>. Tréning z nej urobí{" "}
            <b className="font-semibold not-italic text-gold-bright">zručnosť</b>.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/train" className="btn">Začať trénovať</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
