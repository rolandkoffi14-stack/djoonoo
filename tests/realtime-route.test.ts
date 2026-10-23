import { describe, it, expect, vi, beforeEach } from "vitest";
import * as auth from "@/lib/auth";
import { GET } from "@/app/api/realtime/stream/route";

vi.mock("@/lib/auth", () => ({
  getCurrentSession: vi.fn(),
}));

describe("GET /api/realtime/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("doit refuser la connexion avec un code 401 si l'utilisateur n'est pas connecté", async () => {
    vi.mocked(auth.getCurrentSession).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/realtime/stream"));
    expect(response.status).toBe(401);
  });

  it("doit ouvrir un flux SSE avec les en-têtes HTTP requis si l'utilisateur est authentifié", async () => {
    vi.mocked(auth.getCurrentSession).mockResolvedValue({
      userId: "user-1",
      compteId: "compte-1",
      role: "patron",
      nom: "Boss",
      email: "boss@djoonoo.com",
    } as any);

    const response = await GET(new Request("http://localhost/api/realtime/stream"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    expect(response.headers.get("Cache-Control")).toContain("no-cache");
    expect(response.headers.get("X-Accel-Buffering")).toBe("no");
  });
});
