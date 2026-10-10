import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { verifierEmailPatronAction } from "@/app/actions/auth";
import { siteConfig } from "@/config/site";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function VerificationEmailPage({ params }: PageProps) {
  const { token } = await params;
  const resultat = await verifierEmailPatronAction(token);

  return (
    <div className="min-h-screen bg-[#FAF6F1] flex flex-col items-center justify-center p-4 selection:bg-[#C1652D]/20">
      <div className="w-full max-w-md bg-white border border-[#E5DACF] rounded-2xl shadow-xl overflow-hidden p-8 text-center">
        {/* Logo djoonoo */}
        <div className="flex justify-center mb-6">
          <Link href="/">
            <Image
              src={siteConfig.app.logos.transparentClairPng}
              alt="djoonoo"
              width={140}
              height={45}
              priority
              className="h-10 w-auto object-contain"
            />
          </Link>
        </div>

        {resultat.success ? (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-[#16A34A]/10 text-[#16A34A] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-[#2B2119]">
              Adresse email confirmée !
            </h1>
            <p className="text-sm text-[#6D5D52] leading-relaxed">
              Votre adresse email <strong>{resultat.email}</strong> a été validée avec succès. Votre compte djoonoo est maintenant pleinement sécurisé.
            </p>
            <div className="pt-4">
              <Link
                href="/connexion"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 bg-[#C1652D] hover:bg-[#A85422] text-[#FAF6F1] font-semibold rounded-xl shadow-md transition-all duration-200"
              >
                Accéder à mon espace
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-[#DC2626]/10 text-[#DC2626] rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-[#2B2119]">
              Lien invalide ou expiré
            </h1>
            <p className="text-sm text-[#6D5D52] leading-relaxed">
              {resultat.error || "Ce lien de confirmation n'est plus valable. Si vous avez déjà validé votre compte, vous pouvez vous connecter directement."}
            </p>
            <div className="pt-4">
              <Link
                href="/connexion"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 bg-[#2B2119] hover:bg-[#3E3024] text-[#FAF6F1] font-semibold rounded-xl shadow-md transition-all duration-200"
              >
                Retour à la page de connexion
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-8 text-xs text-[#8C7A6B] text-center">
        © {new Date().getFullYear()} {siteConfig.app.nom} — {siteConfig.app.sousSloganFacture}
      </footer>
    </div>
  );
}
