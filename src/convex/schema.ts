import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // add other tables here

    // Élèves identifiés par nom / prénom / classe (sans adresse mail)
    students: defineTable({
      key: v.string(), // clé d'identité normalisée "nom|prenom|classe"
      nom: v.string(),
      prenom: v.string(),
      classe: v.string(),
      createdAt: v.number(),
    }).index("by_key", ["key"]),

    // Une tentative = une lecture de comparateur validée
    attempts: defineTable({
      studentId: v.id("students"),
      expected: v.number(), // valeur générée par la simulation (mm)
      value: v.number(), // valeur saisie par l'élève (mm)
      correct: v.boolean(),
      usedHelp: v.boolean(),
      seconds: v.number(),
      createdAt: v.number(),
    }).index("by_student", ["studentId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
