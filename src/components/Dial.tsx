import { memo } from "react";
import { fractionToDegrees } from "@/lib/dial";

export type DialProps = {
  /** Fraction dans le tour en cours, 0..1 (1 tour = 1 mm). */
  fraction: number;
  /** Nombre de tours complets 0..24 (petite aiguille). */
  revolutions: number;
  /** Mode aide : met en surbrillance les graduations alignées avec les aiguilles. */
  highlight?: boolean;
  label?: string;
  size?: number;
  className?: string;
};

const C = 200; // centre
const R_FACE = 190;

type Tick = { angle: number; major: boolean };

const TICKS: Tick[] = Array.from({ length: 100 }, (_, i) => ({
  angle: i * 3.6,
  major: i % 10 === 0,
}));

/** Étiquettes façon Mitutoyo 2052A : grand chiffre + petit chiffre à 90°. */
const LABELS: Array<{ i: number; big: string; small: string }> = [
  { i: 0, big: "0", small: "0" },
  { i: 10, big: "10", small: "90" },
  { i: 20, big: "20", small: "80" },
  { i: 30, big: "30", small: "70" },
  { i: 40, big: "40", small: "60" },
  { i: 50, big: "50", small: "50" },
  { i: 60, big: "60", small: "40" },
  { i: 70, big: "70", small: "30" },
  { i: 80, big: "80", small: "20" },
  { i: 90, big: "90", small: "10" },
];

function polar(angleDeg: number, radius: number, cx = C, cy = C) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
}

/** Sous-cadran des tours (petite aiguille), comme sur le comparateur réel. */
const SUB = { cx: C, cy: 140, r: 46 };
const SUB_LABELS = ["0", "5", "10", "15", "20"];

export const Dial = memo(function Dial({
  fraction,
  revolutions,
  highlight = false,
  label,
  size = 380,
  className,
}: DialProps) {
  const needleDeg = fractionToDegrees(fraction);
  const smallDeg = ((revolutions % 25) / 25) * 360;
  const hiIndex = ((Math.round(fraction * 100) % 100) + 100) % 100;
  const hiDeg = hiIndex * 3.6;

  const needleTip = polar(needleDeg, 148);
  const needleTail = polar(needleDeg + 180, 30);
  const smallTip = polar(smallDeg, SUB.r - 16, SUB.cx, SUB.cy);

  // Graduation du tour mise en évidence (aide) + graduation des tours (aide)
  const subTickStep = 360 / 25;
  const subHiIndex = ((revolutions % 25) + 25) % 25;
  const subHiDeg = subHiIndex * subTickStep;

  return (
    <svg
      viewBox="0 0 400 400"
      width={size}
      height={size}
      role="img"
      aria-label={label ?? "Comparateur à cadran, lecture en cours"}
      className={className}
    >
      {/* Cadran */}
      <circle cx={C} cy={C} r={R_FACE} className="fill-card stroke-foreground" strokeWidth="3" />
      <circle cx={C} cy={C} r={R_FACE - 12} className="fill-none stroke-foreground/50" strokeWidth="1" />
      {/* Cercle intérieur en creux, comme sur un vrai comparateur */}
      <circle cx={C} cy={C} r={110} className="fill-muted/50 stroke-foreground/20" strokeWidth="1" />

      {/* Graduations (100 divisions / tour, 1 division = 0,01 mm) */}
      {TICKS.map((t, i) => {
        const isHi = highlight && i === hiIndex;
        const outer = polar(t.angle, 178);
        const inner = polar(t.angle, t.major ? 156 : 166);
        return (
          <line
            key={i}
            x1={outer.x}
            y1={outer.y}
            x2={inner.x}
            y2={inner.y}
            strokeWidth={t.major ? 2.4 : 1}
            className={
              isHi
                ? "stroke-amber-500 dark:stroke-amber-400"
                : t.major
                  ? "stroke-foreground"
                  : "stroke-foreground/55"
            }
            strokeLinecap="butt"
          />
        );
      })}

      {/* Mise en évidence de l'alignement grande aiguille (mode aide) */}
      {highlight && (
        <line
          x1={polar(hiDeg, 182).x}
          y1={polar(hiDeg, 182).y}
          x2={polar(hiDeg, 120).x}
          y2={polar(hiDeg, 120).y}
          strokeWidth="3"
          className="stroke-amber-500 dark:stroke-amber-400"
          strokeLinecap="round"
        />
      )}

      {/* Étiquettes principales */}
      {LABELS.map(({ i, big, small }) => {
        // i = index de graduation (0, 10, … 90) → 3,6° par division.
        // Chiffres des dixièmes alignés sur le même index majeur, en rayon
        // intérieur (façon Mitutoyo 2052A).
        const pBig = polar(i * 3.6, 138);
        const pSmall = polar(i * 3.6, 118);
        return (
          <g key={i}>
            <text
              x={pBig.x}
              y={pBig.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-foreground font-num"
              fontSize="21"
              fontWeight={600}
            >
              {big}
            </text>
            <text
              x={pSmall.x}
              y={pSmall.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-foreground/55 font-num"
              fontSize="10"
            >
              {small}
            </text>
          </g>
        );
      })}

      {/* Petite aiguille (tours) dans son sous-cadran */}
      <circle
        cx={SUB.cx}
        cy={SUB.cy}
        r={SUB.r}
        className="fill-background/60 stroke-foreground/45"
        strokeWidth="1.2"
      />
      {Array.from({ length: 25 }, (_, i) => {
        const deg = i * subTickStep;
        const major = i % 5 === 0;
        const o = polar(deg, SUB.r - 3, SUB.cx, SUB.cy);
        const n = polar(deg, SUB.r - (major ? 13 : 8), SUB.cx, SUB.cy);
        const isSubHi = highlight && i === subHiIndex;
        return (
          <line
            key={`sub-${i}`}
            x1={o.x}
            y1={o.y}
            x2={n.x}
            y2={n.y}
            strokeWidth={major ? 1.8 : 0.9}
            className={
              isSubHi
                ? "stroke-amber-500 dark:stroke-amber-400"
                : major
                  ? "stroke-foreground/85"
                  : "stroke-foreground/45"
            }
          />
        );
      })}
      {SUB_LABELS.map((txt, idx) => {
        const deg = idx * 5 * subTickStep;
        const p = polar(deg, SUB.r - 22, SUB.cx, SUB.cy);
        return (
          <text
            key={`subl-${idx}`}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-foreground/70 font-num"
            fontSize="9.5"
          >
            {txt}
          </text>
        );
      })}
      {highlight && (
        <line
          x1={polar(subHiDeg, SUB.r - 3, SUB.cx, SUB.cy).x}
          y1={polar(subHiDeg, SUB.r - 3, SUB.cx, SUB.cy).y}
          x2={polar(subHiDeg, SUB.r - 24, SUB.cx, SUB.cy).x}
          y2={polar(subHiDeg, SUB.r - 24, SUB.cx, SUB.cy).y}
          strokeWidth="2.6"
          className="stroke-amber-500 dark:stroke-amber-400"
          strokeLinecap="round"
        />
      )}
      <line
        x1={SUB.cx}
        y1={SUB.cy}
        x2={smallTip.x}
        y2={smallTip.y}
        strokeWidth="2.6"
        className="stroke-foreground"
        strokeLinecap="round"
      />
      <circle cx={SUB.cx} cy={SUB.cy} r="3.5" className="fill-foreground" />

      {/* Grande aiguille */}
      <line
        x1={needleTail.x}
        y1={needleTail.y}
        x2={needleTip.x}
        y2={needleTip.y}
        strokeWidth="2.6"
        className="stroke-destructive"
        strokeLinecap="round"
      />
      <circle cx={C} cy={C} r="7" className="fill-card stroke-foreground" strokeWidth="2" />

      {/* Mentions de cadran */}
      <text x={C} y={C + 92} textAnchor="middle" className="fill-foreground/55" fontSize="11">
        0 – 25 mm · 0,01 mm / div
      </text>
    </svg>
  );
});

export default Dial;
