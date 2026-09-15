import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Dial } from "@/components/Dial";
import { ArrowRight, FileText, Ruler, Users } from "lucide-react";

const DEMO = { revolutions: 12, fraction: 0.48 };

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Métrologie · Lecture de comparateur
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
                Apprenez à lire un comparateur
                <span className="text-muted-foreground"> au centième.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
                Un exerciseur sobre et précis&nbsp;: une position est tirée au
                hasard entre 0 et 25&nbsp;mm, à vous de lire les deux aiguilles
                et d&apos;annoncer la mesure au centième de millimètre près.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild>
                  <a href="/exercice">
                    Commencer l&apos;exercice
                    <ArrowRight className="ml-2 size-4" />
                  </a>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Aucun compte, aucune donnée en ligne&nbsp;: tout reste sur votre
                appareil.
              </p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="rounded-xl border border-border/70 bg-card p-6 shadow-none">
                <Dial
                  fraction={DEMO.fraction}
                  revolutions={DEMO.revolutions}
                  size={340}
                  label="Exemple de comparateur : 12 mm et 48 centièmes"
                />
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Exemple de lecture&nbsp;: 12,48&nbsp;mm
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="border-t border-border/60" />
        </div>

        {/* Fonctionnement */}
        <section className="mx-auto w-full max-w-6xl px-6 py-16">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Comment ça se passe
          </h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: Users,
                title: "1 · Renseignez votre identité",
                body: "Nom, prénom, classe — uniquement pour la fiche. Aucun compte, aucune adresse mail.",
              },
              {
                icon: Ruler,
                title: "2 · Lisez le cadran",
                body: "Petite aiguille = tours complets, grande aiguille = centièmes. Saisissez la mesure.",
              },
              {
                icon: FileText,
                title: "3 · Générez votre fiche",
                body: "Score en pourcentage — du millimètre au centième près — et nombre de tentatives, dans une fiche imprimable.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex flex-col gap-3">
                <div className="flex size-9 items-center justify-center rounded-md border border-border/70 bg-card">
                  <Icon className="size-4 text-foreground" />
                </div>
                <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="border-t border-border/60">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-6 py-14 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Prêt à mesurer&nbsp;?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Chaque tirage est différent — entraînez-vous autant que vous
                voulez.
              </p>
            </div>
            <Button asChild>
              <a href="/exercice">
                Ouvrir l&apos;exerciceur
                <ArrowRight className="ml-2 size-4" />
              </a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span>Exerciceur de comparateur · v1 — lecture 0–25 mm</span>
          <span>Fiche générée localement · aucune donnée hébergée</span>
        </div>
      </footer>
    </div>
  );
}
