import { redirect } from "next/navigation";

export default async function DashboardCheckoutRedirect({
  searchParams,
}: {
  searchParams: Promise<{ forfaitId?: string; action?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.forfaitId) query.set("forfaitId", params.forfaitId);
  if (params.action) query.set("action", params.action);

  const qs = query.toString();
  redirect(`/abonnement/checkout${qs ? `?${qs}` : ""}`);
}
