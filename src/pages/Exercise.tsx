import { useCallback, useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Dial } from "@/components/Dial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildSheetHtml,
  countQuality,
  qualityOf,
  scorePct,
  type AnswerQuality,
  type Identity,
  type LocalAttempt,
} from "@/lib/scoring";
import {
  formatMm,
  randomReading,
  readingHelpText,
  type Reading,
} from "@/lib/dial";
import {
  ArrowRight,
  CheckCircle2,
  FileDown,
  Lightbulb,
  RotateCcw,
  XCircle,
} from "lucide-react";

type Step = "identity" | "exercise";
type Feedback = {
  quality: AnswerQuality;
  expected: number;
  given: number;
} | null;

const IDENTITY_KEY = "dial-reader-identity";
const ATTEMPTS_KEY = "dial-reader-attempts";

function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Identity>;
    if (p?.nom && p?.prenom && p?.classe) return p as Identity;
  } catch {
    /* ignore */
  }
  return null;
}

function loadAttempts(): LocalAttempt[] {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    if (Array.isArray(p)) return p as LocalAttempt[];
  } catch {
    /* ignore */
  }
  return [];
}

const POINT_LABEL: Record<AnswerQuality, string> = {
  centieme: "+1 pt",
  dixieme: "+0,75 pt",
  mm: "+0,5 pt",
  faux: "0 pt",
};

export default function Exercise() {
  const [identity, setIdentity] = useState<Identity | null>(loadIdentity);
  const [step, setStep] = useState<Step>(() =>
    loadIdentity() ? "exercise" : "identity",
  );

  const [nom, setNom] = useState(() => loadIdentity()?.nom ?? "");
  const [prenom, setPrenom] = useState(() => loadIdentity()?.prenom ?? "");
  const [classe, setClasse] = useState(() => loadIdentity()?.classe ?? "");
  const [idError, setIdError] = useState<string | null>(null);

  const [attempts, setAttempts] = useState<LocalAttempt[]>(loadAttempts);
  const [reading, setReading] = useState<Reading>(() => randomReading());
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [help, setHelp] = useState(false);
  const answerRef = useRef<HTMLInputElement>(null);

  // Tout est local : les tentatives vivent uniquement dans ce navigateur.
  useEffect(() => {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  }, [attempts]);

  const redraw = useCallback(() => {
    setReading(randomReading());
    setAnswer("");
    setFeedback(null);
    setHelp(false);
    answerRef.current?.focus();
  }, []);

  const handleIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !prenom.trim() || !classe.trim()) {
      setIdError("Merci de remplir les trois champs.");
      return;
    }
    const id: Identity = {
      nom: nom.trim(),
      prenom: prenom.trim(),
      classe: classe.trim(),
    };
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(id));
    setIdentity(id);
    setStep("exercise");
  };

  const submitAnswer = (raw: string) => {
    const parsed = Number.parseFloat(raw.replace(",", "."));
    if (!Number.isFinite(parsed)) return;
    const quality = qualityOf(reading.value, parsed);
    setFeedback({ quality, expected: reading.value, given: parsed });
    setAttempts((prev) => [
      ...prev,
      {
        expected: reading.value,
        given: parsed,
        quality,
        usedHelp: help,
        createdAt: Date.now(),
      },
    ]);
  };

  const handleAnswerForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback) return;
    submitAnswer(answer);
  };

  const generateSheet = () => {
    if (!identity) return;
    const blob = new Blob([buildSheetHtml(identity, attempts)], {
      type: "text/html;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      `fiche-${identity.prenom}-${identity.nom}`
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-") + ".html";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (step === "identity" || !identity) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <form
            onSubmit={handleIdentify}
            className="w-full max-w-sm rounded-lg border border-border/70 bg-card p-8"
          >
            <h1 className="text-xl font-semibold tracking-tight">
              Identification
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Nom, prénom et classe — uniquement pour votre fiche de résultats.
              Tout reste sur cet appareil, rien n&apos;est envoyé en ligne.
            </p>
            <div className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nom">Nom</Label>
                <Input
                  id="nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Dupont"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prenom">Prénom</Label>
                <Input
                  id="prenom"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Léa"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="classe">Classe</Label>
                <Input
                  id="classe"
                  value={classe}
                  onChange={(e) => setClasse(e.target.value)}
                  placeholder="1ère MEI"
                />
              </div>
              {idError && <p className="text-sm text-destructive">{idError}</p>}
              <Button type="submit" className="mt-2">
                Commencer l&apos;exercice
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </form>
        </main>
      </div>
    );
  }

  const r = reading;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Cadran */}
          <section className="flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h1 className="text-lg font-semibold tracking-tight">
                Exercice 1 — Lecture d&apos;un comparateur 0–25 mm
              </h1>
              <span className="text-xs text-muted-foreground">
                {identity.prenom} {identity.nom.toUpperCase()} ·{" "}
                {identity.classe}
              </span>
            </div>
            <div className="mt-6 flex justify-center rounded-lg border border-border/70 bg-card p-8">
              <Dial
                fraction={r.fraction}
                revolutions={r.revolutions}
                highlight={help}
                size={380}
                label="Comparateur à cadran, mesure en cours"
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setHelp((h) => !h)}
                aria-pressed={help}
              >
                <Lightbulb className="mr-2 size-4" />
                {help ? "Masquer l'aide" : "Aide"}
              </Button>
              <Button type="button" variant="outline" onClick={redraw}>
                <RotateCcw className="mr-2 size-4" />
                Tirer une nouvelle mesure
              </Button>
            </div>
          </section>

          {/* Panneau réponse */}
          <section className="w-full lg:max-w-sm">
            <form
              onSubmit={handleAnswerForm}
              className="rounded-lg border border-border/70 bg-card p-6"
            >
              <h2 className="text-sm font-semibold tracking-tight">
                Valeur mesurée (mm)
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Petite aiguille = tours complets · grande aiguille = centièmes.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Input
                  ref={answerRef}
                  inputMode="decimal"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="ex. 12,48"
                  disabled={!!feedback}
                  className="font-num"
                  aria-label="Valeur mesurée en millimètres"
                />
                <span className="text-sm text-muted-foreground">mm</span>
              </div>
              {!feedback && (
                <Button type="submit" className="mt-4 w-full">
                  Vérifier ma réponse
                </Button>
              )}

              {feedback && (
                <div className="mt-4">
                  <div
                    className={`flex items-start gap-2 rounded-md border p-3 ${
                      feedback.quality === "faux"
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-border bg-secondary"
                    }`}
                  >
                    {feedback.quality === "faux" ? (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-foreground" />
                    )}
                    <div className="text-sm leading-6">
                      {feedback.quality === "centieme" && (
                        <p>
                          <span className="font-semibold">Juste.</span> Exact au
                          centième près :{" "}
                          <span className="font-num">
                            {formatMm(feedback.expected)}&nbsp;mm
                          </span>
                          .{" "}
                          <span className="font-num text-muted-foreground">
                            {POINT_LABEL[feedback.quality]}
                          </span>
                        </p>
                      )}
                      {feedback.quality === "dixieme" && (
                        <p>
                          <span className="font-semibold">Presque.</span> La
                          réponse est exacte au dixième de millimètre près
                          (écart ≤ 0,05&nbsp;mm), pas au centième.{" "}
                          <span className="font-num text-muted-foreground">
                            {POINT_LABEL[feedback.quality]}
                          </span>
                        </p>
                      )}
                      {feedback.quality === "mm" && (
                        <p>
                          <span className="font-semibold">
                            Au millimètre près seulement.
                          </span>{" "}
                          La réponse est exacte au millimètre près (écart ≤
                          0,5&nbsp;mm), pas au dixième.{" "}
                          <span className="font-num text-muted-foreground">
                            {POINT_LABEL[feedback.quality]}
                          </span>
                        </p>
                      )}
                      {feedback.quality === "faux" && (
                        <>
                          <p>
                            <span className="font-semibold">Faux.</span> Vous
                            avez répondu {formatMm(feedback.given)}&nbsp;mm, la
                            bonne mesure était{" "}
                            <span className="font-semibold font-num">
                              {formatMm(feedback.expected)}&nbsp;mm
                            </span>
                            .
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {readingHelpText(r)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="mt-4 w-full"
                    onClick={redraw}
                  >
                    <RotateCcw className="mr-2 size-4" />
                    Tirer à nouveau
                  </Button>
                </div>
              )}
            </form>

            {/* Résultats locaux + fiche */}
            <div className="mt-6 rounded-lg border border-border/70 bg-card p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold tracking-tight">
                  Vos résultats
                </h2>
                <span className="font-num text-lg font-semibold">
                  {scorePct(attempts)}&nbsp;%
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Score pondéré — centième 1&nbsp;pt · dixième 0,75&nbsp;pt ·
                millimètre 0,5&nbsp;pt.
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md border border-border/60 p-2">
                  <dt className="text-xs text-muted-foreground">Tentatives</dt>
                  <dd className="font-num text-base font-semibold">
                    {attempts.length}
                  </dd>
                </div>
                <div className="rounded-md border border-border/60 p-2">
                  <dt className="text-xs text-muted-foreground">Au centième</dt>
                  <dd className="font-num text-base font-semibold">
                    {countQuality(attempts, "centieme")}
                  </dd>
                </div>
                <div className="rounded-md border border-border/60 p-2">
                  <dt className="text-xs text-muted-foreground">Au dixième</dt>
                  <dd className="font-num text-base font-semibold">
                    {countQuality(attempts, "dixieme")}
                  </dd>
                </div>
                <div className="rounded-md border border-border/60 p-2">
                  <dt className="text-xs text-muted-foreground">Au mm</dt>
                  <dd className="font-num text-base font-semibold">
                    {countQuality(attempts, "mm")}
                  </dd>
                </div>
              </dl>
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full"
                onClick={generateSheet}
                disabled={attempts.length === 0}
              >
                <FileDown className="mr-2 size-4" />
                Générer la fiche de résultats
              </Button>
              <div className="mt-4 flex items-center justify-between text-xs">
                <button
                  type="button"
                  className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  onClick={() => setStep("identity")}
                >
                  Modifier l&apos;identité
                </button>
                <button
                  type="button"
                  className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  onClick={() => {
                    if (
                      attempts.length === 0 ||
                      window.confirm(
                        "Effacer tous les résultats de cet appareil ?",
                      )
                    ) {
                      setAttempts([]);
                    }
                  }}
                >
                  Effacer les résultats
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
