"use client";

import React, { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { genererTranchesPagination } from "@/lib/pagination";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalElements: number;
  limit: number;
}

export default function Pagination({
  page,
  totalPages,
  totalElements,
  limit,
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  if (totalElements === 0 || totalPages <= 1) {
    return null;
  }

  const changerPage = (nouvellePage: number) => {
    if (nouvellePage < 1 || nouvellePage > totalPages || nouvellePage === page) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nouvellePage));

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const changerLimite = (nouvelleLimite: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", String(nouvelleLimite));
    params.set("page", "1"); // Revenir en page 1 quand la taille change

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const debut = (page - 1) * limit + 1;
  const fin = Math.min(page * limit, totalElements);
  const tranches = genererTranchesPagination(page, totalPages);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 bg-[#FAF6F1] border-t border-[#E5DACF] text-xs text-[#6D5D52] transition-opacity duration-200 ${
        isPending ? "opacity-50 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex items-center gap-3">
        <span>
          Affichage de <strong className="text-[#2B2119]">{debut}</strong> à{" "}
          <strong className="text-[#2B2119]">{fin}</strong> sur{" "}
          <strong className="text-[#2B2119]">{totalElements.toLocaleString("fr-FR")}</strong>
        </span>

        <div className="hidden sm:flex items-center gap-1.5 ml-2">
          <span>Par page :</span>
          <select
            value={limit}
            onChange={(e) => changerLimite(Number(e.target.value))}
            className="bg-[#FAF6F1] border border-[#E5DACF] rounded-lg px-2 py-1 text-xs text-[#2B2119] focus:outline-none focus:ring-1 focus:ring-[#C1652D]"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => changerPage(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-[#E5DACF] hover:bg-[#E5DACF]/40 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
          title="Page précédente"
        >
          <ChevronLeft className="w-4 h-4 text-[#2B2119]" />
        </button>

        {tranches.map((item, index) =>
          item === "..." ? (
            <span key={`dots-${index}`} className="px-2 py-1 text-[#8C7A6B]">
              ...
            </span>
          ) : (
            <button
              key={`page-${item}`}
              type="button"
              onClick={() => changerPage(item as number)}
              className={`min-w-8 h-8 rounded-lg font-bold transition-all cursor-pointer ${
                item === page
                  ? "bg-[#C1652D] text-[#FAF6F1] shadow-xs"
                  : "border border-[#E5DACF] text-[#2B2119] hover:bg-[#E5DACF]/40"
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => changerPage(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-[#E5DACF] hover:bg-[#E5DACF]/40 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
          title="Page suivante"
        >
          <ChevronRight className="w-4 h-4 text-[#2B2119]" />
        </button>
      </div>
    </div>
  );
}
