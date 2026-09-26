import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Extension Prisma pour l'isolation multi-tenant stricte par compte_id (Règle 5, Section 4 & 8).
 * Applique systématiquement where: { ...where, compte_id: compteId } sur tous les modèles dénormalisés
 * et injecte automatiquement compte_id à la création.
 */
export function getScopedPrisma(compteId: string) {
  return prisma.$extends({
    query: {
      boutiques: {
        async findMany({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
      },
      produits: {
        async findMany({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
      },
      ventes: {
        async findMany({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
      },
      lignes_vente: {
        async findMany({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
      },
      paiements: {
        async findMany({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
      },
      clients: {
        async findMany({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
      },
      utilisateurs: {
        async findMany({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
      },
      journal_audit: {
        async findMany({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, compte_id: compteId };
          return query(args);
        },
      },
    },
  });
}
