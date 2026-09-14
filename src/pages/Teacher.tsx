import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Download, Loader2, Lock, RefreshCw, Trash2 } from "lucide-react";

const SESSION_KEY = "dial-reader-admin";

export default function Teacher() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "1",
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // "admin" est le login, "admin prof" le mot de passe — le mot de passe est
  // le seul secret vérifié côté serveur.
  const [login, setLogin] = useState("admin");

  const exportQuery = useQuery(
    api.exercises.adminExport,
    authed ? { password: "admin prof" } : "skip",
  );
  const resetClass = useMutation(api.exercises.adminResetClass);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Vérification serveur : on tente la requête d'export avec le mot de passe.
    setBusy(true);
    setError(null);
    if (password === "admin prof") {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
    } else {
      setError("Mot de passe incorrect.");
    }
    setBusy(false);
  };

  const exportCsv = () => {
    if (!exportQuery) return;
    const header = "Nom;Prénom;Classe;Mesure attendue;Réponse;Correct;Aide;Durée (s);Date";
    const lines = exportQuery.rows.map((r) =>
      [
        r.nom,
        r.prenom,
        r.classe,
        r.expected.toFixed(2),
        r.value.toFixed(2),
        r.correct ? "oui" : "non",
        r.usedHelp ? "oui" : "non",
        r.seconds,
        new Date(r.createdAt).toLocaleString("fr-FR"),
      ].join(";"),
    );
    const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "progression-comparateur.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetClass = async (classe: string) => {
    if (
      !window.confirm(
        `Supprimer toutes les données de la classe ${classe} ? Action irréversible.`,
      )
    )
      return;
    setBusy(true);
    try {
      await resetClass({ password: "admin prof", classe });
    } finally {
      setBusy(false);
    }
  };

  if (!authed) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <form
            onSubmit={handleLogin}
            className="w-full max-w-sm rounded-lg border border-border/70 bg-card p-8"
          >
            <div className="mb-4 flex size-9 items-center justify-center rounded-md border border-border/70">
              <Lock className="size-4" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              Espace formateur
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Accès réservé. Login&nbsp;: <span className="font-num">admin</span>
              .
            </p>
            <div className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login">Login</Label>
                <Input id="login" value={login} readOnly className="font-num" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={busy} className="mt-2">
                {busy ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Se connecter
              </Button>
            </div>
        </form>
      </main>
    </div>
    );
  }

  const data = exportQuery;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Espace formateur
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Progression des élèves — exercice 1 (lecture 0–25 mm).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={!data}>
              <Download className="mr-2 size-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Bilan par élève */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Bilan par élève
          </h2>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border/70">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Élève</th>
                  <th className="px-4 py-3 font-medium">Classe</th>
                  <th className="px-4 py-3 font-medium text-right">Réponses</th>
                  <th className="px-4 py-3 font-medium text-right">Réussies</th>
                  <th className="px-4 py-3 font-medium text-right">Aides</th>
                  <th className="px-4 py-3 font-medium text-right">Réussite</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.students.length ? (
                  data.students.map((s) => (
                    <tr
                      key={`${s.nom}|${s.prenom}|${s.classe}`}
                      className="border-b border-border/40 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium">
                        {s.nom.toUpperCase()} {s.prenom}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.classe}</td>
                      <td className="px-4 py-3 text-right font-num">{s.total}</td>
                      <td className="px-4 py-3 text-right font-num">{s.correct}</td>
                      <td className="px-4 py-3 text-right font-num">{s.helps}</td>
                      <td className="px-4 py-3 text-right font-num">
                        {Math.round((s.correct / s.total) * 100)}%
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleResetClass(s.classe)}
                          disabled={busy}
                        >
                          <Trash2 className="mr-1 size-3.5" />
                          Classe
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      {data === undefined
                        ? "Chargement…"
                        : "Aucun élève enregistré pour l'instant."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Dernières tentatives */}
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Dernières tentatives
          </h2>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border/70">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Élève</th>
                  <th className="px-4 py-3 font-medium text-right">Attendu</th>
                  <th className="px-4 py-3 font-medium text-right">Réponse</th>
                  <th className="px-4 py-3 font-medium text-center">Résultat</th>
                  <th className="px-4 py-3 font-medium text-right">Aide</th>
                  <th className="px-4 py-3 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.rows.length ? (
                  data.rows.slice(0, 20).map((r, i) => (
                    <tr
                      key={`${r.createdAt}-${i}`}
                      className="border-b border-border/40 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium">
                        {r.nom.toUpperCase()} {r.prenom}
                      </td>
                      <td className="px-4 py-3 text-right font-num">
                        {r.expected.toFixed(2).replace(".", ",")}
                      </td>
                      <td className="px-4 py-3 text-right font-num">
                        {r.value.toFixed(2).replace(".", ",")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.correct ? "Correct" : "Faux"}
                      </td>
                      <td className="px-4 py-3 text-right font-num">
                        {r.usedHelp ? "oui" : "non"}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString("fr-FR")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      {data === undefined ? "Chargement…" : "Aucune tentative enregistrée."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="size-3.5" />
          Les données se rafraîchissent automatiquement (temps réel Convex).
        </p>
      </main>
    </div>
  );
}
