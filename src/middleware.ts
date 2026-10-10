import { NextRequest, NextResponse } from "next/server";

/**
 * Liste blanche explicite des routes publiques accessibles sans session (Default-Deny).
 * Tout chemin absent de cette liste blanche ou de ses préfixes autorisés exige une session active.
 */
const EXACT_PUBLIC_PATHS = new Set([
  "/",
  "/tarifs",
  "/connexion",
  "/inscription",
  "/cgu",
  "/confidentialite",
  "/super-admin/connexion",
  "/super-admin/initialisation",
  "/api/webhooks/fedapay",
  "/api/cron/abonnements",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
]);

function estRoutePublique(pathname: string): boolean {
  if (EXACT_PUBLIC_PATHS.has(pathname)) {
    return true;
  }

  // Préfixes publics dynamiques ou assets
  if (
    pathname.startsWith("/invitation/") ||
    pathname.startsWith("/verification-email/") ||
    pathname.startsWith("/brand/") ||
    pathname.startsWith("/_next/")
  ) {
    return true;
  }

  return false;
}

/**
 * Middleware central de sécurité Next.js (Default-Deny — Item 3.2 de l'audit)
 * Applique une politique de contrôle d'accès stricte en refus par défaut.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Autoriser immédiatement si la route figure sur la liste blanche publique
  if (estRoutePublique(pathname)) {
    return NextResponse.next();
  }

  // 2. Gestion du périmètre Super-Admin privé
  if (pathname.startsWith("/super-admin")) {
    const superAdminCookie = req.cookies.get("djoonoo_superadmin_session")?.value;
    if (!superAdminCookie) {
      const loginUrl = new URL("/super-admin/connexion", req.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 3. Gestion des routes API privées (retour JSON 401 au lieu d'une redirection HTML)
  if (pathname.startsWith("/api/")) {
    const sessionCookie = req.cookies.get("djoonoo_session")?.value;
    const superAdminCookie = req.cookies.get("djoonoo_superadmin_session")?.value;

    if (!sessionCookie && !superAdminCookie) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 4. TOUTES LES AUTRES ROUTES (Default-Deny) : Exigent le cookie djoonoo_session commerçant
  const sessionCookie = req.cookies.get("djoonoo_session")?.value;
  if (!sessionCookie) {
    const loginUrl = new URL("/connexion", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Matcher excluant expressément les assets statiques de Next.js, images et favicon
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
