import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

/** Clé d'identité normalisée : évite les doublons nom/prénom/classe. */
export function normalizeKey(nom: string, prenom: string, classe: string) {
  return [nom, prenom, classe]
    .map((s) => s.trim().toLowerCase())
    .join("|");
}

/**
 * Identifie (ou retrouve) un élève à partir de nom, prénom et classe.
 * Aucune adresse mail n'est nécessaire.
 */
export const identifyStudent = mutation({
  args: {
    nom: v.string(),
    prenom: v.string(),
    classe: v.string(),
  },
  handler: async (ctx, args) => {
    const key = normalizeKey(args.nom, args.prenom, args.classe);
    const existing = await ctx.db
      .query("students")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("students", {
      key,
      nom: args.nom.trim(),
      prenom: args.prenom.trim(),
      classe: args.classe.trim(),
      createdAt: Date.now(),
    });
  },
});

/** Enregistre une tentative (lecture comparateur 0–25 mm). */
export const recordAttempt = mutation({
  args: {
    studentId: v.id("students"),
    expected: v.number(),
    value: v.number(),
    correct: v.boolean(),
    usedHelp: v.boolean(),
    seconds: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("attempts", {
      studentId: args.studentId,
      expected: args.expected,
      value: args.value,
      correct: args.correct,
      usedHelp: args.usedHelp,
      seconds: Math.max(0, Math.round(args.seconds)),
      createdAt: Date.now(),
    });
  },
});

/** Progression d'un élève (utilisé après identification). */
export const getStudentProgress = query({
  args: { studentId: v.id("students") },
  handler: async (ctx, args) => {
    const attempts = await ctx.db
      .query("attempts")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();
    const total = attempts.length;
    const correct = attempts.filter((a) => a.correct).length;
    const helps = attempts.filter((a) => a.usedHelp).length;
    return {
      total,
      correct,
      helps,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  },
});

/** Liste toutes les classes distinctes (menu formateur). */
export const listClasses = query({
  args: {},
  handler: async (ctx) => {
    const students = await ctx.db.query("students").collect();
    return Array.from(new Set(students.map((s) => s.classe))).sort();
  },
});

/**
 * Export complet pour le menu formateur.
 * Vérifie le mot de passe côté serveur : "admin prof".
 */
export const adminExport = query({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    if (args.password !== "admin prof") {
      throw new Error("Mot de passe incorrect");
    }
    const students = await ctx.db.query("students").collect();
    const byId = new Map(students.map((s) => [s._id, s]));
    const attempts = await ctx.db.query("attempts").collect();

    const rows = attempts
      .map((a) => {
        const s = byId.get(a.studentId);
        return {
          nom: s?.nom ?? "?",
          prenom: s?.prenom ?? "?",
          classe: s?.classe ?? "?",
          expected: a.expected,
          value: a.value,
          correct: a.correct,
          usedHelp: a.usedHelp,
          seconds: a.seconds,
          createdAt: a.createdAt,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 2000);

    const perStudent = new Map<
      string,
      { nom: string; prenom: string; classe: string; total: number; correct: number; helps: number; seconds: number }
    >();
    for (const r of rows) {
      const k = `${r.nom}|${r.prenom}|${r.classe}`;
      const cur = perStudent.get(k) ?? {
        nom: r.nom,
        prenom: r.prenom,
        classe: r.classe,
        total: 0,
        correct: 0,
        helps: 0,
        seconds: 0,
      };
      cur.total += 1;
      if (r.correct) cur.correct += 1;
      if (r.usedHelp) cur.helps += 1;
      cur.seconds += r.seconds;
      perStudent.set(k, cur);
    }

    return {
      rows,
      students: Array.from(perStudent.values()).sort(
        (a, b) =>
          a.classe.localeCompare(b.classe) ||
          a.nom.localeCompare(b.nom) ||
          a.prenom.localeCompare(b.prenom),
      ),
    };
  },
});

/** Réinitialise les données d'une classe (formateur). */
export const adminResetClass = mutation({
  args: { password: v.string(), classe: v.string() },
  handler: async (ctx, args) => {
    if (args.password !== "admin prof") {
      throw new Error("Mot de passe incorrect");
    }
    const students = await ctx.db
      .query("students")
      .collect();
    const targets = students.filter((s) => s.classe === args.classe);
    let removed = 0;
    for (const s of targets) {
      const atts = await ctx.db
        .query("attempts")
        .withIndex("by_student", (q) => q.eq("studentId", s._id))
        .collect();
      for (const a of atts) {
        await ctx.db.delete(a._id);
        removed += 1;
      }
      await ctx.db.delete(s._id);
    }
    return removed;
  },
});

/**
 * Purge (interne) : supprime les élèves créés il y a plus de 180 jours
 * et n'ayant aucune tentative. Appelée par un cron ou à l'initiative du
 * développeur — non exposée au client.
 */
export const purgeOldStudents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 180 * 24 * 3600 * 1000;
    const students = await ctx.db.query("students").collect();
    let removed = 0;
    for (const s of students) {
      if (s.createdAt >= cutoff) continue;
      const atts = await ctx.db
        .query("attempts")
        .withIndex("by_student", (q) => q.eq("studentId", s._id))
        .collect();
      if (atts.length > 0) continue;
      await ctx.db.delete(s._id);
      removed += 1;
    }
    return removed;
  },
});
