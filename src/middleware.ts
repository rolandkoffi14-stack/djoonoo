import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware central de sécurité Next.js (Phase 2 - Items 3.1 & 3.2 de l'audit)
 * Applique une politique de contrôle d'accès stricte (Refus par défaut).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Protection de la console Super-Admin
  if (pathname.startsWith("/super-admin")) {
    // La seule page publique sous /super-admin est /super-admin/connexion
    if (pathname === "/super-admin/connexion") {
      return NextResponse.next();
    }

    const superAdminCookie = req.cookies.get("djoonoo_superadmin_session")?.value;
    if (!superAdminCookie) {
      const loginUrl = new URL("/super-admin/connexion", req.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 2. Protection du Dashboard Commerçant et de l'Abonnement
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/abonnement")) {
    const sessionCookie = req.cookies.get("djoonoo_session")?.value;
    if (!sessionCookie) {
      const loginUrl = new URL("/connexion", req.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 3. Protection des routes API privées
  if (pathname.startsWith("/api/factures-abonnement") || pathname === "/api/auth/session") {
    const sessionCookie = req.cookies.get("djoonoo_session")?.value;
    const superAdminCookie = req.cookies.get("djoonoo_superadmin_session")?.value;

    if (!sessionCookie && !superAdminCookie) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

/**
 * Matcher excluant expressément les assets statiques de Next.js, images et favicon
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - brand (assets graphiques)
     * - public files with extensions (.svg, .png, .jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|brand|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
