"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";

export interface AuditFiltres {
  categorie?: string;
  utilisateurId?: string;
  recherche?: string;
  page?: number;
  limite?: number;
}

export interface JournalAuditItem {
  id: string;
  compte_id: string;
  utilisateur_id: string;
  action: string;
  entite_concernee: string;
  entite_id: string;
  date: Date;
  details: any;
  utilisateur: {
    id: string;
    nom: string;
    email: string;
    role: string;
  } | null;
}

const CATEGORIES_ACTIONS: Record<string, string[]> = {
  ventes: ["creation_vente", "annulation_vente", "reglement_dette", "suppression_vente"],
  stocks: ["creation_produit", "modification_prix_produit", "reapprovisionnement_stock", "suppression_produit"],
  equipe: ["invitation_employe", "modification_statut_employe", "transfert_employe"],
  boutiques: ["creation_boutique", "modification_statut_boutique"],
  securite: ["creation_compte", "connexion", "modification_mot_de_passe", "changement_forfait"]
};

export async function recupererJournalAuditAction(filtres: AuditFiltres = {}) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { success: false, error: "Non authentifié" };
    }

    if (session.role !== "patron") {
      return { success: false, error: "Accès réservé au Patron de l'entreprise" };
    }

    const {
      categorie = "toutes",
      utilisateurId,
      recherche,
      page = 1,
      limite = 40
    } = filtres;

    // Clause WHERE stricte avec isolation Règle 5 (compte_id obligatoire)
    const where: any = {
      compte_id: session.compteId
    };

    // Filtre par catégorie d'actions
    if (categorie && categorie !== "toutes" && CATEGORIES_ACTIONS[categorie]) {
      where.action = { in: CATEGORIES_ACTIONS[categorie] };
    }

    // Filtre par utilisateur spécifique
    if (utilisateurId && utilisateurId !== "tous") {
      where.utilisateur_id = utilisateurId;
    }

    // Recherche textuelle
    if (recherche && recherche.trim() !== "") {
      const q = recherche.trim();
      where.OR = [
        { action: { contains: q, mode: "insensitive" } },
        { entite_concernee: { contains: q, mode: "insensitive" } },
        { entite_id: { contains: q, mode: "insensitive" } },
        { utilisateur: { nom: { contains: q, mode: "insensitive" } } },
        { utilisateur: { email: { contains: q, mode: "insensitive" } } }
      ];
    }

    const skip = (page - 1) * limite;

    // Récupération des logs avec pagination et relation utilisateur
    const [totalLogs, logs, utilisateursActifs] = await Promise.all([
      prisma.journal_audit.count({ where }),
      prisma.journal_audit.findMany({
        where,
        include: {
          utilisateur: {
            select: {
              id: true,
              nom: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { date: "desc" },
        skip,
        take: limite
      }),
      // Liste de tous les utilisateurs ayant posé une action pour le filtre
      prisma.utilisateurs.findMany({
        where: { compte_id: session.compteId },
        select: {
          id: true,
          nom: true,
          email: true,
          role: true
        },
        orderBy: { nom: "asc" }
      })
    ]);

    // Statistiques clés pour les compteurs en haut de page
    const debutAujourdhui = new Date();
    debutAujourdhui.setHours(0, 0, 0, 0);

    const [totalAujourdhui, totalSensibles] = await Promise.all([
      prisma.journal_audit.count({
        where: {
          compte_id: session.compteId,
          date: { gte: debutAujourdhui }
        }
      }),
      prisma.journal_audit.count({
        where: {
          compte_id: session.compteId,
          action: {
            in: ["annulation_vente", "transfert_employe", "modification_prix_produit", "suppression_produit"]
          }
        }
      })
    ]);

    return {
      success: true,
      data: {
        logs: logs as unknown as JournalAuditItem[],
        pagination: {
          total: totalLogs,
          page,
          limite,
          totalPages: Math.ceil(totalLogs / limite)
        },
        utilisateurs: utilisateursActifs,
        stats: {
          totalGlobal: totalLogs,
          totalAujourdhui,
          totalSensibles
        }
      }
    };
  } catch (error) {
    console.error("Erreur récupération journal audit:", error);
    return {
      success: false,
      error: "Impossible de charger le journal d'audit"
    };
  }
}
