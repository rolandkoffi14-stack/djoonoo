import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCookieStore = {
  set: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

import { clearSessionCookie } from "../src/lib/auth";
import { destroySuperAdminSession } from "../src/lib/super-admin-auth";

describe("Sentinelle Sécurité — Révocation des Sessions Utilisateurs & Super-Admin (Point 3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("doit supprimer et révoquer explicitement le cookie de session utilisateur avec maxAge 0 et path /", async () => {
    await clearSessionCookie();

    // 1. Suppression delete()
    expect(mockCookieStore.delete).toHaveBeenCalledWith("djoonoo_session");
    expect(mockCookieStore.delete).toHaveBeenCalledWith("djoonoo_active_boutique");

    // 2. Écrasement explicite avec maxAge: 0 et path: "/" (OWASP session termination)
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "djoonoo_session",
      "",
      expect.objectContaining({
        maxAge: 0,
        path: "/",
        httpOnly: true,
      })
    );
  });

  it("doit supprimer et révoquer explicitement le cookie Super-Admin avec maxAge 0 et path /", async () => {
    await destroySuperAdminSession();

    expect(mockCookieStore.delete).toHaveBeenCalledWith("djoonoo_superadmin_session");
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "djoonoo_superadmin_session",
      "",
      expect.objectContaining({
        maxAge: 0,
        path: "/",
        httpOnly: true,
      })
    );
  });
});
