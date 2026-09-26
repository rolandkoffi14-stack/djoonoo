"use server";

import { getCurrentSession } from "@/lib/auth";
import { getScopedPrisma } from "@/lib/prisma";
import { ModePaiement } from "@prisma/client";

export type PeriodeRapport = "jour" | "semaine" | "mois" | "annee";

export interface ModePaiementStats {
  mode: ModePaiement;
  label: string;
  montant: number;
  pourcentage: number;
}

export interface BoutiqueRapportStats {
  boutiqueId: string;
  boutiqueNom: string;
  boutiqueCode: string;
  caNet: number;
  nbVentes: number;
  totalEncaisse: number;
}

export interface VendeurRapportStats {
  vendeurId: string;
  vendeurNom: string;
  caNet: number;
  nbVentes: number;
}

export interface PointEvolution {
  label: string;
  ca: number;
}

export interface RapportFinancierData {
  periode: PeriodeRapport;
  dateDebut: string;
  dateFin: string;
  caNet: number;
  caBrut: number;
  totalRemises: number;
  totalEncaisse: number;
  totalCreances: number;
  nbVentes: number;
  panierMoyen: number;
  nbArticlesVendus: number;
  modesPaiement: ModePaiementStats[];
  ventesParBoutique: BoutiqueRapportStats[];
  ventesParVendeur: VendeurRapportStats[];
  evolution: PointEvolution[];
}

export async function getRapportFinancierAction(params: {
  periode: PeriodeRapport;
  boutiqueId?: string; // "tous" ou id spécifique
}): Promise<{ success: boolean; data?: RapportFinancierData; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Session expirée." };
  }

  // Permission Section 2 : Vendeur strictement interdit d'accès aux rapports financiers globaux
  if (session.role === "vendeur") {
    return {
      success: false,
      error: "Accès refusé : la consultation des rapports financiers est réservée aux Gérants et Patrons (Section 2).",
    };
  }

  const { periode, boutiqueId } = params;

  try {
    const scoped = getScopedPrisma(session.compteId);

    // 1. Calcul de la plage de dates
    const maintenant = new Date();
    let dateDebut: Date;
    const dateFin = maintenant;

    switch (periode) {
      case "jour":
        dateDebut = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate(), 0, 0, 0);
        break;
      case "semaine":
        dateDebut = new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateDebut.setHours(0, 0, 0, 0);
        break;
      case "mois":
        dateDebut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1, 0, 0, 0);
        break;
      case "annee":
      default:
        dateDebut = new Date(maintenant.getFullYear(), 0, 1, 0, 0, 0);
        break;
    }

    // 2. Condition de filtrage par boutique
    // Le Gérant est strictement verrouillé sur sa boutique
    let targetBoutiqueId: string | undefined = undefined;
    if (session.role === "gerant" && session.boutiqueId) {
      targetBoutiqueId = session.boutiqueId;
    } else if (boutiqueId && boutiqueId !== "tous") {
      targetBoutiqueId = boutiqueId;
    }

    const whereClause: any = {
      compte_id: session.compteId,
      statut_vente: "validee",
      date_vente: {
        gte: dateDebut,
        lte: dateFin,
      },
    };

    if (targetBoutiqueId) {
      whereClause.boutique_id = targetBoutiqueId;
    }

    // 3. Récupération des ventes de la période avec leurs détails
    const ventes = await scoped.ventes.findMany({
      where: whereClause,
      orderBy: { date_vente: "asc" },
      include: {
        boutique: { select: { id: true, nom: true, code: true } },
        utilisateur: { select: { id: true, nom: true } },
        paiements: { select: { montant: true, mode_paiement: true, date_paiement: true } },
        lignes_vente: { select: { quantite: true } },
      },
    });

    // 4. Agrégation des indicateurs financiers (entiers stricts en FCFA)
    let caNet = 0;
    let totalRemises = 0;
    let totalEncaisse = 0;
    let nbArticlesVendus = 0;

    const paiementsModesMap = new Map<ModePaiement, number>([
      ["especes", 0],
      ["mtn_momo", 0],
      ["moov_money", 0],
    ]);

    const boutiquesMap = new Map<string, BoutiqueRapportStats>();
    const vendeursMap = new Map<string, VendeurRapportStats>();

    ventes.forEach((v) => {
      caNet += v.montant_total;
      totalRemises += v.montant_remise;

      // Articles
      const articlesDansVente = v.lignes_vente.reduce((acc, l) => acc + l.quantite, 0);
      nbArticlesVendus += articlesDansVente;

      // Encaissements
      let encaisseSurVente = 0;
      v.paiements.forEach((p) => {
        encaisseSurVente += p.montant;
        totalEncaisse += p.montant;
        const existantMode = paiementsModesMap.get(p.mode_paiement) || 0;
        paiementsModesMap.set(p.mode_paiement, existantMode + p.montant);
      });

      // Ventilation par boutique
      if (!boutiquesMap.has(v.boutique_id)) {
        boutiquesMap.set(v.boutique_id, {
          boutiqueId: v.boutique.id,
          boutiqueNom: v.boutique.nom,
          boutiqueCode: v.boutique.code,
          caNet: 0,
          nbVentes: 0,
          totalEncaisse: 0,
        });
      }
      const bStat = boutiquesMap.get(v.boutique_id)!;
      bStat.caNet += v.montant_total;
      bStat.nbVentes += 1;
      bStat.totalEncaisse += encaisseSurVente;

      // Ventilation par vendeur
      if (!vendeursMap.has(v.utilisateur_id)) {
        vendeursMap.set(v.utilisateur_id, {
          vendeurId: v.utilisateur.id,
          vendeurNom: v.utilisateur.nom,
          caNet: 0,
          nbVentes: 0,
        });
      }
      const vStat = vendeursMap.get(v.utilisateur_id)!;
      vStat.caNet += v.montant_total;
      vStat.nbVentes += 1;
    });

    const caBrut = caNet + totalRemises;
    const totalCreances = Math.max(0, caNet - totalEncaisse);
    const nbVentes = ventes.length;
    const panierMoyen = nbVentes > 0 ? Math.round(caNet / nbVentes) : 0;

    // Répartition modes de paiement
    const modesLabels: Record<ModePaiement, string> = {
      especes: "Espèces",
      mtn_momo: "MTN MoMo",
      moov_money: "Moov Money",
    };

    const modesPaiement: ModePaiementStats[] = Array.from(paiementsModesMap.entries()).map(
      ([mode, montant]) => ({
        mode,
        label: modesLabels[mode],
        montant,
        pourcentage: totalEncaisse > 0 ? Math.round((montant / totalEncaisse) * 100) : 0,
      })
    );

    // Évolution chronologique simple selon la période
    const evolution: PointEvolution[] = [];
    if (periode === "jour") {
      // Regroupement par tranche horaire
      const heuresMap = new Map<number, number>();
      for (let h = 8; h <= 20; h += 2) heuresMap.set(h, 0);

      ventes.forEach((v) => {
        const h = new Date(v.date_vente).getHours();
        const tranche = Math.floor(h / 2) * 2;
        heuresMap.set(tranche, (heuresMap.get(tranche) || 0) + v.montant_total);
      });

      heuresMap.forEach((montant, h) => {
        evolution.push({ label: `${h}h`, ca: montant });
      });
    } else if (periode === "semaine") {
      // 7 derniers jours
      const joursSemaine = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(maintenant.getTime() - i * 24 * 60 * 60 * 1000);
        const jourNom = joursSemaine[d.getDay()];
        const ventesJour = ventes.filter((v) => {
          const vd = new Date(v.date_vente);
          return vd.toDateString() === d.toDateString();
        });
        const caJour = ventesJour.reduce((acc, v) => acc + v.montant_total, 0);
        evolution.push({ label: jourNom, ca: caJour });
      }
    } else if (periode === "mois") {
      // Regroupement par semaine (S1, S2, S3, S4)
      for (let s = 1; s <= 4; s++) {
        const caSemaine = ventes
          .filter((v) => {
            const jourMois = new Date(v.date_vente).getDate();
            return Math.ceil(jourMois / 7) === s;
          })
          .reduce((acc, v) => acc + v.montant_total, 0);
        evolution.push({ label: `Sem. ${s}`, ca: caSemaine });
      }
    } else {
      // 12 mois de l'année
      const moisNoms = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
      for (let m = 0; m <= maintenant.getMonth(); m++) {
        const caMois = ventes
          .filter((v) => new Date(v.date_vente).getMonth() === m)
          .reduce((acc, v) => acc + v.montant_total, 0);
        evolution.push({ label: moisNoms[m], ca: caMois });
      }
    }

    return {
      success: true,
      data: {
        periode,
        dateDebut: dateDebut.toISOString(),
        dateFin: dateFin.toISOString(),
        caNet,
        caBrut,
        totalRemises,
        totalEncaisse,
        totalCreances,
        nbVentes,
        panierMoyen,
        nbArticlesVendus,
        modesPaiement,
        ventesParBoutique: Array.from(boutiquesMap.values()),
        ventesParVendeur: Array.from(vendeursMap.values()).sort((a, b) => b.caNet - a.caNet),
        evolution,
      },
    };
  } catch (err: any) {
    console.error("Erreur getRapportFinancierAction :", err);
    return { success: false, error: "Impossible de générer le rapport financier." };
  }
}
