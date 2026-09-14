import { useCallback, useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Dial } from "@/components/Dial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  formatMm,
  isReadingCorrect,
  randomReading,
  readingHelpText,
  type Reading,
} from "@/lib/dial";
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  RotateCcw,
  XCircle,
} from "lucide-react";

type Step = "identity" | "exercise";
type Feedback = { ok: boolean; expected: number; given: number } | null;

const STUDENT_KEY = "dial-reader-student";

function loadStoredStudent(): {
  studentId: Id<"students">;
  nom: string;
  prenom: string;
  classe: string;
} | null {
  try {
    const raw = localStorage.getItem(STUDENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.studentId && parsed?.nom && parsed?.prenom && parsed?.classe) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export default function Exercise() {
  const [student, setStudent] = useState(loadStoredStudent);
  const [step, setStep] = useState<Step>(() =>
    loadStoredStudent() ? "exercise" : "identity",
  );

  const [nom, setNom] = useState(student?.nom ?? "");
  const [prenom, setPrenom] = useState(student?.prenom ?? "");
  const [classe, setClasse] = useState(student?.classe ?? "");
  const [idError, setIdError] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);

  const [reading, setReading] = useState<Reading>(() => randomReading());
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [help, setHelp] = useState(false);
  const startTime = useRef<number>(Date.now());
  const answerRef = useRef<HTMLInputElement>(null);

  const identify = useMutation(api.exercises.identifyStudent);
  const recordAttempt = useMutation(api.exercises.recordAttempt);
  const progress = useQuery(
    api.exercises.getStudentProgress,
    student ? { studentId: student.studentId } : "skip",
  );

  const redraw = useCallback(() => {
    setReading(randomReading());
    setAnswer("");
    setFeedback(null);
    setHelp(false);
    startTime.current = Date.now();
    answerRef.current?.focus();
  }, []);

  useEffect(() => {
    startTime.current = Date.now();
  }, []);

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !prenom.trim() || !classe.trim()) {
      setIdError("Merci de remplir les trois champs.");
      return;
    }
    setIdentifying(true);
    setIdError(null);
    try {
      const studentId = await identify({
        nom: nom.trim(),
        prenom: prenom.trim(),
        classe: classe.trim(),
      });
      const s = {
        studentId,
        nom: nom.trim(),
        prenom: prenom.trim(),
        classe: classe.trim(),
      };
      localStorage.setItem(STUDENT_KEY, JSON.stringify(s));
      setStudent(s);
      setStep("exercise");
      startTime.current = Date.now();
    } catch {
      setIdError("Impossible d'enregistrer l'identification. Réessayez.");
    } finally {
      setIdentifying(false);
    }
  };

  const submitAnswer = async (raw: string) => {
    const parsed = Number.parseFloat(raw.replace(",", "."));
    if (!Number.isFinite(parsed)) return;
    const ok = isReadingCorrect(reading.value, parsed);
    setFeedback({ ok, expected: reading.value, given: parsed });
    if (student) {
      try {
        await recordAttempt({
          studentId: student.studentId,
          expected: reading.value,
          value: parsed,
          correct: ok,
          usedHelp: help,
          seconds: Math.round((Date.now() - startTime.current) / 1000),
        });
      } catch {
        /* la correction reste affichée même si l'enregistrement échoue */
      }
    }
  };

  const handleAnswerForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback) return;
    void submitAnswer(answer);
  };

  if (step === "identity" || !student) {
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
              Vos progrès sont enregistrés avec votre nom, votre prénom et votre
              classe. Aucune adresse mail n'est demandée.
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
              <Button type="submit" disabled={identifying} className="mt-2">
                {identifying ? "Enregistrement…" : "Commencer l'exercice"}
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
            <div className="flex items-baseline justify-between">
              <h1 className="text-lg font-semibold tracking-tight">
                Exercice 1 — Lecture d'un comparateur 0–25 mm
              </h1>
              <span className="text-xs text-muted-foreground">
                {student.prenom} {student.nom.toUpperCase()} · {student.classe}
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
                      feedback.ok
                        ? "border-border bg-secondary"
                        : "border-destructive/30 bg-destructive/5"
                    }`}
                  >
                    {feedback.ok ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-foreground" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    )}
                    <div className="text-sm leading-6">
                      {feedback.ok ? (
                        <p>
                          <span className="font-semibold">Juste.</span>{" "}
                          {formatMm(feedback.expected)}&nbsp;mm
                        </p>
                      ) : (
                        <p>
                          <span className="font-semibold">Faux.</span> Vous
                          avez répondu {formatMm(feedback.given)}&nbsp;mm, la
                          bonne mesure était{" "}
                          <span className="font-semibold font-num">
                            {formatMm(feedback.expected)}&nbsp;mm
                          </span>
                          .
                        </p>
                      )}
                      {!feedback.ok && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {readingHelpText(r)}
                        </p>
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

            {/* Progression */}
            <div className="mt-6 rounded-lg border border-border/70 bg-card p-6">
              <h2 className="text-sm font-semibold tracking-tight">
                Votre progression
              </h2>
              {progress && progress.total > 0 ? (
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <dt className="text-xs text-muted-foreground">Réponses</dt>
                    <dd className="font-num text-lg font-semibold">
                      {progress.total}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Réussies</dt>
                    <dd className="font-num text-lg font-semibold">
                      {progress.correct}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Réussite</dt>
                    <dd className="font-num text-lg font-semibold">
                      {progress.accuracy}%
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Aucune réponse pour l'instant. Vos résultats s'afficheront ici.
                </p>
              )}
              <button
                type="button"
                className="mt-4 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                onClick={() => {
                  localStorage.removeItem(STUDENT_KEY);
                  setStudent(null);
                  setStep("identity");
                }}
              >
                Changer d'élève
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
