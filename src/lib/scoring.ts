import { formatMm } from "./dial";

export type AnswerQuality = "centieme" | "dixieme" | "mm" | "faux";

const EPS = 1e-9;

/** Barème pondéré : exact au centième, sinon au dixième, sinon au mm, sinon faux. */
export const POINTS: Record<AnswerQuality, number> = {
  centieme: 1,
  dixieme: 0.75,
  mm: 0.5,
  faux: 0,
};

/** Appréciation littérale par niveau de précision. */
export const QUALITY_LABEL: Record<AnswerQuality, string> = {
  centieme: "Exact au centième",
  dixieme: "Exact au dixième",
  mm: "Exact au millimètre",
  faux: "Faux",
};

/**
 * Qualité d'une réponse : au centième de mm près (±0,005), au dixième
 * (±0,05), au millimètre entier (arrondi correct) ou complètement fausse.
 */
export function qualityOf(expected: number, given: number): AnswerQuality {
  if (!Number.isFinite(given)) return "faux";
  const d = Math.abs(given - expected);
  if (d < 0.005 + EPS) return "centieme";
  if (d < 0.05 + EPS) return "dixieme";
  if (d < 0.5 + EPS) return "mm";
  return "faux";
}

export type LocalAttempt = {
  expected: number; // valeur affichée par la simulation (mm)
  given: number; // valeur saisie par l'élève (mm)
  quality: AnswerQuality;
  usedHelp: boolean;
  createdAt: number;
};

export type Identity = {
  nom: string;
  prenom: string;
  classe: string;
};

export function countQuality(
  attempts: LocalAttempt[],
  q: AnswerQuality,
): number {
  return attempts.filter((a) => a.quality === q).length;
}

/** Score pondéré en pourcentage (100 = toutes les lectures exactes au centième). */
export function scorePct(attempts: LocalAttempt[]): number {
  if (attempts.length === 0) return 0;
  const points = attempts.reduce((sum, a) => sum + POINTS[a.quality], 0);
  return Math.round((points / attempts.length) * 100);
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

/** Génère le HTML autonome de la fiche (nom, prénom, classe, score, détails). */
export function buildSheetHtml(
  identity: Identity,
  attempts: LocalAttempt[],
): string {
  const total = attempts.length;
  const pct = scorePct(attempts);
  const counts = {
    centieme: countQuality(attempts, "centieme"),
    dixieme: countQuality(attempts, "dixieme"),
    mm: countQuality(attempts, "mm"),
    faux: countQuality(attempts, "faux"),
  };
  const helps = attempts.filter((a) => a.usedHelp).length;
  const dateTxt = new Date().toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const rows = attempts
    .map(
      (a, i) => `<tr>
  <td class="num">${i + 1}</td>
  <td class="num">${formatMm(a.expected)}</td>
  <td class="num">${formatMm(a.given)}</td>
  <td>${QUALITY_LABEL[a.quality]}</td>
  <td class="num">${POINTS[a.quality].toFixed(2).replace(".", ",")}</td>
  <td class="num">${a.usedHelp ? "oui" : "—"}</td>
</tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Fiche de résultats — ${esc(identity.prenom)} ${esc(identity.nom)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Inter", system-ui, -apple-system, sans-serif;
    color: #171717; background: #fff; padding: 40px 32px;
    max-width: 780px; margin: 0 auto; line-height: 1.5;
  }
  header { border-bottom: 2px solid #171717; padding-bottom: 16px; }
  header h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.01em; }
  header p { font-size: 12px; color: #666; margin-top: 4px; }
  h2 {
    font-size: 11px; font-weight: 600; letter-spacing: 0.18em;
    text-transform: uppercase; color: #666; margin: 28px 0 12px;
  }
  .identity { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 20px; }
  .identity div { border: 1px solid #e5e5e5; border-radius: 6px; padding: 10px 14px; }
  .identity dt { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #666; }
  .identity dd { font-size: 15px; font-weight: 600; margin-top: 2px; }
  .score { display: flex; align-items: baseline; gap: 10px; border: 1px solid #e5e5e5; border-radius: 6px; padding: 16px 20px; }
  .score .value { font-size: 40px; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
  .score .label { font-size: 12px; color: #666; }
  .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
  .stats div { border: 1px solid #e5e5e5; border-radius: 6px; padding: 10px 12px; text-align: center; }
  .stats dt { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #666; margin-top: 2px; }
  .stats dd { font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border-bottom: 1px solid #e5e5e5; padding: 7px 10px; text-align: left; }
  th { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #666; font-weight: 600; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .empty { border: 1px dashed #d4d4d4; border-radius: 6px; padding: 20px; font-size: 12px; color: #666; text-align: center; }
  footer { margin-top: 32px; border-top: 1px solid #e5e5e5; padding-top: 12px; font-size: 10px; color: #999; display: flex; justify-content: space-between; }
  @media print { body { padding: 12mm; } }
</style>
</head>
<body>
<header>
  <h1>Fiche de résultats — Exerciseur de comparateur</h1>
  <p>Lecture d'un comparateur 0–25 mm, résolution 0,01 mm · ${esc(dateTxt)}</p>
</header>

<dl class="identity">
  <div><dt>Nom</dt><dd>${esc(identity.nom)}</dd></div>
  <div><dt>Prénom</dt><dd>${esc(identity.prenom)}</dd></div>
  <div><dt>Classe</dt><dd>${esc(identity.classe)}</dd></div>
</dl>

<h2>Score</h2>
<div class="score">
  <span class="value">${pct}&nbsp;%</span>
  <span class="label">de réussite pondérée<br />(centième 1 pt · dixième 0,75 pt · mm 0,5 pt)</span>
</div>

<h2>Détail des ${total} tentative${total > 1 ? "s" : ""}</h2>
<div class="stats">
  <div><dt>Tentatives</dt><dd>${total}</dd></div>
  <div><dt>Au centième</dt><dd>${counts.centieme}</dd></div>
  <div><dt>Au dixième</dt><dd>${counts.dixieme}</dd></div>
  <div><dt>Au mm</dt><dd>${counts.mm}</dd></div>
  <div><dt>Fausses</dt><dd>${counts.faux}</dd></div>
</div>

<h2>Historique</h2>
${
    total === 0
      ? `<div class="empty">Aucune tentative enregistrée pour le moment.</div>`
      : `<table>
<thead><tr>
  <th class="num">N°</th><th class="num">Attendu (mm)</th><th class="num">Réponse (mm)</th>
  <th>Précision</th><th class="num">Points</th><th class="num">Aide</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
<p style="margin-top:10px; font-size:11px; color:#666;">Recours à l'aide&nbsp;: ${helps} fois sur ${total}.</p>`
  }

<footer>
  <span>Exerciseur de comparateur — fiche générée localement, aucune donnée en ligne.</span>
  <span>Barème : centième 1 pt · dixième 0,75 pt · mm 0,5 pt</span>
</footer>

<script>window.onload = function () { window.print(); };</script>
</body>
</html>`;
}