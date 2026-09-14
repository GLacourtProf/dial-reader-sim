export type Reading = {
  /** Valeur totale affichée par le comparateur, en mm. */
  value: number;
  /** Lecture de la petite aiguille : nombre de tours complets (0 à 24). */
  revolutions: number;
  /** Lecture de la grande aiguille : reste dans le tour (0.00 à 0.99 mm). */
  fraction: number;
};

const EPS = 1e-9;

/**
 * Génère une valeur aléatoire de comparateur : multiples de 0,01 mm entre
 * 0,05 et 24,95 mm, en évitant les valeurs trop faciles (ex. 5,00 mm).
 */
export function randomReading(): Reading {
  for (;;) {
    const hundredths = 5 + Math.floor(Math.random() * 2491); // 5..2495
    const value = hundredths / 100;
    const revolutions = Math.floor(value + EPS);
    const fraction = value - revolutions;

    // Évite les valeurs "rondes" trop simples (ex. 5.00, 12.50)
    const isRound =
      Math.abs(fraction) < EPS ||
      Math.abs(fraction - 0.5) < EPS ||
      Math.abs(fraction - 0.25) < EPS ||
      Math.abs(fraction - 0.75) < EPS;
    if (isRound) continue;

    return { value, revolutions, fraction };
  }
}

/** La réponse est-elle correcte ? Tolérance ±0,01 mm (arrondi d'affichage). */
export function isReadingCorrect(expected: number, given: number): boolean {
  if (!Number.isFinite(given)) return false;
  return Math.abs(given - expected) <= 0.01 + EPS;
}

/** Formate une valeur en mm avec la virgule décimale française. */
export function formatMm(value: number, decimals = 2): string {
  return value.toFixed(decimals).replace(".", ",");
}

/**
 * Explication pédagogique de la lecture (affichée après une réponse fausse).
 */
export function readingHelpText(r: Reading): string {
  const rev = r.revolutions;
  const frac = r.fraction;

  if (rev === 0) {
    return `Petite aiguille entre 0 et 1 : 0 tour complet. Grande aiguille : ${formatMm(
      frac,
    )} mm. Total : ${formatMm(r.value)} mm.`;
  }

  const fracTxt =
    frac < EPS
      ? "exactement sur un multiple de 1 mm"
      : `Grande aiguille : ${formatMm(frac)} mm au-delà du multiple`;

  return `Petite aiguille : ${rev} tour${rev > 1 ? "s" : ""} complet${rev > 1 ? "s" : ""} (⇒ ${formatMm(rev, 0)} mm). ${fracTxt}. Total : ${formatMm(r.value)} mm.`;
}

/** Degrés de la grande aiguille pour une fraction donnée (0 → 0°, 0.50 → 180°). */
export function fractionToDegrees(fraction: number): number {
  return (((fraction % 1) + 1) % 1) * 360;
}
